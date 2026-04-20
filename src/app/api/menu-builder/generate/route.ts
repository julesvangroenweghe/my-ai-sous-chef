import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const MONTH_NAMES: Record<number, string> = {
  1: 'jan', 2: 'feb', 3: 'mar', 4: 'apr', 5: 'may', 6: 'jun',
  7: 'jul', 8: 'aug', 9: 'sep', 10: 'oct', 11: 'nov', 12: 'dec',
}

const COURSE_LABELS: Record<string, string> = {
  AMUSE: 'Amuse-bouche',
  FINGERFOOD: 'Fingerfood / Fingerbites',
  VOORGERECHT: 'Voorgerecht',
  TUSSENGERECHT: 'Tussengerecht',
  HOOFDGERECHT: 'Hoofdgerecht',
  KAAS: 'Kaas',
  DESSERT: 'Dessert',
  MIGNARDISES: 'Mignardises',
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      event_type = 'walking_dinner',
      num_persons = 50,
      price_per_person = 65,
      food_cost_target = 30,
      date,
      allergies = [],
      courses = ['AMUSE', 'HOOFDGERECHT', 'DESSERT'],
      style = 'Modern',
      hint = '',
    } = body

    // Get kitchen_id via kitchen_members
    const { data: memberData } = await supabase
      .from('kitchen_members')
      .select('kitchen_id, kitchens(id, name)')
      .eq('user_id', user.id)
      .single()

    const kitchenId = memberData?.kitchen_id || null

    // Load chef profile
    const { data: chef } = await supabase
      .from('chef_profiles')
      .select('display_name, kitchen_type, cuisine_specialties, cooking_philosophy, style_analysis, bio')
      .eq('auth_user_id', user.id)
      .single()

    // Load own recipes
    const recipesQuery = supabase
      .from('recipes')
      .select('id, name, description, category_id, total_cost_per_serving, number_of_servings')
      .eq('status', 'active')
      .limit(60)

    if (kitchenId) {
      recipesQuery.eq('kitchen_id', kitchenId)
    }

    const { data: ownRecipes } = await recipesQuery

    // Load LEGENDE dishes
    const { data: legendeDishes } = await supabase
      .from('legende_dishes')
      .select('id, name, category_id, element_count, notes, elements:legende_dish_elements(name, quantity_text)')
      .limit(80)

    // Determine month from date
    const eventDate = date ? new Date(date) : new Date()
    const monthNum = eventDate.getMonth() + 1
    const monthKey = MONTH_NAMES[monthNum] as string

    // Load seasonal peak products
    const { data: seasonalItems } = await supabase
      .from('seasonal_calendar')
      .select(`id, name, category, ${monthKey}`)
      .eq(monthKey, 2)
      .limit(30)

    const maxFoodCost = ((price_per_person * food_cost_target) / 100).toFixed(2)

    // Build prompt
    const styleInfo = chef?.style_analysis
      ? (typeof chef.style_analysis === 'object'
        ? (chef.style_analysis as Record<string, unknown>)['style_description'] || JSON.stringify(chef.style_analysis).slice(0, 200)
        : String(chef.style_analysis).slice(0, 200))
      : chef?.cooking_philosophy || chef?.bio || 'niet gespecificeerd'

    const recipesList = (ownRecipes || []).map(r =>
      `- ${r.name} | €${Number(r.total_cost_per_serving || 0).toFixed(2)}/p | id: ${r.id}`
    ).join('\n')

    const legendeList = (legendeDishes || []).map(d => {
      const elems = (d.elements as Array<{ name: string; quantity_text: string | null }> || [])
        .map(e => e.name).join(', ')
      return `- ${d.name} | elementen: ${elems || 'nvt'} | id: ${d.id}`
    }).join('\n')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seasonalList = (seasonalItems || []).map((s: any) => `- ${s.name} (${s.category})`).join('\n')

    const coursesWithLabels = courses.map((c: string) => COURSE_LABELS[c] || c).join(', ')

    const prompt = `Je bent een culinaire AI-assistent die een menu samenstelt voor een professionele chef.

CHEF PROFIEL:
- Naam: ${chef?.display_name || 'Chef'}
- Keukentype: ${chef?.kitchen_type || 'catering'}
- Kookstijl: ${styleInfo}

EVENT INFO:
- Type: ${event_type}
- Personen: ${num_persons}
- Verkoopprijs pp: €${price_per_person}
- Food cost target: ${food_cost_target}%
- Max food cost budget pp: €${maxFoodCost}
- Datum: ${date || new Date().toISOString().slice(0, 10)}
- Gewenste gangen: ${coursesWithLabels}
- Stijl: ${style}
- Allergieën: ${allergies.length > 0 ? allergies.join(', ') : 'geen'}
- Hint van de chef: ${hint || 'geen'}

EIGEN RECEPTEN (${ownRecipes?.length || 0}):
${recipesList || '(geen recepten gevonden)'}

LEGENDE GERECHTEN (${legendeDishes?.length || 0}):
${legendeList || '(geen LEGENDE gerechten)'}

SEIZOENSPIEK PRODUCTEN (deze maand):
${seasonalList || '(geen data)'}

Maak een menu voorstel. Geef voor elke gang 1 gerecht (of 2-3 bij fingerfood/mignardises).
Prioriteer: (1) eigen recepten van de chef, (2) LEGENDE gerechten, (3) nieuw AI-voorstel.
Houd rekening met allergieën - vermijd deze ingrediënten volledig.

Geef terug als JSON (ALLEEN JSON, geen markdown):
{
  "menu": [
    {
      "course": "AMUSE",
      "course_label": "Amuse-bouche",
      "items": [
        {
          "name": "Naam gerecht",
          "description": "Korte beschrijving",
          "source": "own_recipe",
          "recipe_id": "uuid of null",
          "legende_id": "uuid of null",
          "key_ingredients": ["ingredient1", "ingredient2"],
          "seasonal_highlights": ["seizoensingrediënt"],
          "estimated_cost_pp": 2.50,
          "notes": "optionele opmerking"
        }
      ]
    }
  ],
  "total_estimated_cost_pp": 18.50,
  "total_food_cost_pct": 28.5,
  "chef_note": "Persoonlijke noot over dit menu"
}

Realistische kostenschattingen: amuse €1-3/p, voorgerecht €3-6/p, tussengerecht €4-7/p, hoofdgerecht €6-12/p, dessert €2-5/p, mignardises €1-2/p, fingerfood (3 stuks) €3-6/p.
source moet "own_recipe", "legende" of "new" zijn. Als je eigen recept gebruikt, zet het echte recipe_id.`

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
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic error:', errText)
      return NextResponse.json({ error: 'AI-aanvraag mislukt' }, { status: 502 })
    }

    const aiResult = await response.json()
    const textContent = aiResult.content?.[0]?.text || ''

    let rawText = textContent.trim()
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Kon menu niet verwerken' }, { status: 422 })
    }

    const menuData = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      ...menuData,
      event_type,
      num_persons,
      price_per_person,
      food_cost_target,
      date,
      courses,
      allergies,
      style,
    })
  } catch (error) {
    console.error('Menu builder error:', error)
    return NextResponse.json({ error: 'Fout bij menu aanmaken' }, { status: 500 })
  }
}
