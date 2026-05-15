// /api/calendar/bulk-sync/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

const EVENTS_SIR_CALENDAR_ID =
  'c_9dacbed2ecc859ce2f8bbcfccac4341a4838c524f4f4f28491af3d4e44f4b83c@group.calendar.google.com'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — haal events op uit Google Calendar + vergelijk met app
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kitchenId = searchParams.get('kitchen_id')
  if (!kitchenId) return NextResponse.json({ error: 'kitchen_id vereist' }, { status: 400 })

  // Haal OAuth token op
  const { data: integration } = await supabase
    .from('kitchen_integrations')
    .select('access_token, refresh_token, token_expires_at')
    .eq('kitchen_id', kitchenId)
    .eq('provider', 'google_calendar')
    .single()

  if (!integration?.access_token) {
    return NextResponse.json({ error: 'Google Calendar niet gekoppeld' }, { status: 401 })
  }

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
  })

  const calendar = google.calendar({ version: 'v3', auth })

  // Komende 90 dagen ophalen
  const timeMin = new Date().toISOString()
  const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

  let calendarEvents: any[] = []
  try {
    const res = await calendar.events.list({
      calendarId: EVENTS_SIR_CALENDAR_ID,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    })
    calendarEvents = res.data.items || []
  } catch (err: any) {
    return NextResponse.json({ error: `Google Calendar fout: ${err.message}` }, { status: 500 })
  }

  // Welke google_calendar_event_id's bestaan al in de app?
  const gcalIds = calendarEvents.map((e) => e.id).filter(Boolean)
  const { data: existingEvents } = await supabase
    .from('events')
    .select('google_calendar_event_id, id, name')
    .eq('kitchen_id', kitchenId)
    .in('google_calendar_event_id', gcalIds)

  const existingIds = new Set((existingEvents || []).map((e) => e.google_calendar_event_id))

  // Formatteer voor de UI
  const formatted = calendarEvents.map((ev) => {
    const start = ev.start?.date || ev.start?.dateTime
    const end = ev.end?.date || ev.end?.dateTime

    // Parse num_persons uit naam (patroon: "B: 250p" of "35p")
    const personsMatch = ev.summary?.match(/(\d+)\s*p\b/i)
    const numPersons = personsMatch ? parseInt(personsMatch[1]) : null

    return {
      google_event_id: ev.id,
      summary: ev.summary || 'Naamloos event',
      start,
      end,
      location: ev.location || null,
      description: ev.description || null,
      num_persons: numPersons,
      already_imported: existingIds.has(ev.id),
    }
  })

  return NextResponse.json({ events: formatted })
}

// POST — importeer geselecteerde events naar de app
export async function POST(req: NextRequest) {
  const { kitchen_id, event_ids, google_events } = await req.json()

  if (!kitchen_id || !event_ids?.length || !google_events?.length) {
    return NextResponse.json({ error: 'Ongeldige payload' }, { status: 400 })
  }

  const toImport = google_events.filter((e: any) => event_ids.includes(e.google_event_id))

  const inserts = toImport.map((ev: any) => {
    const dateStr = ev.start?.split('T')[0] || ev.start

    // Parse num_persons uit naam
    const personsMatch = ev.summary?.match(/(\d+)\s*p\b/i)
    const numPersons = personsMatch ? parseInt(personsMatch[1]) : null

    // Bepaal event type op basis van naam
    let eventType = 'receptie'
    const name = ev.summary?.toLowerCase() || ''
    if (name.includes('tasting')) eventType = 'tasting'
    else if (name.includes('bbq')) eventType = 'bbq'
    else if (name.includes('walking') || name.includes('walking dinner')) eventType = 'walking_dinner'
    else if (name.includes('buffet') || name.includes('lentefeest') || name.includes('tuinfeest')) eventType = 'buffet'
    else if (name.includes('cocktail') || name.includes('dînatoire') || name.includes('dinatoire')) eventType = 'cocktail_dinatoire'

    return {
      kitchen_id,
      name: ev.summary,
      event_date: dateStr,
      event_type: eventType,
      location: ev.location || null,
      notes: ev.description || null,
      status: 'option',
      num_persons: numPersons,
      google_calendar_event_id: ev.google_event_id,
    }
  })

  const { data, error } = await supabase
    .from('events')
    .insert(inserts)
    .select('id, name, event_date')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ imported: data?.length || 0, events: data })
}
