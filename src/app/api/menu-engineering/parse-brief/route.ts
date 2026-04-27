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

    const systemPrompt = `Je bent een culinaire assistent die klantbriefings en event-opdrachten analyseert voor professionele cateraars en chefs.
Extraheer de relevante informatie uit de tekst of afbeelding en geef een gestructureerd JSON-antwoord.

Retourneer ALTIJD geldig JSON in dit exacte formaat:
{
  "menu_type": "event" | "tasting" | "fixed" | "a_la_carte" | "daily",
  "num_persons": number | null,
  "budget_total": number | null,
  "budget_pp": number | null,
  "date_hint": "string beschrijving van datum/periode" | null,
  "location": string | null,
  "event_name": string | null,
  "style": "Modern" | "Klassiek" | "Seizoensgebonden" | "Fusion" | null,
  "courses": ["AMUSE", "FINGERFOOD", "HAPJES", "FINGERBITES", "VOORGERECHT", "TUSSENGERECHT", "HOOFDGERECHT", "KAAS", "DESSERT", "MIGNARDISES"],
  "restrictions": ["glutenvrij", "lactosevrij", "vegetarisch", "vegan", "noten", "schaaldieren"],
  "special_requests": string | null,
  "summary": "Korte samenvatting van de opdracht in 1-2 zinnen"
}

Regels:
- courses: kies de meest logische gangen op basis van de context (bijv. "walking dinner" → FINGERFOOD + HAPJES + FINGERBITES; "3-gang" → VOORGERECHT + HOOFDGERECHT + DESSERT; "gala" → AMUSE + VOORGERECHT + TUSSENGERECHT + HOOFDGERECHT + DESSERT + MIGNARDISES)
- budget: als totaalbudget gegeven, bereken budget_pp op basis van num_persons; als "pp" staat berekeningen andersom
- menu_type: "event" voor catering/feest, "tasting" voor walking dinner/degustatie, "fixed" voor buffet
- style: probeer af te leiden uit beschrijving (luxueus=Klassiek, seizoens=Seizoensgebonden, trendy=Modern, internationaal=Fusion)
- special_requests: vat specifieke wensen samen (thema, ingrediënten, sfeer)
- Geef ALLEEN JSON terug, geen andere tekst`

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
              : 'Analyseer deze afbeelding en extraheer de event/menu informatie.',
          },
        ],
      })
    } else {
      messages.push({
        role: 'user',
        content: `Analyseer de volgende klantbriefing:\n\n${text}`,
      })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract JSON from response
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
