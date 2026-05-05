// POST: parse PDF with AI, return dish preview
// PUT: save approved dishes to mep_dishes/mep_components
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const DISH_EXTRACTION_PROMPT = `Je bent een expert culinair assistent voor SIR Catering.
Analyseer dit document en extraheer de gerechten/onderdelen als JSON.

KRITISCH: Reageer UITSLUITEND met pure JSON. Geen uitleg, geen markdown. Begin direct met {

JSON formaat:
{
  "dishes": [
    {
      "title": "Gerechtnaam",
      "category": "FINGERFOOD",
      "sort_order": 10,
      "notes": null,
      "components": [
        {
          "component_name": "ingredientnaam",
          "quantity": 20,
          "unit": "g",
          "preparation": null,
          "component_group": null,
          "sort_order": 1
        }
      ]
    }
  ]
}

CATEGORIEEN: DRANKEN, LUNCH, FINGERFOOD, FINGERBITES, HAPJES, APPETIZERS, AMUSE,
VOORGERECHT, TUSSENGERECHT, HOOFDGERECHT, HOOFDGERECHT PREMIUM, ON THE SIDE,
KAAS, DESSERT, MIGNARDISES, LATE NIGHT SNACK, KIDS, BROOD & BOTER,
WALKING VOORGERECHT, WALKING DINNER, SHARING VOORGERECHT

REGELS:
- quantity: ENKEL het getal (number), null als niet vermeld
- unit: ENKEL de eenheid, GEEN "pp"
- Return ALLEEN JSON, begin met {`

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const admin = createAdminClient()

    // Verify event exists
    const { data: event } = await admin
      .from('events')
      .select('id, name')
      .eq('id', params.eventId)
      .single()
    if (!event) return NextResponse.json({ error: 'Event niet gevonden' }, { status: 404 })

    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Verwacht multipart/form-data' }, { status: 400 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Geen bestand meegegeven' }, { status: 400 })

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Ongeldig bestandstype. Gebruik PDF, JPG of PNG.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64Data = Buffer.from(bytes).toString('base64')
    const isPdf = file.type === 'application/pdf'

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    let rawJson = ''
    if (isPdf) {
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } } as any,
            { type: 'text', text: DISH_EXTRACTION_PROMPT },
          ],
        }],
      })
      const textContent = response.content.find(c => c.type === 'text')
      rawJson = (textContent as any)?.text || '{}'
    } else {
      const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp'
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
            { type: 'text', text: DISH_EXTRACTION_PROMPT },
          ],
        }],
      })
      const textContent = response.content.find(c => c.type === 'text')
      rawJson = (textContent as any)?.text || '{}'
    }

    let extracted: any
    try {
      const jsonMatch = rawJson.match(/\{[\s\S]*\}/)
      extracted = JSON.parse(jsonMatch ? jsonMatch[0] : rawJson)
    } catch {
      return NextResponse.json({ error: 'Kon document niet verwerken' }, { status: 422 })
    }

    if (!extracted.dishes || !Array.isArray(extracted.dishes) || extracted.dishes.length === 0) {
      return NextResponse.json({ error: 'Geen gerechten gevonden in document' }, { status: 422 })
    }

    return NextResponse.json({
      dishes: extracted.dishes,
      numDishes: extracted.dishes.length,
    })

  } catch (err: any) {
    console.error('Import dishes POST error:', err)
    return NextResponse.json({ error: err.message || 'Onbekende fout' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const admin = createAdminClient()

    // Verify event exists
    const { data: event } = await admin
      .from('events')
      .select('id')
      .eq('id', params.eventId)
      .single()
    if (!event) return NextResponse.json({ error: 'Event niet gevonden' }, { status: 404 })

    const body = await req.json()
    const dishes = body.dishes as any[]
    if (!dishes || !Array.isArray(dishes) || dishes.length === 0) {
      return NextResponse.json({ error: 'Geen gerechten opgegeven' }, { status: 400 })
    }

    // Get current max sort_order for this event
    const { data: existingDishes } = await admin
      .from('mep_dishes')
      .select('sort_order')
      .eq('event_id', params.eventId)
      .order('sort_order', { ascending: false })
      .limit(1)
    
    const maxSortOrder = existingDishes?.[0]?.sort_order ?? 0

    let totalDishes = 0
    let totalComponents = 0

    for (let i = 0; i < dishes.length; i++) {
      const dish = dishes[i]
      const category = (dish.category || 'FINGERFOOD').toUpperCase().trim()
      const sortOrder = maxSortOrder + (dish.sort_order ?? ((i + 1) * 10))

      const { data: mepDish, error: dishErr } = await admin
        .from('mep_dishes')
        .insert({
          event_id: params.eventId,
          title: dish.title || `Gerecht ${i + 1}`,
          category,
          sort_order: sortOrder,
          is_ai_suggestion: true,
          notes: dish.notes || null,
        })
        .select('id')
        .single()

      if (dishErr || !mepDish) { console.error('Dish error:', dishErr); continue }
      totalDishes++

      const components = (dish.components || []) as any[]
      if (components.length > 0) {
        const compInserts = components.map((comp: any, j: number) => ({
          dish_id: mepDish.id,
          component_name: (comp.component_name || comp.name || 'component').trim(),
          quantity: comp.quantity != null ? Number(comp.quantity) : null,
          unit: comp.unit || null,
          preparation: comp.preparation || null,
          component_group: comp.component_group || null,
          sort_order: comp.sort_order ?? (j + 1),
          is_ai_suggestion: true,
        }))
        const { error: compErr } = await admin.from('mep_components').insert(compInserts)
        if (!compErr) totalComponents += compInserts.length
      }
    }

    return NextResponse.json({ success: true, numDishes: totalDishes, numComponents: totalComponents })

  } catch (err: any) {
    console.error('Import dishes PUT error:', err)
    return NextResponse.json({ error: err.message || 'Onbekende fout' }, { status: 500 })
  }
}
