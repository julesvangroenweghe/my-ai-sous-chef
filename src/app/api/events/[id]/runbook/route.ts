import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET: haal alle runbook items op voor een event
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: items, error } = await supabase
    .from('event_runbook_items')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order')
    .order('time_offset_minutes', { nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: items || [] })
}

// POST: maak nieuw item aan
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Haal kitchen_id op via events
  const { data: event } = await supabase
    .from('events')
    .select('kitchen_id')
    .eq('id', eventId)
    .single()

  if (!event) return NextResponse.json({ error: 'Event niet gevonden' }, { status: 404 })

  const { data, error } = await supabase
    .from('event_runbook_items')
    .insert({
      event_id: eventId,
      kitchen_id: event.kitchen_id,
      title: body.title,
      description: body.description || null,
      assigned_to: body.assigned_to || null,
      category: body.category || 'prep',
      time_offset_minutes: body.time_offset_minutes ?? null,
      absolute_time: body.absolute_time || null,
      sort_order: body.sort_order ?? 0,
      is_done: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH: update item
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { item_id, ...updates } = body

  if (!item_id) return NextResponse.json({ error: 'item_id vereist' }, { status: 400 })

  const allowedFields = ['title', 'description', 'assigned_to', 'is_done', 'absolute_time', 'time_offset_minutes', 'category', 'sort_order']
  const filtered: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in updates) filtered[key] = updates[key]
  }
  filtered.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('event_runbook_items')
    .update(filtered)
    .eq('id', item_id)
    .eq('event_id', eventId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE: verwijder item via ?item_id=uuid
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('item_id')
  if (!itemId) return NextResponse.json({ error: 'item_id vereist' }, { status: 400 })

  const { error } = await supabase
    .from('event_runbook_items')
    .delete()
    .eq('id', itemId)
    .eq('event_id', eventId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
