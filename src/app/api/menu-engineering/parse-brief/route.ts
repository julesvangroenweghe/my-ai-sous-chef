import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function parseBrief(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const { text, imageBase64, imageMimeType } = body

    if (!text && !imageBase64) {
      return NextResponse.json({ error: 'Geen inhoud opgegeven' }, { status: 400 })
    }

    const systemPrompt = `Je bent een culinaire assistent die klantbriefings analyseert voor professionele cateraars en chefs.
Extraheer ALLE relevante informatie, inclusief concrete gerechten en tijdslijn.

Retourneer ALTIJD geldig JSON in dit exacte formaat:
{
  "event_name": "string",
  "contact_person": "string of null",
  "num_persons": number of null,
  "date_hint": "YYYY-MM-DD of null",
  "end_date": "YYYY-MM-DD of null",
  "location": "string of null",
  "exclusions": ["allergieën", "uitsluitingen"],
  "budget_total": number of null,
  "budget_pp": number of null,
  "timeline": [
    {
      "start": "18:30",
      "end": "20:00",
      "duration_minutes": 90,
      "label": "Ontvangst & Apero",
      "service": ["drinks", "fingerfood", "appetizers"],
      "dishes": [
        { "name": "gerechtnaam", "is_open_question": false }
      ]
    }
  ],
  "dietary_notes": "string of null",
  "special_requests": "string of null",
  "client_feedback": "string of null",
  "summary": "Korte samenvatting in 1-2 zinnen"
}

Service types voor timeline[].service[]:
- "drinks" — drankjes, aperitief, ontvangst
- "fingerfood" — kleine hapjes, canapes, fingerbites
- "appetizers" — verfijnde amuses, 1-hap gerechtjes
- "walking" — walking dinner, staand diner
- "sit_down" — zittend diner, gala, formeel
- "buffet" — buffet, BBQ, zelfbediening
- "dessert" — dessert, zoet, mignardises
- "open_bar" — open bar, vrij drinkmoment
- "brunch" — brunch, ontbijt-lunch
- "cocktail" — cocktail dinatoire

Regels:
- timeline[] bevat elk tijdsblok chronologisch — GEEN losse menu_type enum
- service[] geeft aan welke service-types plaatsvinden in dat blok
- dishes[] zijn de gerechten die in dat tijdsblok worden geserveerd
- is_open_question=true als het gerecht nog niet bepaald is (TBC, @Jules: etc)
- GEEN menu_type veld — gebruik uitsluitend timeline[]
- Geef ALLEEN JSON terug, geen andere tekst
- Als er geen tijden zijn in de brief: schat redelijke tijden op basis van context`

    const messages: Anthropic.MessageParam[] = []

    if (imageBase64) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: (imageMimeType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: text
              ? `Analyseer deze afbeelding en de volgende tekst:\n\n${text}`
              : 'Analyseer deze afbeelding en extraheer de event/menu informatie inclusief tijdslijn.',
          },
        ],
      })
    } else {
      messages.push({
        role: 'user',
        content: `Analyseer de volgende klantbriefing en extraheer alle informatie inclusief tijdslijn:\n\n${text}`,
      })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleaned = rawText.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Kon geen gegevens extraheren uit de briefing' }, { status: 422 })
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Backward compatibility: afgeleid menu_type op basis van timeline services
    if (!parsed.menu_type && Array.isArray(parsed.timeline) && parsed.timeline.length > 0) {
      const allServices: string[] = parsed.timeline.flatMap((t: { service?: string[] }) => t.service || [])
      if (allServices.includes('walking')) parsed.menu_type = 'walking_dinner'
      else if (allServices.includes('sit_down')) parsed.menu_type = 'sit_down'
      else if (allServices.includes('buffet')) parsed.menu_type = 'buffet'
      else if (allServices.includes('cocktail')) parsed.menu_type = 'cocktail_dinatoire'
      else if (allServices.includes('brunch')) parsed.menu_type = 'brunch'
      else if (allServices.includes('fingerfood') || allServices.includes('appetizers')) parsed.menu_type = 'cocktail'
      else parsed.menu_type = 'event'
    }

    // Backward compat: courses array op basis van timeline
    if (!parsed.courses && Array.isArray(parsed.timeline)) {
      const allServices: string[] = parsed.timeline.flatMap((t: { service?: string[] }) => t.service || [])
      const courseMap: Record<string, string[]> = {
        fingerfood: ['FINGERFOOD'],
        appetizers: ['APPETIZERS'],
        walking: ['WALKING DINNER'],
        sit_down: ['VOORGERECHT', 'HOOFDGERECHT'],
        dessert: ['DESSERT'],
        buffet: ['BUFFET'],
      }
      const courses = new Set<string>()
      allServices.forEach(s => (courseMap[s] || []).forEach(c => courses.add(c)))
      if (courses.size > 0) parsed.courses = Array.from(courses)
    }

    return NextResponse.json({ success: true, brief: parsed })
  } catch (err) {
    console.error('parse-brief error:', err)
    return NextResponse.json({ error: 'Fout bij het verwerken van de briefing' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await parseBrief(request)
        const body = await response.text()
        controller.enqueue(encoder.encode(body))
      } catch (error) {
        console.error('Menu generate error:', error)
        controller.enqueue(encoder.encode(JSON.stringify({
          error: 'Fout bij menu genereren',
          details: error instanceof Error ? error.message : 'Onbekende fout'
        })))
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/json' }
  })
}
