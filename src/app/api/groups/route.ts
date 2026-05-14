import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Haal alle groepen op waar user lid van is
  const { data: memberships, error } = await supabase
    .from('group_members')
    .select(`
      role,
      groups (
        id, name, logo_url, shared_kitchen, created_at
      )
    `)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ groups: memberships })
}

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, shared_kitchen = true } = body

  if (!name) return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 })

  // Maak groep aan
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({ name, shared_kitchen, owner_user_id: user.id })
    .select()
    .single()

  if (groupError) return NextResponse.json({ error: groupError.message }, { status: 500 })

  // Voeg maker toe als owner
  await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    role: 'owner',
  })

  return NextResponse.json({ group })
}
