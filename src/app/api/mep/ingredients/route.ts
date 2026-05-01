import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const body = await request.json()
  const { component_id, ingredient_id, ingredient_name, quantity_per_person, unit, prep_instruction } = body

  if (!component_id) return NextResponse.json({ error: 'component_id verplicht' }, { status: 400 })

  // Als ingredient_name gegeven maar geen ingredient_id, check of het bestaat
  let resolvedIngredientId = ingredient_id || null

  if (!resolvedIngredientId && ingredient_name) {
    const { data: existing } = await supabase
      .from('ingredients')
      .select('id')
      .ilike('name', ingredient_name)
      .limit(1)
      .maybeSingle()

    resolvedIngredientId = existing?.id || null
  }

  const { data, error } = await supabase
    .from('recipe_component_ingredients')
    .insert({
      component_id,
      ingredient_id: resolvedIngredientId,
      quantity_per_person: quantity_per_person || 0,
      unit: unit || 'gr',
      prep_instruction: prep_instruction || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
