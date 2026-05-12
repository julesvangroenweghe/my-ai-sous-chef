import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOOLS = [
  {
    name: 'add_dish',
    description: 'Voeg een nieuw gerecht toe aan het event. Gebruik category in HOOFDLETTERS (bv. MIGNARDISES, DRANKEN, FINGERFOOD, HAPJES, VOORGERECHT, HOOFDGERECHT, DESSERT, etc.)',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Naam van het gerecht' },
        category: { type: 'string', description: 'Categorie in HOOFDLETTERS (bv. MIGNARDISES, DRANKEN, FINGERFOOD)' },
        sort_order: { type: 'number', description: 'Sorteervolgorde (DRANKEN=0, FINGERFOOD=5, HAPJES=10, VOORGERECHT=15, HOOFDGERECHT=20, DESSERT=25, MIGNARDISES=30)' },
        components: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'string', description: 'Alleen het getal (bv. "25")' },
              unit: { type: 'string', description: 'Alleen de eenheid (bv. "g", "ml", "st")' },
              preparation: { type: 'string', description: 'Bereidingswijze (bv. "geschild, gekookt")' },
            },
            required: ['name'],
          },
          description: 'Componenten/ingrediënten van het gerecht',
        },
      },
      required: ['title', 'category', 'sort_order'],
    },
  },
  {
    name: 'add_components',
    description: 'Voeg componenten toe aan een bestaand gerecht',
    input_schema: {
      type: 'object' as const,
      properties: {
        dish_id: { type: 'string', description: 'ID van het gerecht' },
        components: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'string' },
              unit: { type: 'string' },
              preparation: { type: 'string' },
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
    description: 'Pas een bestaand component aan (hoeveelheid, eenheid, bereiding, naam)',
    input_schema: {
      type: 'object' as const,
      properties: {
        component_id: { type: 'string', description: 'ID van het component' },
        component_name: { type: 'string', description: 'Nieuwe naam (optioneel)' },
        quantity: { type: 'string', description: 'Nieuwe hoeveelheid (optioneel)' },
        unit: { type: 'string', description: 'Nieuwe eenheid (optioneel)' },
        preparation: { type: 'string', description: 'Nieuwe bereiding (optioneel)' },
        supplier: { type: 'string', description: 'Leverancier (optioneel)' },
      },
      required: ['component_id'],
    },
  },
  {
    name: 'delete_dish',
    description: 'Verwijder een gerecht en al zijn componenten',
    input_schema: {
      type: 'object' as const,
      properties: {
        dish_id: { type: 'string', description: 'ID van het gerecht' },
      },
      required: ['dish_id'],
    },
  },
  {
    name: 'delete_component',
    description: 'Verwijder een specifiek component',
    input_schema: {
      type: 'object' as const,
      properties: {
        component_id: { type: 'string', description: 'ID van het component' },
      },
      required: ['component_id'],
    },
  },
  {
    name: 'update_dish',
    description: 'Pas een gerecht aan (titel, categorie, notities)',
    input_schema: {
      type: 'object' as const,
      properties: {
        dish_id: { type: 'string', description: 'ID van het gerecht' },
        title: { type: 'string', description: 'Nieuwe titel (optioneel)' },
        category: { type: 'string', description: 'Nieuwe categorie (optioneel)' },
        notes: { type: 'string', description: 'Notities bij het gerecht (optioneel)' },
      },
      required: ['dish_id'],
    },
  },
  {
    name: 'update_event',
    description: 'Pas event-info aan (allergenen, contactpersoon, pax, prijs, etc.)',
    input_schema: {
      type: 'object' as const,
      properties: {
        field: { type: 'string', enum: ['num_persons', 'price_per_person', 'contact_person', 'location', 'event_type', 'venue_address', 'notes'] },
        value: { type: 'string', description: 'Nieuwe waarde' },
      },
      required: ['field', 'value'],
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
          sort_order: input.sort_order || 0,
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
          sort_order: i + 1,
        }))
        const { error: compError } = await supabase.from('mep_components').insert(comps)
        if (compError) results.push(`Gerecht toegevoegd maar fout bij componenten: ${compError.message}`)
        else results.push(`Gerecht "${input.title}" toegevoegd met ${comps.length} componenten`)
      } else {
        results.push(`Gerecht "${input.title}" toegevoegd (zonder componenten)`)
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
        sort_order: startOrder + i,
      }))
      const { error } = await supabase.from('mep_components').insert(comps)
      if (error) return `Fout bij toevoegen componenten: ${error.message}`
      results.push(`${comps.length} component(en) toegevoegd`)
      break
    }

    case 'update_component': {
      const updates: any = {}
      if (input.component_name) updates.component_name = input.component_name
      if (input.quantity !== undefined) updates.quantity = input.quantity ? parseFloat(input.quantity) : null
      if (input.unit !== undefined) updates.unit = input.unit || null
      if (input.preparation !== undefined) updates.preparation = input.preparation || null
      if (input.supplier !== undefined) updates.supplier = input.supplier || null

      const { error } = await supabase.from('mep_components').update(updates).eq('id', input.component_id)
      if (error) return `Fout bij aanpassen: ${error.message}`
      results.push(`Component aangepast`)
      break
    }

    case 'delete_dish': {
      // Delete components first, then dish
      await supabase.from('mep_components').delete().eq('dish_id', input.dish_id)
      const { error } = await supabase.from('mep_dishes').delete().eq('id', input.dish_id)
      if (error) return `Fout bij verwijderen: ${error.message}`
      results.push(`Gerecht verwijderd`)
      break
    }

    case 'delete_component': {
      const { error } = await supabase.from('mep_components').delete().eq('id', input.component_id)
      if (error) return `Fout bij verwijderen: ${error.message}`
      results.push(`Component verwijderd`)
      break
    }

    case 'update_dish': {
      const updates: any = {}
      if (input.title) updates.title = input.title
      if (input.category) updates.category = input.category.toUpperCase()
      if (input.notes !== undefined) updates.notes = input.notes
      const { error } = await supabase.from('mep_dishes').update(updates).eq('id', input.dish_id)
      if (error) return `Fout bij aanpassen gerecht: ${error.message}`
      results.push(`Gerecht aangepast`)
      break
    }

    case 'update_event': {
      const updates: any = {}
      if (input.field === 'num_persons') updates.num_persons = parseInt(input.value)
      else if (input.field === 'price_per_person') updates.price_per_person = parseFloat(input.value)
      else updates[input.field] = input.value

      const { error } = await supabase.from('events').update(updates).eq('id', eventId)
      if (error) return `Fout bij aanpassen event: ${error.message}`
      results.push(`Event ${input.field} aangepast naar "${input.value}"`)
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

  // Use admin client for mutations
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

  // Build context for AI
  const mepContext = dishes.map((d: any) => {
    const comps = (d.mep_components || [])
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((c: any) => {
        let desc = `  - [${c.id}] ${c.component_name}`
        if (c.quantity) desc += ` (${c.quantity}${c.unit || ''})`
        if (c.preparation) desc += ` — ${c.preparation}`
        if (c.supplier) desc += ` [${c.supplier}]`
        return desc
      })
      .join('\n')
    return `[${d.id}] ${d.category}: ${d.title}${d.notes ? ` (note: ${d.notes})` : ''}\n${comps}`
  }).join('\n\n')

  const systemPrompt = `Je bent Jules AI, de MEP-assistent van Sir Catering. Je kunt de mise-en-place lijst van een event direct aanpassen.

HUIDIG EVENT:
- Naam: ${event.name}
- Datum: ${event.event_date}
- Pax: ${event.num_persons || '?'}
- Type: ${event.event_type || '?'}
- Prijs: ${event.price_per_person ? '€' + event.price_per_person + ' pp' : '?'}
- Status: ${event.mep_status}
- Contact: ${event.contact_person || '?'}
- Locatie: ${event.venue_address || event.location || '?'}

HUIDIGE MEP (gerechten en componenten met hun IDs):
${mepContext || 'Geen gerechten gevonden'}

REGELS:
1. Antwoord ALTIJD in het Nederlands
2. Gebruik de tools om aanpassingen te maken — vertel niet alleen WAT je gaat doen, DOE het ook
3. Bij het toevoegen van componenten: quantity = alleen het getal, unit = alleen de eenheid (g, ml, st), NOOIT "pp" in unit
4. Categorieën altijd in HOOFDLETTERS
5. Categorie volgorde: DRANKEN(0) → FINGERFOOD(5) → FINGERBITES(6) → HAPJES(10) → AMUSE(11) → VOORGERECHT(15) → TUSSENGERECHT(17) → HOOFDGERECHT(20) → BROOD & BOTER(22) → ON THE SIDE(23) → KAAS(24) → DESSERT(25) → PETITS FOURS(28) → MIGNARDISES(30) → KIDS(35) → HALFABRICAAT(40)
6. Champagne, wijn en bier = BAR, komt NOOIT op de MEP. Alleen mocktails en infused waters.
7. Koffie & thee verschijnt NOOIT op de MEP
8. Wees kort en professioneel
9. Na elke aanpassing: geef een korte samenvatting van wat je hebt gedaan
10. Als de gebruiker iets zegt als "voeg mignardises toe", voeg ze toe met standaard componenten: Canelé, Madeleine, Financier
11. Allergenen: noteer in het event notes veld of in dish notes

BELANGRIJK: De IDs tussen [] zijn de database-IDs. Gebruik deze exact bij update/delete operaties.`

  // Call Claude with tools
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      tools: TOOLS,
      messages: messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error('Claude API error:', errText)
    return NextResponse.json({ error: 'AI niet beschikbaar' }, { status: 502 })
  }

  let aiResponse = await response.json()
  const mutations: string[] = []
  let finalText = ''

  // Process tool calls in a loop (Claude may call multiple tools)
  let iteration = 0
  const MAX_ITERATIONS = 10
  const conversationMessages = [...messages.map((m: any) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }))]

  while (iteration < MAX_ITERATIONS) {
    iteration++

    // Extract text and tool calls
    const textBlocks = aiResponse.content?.filter((b: any) => b.type === 'text') || []
    const toolUseBlocks = aiResponse.content?.filter((b: any) => b.type === 'tool_use') || []

    for (const tb of textBlocks) {
      if (tb.text) finalText += tb.text + '\n'
    }

    if (toolUseBlocks.length === 0) break // No more tool calls

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

    // Continue conversation with tool results
    conversationMessages.push({ role: 'assistant', content: aiResponse.content })
    conversationMessages.push({ role: 'user', content: toolResults })

    const nextResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        tools: TOOLS,
        messages: conversationMessages,
      }),
    })

    if (!nextResponse.ok) break
    aiResponse = await nextResponse.json()
  }

  // Get final text from last response
  const lastTextBlocks = aiResponse.content?.filter((b: any) => b.type === 'text') || []
  for (const tb of lastTextBlocks) {
    if (tb.text && !finalText.includes(tb.text)) finalText += tb.text
  }

  return NextResponse.json({
    response: finalText.trim() || 'Klaar!',
    mutations,
    mutationsCount: mutations.length,
  })
}
