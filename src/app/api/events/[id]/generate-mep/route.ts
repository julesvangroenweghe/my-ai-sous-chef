import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { MepPlanGenerated, MepSection, MepItem, MepComponentDetail, MepIngredientDetail } from '@/types/mep'

const COURSE_ORDER: Record<string, number> = {
  'Drinks': 0,
  'Fingerfood': 1,
  'Appetizers': 2,
  'Main Course': 3,
  'Walking Dinner': 4,
  'Buffet Items': 5,
  'Dessert': 6,
  'Mignardises': 7,
  'Dips & Sauces': 8,
  'Side Dishes': 9,
}

function guessCourseCategory(recipeName: string, categoryName?: string): string {
  const name = (recipeName + ' ' + (categoryName || '')).toLowerCase()
  if (name.includes('drink') || name.includes('drank')) return 'Drinks'
  if (name.includes('finger') || name.includes('snack') || name.includes('amuse')) return 'Fingerfood'
  if (name.includes('voorgerecht') || name.includes('appetizer') || name.includes('starter')) return 'Appetizers'
  if (name.includes('hoofd') || name.includes('main')) return 'Main Course'
  if (name.includes('dessert') || name.includes('nagerecht')) return 'Dessert'
  if (name.includes('mignardise') || name.includes('petit four')) return 'Mignardises'
  if (name.includes('dip') || name.includes('sauce') || name.includes('saus')) return 'Dips & Sauces'
  if (name.includes('side') || name.includes('bijgerecht') || name.includes('garnituur')) return 'Side Dishes'
  if (name.includes('buffet')) return 'Buffet Items'
  if (name.includes('walking')) return 'Walking Dinner'
  return 'Main Course'
}

function guessTimingCategory(componentName: string): 'advance' | 'day_of' | 'on_stand' {
  const name = componentName.toLowerCase()
  if (name.includes('marinade') || name.includes('base') || name.includes('stock') || name.includes('fond')
    || name.includes('pickle') || name.includes('confit') || name.includes('cure') || name.includes('dough')
    || name.includes('deeg') || name.includes('voorbereid')) return 'advance'
  if (name.includes('finish') || name.includes('assembly') || name.includes('garnish')
    || name.includes('afwerk') || name.includes('service') || name.includes('plating')) return 'on_stand'
  return 'day_of'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Check for existing MEP plan
  const { data: mepPlan } = await supabase
    .from('mep_plans')
    .select('*')
    .eq('event_id', id)
    .eq('status', 'ready')
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()

  if (!mepPlan) {
    return NextResponse.json({ error: 'No MEP plan found. Generate one first.' }, { status: 404 })
  }

  // Re-generate from current data when fetching
  return generateMepForEvent(id, supabase)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  return generateMepForEvent(id, supabase, true)
}

async function generateMepForEvent(eventId: string, supabase: any, saveRecord = false) {
  // Fetch event with full menu data
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(`
      *,
      menu_items:event_menu_items(
        *,
        recipe:recipes(
          *,
          category:recipe_categories(id, name),
          components:recipe_components(
            *,
            ingredients:recipe_component_ingredients(
              *,
              ingredient:ingredients(*)
            )
          )
        )
      )
    `)
    .eq('id', eventId)
    .single()

  if (eventError) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  if (!event.menu_items || event.menu_items.length === 0) {
    return NextResponse.json({ error: 'No menu items. Add recipes to the event first.' }, { status: 400 })
  }

  const guestCount = event.num_persons || 1
  const sectionsMap = new Map<string, MepItem[]>()
  let grandTotalCost = 0

  for (const menuItem of event.menu_items) {
    const recipe = menuItem.recipe
    if (!recipe) continue

    const categoryName = recipe.category?.name || ''
    const courseCategory = guessCourseCategory(recipe.name, categoryName)

    const components: MepComponentDetail[] = []
    let totalGramsPerPerson = 0

    for (const comp of (recipe.components || []).sort((a: any, b: any) => a.sort_order - b.sort_order)) {
      const timing = guessTimingCategory(comp.name)
      const ingredients: MepIngredientDetail[] = []

      for (const ci of comp.ingredients || []) {
        const ingredient = ci.ingredient
        const qtyPerPerson = ci.quantity || 0
        const servings = recipe.servings || 1
        const qtyPerPersonNormalized = qtyPerPerson / servings
        const qtyTotal = qtyPerPersonNormalized * guestCount
        const costPerUnit = ci.cost_per_unit || ingredient?.current_price || 0
        const totalCost = costPerUnit * qtyTotal

        grandTotalCost += totalCost
        totalGramsPerPerson += qtyPerPersonNormalized

        ingredients.push({
          name: ingredient?.name || 'Unknown',
          quantity_per_person: Number(qtyPerPersonNormalized.toFixed(2)),
          quantity_total: Number(qtyTotal.toFixed(2)),
          unit: ci.unit || ingredient?.unit || 'g',
          cost_per_unit: Number(costPerUnit.toFixed(4)),
          total_cost: Number(totalCost.toFixed(2)),
          category: ingredient?.category || 'Other',
        })
      }

      components.push({
        component_name: comp.name,
        ingredients,
        timing,
      })
    }

    const mepItem: MepItem = {
      recipe_name: recipe.name,
      recipe_id: recipe.id,
      components,
      total_grams_per_person: Number(totalGramsPerPerson.toFixed(1)),
    }

    if (!sectionsMap.has(courseCategory)) {
      sectionsMap.set(courseCategory, [])
    }
    sectionsMap.get(courseCategory)!.push(mepItem)
  }

  // Sort sections by standard course order
  const sections: MepSection[] = Array.from(sectionsMap.entries())
    .sort(([a], [b]) => (COURSE_ORDER[a] ?? 99) - (COURSE_ORDER[b] ?? 99))
    .map(([course_category, items]) => ({
      course_category,
      items,
    }))

  const costPerPerson = guestCount > 0 ? grandTotalCost / guestCount : 0

  const mepPlan: MepPlanGenerated = {
    id: crypto.randomUUID(),
    event_id: eventId,
    generated_at: new Date().toISOString(),
    total_cost: Number(grandTotalCost.toFixed(2)),
    cost_per_person: Number(costPerPerson.toFixed(2)),
    sections,
  }

  // Save a record in mep_plans table
  if (saveRecord) {
    // Mark old plans as outdated
    await supabase
      .from('mep_plans')
      .update({ status: 'outdated' })
      .eq('event_id', eventId)
      .eq('status', 'ready')

    await supabase.from('mep_plans').insert({
      event_id: eventId,
      generated_at: mepPlan.generated_at,
      status: 'ready',
    })
  }

  return NextResponse.json(mepPlan)
}
