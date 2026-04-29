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
      max_tokens: 12000,
      messages: [
        {
          role: 'user',
          content: `Analyseer deze catering brief en extraheer ALLE informatie als geldig JSON. Wees BEKNOPT — geen null waarden, geen lege arrays, geen lege strings.

BRIEF:
${briefText}

Retourneer ALLEEN geldig JSON (geen markdown):

{
  "event": {
    "name": "string",
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
    "num_persons": 80,
    "num_children": 6,
    "location": "string",
    "contact_name": "string"
  },
  "dietary_restrictions": ["veggie","noten_allergie","vis_allergie"],
  "dietary_notes": "string",
  "days": [
    {
      "day_label": "Vrijdag 18 juni",
      "date": "YYYY-MM-DD",
      "moments": [
        {
          "time": "18u00",
          "type": "Apero",
          "format": "cocktail",
          "courses": [
            {
              "course_name": "FINGERFOOD",
              "dishes": [
                {
                  "name": "gerechtnaam",
                  "description": "optioneel",
                  "is_open_question": false,
                  "dietary_flags": ["veggie"]
                }
              ]
            }
          ]
        }
      ],
      "budget_items": [{"label": "string", "price_pp": 16.00}],
      "open_questions": ["vraag 1", "vraag 2"]
    }
  ],
  "global_open_questions": ["alle @Jules: notities"]
}

REGELS:
- is_open_question=true als er @Jules: notitie bij staat of als het TBC/te bepalen is
- dietary_flags alleen als van toepassing: ["veggie"], ["vis"], ["noten"], ["vlees"]
- Omit lege arrays en null waarden
- Extraheer ALLE dagen en gerechten volledig
- format: "cocktail","sit_down","walking_dinner","buffet","brunch"
- @Jules: notities → global_open_questions + dag open_questions
- Zorg dat JSON volledig afgesloten is`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    let jsonText = content.text.trim()
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Initial parse failed, attempting repair...', parseError)
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

function attemptJsonRepair(jsonText: string): unknown | null {
  try {
    const stack: string[] = []
    let inString = false
    let escaped = false
    let lastGoodPos = 0

    for (let i = 0; i < jsonText.length; i++) {
      const char = jsonText[i]
      
      if (escaped) { escaped = false; continue }
      if (char === '\\' && inString) { escaped = true; continue }
      if (char === '"') { inString = !inString; continue }
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

    if (stack.length === 0) return JSON.parse(jsonText)

    const truncated = jsonText.substring(0, lastGoodPos + 1)
    const closing = stack.reverse().join('')
    return JSON.parse(truncated + closing)
  } catch {
    return null
  }
}
