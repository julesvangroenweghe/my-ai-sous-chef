import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const ingredientId = searchParams.get('ingredient_id')
  const recipeId = searchParams.get('recipe_id')

  // Always return all 14 allergens as reference
  const { data: allergens, error: allergenError } = await supabase
    .from('allergens')
    .select('*')
    .order('eu_number')

  if (allergenError) {
    return NextResponse.json({ error: allergenError.message }, { status: 500 })
  }

  // If ingredient_id provided, get allergens linked to that ingredient
  if (ingredientId) {
    const { data: links, error: linkError } = await supabase
      .from('ingredient_allergens')
      .select('*, allergen:allergens(*)')
      .eq('ingredient_id', ingredientId)

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 })
    }

    return NextResponse.json({ allergens, ingredient_allergens: links })
  }

  // If recipe_id provided, get all allergens for all ingredients in the recipe
  if (recipeId) {
    const { data: components, error: compError } = await supabase
      .from('recipe_component_ingredients')
      .select(`
        ingredient_id,
        component:recipe_components!inner(recipe_id)
      `)
      .eq('component.recipe_id', recipeId)

    if (compError) {
      return NextResponse.json({ error: compError.message }, { status: 500 })
    }

    const ingredientIds = [...new Set((components || []).map(c => c.ingredient_id).filter(Boolean))]

    if (ingredientIds.length === 0) {
      return NextResponse.json({ allergens, recipe_allergens: [] })
    }

    const { data: links, error: linkError } = await supabase
      .from('ingredient_allergens')
      .select('*, allergen:allergens(*), ingredient:ingredients(id, name)')
      .in('ingredient_id', ingredientIds)

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 })
    }

    return NextResponse.json({ allergens, recipe_allergens: links })
  }

  return NextResponse.json({ allergens })
}
