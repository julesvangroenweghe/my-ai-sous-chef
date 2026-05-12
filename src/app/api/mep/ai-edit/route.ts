import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOOLS = [
  {
    name: 'add_dish',
    description: 'Voeg een nieuw gerecht toe aan het event met optionele componenten.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Naam van het gerecht' },
        category: { type: 'string', description: 'Categorie in HOOFDLETTERS (bv. MIGNARDISES, DRANKEN, FINGERFOOD, HAPJES, VOORGERECHT, HOOFDGERECHT, DESSERT, BROOD & BOTER)' },
        sort_order: { type: 'number', description: 'Sorteervolgorde (DRANKEN=0, FINGERFOOD=5, HAPJES=10, AMUSE=11, VOORGERECHT=15, TUSSENGERECHT=17, HOOFDGERECHT=20, BROOD & BOTER=22, KAAS=24, DESSERT=25, MIGNARDISES=30, KIDS=35)' },
        notes: { type: 'string', description: 'Optionele notities bij het gerecht (bv. allergenen info)' },
        components: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'string', description: 'Alleen het getal (bv. "25")' },
              unit: { type: 'string', description: 'Alleen de eenheid (bv. "g", "ml", "st") — NOOIT "pp"' },
              preparation: { type: 'string', description: 'Bereidingswijze of temperatuur (bv. "geschild, gekookt", "koud geserveerd")' },
              supplier: { type: 'string', description: 'Leverancier naam (optioneel)' },
            },
            required: ['name'],
          },
        },
      },
      required: ['title', 'category', 'sort_order'],
    },
  },
  {
    name: 'add_components',
    description: 'Voeg één of meer componenten toe aan een bestaand gerecht. Gebruik dish_id van de MEP context.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dish_id: { type: 'string', description: 'UUID van het gerecht (uit MEP context)' },
        components: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'string' },
              unit: { type: 'string' },
              preparation: { type: 'string' },
              supplier: { type: 'string' },
            },
            required: ['name'],
          },
        },
      },
      required: ['dish_id', 'components'],
    },
  },
  {
    name: 'update_component',
    description: 'Pas een bestaand component aan. Gebruik component_id van de MEP context.',
    input_schema: {
      type: 'object' as const,
      properties: {
        component_id: { type: 'string', description: 'UUID van het component (uit MEP context)' },
        component_name: { type: 'string', description: 'Nieuwe naam' },
        quantity: { type: 'string', description: 'Nieuwe hoeveelheid (alleen getal)' },
        unit: { type: 'string', description: 'Nieuwe eenheid' },
        preparation: { type: 'string', description: 'Nieuwe bereiding' },
        supplier: { type: 'string', description: 'Leverancier' },
      },
      required: ['component_id'],
    },
  },
  {
    name: 'update_dish',
    description: 'Pas een gerecht aan (titel, categorie, notities). Gebruik dish_id van de MEP context.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dish_id: { type: 'string', description: 'UUID van het gerecht' },
        title: { type: 'string', description: 'Nieuwe titel' },
        category: { type: 'string', description: 'Nieuwe categorie in HOOFDLETTERS' },
        notes: { type: 'string', description: 'Notities (bv. allergenen, bereidingsinfo)' },
      },
      required: ['dish_id'],
    },
  },
  {
    name: 'delete_dish',
    description: 'Verwijder een gerecht en al zijn componenten.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dish_id: { type: 'string', description: 'UUID van het gerecht' },
      },
      required: ['dish_id'],
    },
  },
  {
    name: 'delete_component',
    description: 'Verwijder een specifiek component.',
    input_schema: {
      type: 'object' as const,
      properties: {
        component_id: { type: 'string', description: 'UUID van het component' },
      },
      required: ['component_id'],
    },
  },
  {
    name: 'update_event_info',
    description: 'Pas event-gegevens aan: aantal personen, prijs, contactpersoon, locatie, evenementtype, of vrije notities.',
    input_schema: {
      type: 'object' as const,
      properties: {
        num_persons: { type: 'number', description: 'Aantal gasten' },
        price_per_person: { type: 'number', description: 'Prijs per persoon in euro' },
        contact_person: { type: 'string', description: 'Naam van contactpersoon' },
        location: { type: 'string', description: 'Naam van de locatie' },
        venue_address: { type: 'string', description: 'Volledig adres van de locatie' },
        event_type: { type: 'string', description: 'Type evenement (bv. seated_dinner, walking_dinner, cocktail, buffet)' },
        notes: { type: 'string', description: 'Vrije notities bij het event (bv. allergenen van gasten, bijzonderheden)' },
      },
    },
  },
  {
    name: 'update_event_timing',
    description: 'Pas tijdstippen aan voor het event: start/eindtijd, vertrektijd vanuit Mariakerke, aankomsttijd keuken.',
    input_schema: {
      type: 'object' as const,
      properties: {
        event_start_time: { type: 'string', description: 'Starttijd van het evenement als "HH:MM" (bv. "18:30")' },
        event_end_time: { type: 'string', description: 'Eindtijd van het evenement als "HH:MM" (bv. "23:00")' },
        travel_time_minutes: { type: 'number', description: 'Reistijd in minuten vanuit Mariakerke naar de locatie (inclusief 15% veiligheidsmarge)' },
        kitchen_arrival_time: { type: 'string', description: 'Manuele aankomsttijd keuken als "HH:MM" — overschrijft automatische berekening' },
      },
    },
  },
  {
    name: 'add_allergen_note',
    description: 'Voeg een allergenennotitie toe aan een specifiek gerecht of aan het event algemeen.',
    input_schema: {
      type: 'object' as const,
      properties: {
        target: { type: 'string', enum: ['dish', 'event'], description: 'Waaraan de notitie wordt gekoppeld' },
        dish_id: { type: 'string', description: 'UUID van het gerecht (alleen nodig bij target=dish)' },
        note: { type: 'string', description: 'De allergenennotitie (bv. "1x veggie - geen vlees", "2x lactose-intolerant")' },
      },
      required: ['target', 'note'],
    },
  },
]

