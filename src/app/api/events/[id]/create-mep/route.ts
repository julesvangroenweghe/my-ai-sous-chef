import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/events/[id]/create-mep
// Creates mep_dishes from the best available proposal for this event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

    // Get kitchen
    const { data: profile } = await supabase
      .from('chef_profiles')
      .select('kitchen_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile?.kitchen_id) {
      return NextResponse.json({ error: 'Geen keuken gevonden' }, { status: 400 })
    }

    const kitchenId = profile.kitchen_id

    // Check if mep_dishes already exist for this event
    const { data: existingDishes } = await supabase
      .from('mep_dishes')
      .select('id')
      .eq('event_id', eventId)
      .limit(1)

    if (existingDishes && existingDishes.length > 0) {
      return NextResponse.json({ 
        success: true, 
        alreadyExists: true,
        message: 'MEP bestaat al voor dit event' 
      })
    }

    // Find best proposal: prefer approved/confirmed, else highest revision
    const { data: proposals } = await supabase
      .from('saved_menus')
      .select(`
        id, name, revision_number, proposal_status,
        items:saved_menu_items(
          id, course, course_order, sort_order,
          custom_name, custom_description,
          recipe_id, legende_dish_id, classical_recipe_id,
          source,
          recipe:recipes(id, name),
          legende_dish:legende_dishes(id, name)
        )
      `)
      .eq('event_id', eventId)
      .order('revision_number', { ascending: false })

    if (!proposals || proposals.length === 0) {
      return NextResponse.json({ 
        success: false, 
        noProposal: true,
        message: 'Geen voorstel gevonden voor dit event — maak eerst een voorstel aan' 
      })
    }

    // Prefer approved proposal, else take latest
    const bestProposal = proposals.find(p => 
      p.proposal_status === 'approved' || p.proposal_status === 'confirmed'
    ) || proposals[0]

    const items = (bestProposal.items || []) as any[]
    if (items.length === 0) {
      return NextResponse.json({ 
        success: false,
        message: 'Voorstel heeft geen gerechten' 
      })
    }

    // Map saved_menu_items → mep_dishes
    const dishesToInsert = items.map((item: any, idx: number) => {
      // Resolve dish name
      let title = item.custom_name || null
      if (!title && item.recipe) title = item.recipe.name
      if (!title && item.legende_dish) title = item.legende_dish.name
      if (!title) title = `Gerecht ${idx + 1}`

      // Map course to category
      const courseRaw = (item.course || '').toUpperCase().trim()
      const category = courseRaw || 'ONBEKEND'

      return {
        event_id: eventId,
        kitchen_id: kitchenId,
        legende_dish_id: item.legende_dish_id || null,
        title,
        category,
        sort_order: item.sort_order ?? item.course_order ?? idx,
        is_ai_suggestion: false,
        notes: item.custom_description || null,
        timing_label: null,
      }
    })

    const { data: created, error: insertError } = await supabase
      .from('mep_dishes')
      .insert(dishesToInsert)
      .select('id')

    if (insertError) {
      console.error('MEP insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      created: created?.length || 0,
      proposalName: bestProposal.name,
      proposalRevision: bestProposal.revision_number,
      message: `MEP aangemaakt — ${created?.length || 0} gerechten geïmporteerd van voorstel V${bestProposal.revision_number}`
    })

  } catch (err) {
    console.error('create-mep error:', err)
    return NextResponse.json({ error: 'Server fout' }, { status: 500 })
  }
}

// GET /api/events/[id]/create-mep — check MEP status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

    const { data: dishes } = await supabase
      .from('mep_dishes')
      .select('id')
      .eq('event_id', eventId)

    const { data: proposals } = await supabase
      .from('saved_menus')
      .select('id, name, revision_number, proposal_status')
      .eq('event_id', eventId)
      .order('revision_number', { ascending: false })
      .limit(5)

    return NextResponse.json({
      hasMep: (dishes?.length || 0) > 0,
      mepDishCount: dishes?.length || 0,
      hasProposal: (proposals?.length || 0) > 0,
      proposals: proposals || [],
    })
  } catch (err) {
    return NextResponse.json({ error: 'Server fout' }, { status: 500 })
  }
}
