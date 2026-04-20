import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function fuzzyMatch(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1.0
  if (na.includes(nb) || nb.includes(na)) return 0.85
  const wordsA = na.split(/\s+/)
  const wordsB = nb.split(/\s+/)
  const commonWords = wordsA.filter(w => wordsB.some(wb => wb.includes(w) || w.includes(wb)))
  return (commonWords.length * 2) / (wordsA.length + wordsB.length)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: eventId } = await params

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Geen bestand geüpload' }, { status: 400 })
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Ongeldig bestandstype. Upload een PDF, JPG of PNG.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const contentBlock = file.type === 'application/pdf'
      ? {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf' as const,
            data: base64,
          },
        }
      : {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: file.type as 'image/jpeg' | 'image/png',
            data: base64,
          },
        }

    const mepPrompt = `Je bent een MEP (Mise en Place) expert. Lees dit document en extraheer alle gerechten en hun componenten.

Geef terug als JSON (ALLEEN JSON, geen andere tekst of markdown):
{
  "dishes": [
    {
      "name": "Naam gerecht",
      "category": "FINGERFOOD|FINGERBITES|HAPJES|AMUSE|VOORGERECHT|TUSSENGERECHT|HOOFDGERECHT|KAAS|DESSERT|MIGNARDISES|HALFABRICAAT",
      "components": [
        {
          "name": "Component naam",
          "quantity_per_person": 30,
          "unit": "g",
          "group": "Hoofdelement|Garnituur|Saus|Afwerking"
        }
      ]
    }
  ],
  "document_type": "menu|offerte|mep_list|recipe_list",
  "notes": "Opmerkingen over het document"
}

Regels:
- Alle quantities PER PERSOON
- unit = alleen de eenheid (g, ml, st), NOOIT 'pp' of 'per persoon'
- Koffie & thee NOOIT opnemen
- Brood alleen bij sit-down met voor+hoofdgerecht
- Als geen hoeveelheid bekend: stel een realistische in
- ALLEEN valid JSON terug, geen markdown codeblocks`

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
        messages: [{
          role: 'user',
          content: [contentBlock, { type: 'text', text: mepPrompt }],
        }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic error:', errText)
      return NextResponse.json({ error: 'AI-verwerking mislukt' }, { status: 502 })
    }

    const aiResult = await response.json()
    const textContent = aiResult.content?.[0]?.text || ''

    let rawText = textContent.trim()
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Kon document niet verwerken' }, { status: 422 })
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Load recipes for fuzzy matching
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id, name, description')
      .eq('status', 'active')
      .limit(100)

    const recipesArr = recipes || []

    // Match dishes to recipes
    const dishesWithMatches = (parsed.dishes || []).map((dish: { name: string; category: string; components: unknown[] }) => {
      let bestMatch: { id: string; name: string; score: number } | null = null

      for (const recipe of recipesArr) {
        const score = fuzzyMatch(dish.name, recipe.name)
        if (score > 0.4 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { id: recipe.id, name: recipe.name, score }
        }
      }

      return {
        ...dish,
        matched_recipe: bestMatch,
      }
    })

    return NextResponse.json({
      dishes: dishesWithMatches,
      document_type: parsed.document_type || 'unknown',
      notes: parsed.notes || '',
      event_id: eventId,
    })
  } catch (err) {
    console.error('Import MEP error:', err)
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: eventId } = await params
    const body = await request.json()
    const { menu_items } = body

    if (!Array.isArray(menu_items) || menu_items.length === 0) {
      return NextResponse.json({ error: 'Geen menu items opgegeven' }, { status: 400 })
    }

    // Validate event belongs to user's kitchen
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Event niet gevonden' }, { status: 404 })
    }

    const { error: insertError } = await supabase
      .from('event_menu_items')
      .insert(menu_items.map((item: { recipe_id: string; course_order: number; course: string }) => ({
        event_id: eventId,
        recipe_id: item.recipe_id,
        course_order: item.course_order,
        course: item.course,
      })))

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Kon menu items niet opslaan' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Import MEP PUT error:', err)
    return NextResponse.json({ error: 'Onbekende fout' }, { status: 500 })
  }
}
