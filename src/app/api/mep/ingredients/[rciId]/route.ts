import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { rciId: string } }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const body = await request.json()
  const {
    quantity_per_person,
    unit,
    prep_instruction,
    ingredient_id,
    supplier_product_id,
    notes,
    component_id,
    cost_per_unit,
  } = body

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (quantity_per_person !== undefined) updateData.quantity_per_person = quantity_per_person
  if (unit !== undefined) updateData.unit = unit
  if (prep_instruction !== undefined) updateData.prep_instruction = prep_instruction
  if (ingredient_id !== undefined) updateData.ingredient_id = ingredient_id
  if (supplier_product_id !== undefined) updateData.supplier_product_id = supplier_product_id
  if (notes !== undefined) updateData.notes = notes
  if (component_id !== undefined) updateData.component_id = component_id
  if (cost_per_unit !== undefined) updateData.cost_per_unit = cost_per_unit

  const { data, error } = await supabase
    .from('recipe_component_ingredients')
    .update(updateData)
    .eq('id', params.rciId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { rciId: string } }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { error } = await supabase
    .from('recipe_component_ingredients')
    .delete()
    .eq('id', params.rciId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
