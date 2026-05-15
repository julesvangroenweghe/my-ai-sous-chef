// src/app/api/events/[id]/tasting-links/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: haal alle events gelinkt aan deze tasting
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data, error } = await supabase
    .from('events')
    .select('id, name, event_date, num_persons, status, tasting_attended, event_type, location')
    .eq('tasting_event_id', id)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ links: data || [] })
}

// POST: koppel een toekomstig event aan deze tasting
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { future_event_id } = await req.json()
  if (!future_event_id) return NextResponse.json({ error: 'future_event_id vereist' }, { status: 400 })

  // Prevent linking event to itself
  if (future_event_id === id) return NextResponse.json({ error: 'Kan event niet aan zichzelf koppelen' }, { status: 400 })

  const { error } = await supabase
    .from('events')
    .update({ tasting_event_id: id })
    .eq('id', future_event_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// PATCH: aanwezigheid togglen
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params // tasting event id (not used directly)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { event_id, attended } = await req.json()
  if (!event_id) return NextResponse.json({ error: 'event_id vereist' }, { status: 400 })

  const { error } = await supabase
    .from('events')
    .update({ tasting_attended: attended })
    .eq('id', event_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE: ontkoppelen van tasting
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { event_id } = await req.json()
  if (!event_id) return NextResponse.json({ error: 'event_id vereist' }, { status: 400 })

  const { error } = await supabase
    .from('events')
    .update({ tasting_event_id: null, tasting_attended: false })
    .eq('id', event_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
