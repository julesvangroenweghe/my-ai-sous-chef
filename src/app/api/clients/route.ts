import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: member } = await supabase
    .from('kitchen_members').select('kitchen_id').eq('chef_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'Geen keuken' }, { status: 403 })

  const search = req.nextUrl.searchParams.get('q')
  let query = supabase
    .from('clients')
    .select('*')
    .eq('kitchen_id', member.kitchen_id)
    .order('name')

  if (search) {
    query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { data: clients, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ clients: clients || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: member } = await supabase
    .from('kitchen_members').select('kitchen_id').eq('chef_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'Geen keuken' }, { status: 403 })

  const body = await req.json()
  const { data: client, error } = await supabase
    .from('clients')
    .insert({ ...body, kitchen_id: member.kitchen_id })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ client })
}
