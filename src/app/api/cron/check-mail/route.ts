// src/app/api/cron/check-mail/route.ts
// Vercel Cron Job: elke 10 min Gmail polling voor alle actieve kitchens
// Beveiligd met CRON_SECRET header

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Beveilig cron endpoint
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Haal alle kitchens op met actieve Google integratie
  const { data: integrations } = await supabase
    .from('kitchen_integrations')
    .select('kitchen_id, access_token, refresh_token, expires_at, provider_email')
    .eq('provider', 'google')
    .eq('is_active', true)

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ processed: 0 })
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

async function pollGmailForKitchen(supabase: ReturnType<typeof createServiceClient>, integration: {
  kitchen_id: string
  access_token: string
  refresh_token: string
  expires_at: string
  provider_email: string
}) {
  // Check/refresh token als verlopen
  let accessToken = integration.access_token
  const expiresAt = new Date(integration.expires_at)
  
  if (expiresAt < new Date()) {
    accessToken = await refreshGoogleToken(supabase, integration)
    if (!accessToken) return { skipped: true, reason: 'token_refresh_failed' }
  }

  // Haal poll state op voor deze kitchen
  const { data: pollState } = await supabase
    .from('gmail_poll_state')
    .select('last_history_id, last_polled_at')
    .eq('kitchen_id', integration.kitchen_id)
    .single()

  // Haal recente mails op (laatste 10 min of via history ID)
  const since = pollState?.last_polled_at 
    ? new Date(pollState.last_polled_at).getTime() / 1000
    : (Date.now() / 1000) - 600 // laatste 10 min

  const messagesRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=after:${Math.floor(since)}&maxResults=10`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!messagesRes.ok) return { skipped: true, reason: 'gmail_api_error' }
  
  const messagesData = await messagesRes.json()
  const messages = messagesData.messages || []
  let alertsCreated = 0

  for (const msg of messages) {
    // Haal mail details op
    const detailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!detailRes.ok) continue

    const detail = await detailRes.json()
    
    // Extract headers
    const headers = detail.payload?.headers || []
    const subject = headers.find((h: { name: string }) => h.name === 'Subject')?.value || ''
    const from = headers.find((h: { name: string }) => h.name === 'From')?.value || ''
    const body = extractEmailBody(detail.payload)

    // Sla mails van jezelf over
    if (from.includes(integration.provider_email)) continue

    // AI parseert de mail
    const alert = await parseMailWithAI(
      integration.kitchen_id,
      subject,
      from,
      body,
      supabase
    )

    if (alert) {
      await supabase.from('kitchen_alerts').insert(alert)
      alertsCreated++
    }
  }

  // Update poll state
  await supabase.from('gmail_poll_state').upsert({
    kitchen_id: integration.kitchen_id,
    last_polled_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { onConflict: 'kitchen_id' })

  return { alerts_created: alertsCreated, messages_checked: messages.length }
}

async function parseMailWithAI(
  kitchenId: string,
  subject: string,
  from: string,
  body: string,
  supabase: ReturnType<typeof createServiceClient>
) {
  // Alleen verwerken als mail van leverancier of over food/ingrediënten gaat
  const relevantKeywords = /prijs|price|tarbot|zalm|vlees|groente|vis|voorraad|stock|aanbieding|korting|discount|niet beschikbaar|uitverkocht|leveranc|factuur|invoice|menu|seizoen/i
  
  if (!relevantKeywords.test(subject + body)) return null

  // Haal aankomende events op voor context
  const { data: events } = await supabase
    .from('events')
    .select('id, name, event_date, num_persons')
    .eq('kitchen_id', kitchenId)
    .gte('event_date', new Date().toISOString())
    .lte('event_date', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString())
    .order('event_date')
    .limit(5)

  const eventsContext = events?.map(e => 
    `- ${e.name} (${new Date(e.event_date).toLocaleDateString('nl-BE')}, ${e.num_persons} personen)`
  ).join('\n') || 'Geen aankomende events'

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: 'Je bent een keuken-intelligentie assistent. Analyseer leveranciersmails en retourneer ALLEEN valid JSON, geen uitleg.',
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
  "alert_type": "price_change" | "out_of_stock" | "deal" | "delivery" | "other",
  "title": "Korte titel (max 60 tekens)",
  "message": "Duidelijke samenvatting voor de chef (max 200 tekens)",
  "ingredient": "naam van ingrediënt indien van toepassing, anders null",
  "price_info": { "product": "...", "price": "...", "unit": "..." } of null,
  "event_relevance": "Hoe dit relevant is voor aankomende events, of null",
  "priority": "high" | "medium" | "low",
  "action_suggested": "Wat de chef best doet, of null"
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
      alert_type: parsed.alert_type,
      title: parsed.title,
      message: parsed.message,
      source: 'gmail',
      source_reference: `${from}: ${subject}`,
      metadata: {
        ingredient: parsed.ingredient,
        price_info: parsed.price_info,
        event_relevance: parsed.event_relevance,
        action_suggested: parsed.action_suggested,
        priority: parsed.priority
      },
      is_read: false
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
  
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8')
  }
  
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8')
      }
    }
    // Fallback naar eerste part
    if (payload.parts[0]?.body?.data) {
      return Buffer.from(payload.parts[0].body.data, 'base64').toString('utf-8')
    }
  }
  
  return ''
}

async function refreshGoogleToken(
  supabase: ReturnType<typeof createServiceClient>,
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

    await supabase.from('kitchen_integrations').update({
      access_token: data.access_token,
      expires_at: newExpiry.toISOString()
    }).eq('kitchen_id', integration.kitchen_id).eq('provider', 'google')

    return data.access_token
  } catch {
    return null
  }
}
