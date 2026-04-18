import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: recipe, error: fetchError } = await supabase
    .from('recipes')
    .select(`
      *,
      components:recipe_components(
        *,
        ingredients:recipe_component_ingredients(
          *,
          ingredient:ingredients(id, current_price)
        )
      )
    `)
    .eq('id', id)
    .single()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 404 })

  let totalCost = 0
  for (const comp of (recipe as any).components || []) {
    for (const ci of comp.ingredients || []) {
      const latestPrice = ci.ingredient?.current_price || 0
      totalCost += latestPrice * ci.quantity

      await supabase
        .from('recipe_component_ingredients')
        .update({ cost_per_unit: latestPrice })
        .eq('id', ci.id)
    }
  }

  const servings = recipe.servings || 1
  const costPerServing = totalCost / servings
  const sellingPrice = recipe.selling_price || 0
  const foodCostPct = sellingPrice > 0 ? (costPerServing / sellingPrice) * 100 : 0

  await supabase
    .from('recipes')
    .update({
      total_cost_per_serving: Number(costPerServing.toFixed(4)),
      food_cost_percentage: Number(foodCostPct.toFixed(2)),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  return NextResponse.json({
    total_cost_per_serving: costPerServing,
    food_cost_percentage: foodCostPct,
  })
}