async function executeTool(toolName: string, input: any, eventId: string, supabase: any) {
  const results: string[] = []

  switch (toolName) {
    case 'add_dish': {
      const { data: dish, error } = await supabase
        .from('mep_dishes')
        .insert({
          event_id: eventId,
          title: input.title,
          category: input.category.toUpperCase(),
          sort_order: input.sort_order ?? 0,
          notes: input.notes || null,
          is_ai_suggestion: false,
        })
        .select('id')
        .single()
      if (error) return `Fout bij toevoegen gerecht: ${error.message}`

      if (input.components?.length) {
        const comps = input.components.map((c: any, i: number) => ({
          dish_id: dish.id,
          component_name: c.name,
          quantity: c.quantity ? parseFloat(c.quantity) : null,
          unit: c.unit || null,
          preparation: c.preparation || null,
          supplier: c.supplier || null,
          sort_order: i + 1,
        }))
        const { error: compError } = await supabase.from('mep_components').insert(comps)
        if (compError) results.push(`"${input.title}" toegevoegd maar fout bij componenten: ${compError.message}`)
        else results.push(`Gerecht "${input.title}" (${input.category}) toegevoegd met ${comps.length} component(en)`)
      } else {
        results.push(`Gerecht "${input.title}" (${input.category}) toegevoegd`)
      }
      break
    }

    case 'add_components': {
      const { data: existing } = await supabase
        .from('mep_components')
        .select('sort_order')
        .eq('dish_id', input.dish_id)
        .order('sort_order', { ascending: false })
        .limit(1)
      const startOrder = existing?.[0]?.sort_order ? existing[0].sort_order + 1 : 1

      const comps = input.components.map((c: any, i: number) => ({
        dish_id: input.dish_id,
        component_name: c.name,
        quantity: c.quantity ? parseFloat(c.quantity) : null,
        unit: c.unit || null,
        preparation: c.preparation || null,
        supplier: c.supplier || null,
        sort_order: startOrder + i,
      }))
      const { error } = await supabase.from('mep_components').insert(comps)
      if (error) return `Fout bij toevoegen componenten: ${error.message}`
      results.push(`${comps.length} component(en) toegevoegd`)
      break
    }

    case 'update_component': {
      const updates: any = {}
      if (input.component_name !== undefined) updates.component_name = input.component_name
      if (input.quantity !== undefined) updates.quantity = input.quantity !== '' ? parseFloat(input.quantity) : null
      if (input.unit !== undefined) updates.unit = input.unit || null
      if (input.preparation !== undefined) updates.preparation = input.preparation || null
      if (input.supplier !== undefined) updates.supplier = input.supplier || null

      const { error } = await supabase.from('mep_components').update(updates).eq('id', input.component_id)
      if (error) return `Fout bij aanpassen component: ${error.message}`
      results.push(`Component aangepast`)
      break
    }

    case 'update_dish': {
      const updates: any = {}
      if (input.title) updates.title = input.title
      if (input.category) updates.category = input.category.toUpperCase()
      if (input.notes !== undefined) updates.notes = input.notes || null
      const { error } = await supabase.from('mep_dishes').update(updates).eq('id', input.dish_id)
      if (error) return `Fout bij aanpassen gerecht: ${error.message}`
      results.push(`Gerecht aangepast`)
      break
    }

    case 'delete_dish': {
      await supabase.from('mep_components').delete().eq('dish_id', input.dish_id)
      const { error } = await supabase.from('mep_dishes').delete().eq('id', input.dish_id)
      if (error) return `Fout bij verwijderen: ${error.message}`
      results.push(`Gerecht verwijderd`)
      break
    }

    case 'delete_component': {
      const { error } = await supabase.from('mep_components').delete().eq('id', input.component_id)
      if (error) return `Fout bij verwijderen component: ${error.message}`
      results.push(`Component verwijderd`)
      break
    }

    case 'update_event_info': {
      const updates: any = {}
      if (input.num_persons !== undefined) updates.num_persons = input.num_persons
      if (input.price_per_person !== undefined) updates.price_per_person = input.price_per_person
      if (input.contact_person !== undefined) updates.contact_person = input.contact_person
      if (input.location !== undefined) updates.location = input.location
      if (input.venue_address !== undefined) updates.venue_address = input.venue_address
      if (input.event_type !== undefined) updates.event_type = input.event_type
      if (input.notes !== undefined) updates.notes = input.notes

      const { error } = await supabase.from('events').update(updates).eq('id', eventId)
      if (error) return `Fout bij aanpassen event: ${error.message}`
      const changed = Object.keys(updates).join(', ')
      results.push(`Event bijgewerkt (${changed})`)
      break
    }

    case 'update_event_timing': {
      const updates: any = {}
      if (input.event_start_time !== undefined) updates.event_start_time = input.event_start_time
      if (input.event_end_time !== undefined) updates.event_end_time = input.event_end_time
      if (input.travel_time_minutes !== undefined) updates.travel_time_minutes = input.travel_time_minutes
      if (input.kitchen_arrival_time !== undefined) updates.kitchen_arrival_time = input.kitchen_arrival_time

      const { error } = await supabase.from('events').update(updates).eq('id', eventId)
      if (error) return `Fout bij aanpassen timing: ${error.message}`
      results.push(`Timing bijgewerkt`)
      break
    }

    case 'add_allergen_note': {
      if (input.target === 'dish' && input.dish_id) {
        // Append to existing dish notes
        const { data: dish } = await supabase.from('mep_dishes').select('notes').eq('id', input.dish_id).single()
        const newNotes = dish?.notes ? `${dish.notes}\n${input.note}` : input.note
        const { error } = await supabase.from('mep_dishes').update({ notes: newNotes }).eq('id', input.dish_id)
        if (error) return `Fout bij toevoegen notitie: ${error.message}`
        results.push(`Allergenennotitie toegevoegd aan gerecht`)
      } else {
        // Append to event notes
        const { data: event } = await supabase.from('events').select('notes').eq('id', eventId).single()
        const newNotes = event?.notes ? `${event.notes}\n${input.note}` : input.note
        const { error } = await supabase.from('events').update({ notes: newNotes }).eq('id', eventId)
        if (error) return `Fout bij toevoegen notitie: ${error.message}`
        results.push(`Allergenennotitie toegevoegd aan event`)
      }
      break
    }
  }

  return results.join('; ') || 'Actie uitgevoerd'
}

