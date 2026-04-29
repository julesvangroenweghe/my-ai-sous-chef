import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, imageBase64, imageMimeType } = body

    if (!text && !imageBase64) {
      return NextResponse.json({ error: 'Geen inhoud opgegeven' }, { status: 400 })
    }

    const systemPrompt = `Je bent een culinaire assistent die klantbriefings, event-opdrachten en menu-voorstellen analyseert voor professionele cateraars en chefs.
Extraheer ALLE relevante informatie, inclusief concrete gerechten en klantfeedback.

Retourneer ALTIJD geldig JSON in dit exacte formaat:
{
  "event_name": string | null,
  "contact_person": string | null,
  "menu_type": "walking_dinner" | "cocktail_dinatoire" | "sit_down" | "bbq_buffet" | "aperitief" | "cocktail" | "gala" | "brunch" | "high_tea" | "lunch_buffet" | "event",
  "num_persons": number | null,
  "budget_total": number | null,
  "budget_pp": number | null,
  "date_hint": string | null,
  "location": string | null,
  "style": "Modern" | "Klassiek" | "Seizoensgebonden" | "Fusion" | null,
  "courses": ["AMUSE","FINGERFOOD","HAPJES","FINGERBITES","VOORGERECHT","TUSSENGERECHT","HOOFDGERECHT","KAAS","DESSERT","MIGNARDISES"],
  "dishes_per_course": {
    "COURSE_KEY": [
      { "name": "string — exacte gerechtnaam", "description": "string — omschrijving of subcomponenten indien aanwezig" }
    ]
  },
  "exclusions": ["lijst van uitgesloten ingrediënten of allergieën"],
  "client_feedback": "string — als er feedback van de klant in de tekst staat, letterlijk of samengevat" | null,
  "special_requests": string | null,
  "summary": "Korte samenvatting van de opdracht in 1-2 zinnen"
}

Regels voor dishes_per_course:
- COURSE_KEY moet een van deze zijn: AMUSE, FINGERFOOD, HAPJES, FINGERBITES, VOORGERECHT, TUSSENGERECHT, HOOFDGERECHT, KAAS, DESSERT, MIGNARDISES
- Als de brief een volledig menu bevat, extraheer elk gerecht per gang
- Maak de namen zo precies mogelijk — niet "vis" maar "tarbot met beurre blanc"
- Als er geen gerechten vermeld worden voor een gang, laat die gang weg uit dishes_per_course
- Als de brief een "walking dinner" formaat heeft, gebruik dan FINGERBITES of HAPJES per service

Regels voor menu_type mapping:
- "walking dinner" → walking_dinner
- "cocktail dînatoire" of "dînatoire" → cocktail_dinatoire
- "galadineren" of "gala" → gala
- "zitdiner" of "zittend" of "sit-down" → sit_down
- "BBQ" of "barbecue" → bbq_buffet
- "aperitief" of "vin d'honneur" → aperitief
- "brunch" → brunch
- "high tea" → high_tea

Geef ALLEEN JSON terug, geen andere tekst.`

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
              : 'Analyseer deze afbeelding en extraheer de event/menu informatie inclusief alle gerechten.',
          },
        ],
      })
    } else {
      messages.push({
        role: 'user',
        content: `Analyseer de volgende klantbriefing en extraheer alle informatie inclusief gerechten:\n\n${text}`,
      })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Kon geen gegevens extraheren uit de briefing' }, { status: 422 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({ success: true, brief: parsed })
  } catch (err) {
    console.error('parse-brief error:', err)
    return NextResponse.json({ error: 'Fout bij het verwerken van de briefing' }, { status: 500 })
  }
}
