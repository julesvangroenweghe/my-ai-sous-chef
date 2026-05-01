import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  // Gebruik get_my_kitchen_ids() RPC — SECURITY DEFINER, bypast RLS volledig
  const { data: kitchenIds, error: rpcError } = await supabase.rpc('get_my_kitchen_ids')

  if (rpcError || !kitchenIds?.length) {
    // Fallback: directe SQL join als RPC faalt
    const { data: fallback } = await supabase
      .from('chef_profiles')
      .select('kitchen_members(kitchen_id)')
      .eq('auth_user_id', user.id)
      .single()

    const kitchenId = (fallback as any)?.kitchen_members?.[0]?.kitchen_id
    if (!kitchenId) {
      return NextResponse.json(
        { error: `Geen keuken gevonden (uid: ${user.id}, rpc: ${rpcError?.message})` },
        { status: 403 }
      )
    }
    return handleCreate(request, supabase, user, kitchenId)
  }

  const kitchenId = kitchenIds[0]
  return handleCreate(request, supabase, user, kitchenId)
}

async function handleCreate(
  request: NextRequest,
  supabase: any,
  user: any,
  kitchenId: string
) {
  // Get chef profile id
  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Geen chef profiel gevonden' }, { status: 403 })
  }

  try {
    const { parsedBrief } = await request.json()
    const { event: eventData, days, dietary_restrictions, dietary_notes, global_open_questions } = parsedBrief

    // Determine event_type from the days/moments
    const allFormats = days.flatMap((d: any) => d.moments?.map((m: any) => m.format) || [])
    const primaryFormat = allFormats.includes('sit_down') ? 'sit_down'
      : allFormats.includes('walking_dinner') ? 'walking_dinner'
      : allFormats.includes('buffet') ? 'buffet'
      : allFormats.includes('cocktail') ? 'cocktail'
      : 'sit_down'

    // Build notes with dietary info + global open questions
    const notesLines = []
    if (dietary_notes) notesLines.push(`Dieetwensen: ${dietary_notes}`)
    if (global_open_questions?.length) {
      notesLines.push('\nOpen vragen:')
      global_open_questions.forEach((q: string) => notesLines.push(`• ${q}`))
    }

    // Create the main event
    const { data: eventRecord, error: eventError } = await supabase
      .from('events')
      .insert({
        kitchen_id: kitchenId,
        name: eventData.name,
        event_date: eventData.start_date,
        event_type: primaryFormat,
        num_persons: eventData.num_persons,
        location: eventData.location,
        status: 'draft',
        notes: notesLines.join('\n'),
      })
      .select()
      .single()

    if (eventError) throw eventError

    const createdProposals = []

    // Create one proposal per day
    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
      const day = days[dayIndex]

      // Build all dishes as saved_menu_items
      const allDishes: any[] = []
      let courseOrder = 1

      for (const moment of (day.moments || [])) {
        for (const course of (moment.courses || [])) {
          for (let dishIndex = 0; dishIndex < (course.dishes || []).length; dishIndex++) {
            const dish = course.dishes[dishIndex]
            const courseName = `${moment.type} — ${course.course_name}`

            allDishes.push({
              course: courseName,
              course_order: courseOrder,
              custom_name: dish.name,
              custom_description: dish.description || null,
              source: 'brief_import',
              sort_order: dishIndex + 1,
            })
          }
          courseOrder++
        }
      }

      const dayOpenQuestions = day.open_questions || []
      const globalQuestions = global_open_questions || []

      const eventRequirements = {
        imported_from_brief: true,
        day_label: day.day_label,
        date: day.date,
        moments: day.moments || [],
        budget_items: day.budget_items || [],
        open_questions: dayOpenQuestions,
        day_open_questions: dayOpenQuestions,
        global_open_questions: globalQuestions,
        dietary_restrictions,
        dietary_notes,
        contact: {
          name: eventData.contact_name,
          email: eventData.contact_email || null,
          phone: eventData.contact_phone || null,
        },
        exclusions: dietary_restrictions || [],
        preferences: {},
        concept: `${eventData.name} — ${day.day_label}`,
        special_requests: dietary_notes || '',
        contact_person: eventData.contact_name || '',
      }

      const dayBudget = (day.budget_items || []).reduce(
        (sum: number, b: any) => sum + (b.price_pp || 0),
        0
      )

      const { data: proposal, error: propError } = await supabase
        .from('saved_menus')
        .insert({
          kitchen_id: kitchenId,
          created_by: profile.id,
          event_id: eventRecord.id,
          name: `${day.day_label} — ${eventData.name}`,
          menu_type: primaryFormat,
          num_persons: eventData.num_persons,
          price_per_person: dayBudget > 0 ? dayBudget : null,
          dietary_restrictions: dietary_restrictions || [],
          revision_number: 1,
          proposal_status: 'draft',
          event_requirements: eventRequirements,
          status: 'draft',
        })
        .select()
        .single()

      if (propError) throw propError

      if (allDishes.length > 0) {
        const itemsToInsert = allDishes.map((dish) => ({
          ...dish,
          menu_id: proposal.id,
        }))

        const { error: itemsError } = await supabase
          .from('saved_menu_items')
          .insert(itemsToInsert)

        if (itemsError) console.error('Items insert error:', itemsError)
      }

      createdProposals.push({
        id: proposal.id,
        day_label: day.day_label,
        dish_count: allDishes.length,
        open_question_count: dayOpenQuestions.length,
      })
    }

    return NextResponse.json({
      success: true,
      event_id: eventRecord.id,
      event_name: eventData.name,
      proposals: createdProposals,
      total_open_questions: (global_open_questions || []).length +
        days.reduce((sum: number, d: any) => sum + (d.open_questions?.length || 0), 0),
    })
  } catch (error) {
    console.error('Create from brief error:', error)
    return NextResponse.json(
      { error: 'Aanmaken mislukt: ' + (error instanceof Error ? error.message : 'Onbekende fout') },
      { status: 500 }
    )
  }
}
