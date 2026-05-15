import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()

  const body = await req.json()
  const { component_name, allergens, kitchen_id } = body

  if (!component_name || !kitchen_id) {
    return NextResponse.json(
      { error: 'component_name and kitchen_id zijn vereist' },
      { status: 400 }
    )
  }

  // 1. Find or create ingredient op naam (case-insensitive)
  const { data: existingIngredient } = await supabase
    .from('ingredients')
    .select('id')
    .or(`kitchen_id.eq.${kitchen_id},is_global.eq.true`)
    .ilike('name', component_name)
    .limit(1)
    .maybeSingle()

  let ingredientId: string

  if (existingIngredient) {
    ingredientId = existingIngredient.id
  } else {
    const { data: newIngredient, error: insertError } = await supabase
      .from('ingredients')
      .insert({ name: component_name, kitchen_id, is_global: false })
      .select('id')
      .single()

    if (insertError || !newIngredient) {
      return NextResponse.json(
        { error: 'Ingredient aanmaken mislukt: ' + insertError?.message },
        { status: 500 }
      )
    }
    ingredientId = newIngredient.id
  }

  // 2. Ingredient_allergens bijwerken
  // Verwijder bestaande
  await supabase
    .from('ingredient_allergens')
    .delete()
    .eq('ingredient_id', ingredientId)
    .eq('kitchen_id', kitchen_id)

  // Voeg nieuwe toe als allergens opgegeven
  if (allergens && allergens.trim()) {
    const allergenNames = allergens
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)

    if (allergenNames.length > 0) {
      // Zoek allergen IDs op basis van name_nl of code
      const { data: allergenRows } = await supabase
        .from('allergens')
        .select('id, name_nl, code')
        .in('name_nl', allergenNames)

      // Probeer ook via code voor niet-gevonden namen
      const foundNames = new Set((allergenRows || []).map((r: any) => r.name_nl))
      const notFoundNames = allergenNames.filter((n: string) => !foundNames.has(n))

      let extraRows: any[] = []
      if (notFoundNames.length > 0) {
        const { data: byCode } = await supabase
          .from('allergens')
          .select('id, name_nl, code')
          .in('code', notFoundNames.map((n: string) => n.toUpperCase()))
        extraRows = byCode || []
      }

      const allAllergenRows = [...(allergenRows || []), ...extraRows]

      if (allAllergenRows.length > 0) {
        await supabase.from('ingredient_allergens').insert(
          allAllergenRows.map((a: any) => ({
            ingredient_id: ingredientId,
            allergen_id: a.id,
            kitchen_id,
            is_global: false,
            severity: 'high',
          }))
        )
      }
    }
  }

  // 3. ingredient_id bijwerken op alle matching components
  await supabase
    .from('mep_components')
    .update({ ingredient_id: ingredientId })
    .ilike('component_name', component_name)
    .eq('kitchen_id', kitchen_id)

  // 4. Propageer allergens naar ALLE mep_components met zelfde naam (over alle events)
  const { data: updatedComponents } = await supabase
    .from('mep_components')
    .update({ allergens: allergens && allergens.trim() ? allergens : null })
    .ilike('component_name', component_name)
    .eq('kitchen_id', kitchen_id)
    .select('id')

  return NextResponse.json({
    updated_count: updatedComponents?.length ?? 0,
    ingredient_id: ingredientId,
  })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const component_name = searchParams.get('component_name')
  const kitchen_id = searchParams.get('kitchen_id')

  if (!component_name || !kitchen_id) {
    return NextResponse.json(
      { error: 'component_name en kitchen_id zijn vereist' },
      { status: 400 }
    )
  }

  const { data: ingredient } = await supabase
    .from('ingredients')
    .select('id, name')
    .or(`kitchen_id.eq.${kitchen_id},is_global.eq.true`)
    .ilike('name', component_name)
    .limit(1)
    .maybeSingle()

  if (!ingredient) {
    return NextResponse.json({ allergens: null })
  }

  const { data: allergenRows } = await supabase
    .from('ingredient_allergens')
    .select('allergen_id, allergens(name_nl)')
    .eq('ingredient_id', ingredient.id)

  const allergenNames =
    allergenRows
      ?.map((r: any) => r.allergens?.name_nl)
      .filter(Boolean)
      .join(', ') || null

  return NextResponse.json({
    allergens: allergenNames,
    ingredient_id: ingredient.id,
  })
}
