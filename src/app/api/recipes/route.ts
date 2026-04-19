import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const category_id = searchParams.get('category_id')
  const subcategory_id = searchParams.get('subcategory_id')
  const sort = searchParams.get('sort') || 'date'
  const sort_dir = searchParams.get('sort_dir') || 'desc'

  let query = supabase
    .from('recipes')
    .select(`
      *,
      category:recipe_categories(id, name),
      subcategory:recipe_subcategories(id, name),
      components:recipe_components(
        id, name, sort_order,
        ingredients:recipe_component_ingredients(
          id, quantity, unit, cost_per_unit,
          ingredient:ingredients(id, name, unit, current_price)
        )
      )
    `)
    .eq('is_active', true)

  if (search) query = query.ilike('name', `%${search}%`)
  if (category_id) query = query.eq('category_id', category_id)
  if (subcategory_id) query = query.eq('subcategory_id', subcategory_id)

  const sortCol = sort === 'name' ? 'name' : sort === 'cost' ? 'total_cost_per_serving' : 'created_at'
  query = query.order(sortCol, { ascending: sort === 'name' ? true : sort_dir === 'asc' })

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: chef } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const { data: membership } = await supabase
    .from('kitchen_members')
    .select('kitchen_id')
    .eq('chef_id', chef?.id)
    .limit(1)
    .single()

  // Calculate costs
  let totalCost = 0
  for (const comp of body.components || []) {
    for (const ing of comp.ingredients || []) {
      totalCost += (ing.cost_per_unit || 0) * (ing.quantity || 0)
    }
  }
  const servings = body.servings || 1
  const costPerServing = totalCost / servings
  const sellingPrice = body.selling_price || 0
  const foodCostPct = sellingPrice > 0 ? (costPerServing / sellingPrice) * 100 : 0

  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      name: body.name,
      description: body.description || null,
      category_id: body.category_id || null,
      subcategory_id: body.subcategory_id || null,
      servings: body.servings || null,
      prep_time_minutes: body.prep_time_minutes || null,
      selling_price: body.selling_price || null,
      notes: body.notes || null,
      total_cost_per_serving: Number(costPerServing.toFixed(4)),
      food_cost_percentage: Number(foodCostPct.toFixed(2)),
      is_active: true,
      kitchen_id: membership?.kitchen_id,
      chef_id: chef?.id,
    })
    .select()
    .single()

  if (recipeError) return NextResponse.json({ error: recipeError.message }, { status: 500 })

  // Insert components + ingredients
  for (let i = 0; i < (body.components || []).length; i++) {
    const comp = body.components[i]
    if (!comp.name) continue

    const { data: component } = await supabase
      .from('recipe_components')
      .insert({ recipe_id: recipe.id, name: comp.name, sort_order: i, notes: comp.notes || null })
      .select()
      .single()

    if (component && comp.ingredients?.length > 0) {
      await supabase.from('recipe_component_ingredients').insert(
        comp.ingredients.map((ing: any) => ({
          component_id: component.id,
          ingredient_id: ing.ingredient_id,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes || null,
          cost_per_unit: ing.cost_per_unit || null,
        }))
      )
    }
  }

  return NextResponse.json(recipe, { status: 201 })
}
