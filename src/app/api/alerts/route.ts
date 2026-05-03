import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: kitchenIds } = await supabase.rpc('get_my_kitchen_ids')
  if (!kitchenIds?.length) return NextResponse.json({ alerts: [] })

  const url = new URL(req.url)
  const unreadOnly = url.searchParams.get('unread') === 'true'

  let query = supabase
    .from('kitchen_alerts')
    .select('*, suppliers(name)')
    .in('kitchen_id', kitchenIds)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (unreadOnly) {
    query = query.is('read_at', null)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ alerts: data || [] })
}

export async function PATCH(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, action } = await req.json()

  const updates: Record<string, string> = {}
  if (action === 'read') updates.read_at = new Date().toISOString()
  if (action === 'dismiss') updates.dismissed_at = new Date().toISOString()

  const { error } = await supabase
    .from('kitchen_alerts')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
