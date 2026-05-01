import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    // 1. Auth check via supabase server client
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore cookie set errors in server components
            }
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Niet ingelogd' }, { status: 401 })
    }

    // 2. Get kitchen ID via RPC
    const { data: kitchenIds, error: kitchenError } = await supabase.rpc('get_my_kitchen_ids')
    if (kitchenError || !kitchenIds || kitchenIds.length === 0) {
      return NextResponse.json({ error: 'no_kitchen', message: 'Geen keuken gevonden' }, { status: 404 })
    }
    const kitchenId = kitchenIds[0]

    // 3. Get Google OAuth token from kitchen_integrations
    const { data: integration, error: integrationError } = await supabase
      .from('kitchen_integrations')
      .select('access_token, refresh_token, token_expires_at, status')
      .eq('kitchen_id', kitchenId)
      .eq('provider', 'google')
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'needs_reauth', message: 'Google account niet verbonden' },
        { status: 200 }
      )
    }

    // 4. Check for needs_reauth status
    if (integration.status === 'needs_reauth' || !integration.access_token) {
      return NextResponse.json(
        { error: 'needs_reauth', message: 'Google account niet verbonden' },
        { status: 200 }
      )
    }

    let accessToken = integration.access_token

    // 5. Check if token is expired and refresh if needed
    const now = new Date()
    const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at) : null
    const isExpired = expiresAt ? now >= expiresAt : false

    if (isExpired && integration.refresh_token) {
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: integration.refresh_token,
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        })

        if (!tokenRes.ok) {
          return NextResponse.json(
            { error: 'needs_reauth', message: 'Google sessie verlopen' },
            { status: 200 }
          )
        }

        const tokenData = await tokenRes.json()
        accessToken = tokenData.access_token

        // Save new token using admin/service role client
        const adminClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const newExpiresAt = new Date(now.getTime() + (tokenData.expires_in || 3600) * 1000).toISOString()
        await adminClient
          .from('kitchen_integrations')
          .update({
            access_token: accessToken,
            token_expires_at: newExpiresAt,
            updated_at: now.toISOString(),
          })
          .eq('kitchen_id', kitchenId)
          .eq('provider', 'google')
      } catch {
        return NextResponse.json(
          { error: 'needs_reauth', message: 'Token vernieuwen mislukt' },
          { status: 200 }
        )
      }
    }

    // 6. Fetch Google Calendar events
    const timeMin = now.toISOString()
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate()).toISOString()

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        new URLSearchParams({
          timeMin,
          timeMax,
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: '30',
        }),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!calRes.ok) {
      if (calRes.status === 401) {
        return NextResponse.json(
          { error: 'needs_reauth', message: 'Google toegang geweigerd' },
          { status: 200 }
        )
      }
      return NextResponse.json(
        { error: 'calendar_error', message: 'Agenda ophalen mislukt' },
        { status: 500 }
      )
    }

    const calData = await calRes.json()

    // 7. Map and return events
    const events = (calData.items || []).map((item: any) => ({
      id: item.id,
      summary: item.summary || 'Geen titel',
      start: item.start?.date || item.start?.dateTime?.split('T')[0] || '',
      end: item.end?.date || item.end?.dateTime?.split('T')[0] || '',
      location: item.location || undefined,
      description: item.description || undefined,
      htmlLink: item.htmlLink || '',
    }))

    return NextResponse.json({ events })
  } catch (err) {
    console.error('Google Calendar route error:', err)
    return NextResponse.json(
      { error: 'server_error', message: 'Interne serverfout' },
      { status: 500 }
    )
  }
}
