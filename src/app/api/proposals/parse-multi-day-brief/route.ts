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
      max_tokens: 8000,
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
  "dietary_notes": "vrije tekst over wie welk dieet heeft",
  "days": [
    {
      "day_label": "Vrijdag 18 juni",
      "date": "YYYY-MM-DD",
      "moments": [
        {
          "time": "18u00",
          "type": "Apero",
          "format": "cocktail",
          "description": "korte beschrijving",
          "courses": [
            {
              "course_name": "FINGERFOOD",
              "dishes": [
                {
                  "name": "gerechtnaam",
                  "description": null,
                  "client_notes": null,
                  "is_open_question": false,
                  "dietary_flags": []
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
      "open_questions": ["lijst van open vragen voor dit dag"]
    }
  ],
  "budget_summary": "overzicht als vrije tekst",
  "global_open_questions": ["alle @Jules: notities als lijst"]
}

REGELS:
- is_open_question = true als er een "@Jules:" notitie bij staat of als er iets nog TBC/te bepalen is
- client_notes = de exacte noot van de klant bij een gerecht
- dietary_flags: gebruik ["veggie"], ["vis"], ["noten"], ["vlees_optie"] waar van toepassing
- Extraheer ALLE gerechten uit de brief, elke dag volledig
- format waarden: "cocktail", "sit_down", "walking_dinner", "buffet", "brunch", "fingerfood_only"
- Als een gerecht meerdere opties heeft, maak aparte dishes met "Optie 1:" en "Optie 2:" prefix
- BELANGRIJK: Sluit de JSON volledig af — zorg dat alle arrays en objecten correct gesloten zijn`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    // Robust JSON extraction
    let jsonText = content.text.trim()
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    
    // Extract JSON object
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }

    // Try to parse — if it fails, attempt auto-repair
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonText)
    } catch (parseError) {
      // Attempt repair: find last complete day entry and close the JSON
      console.error('Initial parse failed, attempting repair...', parseError)
      
      // Try to find a valid JSON prefix by progressively truncating
      // Strategy: close any open arrays/objects to make valid JSON
      const repaired = attemptJsonRepair(jsonText)
      if (repaired) {
        parsed = repaired
      } else {
        throw new Error('JSON parsing failed: ' + (parseError instanceof Error ? parseError.message : String(parseError)))
      }
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Parse brief error:', error)
    return NextResponse.json(
      { error: 'Parsing mislukt: ' + (error instanceof Error ? error.message : 'Onbekende fout') },
      { status: 500 }
    )
  }
}

// Attempt to repair truncated JSON by closing open structures
function attemptJsonRepair(jsonText: string): unknown | null {
  try {
    // Count open braces/brackets to determine what needs closing
    const stack: string[] = []
    let inString = false
    let escaped = false
    let lastGoodPos = 0

    for (let i = 0; i < jsonText.length; i++) {
      const char = jsonText[i]
      
      if (escaped) {
        escaped = false
        continue
      }
      
      if (char === '\\' && inString) {
        escaped = true
        continue
      }
      
      if (char === '"') {
        inString = !inString
        continue
      }
      
      if (inString) continue
      
      if (char === '{' || char === '[') {
        stack.push(char === '{' ? '}' : ']')
      } else if (char === '}' || char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop()
          lastGoodPos = i
        }
      }
    }

    // If stack is empty, JSON was complete
    if (stack.length === 0) {
      return JSON.parse(jsonText)
    }

    // Try to close the JSON at the last good position
    const truncated = jsonText.substring(0, lastGoodPos + 1)
    const closing = stack.reverse().join('')
    const repaired = truncated + closing

    return JSON.parse(repaired)
  } catch {
    return null
  }
}
