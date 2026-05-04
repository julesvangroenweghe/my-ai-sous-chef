// src/app/api/mep/import-pdf/route.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const MENU_EXTRACTION_PROMPT = `Je bent een expert culinair assistent voor SIR Catering (Jules Van Groeneweghe, Gent).
Analyseer dit menu PDF en extraheer de volledige structuur als JSON.

KRITISCH: Reageer UITSLUITEND met pure JSON. Geen uitleg, geen markdown. Begin direct met {

JSON formaat:
{
  "event_name": "Klant / Event naam",
  "event_date": "YYYY-MM-DD",
  "num_persons": 50,
  "price_per_person": 75.00,
  "event_type": "cocktail|walking_dinner|sit_down|buffet|tasting|brunch|lunch",
  "location": "Naam locatie of null",
  "venue_address": "Volledig adres of null",
  "contact_person": "Naam of null",
  "start_time": "18:00 of null",
  "end_time": "22:00 of null",
  "dishes": [
    {
      "title": "Volledige gerechtnaam zoals op menu",
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

CATEGORIEEN:
- DRANKEN: mocktails, infused waters
- LUNCH: broodjeslunch, tasting lunch
- FINGERFOOD: hapjes op tafel om te delen
- FINGERBITES: doorgegeven hapjes
- HAPJES of APPETIZERS: warme/koude hapjes
- AMUSE: amuse-bouche
- VOORGERECHT: voorgerecht individueel
- TUSSENGERECHT: tussengerecht
- HOOFDGERECHT: hoofdgerecht
- HOOFDGERECHT PREMIUM: premium upgrade
- ON THE SIDE: bijgerechten
- SAUZEN: sauzen
- KAAS: kaasplank
- DESSERT: dessert
- MIGNARDISES: mignardises, bonbons
- LATE NIGHT SNACK: late night snacks
- KIDS: kindermenu
- BROOD & BOTER: brood met boter
- WALKING VOORGERECHT: walking dinner voorgerecht
- WALKING DINNER: walking dinner gangen
- SHARING VOORGERECHT: sharing voorgerecht

REGELS:
- sort_order: 10, 20, 30... per categorie
- quantity: ENKEL het getal (number), null als niet vermeld
- unit: ENKEL de eenheid, GEEN "pp"
- Return ALLEEN JSON, begin met {`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

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
    try {
      if (isPdf) {
        const response = await anthropic.messages.create({
          model: 'claude-opus-4-5',
          max_tokens: 8192,
          messages: [{
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } } as any,
              { type: 'text', text: MENU_EXTRACTION_PROMPT },
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
              { type: 'text', text: MENU_EXTRACTION_PROMPT },
            ],
          }],
        })
        const textContent = response.content.find(c => c.type === 'text')
        rawJson = (textContent as any)?.text || '{}'
      }
    } catch (aiErr: any) {
      console.error('AI error:', aiErr?.message)
      return NextResponse.json({ error: 'AI analyse mislukt. Probeer opnieuw.' }, { status: 500 })
    }

    let extracted: any
    try {
      const jsonMatch = rawJson.match(/\{[\s\S]*\}/)
      extracted = JSON.parse(jsonMatch ? jsonMatch[0] : rawJson)
    } catch {
      console.error('JSON parse error:', rawJson.slice(0, 300))
      return NextResponse.json({ error: 'Kon menu niet verwerken' }, { status: 422 })
    }

    if (!extracted.dishes || !Array.isArray(extracted.dishes)) {
      return NextResponse.json({ error: 'Geen gerechten gevonden in PDF' }, { status: 422 })
    }

    const admin = createAdminClient()
    const kitchenId = 'bc2bb78e-090e-4492-9779-d48763799d63'

    const { data: newEvent, error: eventErr } = await admin
      .from('events')
      .insert({
        name: extracted.event_name || file.name.replace(/\.[^/.]+$/, ''),
        event_date: extracted.event_date || new Date().toISOString().split('T')[0],
        num_persons: extracted.num_persons || null,
        price_per_person: extracted.price_per_person || null,
        event_type: extracted.event_type || 'cocktail',
        location: extracted.location || null,
        venue_address: extracted.venue_address || null,
        contact_person: extracted.contact_person || null,
        start_time: extracted.start_time || null,
        end_time: extracted.end_time || null,
        mep_status: 'draft',
        status: 'draft',
        kitchen_id: kitchenId,
      })
      .select('id, name')
      .single()

    if (eventErr || !newEvent) {
      console.error('Event insert error:', eventErr)
      return NextResponse.json({ error: 'Kon event niet aanmaken' }, { status: 500 })
    }

    const dishes = extracted.dishes as any[]
    let totalDishes = 0
    let totalComponents = 0

    for (let i = 0; i < dishes.length; i++) {
      const dish = dishes[i]
      const category = (dish.category || 'FINGERFOOD').toUpperCase().trim()

      const { data: mepDish, error: dishErr } = await admin
        .from('mep_dishes')
        .insert({
          event_id: newEvent.id,
          title: dish.title || `Gerecht ${i + 1}`,
          category,
          sort_order: dish.sort_order ?? (i * 10),
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

    return NextResponse.json({
      success: true,
      eventId: newEvent.id,
      eventName: newEvent.name,
      numDishes: totalDishes,
      numComponents: totalComponents,
    })

  } catch (err: any) {
    console.error('Import PDF error:', err)
    return NextResponse.json({ error: err.message || 'Onbekende fout' }, { status: 500 })
  }
}
