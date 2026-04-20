import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

interface ParsedDish {
  name: string
  category: string
  description: string
  matched_recipe_id: string | null
  matched_recipe_name: string | null
  matched_legende_id: string | null
  matched_legende_name: string | null
  confidence: number
}

interface ParsedMenu {
  event_info: {
    name: string | null
    date: string | null
    num_persons: number | null
    event_type: string | null
    location: string | null
    contact_person: string | null
    price_per_person: number | null
    notes: string | null
  }
  dishes: ParsedDish[]
}

const COURSE_ORDER: Record<string, number> = {
  'AMUSE': 0,
  'FINGERFOOD': 0,
  'FINGERBITES': 0,
  'HAPJES': 0,
  'VOORGERECHT': 1,
  'TUSSENGERECHT': 2,
  'WALKING DINNER': 3,
  'HOOFDGERECHT': 3,
  'KAAS': 4,
  'DESSERT': 5,
  'MIGNARDISES': 6,
  'HALFABRICAAT': 7,
}

function fuzzyMatch(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1.0
  if (na.includes(nb) || nb.includes(na)) return 0.85

  const wordsA = na.split(/\s+/)
  const wordsB = nb.split(/\s+/)
  const commonWords = wordsA.filter(w => wordsB.some(wb => wb.includes(w) || w.includes(wb)))
  const matchRatio = (commonWords.length * 2) / (wordsA.length + wordsB.length)
  return matchRatio
}

function matchDishToRecipes(
  dishName: string,
  recipes: { id: string; name: string; description: string | null; total_cost_per_serving: number | null }[],
  legendeDishes: { id: string; name: string; category_id: string | null; element_count: number | null }[]
): { recipe_id: string | null; recipe_name: string | null; legende_id: string | null; legende_name: string | null; confidence: number } {
  let bestRecipeMatch = { id: '', name: '', score: 0 }
  let bestLegendeMatch = { id: '', name: '', score: 0 }

  for (const recipe of recipes) {
    const nameScore = fuzzyMatch(dishName, recipe.name)
    const descScore = recipe.description ? fuzzyMatch(dishName, recipe.description) * 0.7 : 0
    const score = Math.max(nameScore, descScore)
    if (score > bestRecipeMatch.score) {
      bestRecipeMatch = { id: recipe.id, name: recipe.name, score }
    }
  }

  for (const dish of legendeDishes) {
    const score = fuzzyMatch(dishName, dish.name)
    if (score > bestLegendeMatch.score) {
      bestLegendeMatch = { id: dish.id, name: dish.name, score }
    }
  }

  const threshold = 0.4
  return {
    recipe_id: bestRecipeMatch.score >= threshold ? bestRecipeMatch.id : null,
    recipe_name: bestRecipeMatch.score >= threshold ? bestRecipeMatch.name : null,
    legende_id: bestLegendeMatch.score >= threshold ? bestLegendeMatch.id : null,
    legende_name: bestLegendeMatch.score >= threshold ? bestLegendeMatch.name : null,
    confidence: Math.max(bestRecipeMatch.score, bestLegendeMatch.score),
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Geen bestand geüpload' }, { status: 400 })
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Ongeldig bestandstype. Upload een PDF of afbeelding.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const mediaType = file.type === 'application/pdf' ? 'application/pdf' as const : file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
    const sourceType = file.type === 'application/pdf' ? 'base64' as const : 'base64' as const
    const contentBlockType = file.type === 'application/pdf' ? 'document' as const : 'image' as const

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
            media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
            data: base64,
          },
        }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            contentBlock,
            {
              type: 'text',
              text: `Analyseer dit catering menu document en extraheer alle informatie. Antwoord ALLEEN met valid JSON, geen andere tekst.

Geef terug in dit formaat:
{
  "event_info": {
    "name": "naam van het event of null",
    "date": "YYYY-MM-DD of null",
    "num_persons": getal of null,
    "event_type": "walking_dinner|buffet|sit_down|cocktail|brunch|tasting|daily_service of null",
    "location": "locatie of null",
    "contact_person": "contactpersoon of null",
    "price_per_person": getal of null,
    "notes": "extra opmerkingen of null"
  },
  "dishes": [
    {
      "name": "naam van het gerecht",
      "category": "AMUSE|VOORGERECHT|TUSSENGERECHT|HOOFDGERECHT|KAAS|DESSERT|MIGNARDISES|FINGERFOOD|FINGERBITES|HAPJES|WALKING DINNER|HALFABRICAAT",
      "description": "korte beschrijving van het gerecht"
    }
  ]
}

Regels:
- Categoriseer elk gerecht in de juiste gang/categorie
- Koffie en thee NOOIT opnemen
- Brood alleen bij sit-down met voor+hoofdgerecht
- Alle gangbare Nederlandse/Belgische course namen herkennen
- Als je een gang niet kunt categoriseren, gebruik "HOOFDGERECHT"
- Geef ALLEEN valid JSON terug, geen markdown codeblocks`,
            },
          ],
        },
      ],
    })

    const textContent = response.content.find(b => b.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'Geen tekst in AI response' }, { status: 500 })
    }

    let rawText = textContent.text.trim()
    // Strip markdown code fences if present
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    let parsed: { event_info: ParsedMenu['event_info']; dishes: { name: string; category: string; description: string }[] }
    try {
      parsed = JSON.parse(rawText)
    } catch {
      return NextResponse.json({ error: 'AI response kon niet als JSON geparsed worden', raw: rawText }, { status: 500 })
    }

    // Fetch existing recipes and legende dishes for matching
    const supabase = await createClient()
    const [recipesResult, legendeResult] = await Promise.all([
      supabase.from('recipes').select('id, name, description, total_cost_per_serving'),
      supabase.from('legende_dishes').select('id, name, category_id, element_count'),
    ])

    const recipes = recipesResult.data || []
    const legendeDishes = legendeResult.data || []

    // Match each dish
    const matchedDishes: ParsedDish[] = parsed.dishes.map(dish => {
      const match = matchDishToRecipes(dish.name, recipes, legendeDishes)
      return {
        name: dish.name,
        category: dish.category,
        description: dish.description,
        matched_recipe_id: match.recipe_id,
        matched_recipe_name: match.recipe_name,
        matched_legende_id: match.legende_id,
        matched_legende_name: match.legende_name,
        confidence: match.confidence,
      }
    })

    const result: ParsedMenu = {
      event_info: parsed.event_info,
      dishes: matchedDishes,
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    console.error('Parse menu error:', err)
    const message = err instanceof Error ? err.message : 'Onbekende fout bij het parsen van het menu'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
