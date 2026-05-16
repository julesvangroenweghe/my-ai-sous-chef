import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getUser(req: NextRequest) {
  const supabase = getSupabase()
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params
  const supabase = getSupabase()
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Haal event op
  const { data: event } = await supabase
    .from('events')
    .select('id, name, event_date, event_type, num_persons, location, arrival_time, departure_time, kitchen_id')
    .eq('id', eventId)
    .single()

  if (!event) return NextResponse.json({ error: 'Event niet gevonden' }, { status: 404 })

  // Haal MEP dishes op als die bestaan
  const { data: mepDishes } = await supabase
    .from('mep_dishes')
    .select('name, course')
    .eq('event_id', eventId)
    .limit(20)

  const eventTypeMap: Record<string, string> = {
    walking_dinner: 'Walking Dinner',
    buffet: 'Buffet',
    sit_down: 'Sit-down Diner',
    cocktail: 'Cocktail Dinatoire',
    brunch: 'Brunch',
    tasting: 'Tasting Menu',
    daily_service: 'Dagdienst',
  }

  const eventTypeFull = eventTypeMap[event.event_type] || event.event_type
  const mepDishesText = mepDishes && mepDishes.length > 0
    ? `\nMenu/Gerechten:\n${mepDishes.map((d: { course: string | null; name: string }) => `- ${d.course || ''}: ${d.name}`).join('\n')}`
    : ''

  const prompt = `Genereer een operationeel draaiboek voor dit catering event:

Event: ${event.name}
Type: ${eventTypeFull}
Datum: ${event.event_date}
Aantal personen: ${event.num_persons || 'onbekend'}
Locatie: ${event.location || 'onbekend'}
Aankomsttijd team: ${event.arrival_time || 'niet opgegeven'}
Eindtijd: ${event.departure_time || 'niet opgegeven'}
${mepDishesText}

Genereer een praktisch, gedetailleerd draaiboek als JSON array. Elke taak heeft:
- title: korte actietitel (max 60 tekens)
- description: optionele toelichting
- assigned_to: wie (bijv. "Keukenchef", "Logistiek", "Service", "Alle handen")
- category: "prep" (voorbereiding), "service" (tijdens event), "logistics" (transport/materiaal), "cleanup" (afbouw)
- time_offset_minutes: minuten t.o.v. event start (negatief = voor event, positief = na start)
- sort_order: volgorde (0, 10, 20, ...)

Richtlijnen per type:
- cocktail: hapjes per ronde plannen, timing doorgeven hapjes
- walking_dinner: per gerecht timing, doorgave moment
- sit_down: per gang timing, service timing
- buffet: opbouw buffet, bijvullen, afbouw

Genereer 15-25 praktische items. Antwoord ENKEL met de JSON array, geen uitleg.`

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: 'Je bent een operationeel expert voor food catering events. Je maakt draaiboeken die een heel team kan volgen. Antwoord altijd met alleen geldige JSON, geen markdown code blocks.',
      messages: [
        { role: 'user', content: prompt }
      ]
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Geen tekst response van AI' }, { status: 500 })
    }

    let generatedItems: Array<{
      title: string
      description?: string
      assigned_to?: string
      category: string
      time_offset_minutes?: number
      sort_order?: number
    }>

    try {
      // Verwijder eventuele markdown code blocks
      let jsonText = content.text.trim()
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      generatedItems = JSON.parse(jsonText)
    } catch {
      return NextResponse.json({ error: 'Kon AI response niet verwerken als JSON' }, { status: 500 })
    }

    // Verwijder bestaande items
    await supabase
      .from('event_runbook_items')
      .delete()
      .eq('event_id', eventId)

    // Voeg nieuwe items in
    const toInsert = generatedItems.map((item, idx) => ({
      event_id: eventId,
      kitchen_id: event.kitchen_id,
      title: item.title,
      description: item.description || null,
      assigned_to: item.assigned_to || null,
      category: item.category || 'prep',
      time_offset_minutes: item.time_offset_minutes ?? null,
      absolute_time: null,
      sort_order: item.sort_order ?? idx * 10,
      is_done: false,
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('event_runbook_items')
      .insert(toInsert)
      .select()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    return NextResponse.json({ items: inserted, count: inserted?.length || 0 })
  } catch (err) {
    console.error('AI generate error:', err)
    return NextResponse.json({ error: 'AI generatie mislukt' }, { status: 500 })
  }
}
