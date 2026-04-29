import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const PUSH_LEVEL_PROMPTS = {
  comfort: `NIVEAU: Comfort (90% vertrouwd)
Kies ingrediënten en technieken die chefs kennen. Klassieke combinaties, vertrouwde smaakprofielen. Verrass subtiel — via kwaliteit en afwerking, niet via wildheid.`,
  balanced: `NIVEAU: Gebalanceerd (70% vertrouwd, 30% nieuw)
Mix van het vertrouwde en het verrassende. Eén element mag uitdagen — een onbekende techniek, een onverwacht ingredient. De rest is herkenbaar.`,
  challenge: `NIVEAU: Uitdagend (50% vertrouwd, 50% nieuw)
Durf te provoceren. Onverwachte combinaties, nieuwe technieken, minder gangbare ingrediënten. Gasten worden uitgedaagd — maar het is nooit willekeurig, altijd culinair logisch.`,
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    mode = 'ai',
    course = '',
    menuType = 'walking_dinner',
    exclusions = [] as string[],
    existingDishes = [] as string[],
    concept = '',
    numPersons = 20,
    push_level = 'balanced' as 'comfort' | 'balanced' | 'challenge',
    query = '',
    hertaalId = null as string | null,
  } = body

  // --- MODE: LEGENDE ---
  if (mode === 'legende') {
    const { data: legendeDishes } = await supabase
      .from('legende_dishes')
      .select(`
        id, name, description, price_per_person,
        category:legende_categories(name),
        elements:legende_dish_elements(name, quantity_text)
      `)
      .limit(60)

    return NextResponse.json({ legende: legendeDishes || [] })
  }

  // --- MODE: KENNISBANK (search) ---
  if (mode === 'kennisbank' && !hertaalId) {
    const searchQuery = query.trim()
    let dbQuery = supabase
      .from('classical_recipes')
      .select('id, name_original, category, description, source')
      .limit(20)

    if (searchQuery) {
      dbQuery = dbQuery.ilike('name_original', `%${searchQuery}%`)
    } else {
      dbQuery = dbQuery.order('id')
    }

    const { data: recipes } = await dbQuery
    return NextResponse.json({ recipes: recipes || [] })
  }

  // --- MODE: KENNISBANK — hertaal een klassiek recept ---
  if (mode === 'kennisbank' && hertaalId) {
    const { data: recipe } = await supabase
      .from('classical_recipes')
      .select('name_original, category, description, source')
      .eq('id', hertaalId)
      .single()

    if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })

    const { data: profile } = await supabase
      .from('chef_profiles')
      .select('style_analysis, preferred_ingredients')
      .eq('auth_user_id', user.id)
      .single()

    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    const currentMonth = monthNames[new Date().getMonth()]
    const { data: seasonal } = await supabase
      .from('seasonal_calendar')
      .select('name, category')
      .eq(currentMonth, 1)
      .limit(20)

    const seasonalText = seasonal?.map(s => s.name).join(', ') || ''
    const pushText = PUSH_LEVEL_PROMPTS[push_level as keyof typeof PUSH_LEVEL_PROMPTS] || PUSH_LEVEL_PROMPTS.balanced

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        system: `Je bent de AI-partner van Jules Van Groenweghe — Belgische top-chef, SIR Catering / Food by Jules.
Jules' stijl: Belgisch-Frans met Japanse umami-accenten. Comfort-elegantie. Handtekening-ingrediënten: lavas, dashi, forelkaviaar, gepekelde eidooier, hamachi, knolselder, zwarte look, miso, kimchi, XO.

HERTAALFILOSOFIE (4 stappen):
1. UPGRADE hoofdingrediënt → premium variant
2. TRANSFORMEER saus → moderne techniek (dashi-beurre blanc, miso-glaze, lavasemulsie)
3. VOEG UMAMI-LAAG toe (dashi, miso, XO, bonito, gefermenteerde elementen)
4. ZET EEN ZUUR-ACCENT (gepekeld, gefermenteerd, yuzu, citrusgel)

${pushText}

Antwoord ALLEEN als JSON — geen tekst buiten JSON.`,
        messages: [{
          role: 'user',
          content: `Hertaal dit klassiek recept in Jules' stijl voor een ${menuType.replace(/_/g, ' ')} (gang: ${course}):

KLASSIEK RECEPT: "${recipe.name_original}"
Beschrijving: ${recipe.description || '—'}
Bron: ${recipe.source || '—'}

Seizoensproducten nu: ${seasonalText}
Exclusies/allergenen (VERPLICHT vermijden): ${exclusions.join(', ') || 'geen'}

Geef 2 varianten hertaald in Jules' DNA. JSON formaat:
{
  "original_name": "klassieke naam",
  "variants": [
    {
      "name": "naam van gerecht in Jules' stijl",
      "description": "poëtische beschrijving max 12 woorden",
      "key_changes": "welke hertaling-stap je toepaste",
      "cost_per_person": 8.50
    }
  ]
}`
        }],
      }),
    })

    const aiData = await response.json()
    const text = aiData.content?.[0]?.text || ''
    const cleaned = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'AI parse failed', raw: text }, { status: 500 })
    return NextResponse.json(JSON.parse(match[0]))
  }

  // --- MODE: AI (generate 3 options) ---
  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('style_analysis, preferred_ingredients, cuisine_styles')
    .eq('auth_user_id', user.id)
    .single()

  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
  const currentMonth = monthNames[new Date().getMonth()]
  const { data: seasonal } = await supabase
    .from('seasonal_calendar')
    .select('name, category')
    .eq(currentMonth, 1)
    .limit(25)

  const { data: legendeForCourse } = await supabase
    .from('legende_dishes')
    .select('name, description, elements:legende_dish_elements(name)')
    .limit(15)

  const styleText = profile?.style_analysis
    ? (typeof profile.style_analysis === 'string' ? profile.style_analysis : JSON.stringify(profile.style_analysis)).slice(0, 400)
    : ''
  const seasonalText = seasonal?.map(s => s.name).join(', ') || ''
  const legendeText = legendeForCourse?.slice(0, 8).map(d =>
    `• ${d.name}${d.description ? ` — ${d.description}` : ''}`
  ).join('\n') || ''

  const pushText = PUSH_LEVEL_PROMPTS[push_level as keyof typeof PUSH_LEVEL_PROMPTS] || PUSH_LEVEL_PROMPTS.balanced

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: `Je bent de AI-partner van Jules Van Groenweghe — Belgische top-chef, SIR Catering / Food by Jules.
Jules' stijl: Belgisch-Frans + Japanse umami. Comfort-elegantie. Handtekening: lavas, dashi, forelkaviaar, gepekelde eidooier, hamachi, zwarte look, miso, kimchi, XO, zeekraal.
HERTAALFILOSOFIE: upgrade ingredient → premium | saus → moderne techniek | umami-laag | zuur-accent.

${pushText}

Antwoord ALLEEN als JSON.`,
      messages: [{
        role: 'user',
        content: `Geef 3 verschillende gerechtsuggesties voor gang: "${course}" (format: ${menuType.replace(/_/g, ' ')}, ${numPersons} personen).

CONTEXT:
• Stijl: ${styleText || 'Belgisch-Frans, Japanse umami-accenten'}
• Nu in seizoen: ${seasonalText}
• Concept event: ${concept || 'geen'}
• Exclusies/allergenen (VERPLICHT vermijden): ${exclusions.join(', ') || 'geen'}
• Andere gangen al aanwezig: ${existingDishes.join(', ') || 'geen'}

LEGENDE REFERENTIE (Jules' signatuurgerechten — inspirieer hierop maar kopieer niet):
${legendeText}

3 VERSCHILLENDE INVALSHOEKEN:
1. Pure Jules DNA (lavas/dashi/gepekeld/hamachi-richting)
2. Seizoensgebonden (gebruik de seizoensproducten maximaal)
3. Verrassende hoek (nieuwe techniek of onverwachte combinatie — maar herkenbaar)

JSON formaat:
{
  "suggestions": [
    {
      "name": "gerechtnaam",
      "description": "max 12 woorden poëtisch",
      "angle": "Jules DNA | Seizoens | Verrassend",
      "key_ingredients": ["ingredient1", "ingredient2"],
      "technique": "bereidingstechniek",
      "cost_per_person": 9.00
    }
  ]
}`
      }],
    }),
  })

  const aiData = await response.json()
  const text = aiData.content?.[0]?.text || ''
  const cleaned = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) return NextResponse.json({ error: 'AI parse failed', raw: text }, { status: 500 })
  return NextResponse.json(JSON.parse(match[0]))
}
