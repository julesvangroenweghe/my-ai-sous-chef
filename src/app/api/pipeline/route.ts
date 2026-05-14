import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: member } = await supabase
    .from('kitchen_members').select('kitchen_id').eq('chef_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'Geen keuken' }, { status: 403 })

  const { data: deals, error } = await supabase
    .from('pipeline_deals')
    .select(`*, client:clients(name, company)`)
    .eq('kitchen_id', member.kitchen_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deals: deals || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: member } = await supabase
    .from('kitchen_members').select('kitchen_id').eq('chef_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'Geen keuken' }, { status: 403 })

  const body = await req.json()
  const { data: deal, error } = await supabase
    .from('pipeline_deals')
    .insert({ ...body, kitchen_id: member.kitchen_id })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deal })
}
