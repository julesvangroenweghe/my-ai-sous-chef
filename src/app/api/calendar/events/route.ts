import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  
  // Get user's kitchen
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  
  const { data: kitchenIds } = await supabase.rpc('get_my_kitchen_ids')
  if (!kitchenIds?.length) return NextResponse.json({ error: 'Geen keuken gevonden' }, { status: 400 })
  
  // Get Google token
  const { data: integration } = await supabase
    .from('kitchen_integrations')
    .select('access_token, refresh_token, token_expires_at')
    .eq('kitchen_id', kitchenIds[0])
    .eq('provider', 'google')
    .eq('status', 'active')
    .single()
  
  if (!integration?.access_token) {
    return NextResponse.json({ error: 'Geen Google koppeling', needsAuth: true }, { status: 401 })
  }
  
  // Check if token expired, refresh if needed
  let accessToken = integration.access_token
  const expiresAt = new Date(integration.token_expires_at)
  
  if (expiresAt < new Date()) {
    // Refresh token
    try {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: integration.refresh_token,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        })
      })
      const refreshData = await refreshRes.json()
      if (refreshData.access_token) {
        accessToken = refreshData.access_token
        await supabase
          .from('kitchen_integrations')
          .update({
            access_token: refreshData.access_token,
            token_expires_at: new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('kitchen_id', kitchenIds[0])
          .eq('provider', 'google')
      }
    } catch (e) {
      return NextResponse.json({ error: 'Token vernieuwing mislukt', needsAuth: true }, { status: 401 })
    }
  }
  
  // Fetch upcoming calendar events (next 6 months)
  const now = new Date().toISOString()
  const sixMonths = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
  
  const calRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
    `timeMin=${encodeURIComponent(now)}&timeMax=${encodeURIComponent(sixMonths)}` +
    `&singleEvents=true&orderBy=startTime&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  
  const calData = await calRes.json()
  
  if (!calRes.ok) {
    return NextResponse.json({ error: 'Agenda ophalen mislukt', needsAuth: calRes.status === 401 }, { status: calRes.status })
  }
  
  const events = (calData.items || []).map((item: any) => ({
    id: item.id,
    summary: item.summary || '(Geen titel)',
    start: item.start?.dateTime || item.start?.date,
    end: item.end?.dateTime || item.end?.date,
    location: item.location || null,
    description: item.description || null,
    htmlLink: item.htmlLink,
    isAllDay: !!item.start?.date && !item.start?.dateTime,
  }))
  
  return NextResponse.json({ events })
}
