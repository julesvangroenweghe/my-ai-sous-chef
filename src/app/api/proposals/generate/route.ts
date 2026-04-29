import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300

function getFormatInstruction(menuType: string, numPersons: number): string {
  const instructions: Record<string, string> = {
    walking_dinner: `WALKING DINNER STRUCTUUR (professioneel advies):
- Typisch 3-4 gangen (max 4 is het advies, op klantvraag mag 5)
- 30 min/gerecht cadans — dit is de minimale operationele ritme
- Gerechten zijn standalone, draagbaar of op klein bord
- Gangvolgorde: Fingerbites/Hapjes → Voorgerecht (warm) → Hoofdgerecht → Dessert
- 1-2 gerechten per gang max (anders te druk voor de zaal)`,
    cocktail_dinatoire: `COCKTAIL DÎNATOIRE STRUCTUUR:
- 12-15 stuks pp totaal (3 fases)
- Fase 1 "Fraîcheur" (uur 1, 5pp): licht, fris, koud — amuses, oester, ceviche-stijl
- Fase 2 "Le Cœur" (uur 2, 4pp): warm, substantieel — mini-gerechten, gevulde hapjes
- Fase 3 "Douceur" (uur 3, 3pp): zoet, warm afsluitend — petits fours, mini desserts
- Mix fingerbites (1 hap, tegelijk serveren) + potjes/schaaltjes (1 tegelijk)`,
    sit_down: `ZIT DINER STRUCTUUR:
- 3-5 gangen afhankelijk van budget
- ${numPersons <= 50 ? '45 min/gang' : '60 min/gang'} service timing
- Klassiek: Amuse → Voorgerecht → (Tussengerecht bij 5-gang) → Hoofdgerecht → Dessert
- Amuse is altijd aanwezig, niet meetellend als officiële gang`,
    buffet: `BBQ BUFFET STRUCTUUR (schalen delen, niet borden per persoon):
- 7 elementen: Groenten van de grill + Vlees hoofdstuk + Vis/zeevruchten + Sauzen (3 min) + Warme sides + Koud buffet / saladebar + Dessert
- Gegrild à la minute — live fire geeft energy
- Jules DNA in elke schaal: zeekraal, dashi-beurre blanc, gepekeld eigeel, lavasvinaigrette`,
    cocktail: `COCKTAIL APERITIEF:
- 8-12 stuks pp
- 4 fases: Opening snack → Savoury bites → Substantieel hapje → Zoet afsluitend
- Mix: kanapekes, croûtons, mini-potjes, fingerbites`,
    aperitief: `APERITIEF / VIN D'HONNEUR:
- 4-6 stuks pp
- 45-90 min
- 2 fases: eerste indruk (signature) + substantieel hapje
- Elegant, licht, appetijt opwekkend`,
    brunch: `BRUNCH / GARDEN PARTY:
- 6 stations
- Mix zoet + hartig
- Buffet-stijl, zelf-bedienen`,
  }
  return instructions[menuType] || `GENEREER passende gangstructuur voor ${menuType.replace(/_/g, ' ')}`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    proposalId,
    menuType = 'walking_dinner',
    numPersons = 20,
    pricePerPerson = 65,
    targetFoodCostPct = 30,
    requirements = {},
    eventName = '',
  } = body

  const {
    exclusions = [] as string[],
    concept = '',
    preferences = {} as Record<string, string>,
    special_requests = '',
    contact_person = '',
  } = requirements

  // 1. Chef profiel ophalen
  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('style_analysis, preferred_ingredients, cuisine_styles, cooking_philosophy')
    .eq('auth_user_id', user.id)
    .single()

  // 2. Catering scenario voor dit format
  const { data: scenario } = await supabase
    .from('catering_scenarios')
    .select('name, description, portions_pp, course_structure, service_pacing_rules, staffing_rules, experience_arc')
    .eq('format_key', menuType)
    .single()

  // 3. LEGENDE gerechten ophalen — relevante selectie
  const { data: legendeDishes } = await supabase
    .from('legende_dishes')
    .select(`
      name, description, price_per_person,
      category:legende_categories(name),
      elements:legende_dish_elements(name, quantity_text)
    `)
    .limit(40)

  // 4. Seizoensgebonden ingrediënten (huidige maand)
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
  const currentMonthCol = monthNames[new Date().getMonth()]

  const { data: seasonal } = await supabase
    .from('seasonal_calendar')
    .select('name, category')
    .eq(currentMonthCol, 1)
    .limit(30)

  // 5. Klassieke referentierecepten voor inspiratie (steekproef op categorie)
  const { data: classicalSample } = await supabase
    .from('classical_recipes')
    .select('name_original, category, description')
    .limit(10)

  // --- PROMPT BOUWEN ---

  const styleText = profile?.style_analysis
    ? `\nJULES' STIJL DNA:\n${typeof profile.style_analysis === 'string' ? profile.style_analysis : JSON.stringify(profile.style_analysis, null, 2)}`
    : ''

  const scenarioText = scenario
    ? `\nFORMAT SCENARIO — ${scenario.name}:
Beschrijving: ${scenario.description || '—'}
Porties/pp: ${scenario.portions_pp || '—'}
Gangstructuur: ${scenario.course_structure ? JSON.stringify(scenario.course_structure) : '—'}
Experience Arc: ${scenario.experience_arc ? JSON.stringify(scenario.experience_arc) : '—'}`
    : ''

  // Filter legende dishes relevant voor format
  const formatCategoryMap: Record<string, string[]> = {
    walking_dinner: ['walking dinner', 'hapjes', 'fingerbites', 'dessert'],
    cocktail_dinatoire: ['fingerbites', 'fingerfood', 'hapjes', 'mignardises'],
    sit_down: ['voorgerecht', 'hoofdgerecht', 'dessert', 'amuse'],
    buffet: ['walking dinner', 'hapjes'],
    cocktail: ['fingerbites', 'hapjes', 'fingerfood'],
  }
  const relevantCategories = formatCategoryMap[menuType] || []

  const filteredLegende = legendeDishes?.filter(d => {
    const catName = (d.category as any)?.name?.toLowerCase() || ''
    return relevantCategories.some(rc => catName.includes(rc)) || relevantCategories.length === 0
  }).slice(0, 20) || []

  const legendeText = filteredLegende.length > 0
    ? `\nJULES' LEGENDE GERECHTEN (voor stijlreferentie — hertaal in zijn DNA):\n${
        filteredLegende.map(d => {
          const elements = (d.elements as any[])?.slice(0, 3).map((e: any) => e.name).join(', ') || ''
          return `• ${d.name}${d.description ? ` — ${d.description}` : ''}${elements ? ` [${elements}]` : ''}${d.price_per_person ? ` (€${d.price_per_person}/p)` : ''}`
        }).join('\n')
      }`
    : ''

  const seasonalText = seasonal && seasonal.length > 0
    ? `\nNU IN SEIZOEN (gebruik prioritair):\n${seasonal.map(s => `• ${s.name} (${s.category || 'groente/fruit'})`).join(', ')}`
    : ''

  const exclusionsText = exclusions.length > 0
    ? `\nEXCLUSIES / ALLERGIEËN (STRIKT vermijden — geen sporen):\n${exclusions.map((e: string) => `✗ ${e}`).join('\n')}`
    : ''

  const conceptText = concept ? `\nCONCEPT VAN DE KLANT: ${concept}` : ''

  const prefsText = Object.keys(preferences).length > 0
    ? `\nVOORKEUREN PER GANG:\n${Object.entries(preferences).map(([k, v]) => `• ${k}: ${v}`).join('\n')}`
    : ''

  const specialText = special_requests ? `\nBIJZONDERE WENSEN: ${special_requests}` : ''

  const contactText = contact_person ? `\nKLANT: ${contact_person}` : ''

  const formatInstruction = getFormatInstruction(menuType, numPersons)

  const foodCostBudget = ((pricePerPerson * targetFoodCostPct) / 100).toFixed(2)

  const systemPrompt = `Je bent de AI-partner van Jules Van Groenweghe, een Belgische top-chef en eigenaar van SIR Catering / Food by Jules. Je spreekt en schrijft uitsluitend in het Nederlands.

JULES' HANDTEKENING INGREDIËNTEN (gebruik minstens 2-3 per menu):
lavas, dashi, forelkaviaar, gepekelde eidooier, hamachi, knolselder, zwarte look, miso, kimchi, XO-saus, zeekraal, dashi-beurre blanc, lavasvinaigrette, yuzu, bonito, zuurdesem, gepekelde groenten

HERTAALFILOSOFIE — pas toe op elk gerecht:
1. UPGRADE het hoofdingrediënt → premium variant (aardappel → Jersey Royal; ui → charred cipollini; zalm → hamachi of zeebaars)
2. TRANSFORMEER de saus → moderne techniek (botersaus → dashi-beurre blanc; jus → miso-glaze; mayo → lavasemulsie)
3. VOEG UMAMI-LAAG toe (dashi, miso, XO, bonito, gefermenteerde elementen — subtiel maar herkenbaar)
4. ZET EEN ZUUR-ACCENT (gepekeld, gefermenteerd, citrusgel, yuzu-foam — voor frisheid en balans)

KWALITEITSEISEN:
- Hedendaags Belgisch-Frans met Japanse umami-accenten — Jules' signatuurstijl
- Seizoensgebonden, lokaal tenzij premium (foie gras, hamachi, forelkaviaar mogen altijd)
- Chef-niveau — niet voor thuiskoks, voor gastronomisch publiek
- Gerechtnamen: elegant, beschrijvend, in het Nederlands (geen clichés zoals "carpaccio van rund")
- Beschrijvingen: poëtisch maar bondig, max 12 woorden, focus op sensatie en textuur
- Food cost: realistisch voor professionele catering (€${foodCostBudget}/persoon beschikbaar bij ${targetFoodCostPct}% food cost)

VERBODEN:
- Geen emoji's in namen of beschrijvingen
- Geen algemeenheden zoals "vers seizoensgebonden salade"
- Geen generieke sauzen (geen "bruine jus", "witte saus")
- Zorg dat exclusies NERGENS terugkomen — ook niet in sauzen of bereidingen`

  const userPrompt = `Maak een menu voorstel voor: ${eventName || 'catering event'}
${contactText}

EVENT PARAMETERS:
• Format: ${menuType.replace(/_/g, ' ')}
• Personen: ${numPersons}
• Budget: €${pricePerPerson}/persoon — food cost doel: ${targetFoodCostPct}% (= €${foodCostBudget}/pp beschikbaar)
• Huidige maand: ${monthNames[new Date().getMonth()]}
${exclusionsText}
${conceptText}
${prefsText}
${specialText}
${styleText}
${scenarioText}
${formatInstruction}
${legendeText}
${seasonalText}

TAAK: Genereer een volledig menu voorstel. Gebruik Jules' DNA, handtekening-ingrediënten en hertaalfilosofie. Gebruik prioritair de seizoensgebonden ingrediënten. Gerechten moeten hedendaags zijn maar herkenbaar — "comfort-elegantie" is het juiste woord.

Antwoord ALLEEN als JSON (geen tekst buiten de JSON):
{
  "courses": [
    {
      "name": "Gang naam (bvb. Amuse, Fingerbites, Voorgerecht, Hoofdgerecht, Dessert)",
      "dishes": [
        {
          "name": "Naam van het gerecht",
          "description": "Poëtische beschrijving max 12 woorden",
          "cost_per_person": 4.50,
          "key_ingredients": ["ingredient1", "ingredient2", "ingredient3"],
          "technique": "Kooktechniek"
        }
      ]
    }
  ],
  "concept_note": "1 zin die het menu samenvat — Jules' stijl, de rode draad",
  "chef_note": "Optionele noot van de chef voor de klant (max 2 zinnen, hartelijk)"
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return NextResponse.json({ error: `AI call failed: ${errText}` }, { status: 500 })
    }

    const aiResult = await response.json()
    const text: string = aiResult.content?.[0]?.text || ''
    const cleaned = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'No valid JSON in AI response', raw: text }, { status: 500 })

    const parsed = JSON.parse(match[0])

    // Als proposalId meegegeven: items direct in DB opslaan
    if (proposalId && parsed.courses && Array.isArray(parsed.courses)) {
      // Bestaande items verwijderen
      await supabase.from('saved_menu_items').delete().eq('menu_id', proposalId)

      const items: any[] = []
      parsed.courses.forEach((course: any, ci: number) => {
        const dishes = Array.isArray(course.dishes) ? course.dishes : []
        dishes.forEach((dish: any, di: number) => {
          items.push({
            menu_id: proposalId,
            course: course.name,
            dish_name: dish.name || '',
            dish_description: dish.description || null,
            source_type: 'ai',
            cost_per_person: dish.cost_per_person || null,
            sort_order: ci * 100 + di,
          })
        })
      })

      if (items.length > 0) {
        await supabase.from('saved_menu_items').insert(items)
      }

      // Concept note opslaan in event_requirements
      if (parsed.concept_note || parsed.chef_note) {
        const { data: currentMenu } = await supabase
          .from('saved_menus')
          .select('event_requirements')
          .eq('id', proposalId)
          .single()

        const updatedReqs = {
          ...(currentMenu?.event_requirements || {}),
          ...(requirements || {}),
          concept_note: parsed.concept_note || '',
          chef_note: parsed.chef_note || '',
        }
        await supabase.from('saved_menus').update({
          event_requirements: updatedReqs,
          updated_at: new Date().toISOString(),
        }).eq('id', proposalId)
      }
    }

    return NextResponse.json(parsed)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
