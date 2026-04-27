import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profiel niet gevonden' }, { status: 404 })

  const { data: member } = await supabase
    .from('kitchen_members')
    .select('kitchen_id')
    .eq('chef_id', profile.id)
    .single()

  if (!member) return NextResponse.json({ error: 'Geen keuken gevonden' }, { status: 404 })

  const { data: config } = await supabase
    .from('kitchen_pricing_config')
    .select('*')
    .eq('kitchen_id', member.kitchen_id)
    .maybeSingle()

  return NextResponse.json({ config: config ?? null, kitchen_id: member.kitchen_id })
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profiel niet gevonden' }, { status: 404 })

  const { data: member } = await supabase
    .from('kitchen_members')
    .select('kitchen_id, role')
    .eq('chef_id', profile.id)
    .single()

  if (!member) return NextResponse.json({ error: 'Geen keuken' }, { status: 404 })

  const body = await req.json()

  // Remove system fields
  delete body.id
  delete body.kitchen_id
  delete body.created_at

  const upsertData = {
    ...body,
    kitchen_id: member.kitchen_id,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('kitchen_pricing_config')
    .upsert(upsertData, { onConflict: 'kitchen_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}
