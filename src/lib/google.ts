import { google } from 'googleapis'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

export function getOAuth2Client() {
  // Sanitize client ID - fix common typo in env var (gooleusercontent -> googleusercontent)
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').replace('gooleusercontent', 'googleusercontent')
  
  return new google.auth.OAuth2(
    clientId,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`
  )
}

export function getAuthorizationUrl(kitchenId: string): string {
  const oauth2Client = getOAuth2Client()
  
  // Encode kitchen_id in state parameter
  const state = Buffer.from(JSON.stringify({ kitchen_id: kitchenId })).toString('base64url')
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent', // Force consent to always get refresh_token
    include_granted_scopes: true,
  })
}

export function decodeState(state: string): { kitchen_id: string } {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf-8')
    return JSON.parse(decoded)
  } catch {
    throw new Error('Invalid state parameter')
  }
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function getUserEmail(accessToken: string): Promise<string> {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })
  
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
  const { data } = await oauth2.userinfo.get()
  return data.email || ''
}

export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  
  const { credentials } = await oauth2Client.refreshAccessToken()
  return {
    access_token: credentials.access_token!,
    expiry_date: credentials.expiry_date!,
  }
}

export async function getAuthedClient(accessToken: string, refreshToken: string, expiresAt: string) {
  const oauth2Client = getOAuth2Client()
  
  const expiryDate = new Date(expiresAt).getTime()
  const isExpired = Date.now() >= expiryDate - 60000 // 1 min buffer
  
  if (isExpired && refreshToken) {
    const refreshed = await refreshAccessToken(refreshToken)
    oauth2Client.setCredentials({
      access_token: refreshed.access_token,
      refresh_token: refreshToken,
      expiry_date: refreshed.expiry_date,
    })
    return { oauth2Client, newAccessToken: refreshed.access_token, newExpiryDate: new Date(refreshed.expiry_date).toISOString() }
  }
  
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: expiryDate,
  })
  return { oauth2Client, newAccessToken: null, newExpiryDate: null }
}

export interface CalendarEvent {
  id: string
  calendarId: string
  calendarName: string
  title: string
  description: string | null
  location: string | null
  startTime: string | null
  endTime: string | null
  isAllDay: boolean
  status: string
  guestCount: number | null
  eventType: string | null
  htmlLink: string | null
  meetLink: string | null
  attendees: Array<{ email: string; displayName?: string; responseStatus?: string }>
  rawData: Record<string, unknown>
}

/**
 * Parse catering-specific info from event title
 * Patterns: "700p", "115p" → guest count
 * "B:" prefix → confirmed booking
 * "O:" prefix → option (tentative)
 */
export function parseCateringInfo(title: string): { guestCount: number | null; eventType: string | null } {
  let guestCount: number | null = null
  let eventType: string | null = null
  
  // Guest count: look for patterns like "700p", "115p", "50 p"
  const guestMatch = title.match(/(\d+)\s*p\b/i)
  if (guestMatch) {
    guestCount = parseInt(guestMatch[1], 10)
  }
  
  // Event type from prefix
  const trimmed = title.trim()
  if (trimmed.startsWith('B:') || trimmed.startsWith('B ')) {
    eventType = 'confirmed_booking'
  } else if (trimmed.startsWith('O:') || trimmed.startsWith('O ')) {
    eventType = 'option'
  }
  
  return { guestCount, eventType }
}

export async function fetchCalendarEvents(
  oauth2Client: ReturnType<typeof getOAuth2Client>,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  
  // Get all calendars
  const calendarList = await calendar.calendarList.list()
  const calendars = calendarList.data.items || []
  
  const allEvents: CalendarEvent[] = []
  
  for (const cal of calendars) {
    if (!cal.id) continue
    
    try {
      const response = await calendar.events.list({
        calendarId: cal.id,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250,
      })
      
      const events = response.data.items || []
      
      for (const event of events) {
        if (!event.id || event.status === 'cancelled') continue
        
        const isAllDay = !event.start?.dateTime
        const startTime = event.start?.dateTime || event.start?.date || null
        const endTime = event.end?.dateTime || event.end?.date || null
        const title = event.summary || '(Geen titel)'
        
        const { guestCount, eventType } = parseCateringInfo(title)
        
        // Check for Meet link
        const meetLink = event.conferenceData?.entryPoints?.find(
          (ep) => ep.entryPointType === 'video'
        )?.uri || null
        
        const attendees = (event.attendees || []).map((a) => ({
          email: a.email || '',
          displayName: a.displayName || undefined,
          responseStatus: a.responseStatus || undefined,
        }))
        
        allEvents.push({
          id: event.id,
          calendarId: cal.id,
          calendarName: cal.summary || cal.id,
          title,
          description: event.description || null,
          location: event.location || null,
          startTime,
          endTime,
          isAllDay,
          status: event.status || 'confirmed',
          guestCount,
          eventType,
          htmlLink: event.htmlLink || null,
          meetLink,
          attendees,
          rawData: event as unknown as Record<string, unknown>,
        })
      }
    } catch (err) {
      // Skip calendars we can't access
      console.error(`Failed to fetch events from calendar ${cal.id}:`, err)
    }
  }
  
  return allEvents
}

export async function revokeToken(token: string) {
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  } catch {
    // Revocation failure is non-critical
  }
}
