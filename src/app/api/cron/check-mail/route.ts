// src/app/api/cron/check-mail/route.ts
// Vercel Cron Job: elke 10 min Gmail polling voor alle actieve kitchens
// Gebruikt SECURITY DEFINER RPC functies — geen service role key nodig

import { createClient as createAnonClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Anon client — RPC functies zijn SECURITY DEFINER dus bypassen RLS
function getCronClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET(req: NextRequest) {
  // Beveilig cron endpoint — Vercel stuurt Authorization: Bearer {CRON_SECRET}
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getCronClient()

  // Alle actieve Gmail integraties via SECURITY DEFINER RPC
  const { data: integrations, error } = await supabase.rpc('get_all_active_gmail_integrations')

  if (error) {
    console.error('Gmail integrations fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ processed: 0, message: 'Geen actieve Gmail integraties' })
  }

  let processed = 0
  const results = []

  for (const integration of integrations) {
    try {
      const result = await pollGmailForKitchen(supabase, integration)
      processed++
      results.push({ kitchen_id: integration.kitchen_id, ...result })
    } catch (err) {
      console.error(`Gmail poll fout voor kitchen ${integration.kitchen_id}:`, err)
    }
  }

  return NextResponse.json({ processed, results })
}

async function pollGmailForKitchen(
  supabase: ReturnType<typeof getCronClient>,
  integration: {
    kitchen_id: string
    access_token: string
    refresh_token: string
    token_expires_at: string
    provider_email: string
  }
) {
  // Check/refresh token als verlopen
  let accessToken = integration.access_token
  const expiresAt = new Date(integration.token_expires_at)

  if (expiresAt < new Date(Date.now() + 5 * 60 * 1000)) { // 5 min buffer
    accessToken = await refreshGoogleToken(supabase, integration) || accessToken
    if (!accessToken) return { skipped: true, reason: 'token_refresh_failed' }
  }

  // Haal poll state op
  const { data: pollStateRows } = await supabase
    .rpc('get_upcoming_events_for_kitchen', { p_kitchen_id: integration.kitchen_id, p_days: 1 })
    .limit(0) // just testing RPC connectivity, poll state from separate query

  // Poll state uit gmail_poll_state tabel
  const { data: pollState } = await supabase
    .from('gmail_poll_state')
    .select('last_polled_at')
    .eq('kitchen_id', integration.kitchen_id)
    .maybeSingle()

  const since = pollState?.last_polled_at
    ? new Date(pollState.last_polled_at).getTime() / 1000
    : (Date.now() / 1000) - 600

  const messagesRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=after:${Math.floor(since)}&maxResults=10`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!messagesRes.ok) return { skipped: true, reason: 'gmail_api_error' }

  const messagesData = await messagesRes.json()
  const messages = messagesData.messages || []
  let alertsCreated = 0

  for (const msg of messages) {
    const detailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!detailRes.ok) continue

    const detail = await detailRes.json()
    const headers = detail.payload?.headers || []
    const subject = headers.find((h: { name: string }) => h.name === 'Subject')?.value || ''
    const from = headers.find((h: { name: string }) => h.name === 'From')?.value || ''
    const body = extractEmailBody(detail.payload)

    if (from.includes(integration.provider_email)) continue

    const alert = await parseMailWithAI(integration.kitchen_id, subject, from, body, supabase)
    if (alert) {
      await supabase.rpc('insert_kitchen_alert_v2', {
        p_kitchen_id: alert.kitchen_id,
        p_type: alert.type,
        p_title: alert.title,
        p_body: alert.body,
        p_ingredient_name: alert.ingredient_name,
        p_metadata: alert.metadata,
      })
      alertsCreated++
    }
  }

  // Update poll state via RPC
  await supabase.rpc('upsert_gmail_poll_state', {
    p_kitchen_id: integration.kitchen_id,
    p_last_polled_at: new Date().toISOString(),
  })

  return { alerts_created: alertsCreated, messages_checked: messages.length }
}

async function parseMailWithAI(
  kitchenId: string,
  subject: string,
  from: string,
  body: string,
  supabase: ReturnType<typeof getCronClient>
) {
  const relevantKeywords = /prijs|price|tarbot|zalm|vlees|groente|vis|voorraad|stock|aanbieding|korting|discount|niet beschikbaar|uitverkocht|leveranc|factuur|invoice|seizoen/i
  if (!relevantKeywords.test(subject + body)) return null

  const { data: events } = await supabase.rpc('get_upcoming_events_for_kitchen', {
    p_kitchen_id: kitchenId,
    p_days: 60
  })

  const eventsContext = Array.isArray(events) ? events.map((e: { name: string; event_date: string; num_persons: number }) =>
    `- ${e.name} (${new Date(e.event_date).toLocaleDateString('nl-BE')}, ${e.num_persons} personen)`
  ).join('\n') : 'Geen aankomende events'

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: 'Je bent een keuken-intelligentie assistent. Analyseer leveranciersmails en retourneer ALLEEN valid JSON.',
    messages: [{
      role: 'user',
      content: `Analyseer deze mail voor een professionele chef-kok.

Van: ${from}
Onderwerp: ${subject}
Inhoud: ${body.slice(0, 1000)}

Aankomende events:
${eventsContext}

Retourneer JSON:
{
  "is_relevant": true/false,
  "type": "price_change" | "out_of_stock" | "deal" | "delivery" | "other",
  "title": "Korte titel (max 60 tekens)",
  "body": "Duidelijke samenvatting voor de chef (max 200 tekens)",
  "ingredient_name": "naam ingrediënt of null",
  "event_relevance": "Hoe relevant voor aankomende events, of null",
  "priority": "high" | "medium" | "low"
}`
    }]
  })

  try {
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.is_relevant) return null

    return {
      kitchen_id: kitchenId,
      type: parsed.type || 'other',
      title: parsed.title || subject.slice(0, 60),
      body: parsed.body || '',
      ingredient_name: parsed.ingredient_name || null,
      metadata: {
        from,
        subject,
        event_relevance: parsed.event_relevance,
        priority: parsed.priority || 'medium',
      }
    }
  } catch {
    return null
  }
}

function extractEmailBody(payload: {
  mimeType?: string
  body?: { data?: string }
  parts?: Array<{ mimeType?: string; body?: { data?: string } }>
}): string {
  if (!payload) return ''
  if (payload.body?.data) return Buffer.from(payload.body.data, 'base64').toString('utf-8')
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8')
      }
    }
    if (payload.parts[0]?.body?.data) {
      return Buffer.from(payload.parts[0].body.data, 'base64').toString('utf-8')
    }
  }
  return ''
}

async function refreshGoogleToken(
  supabase: ReturnType<typeof getCronClient>,
  integration: { kitchen_id: string; refresh_token: string }
): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID?.replace('gooleusercontent', 'googleusercontent') || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: integration.refresh_token,
        grant_type: 'refresh_token'
      })
    })
    if (!res.ok) return null
    const data = await res.json()
    const newExpiry = new Date(Date.now() + data.expires_in * 1000)
    await supabase.rpc('update_integration_access_token', {
      p_kitchen_id: integration.kitchen_id,
      p_provider: 'google',
      p_access_token: data.access_token,
      p_expires_at: newExpiry.toISOString(),
    })
    return data.access_token
  } catch {
    return null
  }
}
