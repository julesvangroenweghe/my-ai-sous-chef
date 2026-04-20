import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 const { id } = await params
 const supabase = await createClient()

 const { data, error } = await supabase
   .from('recipes')
   .select(`
     *,
     category:recipe_categories(id, name),
     subcategory:recipe_subcategories(id, name),
     components:recipe_components(
       *,
       ingredients:recipe_component_ingredients(
         *,
         ingredient:ingredients(*)
       )
     )
   `)
   .eq('id', id)
   .single()

 if (error) return NextResponse.json({ error: error.message }, { status: 404 })
 return NextResponse.json(data)
}

export async function PUT(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 const { id } = await params
 const supabase = await createClient()
 const body = await request.json()

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

 const { error: updateError } = await supabase
   .from('recipes')
   .update({
     name: body.name,
     description: body.description || null,
     category_id: body.category_id || null,
     subcategory_id: body.subcategory_id || null,
     number_of_servings: body.servings || null,
     prep_time_minutes: body.prep_time_minutes || null,
     selling_price: body.selling_price || null,
     notes: body.notes || null,
     total_cost_per_serving: Number(costPerServing.toFixed(4)),
     food_cost_percentage: Number(foodCostPct.toFixed(2)),
     updated_at: new Date().toISOString(),
   })
   .eq('id', id)

 if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

 // Delete old components (cascade)
 await supabase.from('recipe_components').delete().eq('recipe_id', id)

 // Re-insert
 for (let i = 0; i < (body.components || []).length; i++) {
   const comp = body.components[i]
   if (!comp.name) continue

   const { data: component } = await supabase
     .from('recipe_components')
     .insert({ recipe_id: id, name: comp.name, sort_order: i, notes: comp.notes || null })
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

 return NextResponse.json({ success: true })
}

export async function DELETE(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 const { id } = await params
 const supabase = await createClient()

 const { error } = await supabase
   .from('recipes')
   .update({ status: 'archived', updated_at: new Date().toISOString() })
   .eq('id', id)

 if (error) return NextResponse.json({ error: error.message }, { status: 500 })
 return NextResponse.json({ success: true })
}
