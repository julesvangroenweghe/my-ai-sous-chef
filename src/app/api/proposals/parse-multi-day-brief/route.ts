import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { briefText } = await request.json()

    if (!briefText?.trim()) {
      return NextResponse.json({ error: 'Geen brieftekst' }, { status: 400 })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `Je bent een expert catering assistant. Analyseer deze catering brief en extraheer ALLE informatie in een gestructureerd JSON formaat.

BRIEF:
${briefText}

Retourneer ALLEEN geldig JSON (geen markdown, geen uitleg) in dit exacte formaat:

{
  "event": {
    "name": "naam van het event (bv. Huwelijk Laura & Thomas)",
    "start_date": "YYYY-MM-DD (eerste dag)",
    "end_date": "YYYY-MM-DD (laatste dag, zelfde als start_date als 1 dag)",
    "num_persons": 80,
    "num_children": 6,
    "location": "locatienaam",
    "contact_name": "naam contactpersoon",
    "contact_email": "email of null",
    "contact_phone": "telefoon of null"
  },
  "dietary_restrictions": ["veggie", "noten_allergie", "vis_allergie"],
  "dietary_notes": "vrije tekst over wie welk dieet heeft — bv. bruid veggie, papa bruidegom vis+noten",
  "days": [
    {
      "day_label": "Vrijdag 18 juni",
      "date": "YYYY-MM-DD",
      "moments": [
        {
          "time": "18u00",
          "type": "Apero",
          "format": "cocktail",
          "description": "korte beschrijving van het moment",
          "courses": [
            {
              "course_name": "FINGERFOOD",
              "dishes": [
                {
                  "name": "Artisjok – vinaigrette salée – daslook olie",
                  "description": null,
                  "client_notes": null,
                  "is_open_question": false,
                  "dietary_flags": []
                }
              ]
            },
            {
              "course_name": "APPETIZERS",
              "dishes": [...]
            }
          ]
        },
        {
          "time": "19u30",
          "type": "Diner",
          "format": "sit_down",
          "description": "gezellig diner in losse sfeer",
          "courses": [
            {
              "course_name": "HOOFDGERECHT",
              "dishes": [
                {
                  "name": "Optie 1: Witte pens Dierendonck & gemarineerde Aradoa kip",
                  "description": "Gegrilde padrons & gepofte zoete aardappel – Gegrilde courgette – pecorino - kappercrunch",
                  "client_notes": "2 nieuwe VEGGIE opties uitwerken",
                  "is_open_question": true,
                  "dietary_flags": ["vlees_optie"]
                }
              ]
            }
          ]
        }
      ],
      "budget_items": [
        {
          "label": "Food receptie",
          "price_pp": 16.00,
          "notes": null
        }
      ],
      "open_questions": ["2 nieuwe VEGGIE opties uitwerken voor het hoofdgerecht"]
    }
  ],
  "budget_summary": "overzicht als vrije tekst",
  "global_open_questions": ["alle @Jules: notities als lijst"]
}

REGELS:
- is_open_question = true als er een "@Jules:" notitie bij staat of als er iets nog TBC/te bepalen is
- client_notes = de exacte noot van de klant bij een gerecht (bv. "graag iets luchtig met rood fruit")
- dietary_flags: gebruik ["veggie"], ["vis"], ["noten"], ["vlees_optie"] waar van toepassing
- Extraheer ALLE gerechten, ook drinks zijn niet nodig (focus op food)
- format waarden: "cocktail", "sit_down", "walking_dinner", "buffet", "brunch", "fingerfood_only"
- Als een gerecht meerdere opties heeft, maak dan aparte dishes met "Optie 1:" en "Optie 2:" prefix
- Extraheer ook buffet-items (ontbijt/brunch items tellen ook mee)`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    // Extract JSON from response (handles cases where Claude adds extra text)
    let jsonText = content.text.trim()
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }

    const parsed = JSON.parse(jsonText)
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Parse brief error:', error)
    return NextResponse.json(
      { error: 'Parsing mislukt: ' + (error instanceof Error ? error.message : 'Onbekende fout') },
      { status: 500 }
    )
  }
}
