// src/app/api/recipes/ocr-import/route.ts
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const EXTRACT_PROMPT = `Je bent een culinaire AI die recepten extraheert uit tekst of foto's van recepten.

Extraheer ALLE recepten die je vindt en geef ze terug als JSON in dit exacte formaat:
{
  "recipes": [
    {
      "name": "Naam van het gerecht",
      "description": "Korte beschrijving (1-2 zinnen, in het Nederlands)",
      "category": "voorgerecht|hoofdgerecht|dessert|bijgerecht|saus|basis|hapje|overige",
      "servings": 4,
      "prep_time_minutes": 30,
      "ingredients": [
        { "name": "Ingrediëntnaam", "quantity": "200", "unit": "g" }
      ],
      "steps": [
        "Stap 1: Beschrijving",
        "Stap 2: Beschrijving"
      ],
      "notes": "Eventuele chef-notities of tips"
    }
  ]
}

Regels:
- Extraheer ALLE recepten die je ziet, ook als er meerdere zijn
- Converteer naar grammen/ml waar mogelijk, gebruik 'stuk' voor stuks
- Als hoeveelheid onduidelijk is, gebruik null
- Stappen als volledige zinnen, niet als fragmenten
- Als er geen recept te vinden is: geef lege array
- Geef ALTIJD geldige JSON terug, niets anders`

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const contentType = request.headers.get('content-type') || ''

    let result: any

    if (contentType.includes('multipart/form-data')) {
      // Image OCR mode
      const formData = await request.formData()
      const files = formData.getAll('files') as File[]

      if (!files.length) {
        return NextResponse.json({ error: 'Geen bestanden ontvangen' }, { status: 400 })
      }

      // Process all images in one Claude call
      const imageContent: any[] = []
      for (const file of files.slice(0, 10)) { // max 10 images
        const bytes = await file.arrayBuffer()
        const base64 = Buffer.from(bytes).toString('base64')
        // Normalize MIME type
        let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg'
        if (file.type === 'image/png') mediaType = 'image/png'
        else if (file.type === 'image/gif') mediaType = 'image/gif'
        else if (file.type === 'image/webp') mediaType = 'image/webp'

        imageContent.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 }
        })
      }

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            ...imageContent,
            { type: 'text', text: EXTRACT_PROMPT }
          ]
        }]
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      result = parseRecipesFromText(text)

    } else {
      // Text / .enex parsing mode
      const body = await request.json()
      const { text } = body

      if (!text?.trim()) {
        return NextResponse.json({ error: 'Geen tekst ontvangen' }, { status: 400 })
      }

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `${EXTRACT_PROMPT}\n\nTekst om te verwerken:\n\n${text.slice(0, 8000)}`
        }]
      })

      const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
      result = parseRecipesFromText(responseText)
    }

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('OCR import error:', err)
    return NextResponse.json({ error: err.message || 'Import mislukt' }, { status: 500 })
  }
}

function parseRecipesFromText(text: string): { recipes: any[] } {
  // Try to find JSON block
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { recipes: [] }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    return { recipes: Array.isArray(parsed.recipes) ? parsed.recipes : [] }
  } catch {
    // Try to repair common JSON issues
    try {
      const cleaned = jsonMatch[0]
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
      const parsed = JSON.parse(cleaned)
      return { recipes: Array.isArray(parsed.recipes) ? parsed.recipes : [] }
    } catch {
      return { recipes: [] }
    }
  }
}
