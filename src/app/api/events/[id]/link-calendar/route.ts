import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  
  const body = await req.json()
  const { calendarEventId, summary, htmlLink } = body
  
  const { error } = await supabase
    .from('events')
    .update({
      google_calendar_event_id: calendarEventId,
      google_calendar_summary: summary,
      google_calendar_html_link: htmlLink,
    })
    .eq('id', params.id)
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  
  const { error } = await supabase
    .from('events')
    .update({
      google_calendar_event_id: null,
      google_calendar_summary: null,
      google_calendar_html_link: null,
    })
    .eq('id', params.id)
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
