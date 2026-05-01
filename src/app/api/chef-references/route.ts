// src/app/api/chef-references/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// GET: alle globale chefs + kitchen-specifieke koppeling
export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('id, kitchens:kitchen_members(kitchen_id)')
    .eq('auth_user_id', user.id)
    .single()

  const kitchen_id = profile?.kitchens?.[0]?.kitchen_id

  // Alle globale chef references
  const { data: references } = await supabase
    .from('chef_style_references')
    .select('*')
    .eq('is_global', true)
    .order('name')

  // Welke zijn al gekoppeld aan deze kitchen
  const { data: linked } = await supabase
    .from('kitchen_chef_references')
    .select('chef_reference_id, influence_level')
    .eq('kitchen_id', kitchen_id)

  const linkedIds = new Set(linked?.map(l => l.chef_reference_id) || [])
  const linkedMap = Object.fromEntries(linked?.map(l => [l.chef_reference_id, l.influence_level]) || [])

  const result = references?.map(ref => ({
    ...ref,
    is_linked: linkedIds.has(ref.id),
    influence_level: linkedMap[ref.id] || null
  })) || []

  return NextResponse.json({ references: result })
}

// POST: koppel chef reference aan kitchen
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { chef_reference_id, influence_level = 'inspiratie' } = await req.json()

  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('id, kitchens:kitchen_members(kitchen_id)')
    .eq('auth_user_id', user.id)
    .single()

  const kitchen_id = profile?.kitchens?.[0]?.kitchen_id

  const { error } = await supabase
    .from('kitchen_chef_references')
    .upsert({ kitchen_id, chef_reference_id, influence_level })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE: ontkoppel chef reference
export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const chef_reference_id = searchParams.get('id')

  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('id, kitchens:kitchen_members(kitchen_id)')
    .eq('auth_user_id', user.id)
    .single()

  const kitchen_id = profile?.kitchens?.[0]?.kitchen_id

  const { error } = await supabase
    .from('kitchen_chef_references')
    .delete()
    .eq('kitchen_id', kitchen_id)
    .eq('chef_reference_id', chef_reference_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
