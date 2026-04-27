import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const JARVIS_CALLBACK =
  'https://webhooks.tasklet.ai/v1/public/webhook/a_pm8c3je34w1hm1wgkjpt?token=a28d6eab85448000105cf6b9f9b54a14'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://my-ai-sous-chef.vercel.app'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // ── generate_mep ────────────────────────────────────────────────────────
    if (action === 'generate_mep') {
      const { event_id, guest_count } = body

      if (!event_id) {
        return NextResponse.json({ error: 'event_id is required' }, { status: 400 })
      }

      // Fetch event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, name, event_date, num_persons, event_type, location, price_per_person, status, kitchen_id')
        .eq('id', event_id)
        .single()

      if (eventError || !event) {
        return NextResponse.json({ error: 'Event niet gevonden' }, { status: 404 })
      }

      const numPersons = guest_count || event.num_persons || 0

      // Fetch menu items with recipe/ingredient data
      const { data: menuItems } = await supabase
        .from('event_menu_items')
        .select(
          `
          id, course, course_order, component_group,
          recipe:recipes(
            id, name, total_cost_per_serving,
            components:recipe_components(
              id, name,
              ingredients:recipe_component_ingredients(
                id, quantity_per_person, unit,
                ingredient:ingredients(id, name)
              )
            )
          )
        `
        )
        .eq('event_id', event_id)
        .order('course_order')

      // Build MEP courses
      const courses = ((menuItems || []) as any[])
        .map((item: any) => {
          const recipe = item.recipe
          if (!recipe) return null

          const components = ((recipe.components || []) as any[]).map((component: any) => {
            const ingredients = ((component.ingredients || []) as any[]).map((rci: any) => {
              const qpp = Number(rci.quantity_per_person) || 0
              const unit = (rci.unit || 'g').toLowerCase()
              const totalQuantity = Math.round(qpp * numPersons * 100) / 100
              return {
                name: rci.ingredient?.name || 'Onbekend',
                quantity_per_person: qpp,
                total_quantity: totalQuantity,
                unit,
              }
            })
            return { component_name: component.name, ingredients }
          })

          const costPerPerson = Number(recipe.total_cost_per_serving) || 0
          return {
            course: item.course || `Gang ${item.course_order}`,
            recipe_name: recipe.name,
            cost_per_person: costPerPerson,
            components,
          }
        })
        .filter(Boolean)

      const totalFoodCostPp = courses.reduce((s: number, c: any) => s + c.cost_per_person, 0)
      const totalFoodCost = totalFoodCostPp * numPersons
      const mepUrl = `${APP_URL}/mep/${event_id}`

      // Update event status to 'generated'
      await supabase.from('events').update({ status: 'generated' }).eq('id', event_id)

      // Fire-and-forget callback to Jarvis
      fetch(JARVIS_CALLBACK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'my_ai_sous_chef',
          type: 'mep_generated',
          event_id,
          event_title: event.name,
          guest_count: numPersons,
          mep_url: mepUrl,
          food_cost_per_person: Math.round(totalFoodCostPp * 100) / 100,
          total_food_cost: Math.round(totalFoodCost * 100) / 100,
          total_courses: courses.length,
          generated_at: new Date().toISOString(),
        }),
      }).catch((err) => console.error('Jarvis callback failed:', err))

      return NextResponse.json({
        success: true,
        event: {
          id: event_id,
          name: event.name,
          event_date: event.event_date,
          num_persons: numPersons,
          status: 'generated',
        },
        courses,
        food_cost_per_person: Math.round(totalFoodCostPp * 100) / 100,
        total_food_cost: Math.round(totalFoodCost * 100) / 100,
        mep_url: mepUrl,
      })
    }

    // ── get_recipes ──────────────────────────────────────────────────────────
    if (action === 'get_recipes') {
      const { category, limit: queryLimit } = body

      let query = supabase
        .from('recipes')
        .select('id, name, total_cost_per_serving, serving_size_grams, category, prep_time_minutes')
        .order('name')

      if (category) {
        query = query.ilike('category', `%${category}%`)
      }

      const { data: recipes, error } = await query.limit(queryLimit || 50)

      if (error) {
        return NextResponse.json({ error: 'Fout bij laden recepten' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        recipes: recipes || [],
        total: recipes?.length || 0,
      })
    }

    // ── update_status ────────────────────────────────────────────────────────
    if (action === 'update_status') {
      const { mep_id, status } = body

      if (!mep_id || !status) {
        return NextResponse.json({ error: 'mep_id and status are required' }, { status: 400 })
      }

      const validStatuses = ['draft', 'confirmed', 'in_prep', 'approved', 'generated', 'completed', 'cancelled']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }

      const { error } = await supabase
        .from('events')
        .update({ status })
        .eq('id', mep_id)

      if (error) {
        return NextResponse.json({ error: 'Update mislukt: ' + error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, mep_id, status })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    console.error('Jarvis webhook error:', error)
    return NextResponse.json({ error: 'Server fout' }, { status: 500 })
  }
}
