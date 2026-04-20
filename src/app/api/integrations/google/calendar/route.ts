import { createClient } from '@/lib/supabase/server'
import { getAuthedClient, fetchCalendarEvents } from '@/lib/google'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const kitchenId = searchParams.get('kitchen_id')
  const timeMin = searchParams.get('time_min')
  const timeMax = searchParams.get('time_max')

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!kitchenId) {
    return NextResponse.json({ error: 'kitchen_id is required' }, { status: 400 })
  }

  // Get integration
  const { data: integration, error: intError } = await supabase
    .from('kitchen_integrations')
    .select('*')
    .eq('kitchen_id', kitchenId)
    .eq('provider', 'google')
    .eq('status', 'active')
    .single()

  if (intError || !integration) {
    return NextResponse.json({ error: 'Google not connected', connected: false }, { status: 404 })
  }

  try {
    // Get authed client (auto-refreshes if needed)
    const { oauth2Client, newAccessToken, newExpiryDate } = await getAuthedClient(
      integration.access_token,
      integration.refresh_token,
      integration.token_expires_at
    )

    // Update tokens if refreshed
    if (newAccessToken) {
      await supabase
        .from('kitchen_integrations')
        .update({
          access_token: newAccessToken,
          token_expires_at: newExpiryDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', integration.id)
    }

    // Default time range: current month ± 1 month
    const now = new Date()
    const defaultMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const defaultMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString()

    const events = await fetchCalendarEvents(
      oauth2Client,
      timeMin || defaultMin,
      timeMax || defaultMax
    )

    // Sync to calendar_events table
    for (const event of events) {
      const { data: existing } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('kitchen_id', kitchenId)
        .eq('google_event_id', event.id)
        .eq('google_calendar_id', event.calendarId)
        .single()

      const eventData = {
        kitchen_id: kitchenId,
        google_event_id: event.id,
        google_calendar_id: event.calendarId,
        calendar_name: event.calendarName,
        title: event.title,
        description: event.description,
        location: event.location,
        start_time: event.startTime,
        end_time: event.endTime,
        is_all_day: event.isAllDay,
        event_status: event.status,
        guest_count: event.guestCount,
        event_type: event.eventType,
        html_link: event.htmlLink,
        meet_link: event.meetLink,
        attendees: event.attendees,
        raw_data: event.rawData,
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (existing) {
        await supabase
          .from('calendar_events')
          .update(eventData)
          .eq('id', existing.id)
      } else {
        await supabase
          .from('calendar_events')
          .insert(eventData)
      }
    }

    return NextResponse.json({
      success: true,
      events_synced: events.length,
      events,
    })
  } catch (err) {
    console.error('Calendar sync error:', err)
    
    // Check if token is invalid
    const isAuthError = err instanceof Error && 
      (err.message.includes('invalid_grant') || err.message.includes('Token has been expired'))
    
    if (isAuthError) {
      await supabase
        .from('kitchen_integrations')
        .update({ status: 'needs_reauth', updated_at: new Date().toISOString() })
        .eq('id', integration.id)
      
      return NextResponse.json({ error: 'Token expired, please reconnect Google', needs_reauth: true }, { status: 401 })
    }
    
    return NextResponse.json({ error: 'Failed to sync calendar' }, { status: 500 })
  }
}
