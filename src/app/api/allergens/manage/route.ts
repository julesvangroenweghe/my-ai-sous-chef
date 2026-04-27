import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: chef } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!chef) return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 })

  const { data: membership } = await supabase
    .from('kitchen_members')
    .select('kitchen_id')
    .eq('chef_id', chef.id)
    .limit(1)
    .single()

  if (!membership) return NextResponse.json({ error: 'No kitchen found' }, { status: 404 })

  const body = await request.json()
  const { ingredient_id, allergen_id, severity = 'contains' } = body

  if (!ingredient_id || !allergen_id) {
    return NextResponse.json({ error: 'ingredient_id and allergen_id required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('ingredient_allergens')
    .upsert({
      ingredient_id,
      allergen_id,
      severity,
      kitchen_id: membership.kitchen_id,
      is_global: false,
    }, {
      onConflict: 'ingredient_id,allergen_id,kitchen_id',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: chef } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!chef) return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 })

  const { data: membership } = await supabase
    .from('kitchen_members')
    .select('kitchen_id')
    .eq('chef_id', chef.id)
    .limit(1)
    .single()

  if (!membership) return NextResponse.json({ error: 'No kitchen found' }, { status: 404 })

  const body = await request.json()
  const { ingredient_id, allergen_id } = body

  if (!ingredient_id || !allergen_id) {
    return NextResponse.json({ error: 'ingredient_id and allergen_id required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('ingredient_allergens')
    .delete()
    .eq('ingredient_id', ingredient_id)
    .eq('allergen_id', allergen_id)
    .eq('kitchen_id', membership.kitchen_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