export async function POST(request: NextRequest) {
  // Auth check
  const userSupabase = await createClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages, eventId } = await request.json()
  if (!eventId) return NextResponse.json({ error: 'eventId is verplicht' }, { status: 400 })

  const supabase = createAdminClient()

  // Load event + MEP data
  const [eventRes, dishesRes] = await Promise.all([
    supabase.from('events').select('*').eq('id', eventId).single(),
    supabase.from('mep_dishes').select(`
      id, title, category, sort_order, notes, is_ai_suggestion,
      mep_components (id, component_name, quantity, unit, preparation, supplier, component_group, sort_order)
    `).eq('event_id', eventId).order('sort_order'),
  ])

  const event = eventRes.data
  const dishes = dishesRes.data || []

  if (!event) return NextResponse.json({ error: 'Event niet gevonden' }, { status: 404 })

  // Detect event type for proactive checks
  const hasVoorgerecht = dishes.some((d: any) => d.category?.toUpperCase().includes('VOORGERECHT'))
  const hasHoofdgerecht = dishes.some((d: any) => d.category?.toUpperCase().includes('HOOFDGERECHT'))
  const hasBrood = dishes.some((d: any) => d.category?.toUpperCase().includes('BROOD'))
  const hasMignardises = dishes.some((d: any) => d.category?.toUpperCase().includes('MIGNARDISES'))
  const hasDranken = dishes.some((d: any) => d.category?.toUpperCase().includes('DRANKEN'))
  const isWalkingDinner = event.event_type === 'walking_dinner' || dishes.some((d: any) => d.category?.toUpperCase().includes('WALKING'))
  const isSitDown = hasVoorgerecht && hasHoofdgerecht && !isWalkingDinner

  // Build proactive warnings
  const warnings: string[] = []
  if (isSitDown && !hasBrood) warnings.push('⚠️ Sit-down diner zonder BROOD & BOTER — voeg toe indien gewenst')
  if (!hasMignardises && (hasHoofdgerecht || isWalkingDinner)) warnings.push('⚠️ Geen MIGNARDISES gevonden — voeg toe indien gewenst')
  if (!hasDranken) warnings.push('⚠️ Geen DRANKEN (mocktails/infused waters) gevonden')

  // Build MEP context string
  const mepContext = dishes.map((d: any) => {
    const comps = (d.mep_components || [])
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((c: any) => {
        let desc = `    - [${c.id}] ${c.component_name}`
        if (c.quantity) desc += ` (${c.quantity}${c.unit ? ' ' + c.unit : ''})`
        if (c.preparation) desc += ` — ${c.preparation}`
        if (c.supplier) desc += ` [${c.supplier}]`
        return desc
      })
      .join('\n')
    return `  [${d.id}] ${d.category}: ${d.title}${d.notes ? ` [note: ${d.notes}]` : ''}\n${comps}`
  }).join('\n\n')

  // Format timing info
  const startTime = event.event_start_time ? String(event.event_start_time).substring(0, 5) : '?'
  const endTime = event.event_end_time ? String(event.event_end_time).substring(0, 5) : '?'

  const systemPrompt = `Je bent Jules AI, de slimme MEP-assistent van Sir Catering (Food by Jules). Je kunt de mise-en-place lijst van een event direct aanpassen in de database.

HUIDIG EVENT:
- Naam: ${event.name}
- Datum: ${event.event_date}
- Type: ${event.event_type || 'onbekend'}
- Pax: ${event.num_persons || '?'} personen
- Prijs: ${event.price_per_person ? '€' + event.price_per_person + ' pp' : 'onbekend'}
- Status: ${event.mep_status}
- Starttijd: ${startTime}
- Eindtijd: ${endTime}
- Reistijd: ${event.travel_time_minutes ? event.travel_time_minutes + ' min' : 'onbekend'}
- Aankomsttijd keuken: ${event.kitchen_arrival_time || 'automatisch berekend'}
- Contact: ${event.contact_person || 'onbekend'}
- Locatie: ${event.venue_address || event.location || 'onbekend'}
- Notities: ${event.notes || 'geen'}

PROACTIEVE CHECKS:
${warnings.length > 0 ? warnings.join('\n') : '✅ MEP ziet er compleet uit'}

HUIDIGE MEP (gerechten en componenten met hun database-UUIDs):
${mepContext || 'Geen gerechten gevonden'}

WERKREGELS — altijd naleven:
1. Antwoord ALTIJD in het Nederlands, bondig en professioneel
2. Gebruik tools om aanpassingen te maken — niet alleen beschrijven, maar ook uitvoeren
3. Quantity = alleen het getal (25), unit = alleen de eenheid (g/ml/st) — NOOIT "pp" in unit
4. Categorieën ALTIJD in HOOFDLETTERS
5. CHAMPAGNE, WIJN en BIER = BAR — dit komt NOOIT op een MEP lijst
6. KOFFIE & THEE = niet op MEP — maar mignardises die eronder staan WEL altijd opnemen
7. Allergenen noteren als notitie bij het gerecht of het event
8. Bij "pas aantallen aan voor X personen met Y crew": dit gaat over het aantal gasten (num_persons) — pas event_info aan
9. Uitzonderingen bij aantallen (1x veggie, 2x lactose) gaan als notitie bij het event
10. Na elke actie: beknopte samenvatting van wat is gedaan

CATEGORIE-VOLGORDE (sort_order):
DRANKEN=0, FINGERFOOD=5, FINGERBITES=6, HAPJES=10, AMUSE=11, VOORGERECHT=15, TUSSENGERECHT=17, HOOFDGERECHT=20, BROOD & BOTER=22, ON THE SIDE=23, KAAS=24, DESSERT=25, PETITS FOURS=28, MIGNARDISES=30, KIDS=35, HALFABRICAAT=40

STANDAARD COMPONENTEN:
- Brood & boter: "Artisanaal zuurdesembrood", "Roomboter", "Fleur de sel"
- Mignardises: "Canelé", "Madeleine", "Financier"

BELANGRIJK: De UUIDs tussen [] zijn de exacte database-IDs. Gebruik ze letterlijk bij update/delete.`

  const callClaude = async (msgs: any[]) => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 4096,
        system: systemPrompt,
        tools: TOOLS,
        messages: msgs,
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error('Claude API error:', res.status, errText)
      throw new Error(`Claude error ${res.status}: ${errText.substring(0, 200)}`)
    }
    return res.json()
  }

  const conversationMessages = messages.map((m: any) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }))

  let aiResponse
  try {
    aiResponse = await callClaude(conversationMessages)
  } catch (err: any) {
    console.error('Initial Claude call failed:', err)
    return NextResponse.json({ error: `AI niet beschikbaar: ${err.message}` }, { status: 502 })
  }

  const mutations: string[] = []
  let finalText = ''

  // Agentic loop — process tool calls
  let iteration = 0
  const MAX_ITERATIONS = 10

  while (iteration < MAX_ITERATIONS) {
    iteration++

    const textBlocks = aiResponse.content?.filter((b: any) => b.type === 'text') || []
    const toolUseBlocks = aiResponse.content?.filter((b: any) => b.type === 'tool_use') || []

    for (const tb of textBlocks) {
      if (tb.text) finalText += (finalText ? '\n' : '') + tb.text
    }

    if (toolUseBlocks.length === 0 || aiResponse.stop_reason === 'end_turn') break

    // Execute all tool calls
    const toolResults: any[] = []
    for (const tu of toolUseBlocks) {
      const result = await executeTool(tu.name, tu.input, eventId, supabase)
      mutations.push(result)
      toolResults.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: result,
      })
    }

    // Continue with tool results
    conversationMessages.push({ role: 'assistant', content: aiResponse.content })
    conversationMessages.push({ role: 'user', content: toolResults })

    try {
      aiResponse = await callClaude(conversationMessages)
    } catch {
      break
    }
  }

  // Collect final text from last response
  const lastTextBlocks = aiResponse?.content?.filter((b: any) => b.type === 'text') || []
  for (const tb of lastTextBlocks) {
    if (tb.text && !finalText.includes(tb.text)) {
      finalText += (finalText ? '\n' : '') + tb.text
    }
  }

  return NextResponse.json({
    response: finalText.trim() || 'Klaar!',
    mutations,
    mutationsCount: mutations.length,
    warnings: warnings.length > 0 ? warnings : undefined,
  })
}
