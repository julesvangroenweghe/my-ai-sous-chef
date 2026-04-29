import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

interface GmailMessage {
  id: string
  from: string
  subject: string
  date: string
  snippet: string
  labels: string[]
}

async function getGoogleTokens(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('auth_user_id', userId)
    .single()
  if (!profile) return null

  const { data: membership } = await supabase
    .from('kitchen_members')
    .select('kitchen_id')
    .eq('chef_id', profile.id)
    .limit(1)
    .single()
  if (!membership) return null

  const { data: integration } = await supabase
    .from('kitchen_integrations')
    .select('id, access_token, refresh_token, token_expires_at, provider_email')
    .eq('kitchen_id', membership.kitchen_id)
    .eq('provider', 'google')
    .single()

  return integration
}

async function refreshAccessToken(supabase: any, integration: any): Promise<string | null> {
  if (!integration.refresh_token) return null

  const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at) : null
  const isExpired = !expiresAt || expiresAt.getTime() < Date.now() + 60000

  if (!isExpired) return integration.access_token

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

    if (!tokenRes.ok) return null

    const tokenData = await tokenRes.json()

    await supabase
      .from('kitchen_integrations')
      .update({
        access_token: tokenData.access_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id)

    return tokenData.access_token
  } catch {
    return null
  }
}

function extractHeader(headers: any[], name: string): string {
  const header = headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
  return header?.value || ''
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // 1. Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Get integration
  const integration = await getGoogleTokens(supabase, user.id)
  if (!integration || !integration.access_token) {
    return NextResponse.json({ error: 'Google account niet gekoppeld', connected: false })
  }

  // 3. Refresh token if needed
  const accessToken = await refreshAccessToken(supabase, integration)
  if (!accessToken) {
    return NextResponse.json({ error: 'Token vernieuwing mislukt', connected: false })
  }

  // 4. Fetch messages list
  try {
    const { searchParams } = new URL(request.url)
    const maxResults = searchParams.get('maxResults') || '20'
    const q = searchParams.get('q') || ''

    const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
    listUrl.searchParams.set('maxResults', maxResults)
    if (q) listUrl.searchParams.set('q', q)

    const listRes = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!listRes.ok) {
      return NextResponse.json({ error: 'Gmail ophalen mislukt', connected: true })
    }

    const listData = await listRes.json()
    const messageIds = (listData.messages || []).slice(0, 20)

    if (messageIds.length === 0) {
      return NextResponse.json({ connected: true, email: integration.provider_email, messages: [] })
    }

    // 5. Fetch message details (metadata only for speed)
    const messages: GmailMessage[] = []

    // Batch fetch — max 10 at a time to avoid rate limits
    const batches = []
    for (let i = 0; i < messageIds.length; i += 10) {
      batches.push(messageIds.slice(i, i + 10))
    }

    for (const batch of batches) {
      const details = await Promise.all(
        batch.map(async (msg: { id: string }) => {
          try {
            const detailRes = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            )
            if (!detailRes.ok) return null
            return await detailRes.json()
          } catch {
            return null
          }
        })
      )

      for (const detail of details) {
        if (!detail) continue
        const headers = detail.payload?.headers || []
        messages.push({
          id: detail.id,
          from: extractHeader(headers, 'From'),
          subject: extractHeader(headers, 'Subject'),
          date: extractHeader(headers, 'Date'),
          snippet: detail.snippet || '',
          labels: detail.labelIds || [],
        })
      }
    }

    return NextResponse.json({
      connected: true,
      email: integration.provider_email,
      messages,
    })
  } catch (err) {
    console.error('Gmail fetch error:', err)
    return NextResponse.json({ error: 'Gmail ophalen mislukt', connected: true })
  }
}
