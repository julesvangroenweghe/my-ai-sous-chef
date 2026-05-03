import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { kitchenId, emailSubject, emailBody, emailFrom, emailDate } = await req.json()

  if (!kitchenId || !emailBody) {
    return NextResponse.json({ error: 'kitchenId en emailBody zijn verplicht' }, { status: 400 })
  }

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, name, website, contact_email')

  const now = new Date()
  const in60days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('id, name, event_date, num_persons')
    .eq('kitchen_id', kitchenId)
    .gte('event_date', now.toISOString())
    .lte('event_date', in60days.toISOString())
    .order('event_date', { ascending: true })
    .limit(10)

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const systemPrompt = `Je bent een slimme keukenassistent die e-mails van leveranciers parseert voor een professionele chef.
Je analyseert inkomende mails en detecteert:
- price_update: prijswijziging van een product
- out_of_stock: product niet beschikbaar of uitverkocht
- deal: speciale aanbieding, seizoensproduct, of promotie
- general: algemene communicatie zonder actie

Geef altijd een JSON response (geen markdown, enkel JSON):
{
  "type": "price_update" | "out_of_stock" | "deal" | "general",
  "isRelevant": boolean,
  "title": "Korte titel max 60 tekens",
  "body": "Samenvatting 1-2 zinnen",
  "ingredientName": "naam product of null",
  "oldPrice": number or null,
  "newPrice": number or null,
  "unit": "kg" | "stuk" | "liter" | null,
  "dealDescription": "beschrijving deal of null",
  "urgency": "low" | "medium" | "high"
}`

  const userPrompt = `Analyseer deze e-mail van ${emailFrom || 'onbekende afzender'}:

ONDERWERP: ${emailSubject || '(geen onderwerp)'}

INHOUD:
${emailBody.substring(0, 3000)}

Bekende leveranciers: ${suppliers?.map((s: {name: string}) => s.name).join(', ') || 'geen'}
Aankomende events (60 dagen): ${upcomingEvents?.map((e: {name: string; event_date: string}) => `${e.name} (${e.event_date?.split('T')[0]})`).join(', ') || 'geen'}

Als het een deal is voor een product dat nuttig kan zijn voor aankomende events, vermeld dit in de body.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  let parsed
  try {
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null
  } catch {
    return NextResponse.json({ error: 'Kon e-mail niet parsen' }, { status: 500 })
  }

  if (!parsed || !parsed.isRelevant || parsed.type === 'general') {
    return NextResponse.json({ created: false, reason: 'Geen actie vereist' })
  }

  const supplier = suppliers?.find((s: {id: string; website?: string; contact_email?: string}) => {
    if (!emailFrom) return false
    const senderDomain = emailFrom.split('@')[1]?.toLowerCase()
    return s.website?.toLowerCase().includes(senderDomain || '') ||
           s.contact_email?.toLowerCase() === emailFrom.toLowerCase()
  })

  const relevantEventIds = (parsed.type === 'deal' && upcomingEvents)
    ? upcomingEvents.map((e: { id: string }) => e.id)
    : []

  const { data: alert, error } = await supabase
    .from('kitchen_alerts')
    .insert({
      kitchen_id: kitchenId,
      type: parsed.type,
      title: parsed.title,
      body: parsed.body,
      supplier_id: supplier?.id || null,
      ingredient_name: parsed.ingredientName || null,
      old_price: parsed.oldPrice || null,
      new_price: parsed.newPrice || null,
      unit: parsed.unit || null,
      deal_description: parsed.dealDescription || null,
      relevant_event_ids: relevantEventIds,
      metadata: { emailFrom, emailDate, urgency: parsed.urgency },
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ created: true, alert })
}
