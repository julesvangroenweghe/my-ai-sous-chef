import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: kitchens } = await supabase
    .from('kitchen_members')
    .select('kitchen_id')
    .eq('chef_id', user.id)
    .limit(1)

  const kitchenId = kitchens?.[0]?.kitchen_id
  if (!kitchenId) return NextResponse.json({ conversations: [] })

  const { data, error } = await supabase
    .from('ai_conversations')
    .select('id, title, context, context_id, messages, updated_at')
    .eq('kitchen_id', kitchenId)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conversations: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: kitchens } = await supabase
    .from('kitchen_members')
    .select('kitchen_id')
    .eq('chef_id', user.id)
    .limit(1)

  const kitchenId = kitchens?.[0]?.kitchen_id
  if (!kitchenId) return NextResponse.json({ error: 'Geen keuken gevonden' }, { status: 400 })

  const body = await req.json()
  const { messages, title, context, context_id } = body

  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({ kitchen_id: kitchenId, messages, title, context, context_id })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
