import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
  status: string
  htmlLink: string
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // 1. Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Get kitchen_id
  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'No profile found' }, { status: 404 })

  const { data: membership } = await supabase
    .from('kitchen_members')
    .select('kitchen_id')
    .eq('chef_id', profile.id)
    .limit(1)
    .single()
  if (!membership) return NextResponse.json({ error: 'No kitchen found' }, { status: 404 })

  // 3. Get Google tokens
  const { data: integration } = await supabase
    .from('kitchen_integrations')
    .select('id, access_token, refresh_token, token_expires_at, account_email')
    .eq('kitchen_id', membership.kitchen_id)
    .eq('provider', 'google')
    .single()

  if (!integration || !integration.access_token) {
    return NextResponse.json({ error: 'Google account niet gekoppeld', connected: false }, { status: 200 })
  }

  let accessToken = integration.access_token

  // 4. Check if token is expired, refresh if needed
  const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at) : null
  const isExpired = !expiresAt || expiresAt.getTime() < Date.now() + 60000 // 1 min buffer

  if (isExpired && integration.refresh_token) {
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: integration.refresh_token,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
        }),
      })

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json()
        accessToken = tokenData.access_token

        // Update tokens in database
        await supabase
          .from('kitchen_integrations')
          .update({
            access_token: tokenData.access_token,
            token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', integration.id)
      } else {
        return NextResponse.json({ error: 'Token vernieuwing mislukt', connected: false }, { status: 200 })
      }
    } catch {
      return NextResponse.json({ error: 'Token vernieuwing mislukt', connected: false }, { status: 200 })
    }
  }

  // 5. Fetch events from Google Calendar
  try {
    const { searchParams } = new URL(request.url)
    const timeMin = searchParams.get('timeMin') || new Date().toISOString()
    const timeMax = searchParams.get('timeMax') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const maxResults = searchParams.get('maxResults') || '20'

    const calendarUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
    calendarUrl.searchParams.set('timeMin', timeMin)
    calendarUrl.searchParams.set('timeMax', timeMax)
    calendarUrl.searchParams.set('maxResults', maxResults)
    calendarUrl.searchParams.set('singleEvents', 'true')
    calendarUrl.searchParams.set('orderBy', 'startTime')

    const calRes = await fetch(calendarUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!calRes.ok) {
      const errBody = await calRes.text()
      console.error('Google Calendar API error:', errBody)
      return NextResponse.json({ error: 'Agenda ophalen mislukt', connected: true }, { status: 200 })
    }

    const calData = await calRes.json()
    const events = (calData.items || []).map((event: GoogleCalendarEvent) => ({
      id: event.id,
      title: event.summary || '(Geen titel)',
      description: event.description || null,
      location: event.location || null,
      start: event.start?.dateTime || event.start?.date || null,
      end: event.end?.dateTime || event.end?.date || null,
      isAllDay: !event.start?.dateTime,
      status: event.status,
      link: event.htmlLink,
    }))

    return NextResponse.json({
      connected: true,
      email: integration.account_email,
      events,
    })
  } catch (err) {
    console.error('Calendar fetch error:', err)
    return NextResponse.json({ error: 'Agenda ophalen mislukt', connected: true }, { status: 200 })
  }
}
