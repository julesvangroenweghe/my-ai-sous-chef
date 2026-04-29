import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Allow up to 60s for this AI route
export const maxDuration = 60

const MONTH_KEYS: Record<number, string> = {
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

const COST_HINTS: Record<string, string> = {
  AMUSE: '€1-3/p',
  FINGERFOOD: '€3-6/p (3 stuks)',
  VOORGERECHT: '€3-6/p',
  TUSSENGERECHT: '€4-7/p',
  HOOFDGERECHT: '€6-12/p',
  KAAS: '€2-4/p',
  DESSERT: '€2-5/p',
  MIGNARDISES: '€1-2/p',
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      course,
      current_menu = {},
      event_type = 'walking_dinner',
      num_persons = 50,
      price_per_person = 65,
      food_cost_target = 30,
    } = body

    if (!course) return NextResponse.json({ error: 'course required' }, { status: 400 })

    // Load chef profile
    const { data: chef } = await supabase
      .from('chef_profiles')
      .select('style_analysis, style_tags, preferred_ingredients, preferred_techniques, cooking_philosophy, cuisine_styles')
      .eq('auth_user_id', user.id)
      .single()

    // Load kitchen for recipe filter
    const { data: profile } = await supabase
      .from('chef_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    let kitchenId: string | null = null
    if (profile?.id) {
      const { data: membership } = await supabase
        .from('kitchen_members')
        .select('kitchen_id')
        .eq('chef_id', profile.id)
        .limit(1)
        .single()
      kitchenId = membership?.kitchen_id || null
    }

    // Load own recipes
    let recipesQuery = supabase
      .from('recipes')
      .select('id, name, description, total_cost_per_serving')
      .eq('status', 'active')
      .limit(30)
    if (kitchenId) recipesQuery = recipesQuery.eq('kitchen_id', kitchenId)
    const { data: ownRecipes } = await recipesQuery

    // Load LEGENDE dishes
    const { data: legendeDishes } = await supabase
      .from('legende_dishes')
      .select('id, name, notes, elements:legende_dish_elements(name)')
      .limit(60)

    // Load seasonal peak products
    const monthKey = MONTH_KEYS[new Date().getMonth() + 1]
    const { data: seasonal } = await supabase
      .from('seasonal_calendar')
      .select('ingredient_name')
      .eq(monthKey, 2)
      .limit(15)

    // Build chef DNA
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sa = chef?.style_analysis as Record<string, any> | null
    const chefDNA = [
      chef?.cooking_philosophy,
      chef?.style_tags?.length ? `Stijl: ${(chef.style_tags as string[]).join(', ')}` : null,
      chef?.preferred_ingredients?.length ? `Signature ingrediënten: ${(chef.preferred_ingredients as string[]).join(', ')}` : null,
      chef?.preferred_techniques?.length ? `Technieken: ${(chef.preferred_techniques as string[]).join(', ')}` : null,
      chef?.cuisine_styles?.length ? `Culinaire invloeden: ${(chef.cuisine_styles as string[]).join(', ')}` : null,
      sa?.flavor_profile ? `Smaakprofiel: ${JSON.stringify(sa.flavor_profile)}` : null,
      sa?.avoid ? `Vermijd: ${JSON.stringify(sa.avoid)}` : null,
    ].filter(Boolean).join('\n')

    const ownList = (ownRecipes || [])
      .map(r => `- "${r.name}" | €${Number(r.total_cost_per_serving || 0).toFixed(2)}/p | id: ${r.id}`)
      .join('\n')

    const legendeList = (legendeDishes || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map(d => `- "${d.name}" | elementen: ${(d.elements as any[] || []).map((e: any) => e.name).slice(0, 4).join(', ')} | id: ${d.id}`)
      .join('\n')

    const seasonalList = (seasonal || []).map(s => s.ingredient_name).join(', ')

    // Current menu context
    const currentMenuStr = Object.entries(current_menu)
      .filter(([, dishes]) => (dishes as unknown[]).length > 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map(([k, dishes]) => `${COURSE_LABELS[k] || k}: ${(dishes as any[]).map((d: any) => d.name).join(', ')}`)
      .join('\n')

    const courseLabel = COURSE_LABELS[course] || course
    const costHint = COST_HINTS[course] || '€3-8/p'
    const maxFoodCostPp = ((price_per_person * food_cost_target) / 100).toFixed(2)

    const prompt = `Je bent een culinaire AI-assistent. Stel 1-2 gerechten voor voor de gang "${courseLabel}".

CHEF DNA:
${chefDNA || 'Moderne Belgisch-Franse keuken met Japanse umami-invloeden (dashi, gepekelde dooier, lavas, forelkaviaar)'}

EVENT: ${event_type} | ${num_persons} personen | €${price_per_person}/p | food cost target ${food_cost_target}% (max €${maxFoodCostPp}/p totaal)
Realistische kostprijs voor deze gang: ${costHint}

HUIDIGE MENU SAMENSTELLING:
${currentMenuStr || '(nog geen andere gangen ingevuld)'}

PIEKSEIZOEN PRODUCTEN (nu in seizoen — gebruik bij voorkeur): ${seasonalList || 'geen data beschikbaar'}

EIGEN RECEPTEN UIT DE LIBRARY:
${ownList || '(geen eigen recepten beschikbaar)'}

LEGENDE GERECHTEN (Jules zijn signature repertoire):
${legendeList || '(geen legende gerechten beschikbaar)'}

INSTRUCTIES:
1. Prioriteer: (1) eigen recept, (2) LEGENDE gerecht, (3) nieuw AI-voorstel
2. Het gerecht moet PASSEN bij wat al in het menu staat — logisch verloop
3. Gebruik seizoensingrediënten als kern
4. Stijl: hertaal klassiek naar modern, chef DNA moet doorschemeren
5. Realistische food cost schatting

Geef max 2 suggesties als JSON (ALLEEN JSON):
{
  "suggestions": [
    {
      "name": "Naam gerecht",
      "description": "Korte beschrijving (1-2 zinnen max)",
      "source": "own_recipe|legende|new",
      "id": "echte uuid uit lijst hierboven of null",
      "estimated_cost_pp": 5.50,
      "key_ingredients": ["ingredient1", "ingredient2", "ingredient3"]
    }
  ]
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ suggestions: [] }, { status: 200 })
    }

    const aiResult = await response.json()
    const text = aiResult.content?.[0]?.text || ''
    let rawText = text.trim()
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ suggestions: [] })

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Menu board suggest error:', error)
    return NextResponse.json({ suggestions: [] }, { status: 200 })
  }
}
