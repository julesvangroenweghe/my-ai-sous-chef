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
  BBQ_HAPJES: 'Hapjes van het rooster',
  BBQ_VLEES: 'Gegrild vlees',
  BBQ_VIS: 'Gegrilde vis & zeevruchten',
  BBQ_SALADES: 'Koude salades & dips',
  BBQ_BIJGERECHTEN: 'Bijgerechten & brood',
}

const COURSE_TO_CLASSICAL: Record<string, string[]> = {
  AMUSE: ['hors_doeuvres', 'soups', 'savouries'],
  FINGERFOOD: ['hors_doeuvres', 'savouries', 'entrees', 'eggs'],
  VOORGERECHT: ['entrees', 'fish', 'soups', 'hors_doeuvres', 'eggs'],
  TUSSENGERECHT: ['fish', 'entrees', 'soups', 'vegetables'],
  HOOFDGERECHT: ['meat', 'poultry', 'poultry_game', 'fish', 'braised', 'roasts', 'game'],
  KAAS: ['savouries', 'entrees'],
  DESSERT: ['desserts', 'frozen_desserts', 'pastry', 'entremets'],
  MIGNARDISES: ['desserts', 'pastry', 'general'],
  BBQ_HAPJES: ['hors_doeuvres', 'savouries', 'entrees'],
  BBQ_VLEES: ['meat', 'poultry', 'roasts', 'braised', 'game'],
  BBQ_VIS: ['fish'],
  BBQ_SALADES: ['vegetables', 'salads', 'entrees'],
  BBQ_BIJGERECHTEN: ['vegetables', 'general'],
}

function callAnthropic(systemPrompt: string, userPrompt: string, maxTokens = 4096) {
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
}

function extractJSON(text: string) {
  let raw = text.trim()

  // Strip markdown code fences
  if (raw.includes('```')) {
    raw = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim()
  }

  // Find the outermost { ... } — use last } to capture full object
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    console.error('[extractJSON] No JSON object found. Raw text (first 500):', raw.slice(0, 500))
    throw new Error('No JSON found in response')
  }

  const jsonStr = raw.slice(start, end + 1)
  try {
    return JSON.parse(jsonStr)
  } catch (e) {
    console.error('[extractJSON] JSON.parse failed. Extracted string (first 500):', jsonStr.slice(0, 500))
    throw e
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      menu_type = 'event',
      kitchen_type: bodyKitchenType,
      num_persons = 50,
      price_per_person = 65,
      target_food_cost_pct = 30,
      season: bodySeason,
      courses = ['AMUSE', 'HOOFDGERECHT', 'DESSERT'],
      dietary_restrictions = [],
      custom_prompt = '',
      push_level = 'balanced',
      event_id,
      style = 'Modern',
    } = body

    // Get chef profile first (chef_id in kitchen_members = chef_profiles.id, NOT auth.users.id)
    const { data: chefProfile } = await supabase
      .from('chef_profiles')
      .select('id, style_analysis, style_tags, preferred_techniques, preferred_cuisines, preferred_ingredients, avoided_ingredients, cuisine_styles, cuisine_specialties, cooking_philosophy, kitchen_type, experience_level, years_experience')
      .eq('auth_user_id', user.id)
      .single()

    if (!chefProfile) return NextResponse.json({ error: 'Geen chef profiel gevonden' }, { status: 404 })

    // Get kitchen_id using chef_profiles.id
    const { data: memberData } = await supabase
      .from('kitchen_members')
      .select('kitchen_id, kitchens(id, name, type, settings)')
      .eq('chef_id', chefProfile.id)
      .single()

    const kitchenId = memberData?.kitchen_id
    if (!kitchenId) return NextResponse.json({ error: 'Geen keuken gevonden' }, { status: 404 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kitchenData = memberData?.kitchens as any
    const kitchenType = bodyKitchenType || kitchenData?.type || 'catering'

    // Parallel data fetches
    const [
      chefResult,
      recipesResult,
      preparationsResult,
      legendeResult,
      classicalResult,
      recentMenusResult,
      auditRulesetResult,
      techniqueResult,
    ] = await Promise.all([
      Promise.resolve({ data: chefProfile, error: null }), // already fetched above
      supabase.from('recipes').select(`
        id, name, description, category_id, total_cost_per_serving, 
        number_of_servings, food_cost_percentage, selling_price, season_tags,
        recipe_categories(name),
        recipe_components(
          name, 
          recipe_component_ingredients(
            quantity_per_person, unit,
            ingredients(name, category)
          )
        )
      `).eq('kitchen_id', kitchenId).eq('status', 'active').limit(100),
      supabase.from('preparations').select('*').eq('kitchen_id', kitchenId).limit(100),
      supabase.from('legende_dishes').select('id, name, category_id, notes, service_style, temperature, is_vegetarian, elements:legende_dish_elements(name, quantity_text, element_type)').limit(100),
      supabase.from('classical_recipes').select('*').limit(200),
      supabase.from('saved_menus').select('*, saved_menu_items(*)').eq('kitchen_id', kitchenId).order('created_at', { ascending: false }).limit(5),
      supabase.from('audit_rulesets').select('*').eq('kitchen_id', kitchenId).eq('chef_id', user.id).single(),
      supabase.from('technique_parameters').select('*').limit(100),
    ])

    const chef = chefResult.data
    const ownRecipes = recipesResult.data || []
    const preparations = preparationsResult.data || []
    const legendeDishes = legendeResult.data || []
    const classicalRecipes = classicalResult.data || []
    const recentMenus = recentMenusResult.data || []
    const auditRuleset = auditRulesetResult.data
    const techniques = techniqueResult.data || []

    // Seasonal products
    const monthNum = new Date().getMonth() + 1
    const monthKey = MONTH_NAMES[monthNum]
    const { data: seasonalPeak } = await supabase
      .from('seasonal_calendar')
      .select('ingredient_name, category')
      .eq(monthKey, 2)
      .limit(60)
    const { data: seasonalAvailable } = await supabase
      .from('seasonal_calendar')
      .select('ingredient_name, category')
      .eq(monthKey, 1)
      .limit(60)

    // Build style info
    const styleInfo = chef ? [
      chef.cooking_philosophy ? `- Filosofie: ${chef.cooking_philosophy}` : '',
      chef.cuisine_specialties ? `- Specialisaties: ${chef.cuisine_specialties}` : '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (chef as any).style_analysis ? `- Stijlanalyse: ${(chef as any).style_analysis}` : '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (chef as any).preferred_techniques ? `- Technieken: ${(chef as any).preferred_techniques}` : '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (chef as any).preferred_ingredients ? `- Voorkeur ingredienten: ${(chef as any).preferred_ingredients}` : '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (chef as any).style_tags ? `- Stijltags: ${(chef as any).style_tags}` : '',
    ].filter(Boolean).join('\n') : ''

    // Build recipe list
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recipesList = ownRecipes.map((r: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cat = (r.recipe_categories as any)?.name || 'onbekend'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const components = (r.recipe_components || []).map((c: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ings = (c.recipe_component_ingredients || []).map((i: any) => i.ingredients?.name).filter(Boolean).join(', ')
        return `${c.name}(${ings})`
      }).join(' | ')
      return `- [EIGEN] "${r.name}" | cat: ${cat} | €${Number(r.total_cost_per_serving || 0).toFixed(2)}/p | id: ${r.id}${components ? `\n  ${components}` : ''}`
    }).join('\n')

    // Build LEGENDE list — full element details for rich AI inspiration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legendeList = legendeDishes.map((d: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const elems = (d.elements || []).map((e: any) => e.name).filter(Boolean)
      const elemStr = elems.length > 0 ? `\n    → ${elems.join(' · ')}` : ''
      const tags = [
        d.service_style ? `${d.service_style}` : null,
        d.temperature ? `${d.temperature}` : null,
        d.is_vegetarian ? 'veggie' : null,
      ].filter(Boolean).join(', ')
      return `• "${d.name}"${tags ? ` [${tags}]` : ''}${elemStr}`
    }).join('\n')


    // SIR 3.0 — Jules' huidige stijlgerechten (meest recente werkdocument)
    const sir3Dishes = \`
Witte asperge Miso gebrand
  → creme dooier, geraspte dooier, jus gefermenteerde asperge, gerookte crunch, daslook olie

Rundstartaar
  → sjalotje, bieslook, kappertjes, artisjok gegrild, gerookte parmezaan, rucola, sgombro vinaigrette, kappercrunch

Zeeuwse mossel
  → creme ui, foreleitjes, gepekelde gebrande zilverui in lavas olie
\`

    // Jules' vaste handtekening-elementen — komen terug in zijn DNA
    const julesDNA = \`
VASTE SMAAKELEMENTEN:
- Lavas: gebruikt als olie, in gribiche, of als aromaat — kenmerkend
- Dashi: als jus-basis, beurre blanc of bouillon
- Forelkaviaar: kleine luxe-accent, zoutig-mineraal
- Gepekelde dooier: geraspt over gerechten voor umami-diepte
- Knolselder: als tagliatelle, creme, chips, gebrand — veelzijdig
- Prei: gerookt, BBQ, als emulsie, gefrituurd — steeds anders
- Hamachi: koud, rauw, ceviche-stijl
- Zwarte look: als gel of creme voor diepte
- Sgombro: als vinaigrette of espuma op vlees
- Gerookte amandel/hazelnoot: textuur en rooktoon
- Furikake: Japanse touch over vis
- Kimchi / miso: fermentatie-accenten
- XO saus: umami-booster
- Oesterblad: op vrijwel alles mogelijk
- Mosterdzaad gepekeld: textuur en frisheid

VASTE TECHNIEKEN:
- 'Konro' = yakitori-grill stijl, intensief roken op houtskool
- Mi-cuit = half-gegaard voor zachte textuur
- Gepekeld / lacto-fermentatie voor frisheid en zuur
- Creme = altijd glad en rijkbottig (niet luchtig)
- Laags opbouwen: base creme → hoofdelement → garnituur → saus ernaast of errond

PRESENTATIE-DNA:
- Gerechten zijn complex opgebouwd maar zien er rustig uit
- Geen drukke borden — élément heeft een rol
- Koud of lauw (niet warm) voor verfijning
- Seizoensgroenten zijn altijd startpunt
\`

    // Preparations list
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prepsList = preparations.map((p: any) => `- ${p.name}`).join('\n')

    // Seasonal lists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seasonalPeakList = (seasonalPeak || []).map((s: any) => `- ${s.ingredient_name} (${s.category}) [PIEK]`).join('\n')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seasonalAvailList = (seasonalAvailable || []).map((s: any) => `- ${s.ingredient_name} (${s.category})`).join('\n')

    // Classical recipes per course
    const classicalSection = courses.map((c: string) => {
      const cats = COURSE_TO_CLASSICAL[c] || []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = classicalRecipes.filter((r: any) => cats.includes(r.category || '')).slice(0, 8)
      if (items.length === 0) return ''
      const label = COURSE_LABELS[c] || c
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list = items.map((r: any) => `  - ${r.name_english || r.name_original}${r.description ? `: ${r.description.slice(0, 80)}` : ''}`).join('\n')
      return `${label}:\n${list}`
    }).filter(Boolean).join('\n\n')

    // Recent menus summary
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentMenusSummary = recentMenus.map((m: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dishes = (m.saved_menu_items || []).map((i: any) => i.custom_name).filter(Boolean).join(', ')
      return `- ${m.name} (${m.menu_type}, ${new Date(m.created_at).toLocaleDateString('nl-BE')}): ${dishes}`
    }).join('\n')

    // Technique params
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const techniquesList = techniques.slice(0, 30).map((t: any) => `- ${t.name}: ${t.description || ''}`).join('\n')

    const maxFoodCost = ((price_per_person * target_food_cost_pct) / 100).toFixed(2)
    const coursesWithLabels = courses.map((c: string) => COURSE_LABELS[c] || c).join(', ')

    // Audit ruleset context
    const rulesetContext = auditRuleset ? `
AUDIT REGELS (geleerd van deze chef):
- Expliciet: ${JSON.stringify(auditRuleset.explicit_rules || {})}
- Geleerd: ${JSON.stringify(auditRuleset.learned_rules || {})}
- Groeirichting: ${JSON.stringify(auditRuleset.growth_direction || {})}
- Push level: ${auditRuleset.push_level || 'balanced'}
- Gemiddelde score: ${auditRuleset.avg_score || 'n/a'}` : ''

    // ==========================================
    // PASS 1: THE GENERATOR
    // ==========================================
    const generatorSystem = `Je bent de culinaire directeur voor een Belgische top-catering chef, Jules Van Groenweghe (Food by Jules).
Je kent zijn stijl door en door: Belgisch-Frans fundament, Japanse umami-laag, comfort-elegantie.
Zijn handtekening-elementen: lavas, dashi, forelkaviaar, gepekelde dooier, knolselder als tagliatelle, prei op Konro, hamachi crudo, zwarte look gel, sgombro, oesterblad, miso, kimchi.

REGELS:
1. NOOIT generieke restaurant-gerechten (geen "zalm met groentjes", geen "poulet rôti")
2. ELK gerecht moet 1 uniek smaak-accent hebben dat past bij Jules' DNA
3. Gebruik zijn LEGENDE gerechten als directe blauwdruk — herken het patroon, hertaal het
4. Hertaal = upgrade ingredient → moderne techniek → umami-laag → zuur-accent
5. Seizoensproducten zijn startpunt, niet bijzaak
6. Geef ALLEEN JSON terug, geen uitleg.`

    const generatorPrompt = `CHEF PROFIEL:
- Naam: ${chef?.display_name || 'Chef'}
- Keukentype: ${kitchenType}
${styleInfo}
${rulesetContext}

EIGEN RECEPTEN (${ownRecipes.length}):
${recipesList || '(geen)'}

LEGENDE GERECHTEN — JULES' EIGEN STIJL-BIBLIOTHEEK (${legendeDishes.length} gerechten):
De volgende gerechten zijn Jules' persoonlijke LEGENDE: dit zijn échte gerechten die hij kookt, met hun volledige opbouw.
Gebruik deze als directe inspiratie — niet kopiëren maar de DNA herkennen en vertalen naar nieuwe context.
${legendeList || '(geen)'}

SIR 3.0 — MEEST RECENTE STIJLGERECHTEN:
Dit zijn Jules' nieuwste gerechten, tonen zijn huidige richting:
${sir3Dishes}

JULES' HANDTEKENING-DNA:
${julesDNA}

HALFFABRICATEN:
${prepsList || '(geen)'}

SEIZOENSPIEK (huidige maand):
${seasonalPeakList || '(geen data)'}

SEIZOEN BESCHIKBAAR:
${seasonalAvailList || '(geen data)'}

KLASSIEKE INSPIRATIE:
${classicalSection || '(geen)'}

RECENTE MENU'S (vermijd herhaling):
${recentMenusSummary || '(geen eerdere menus)'}

TECHNIEKEN:
${techniquesList || '(geen)'}

PARAMETERS:
${menu_type === 'bbq_buffet' ? `
SERVICEFORMAT: BBQ BUFFET — dit is geen walking dinner of borden per persoon.
- BBQ_HAPJES: kleine hapjes gegrild op het rooster, doorgegeven of op een plank. Max 2-3 hapjes pp. Jules-stijl: elevated BBQ bites met umami/zuur-accent.
- BBQ_VLEES: 1-2 grote stukken vlees (heel of half, snijdbaar aan tafel). Denk côte à l'os, lams-rib rack, varkenswang slow-cook dan snel gegrild, picanha. Per schaal voor 4-6 personen.
- BBQ_VIS: 1 hele vis of groot filet op het rooster. Denk hele dorade, makreel, coquilles op half schelp, langoustines gespleten. Jules: zeekraal, dashi-beurre blanc, geroosterd zeewier.
- BBQ_SALADES: 3-4 koude salades naast de grill. Denk gefermenteerde groenten, graan-salades, gepekelde komkommer. Jules: lavasvinaigrette, miso-dressing, gepekeld eigeel erover.
- BBQ_BIJGERECHTEN: warm brood van het rooster, gegrilde polenta, pommes grenailles op asbed.
- DESSERT: licht, kan ook van de grill (gegrild fruit, panna cotta).
Geef voor elke gang MEERDERE opties (want buffet = keuze). Vlees = 2 opties, Vis = 1-2, Salades = 3-4.
` : ''}- Menu type: ${menu_type}
- Keukentype: ${kitchenType}
- Personen: ${num_persons}
- Verkoopprijs: €${price_per_person}/p
- Food cost target: ${target_food_cost_pct}% (max €${maxFoodCost}/p)
- Seizoen: ${bodySeason || 'automatisch'}
- Gangen: ${coursesWithLabels}
- Stijl: ${style}
- Dieet: ${dietary_restrictions.length > 0 ? dietary_restrictions.join(', ') : 'geen'}
- Push level: ${push_level}
- Extra wensen: ${custom_prompt || 'geen'}

Genereer een compleet menu als JSON:
{
  "menu_name": "Creatieve naam voor het menu",
  "courses": [
    {
      "name": "amuse",
      "label": "Amuse-bouche",
      "dishes": [
        {
          "name": "Naam gerecht",
          "description": "Beschrijving (2-3 zinnen)",
          "source": "own_recipe",
          "recipe_id": "uuid of null",
          "legende_dish_id": "uuid of null",
          "classical_recipe_id": null,
          "cost_pp": 2.50,
          "key_techniques": ["techniek1"],
          "key_ingredients": ["ingredient1"],
          "seasonal_ingredients": ["seizoensingrediënt"]
        }
      ]
    }
  ],
  "total_cost_pp": 18.50,
  "total_food_cost_pct": 28.5,
  "chef_note": "Toelichting bij het menu"
}`

    const genRes = await callAnthropic(generatorSystem, generatorPrompt, 4096)
    if (!genRes.ok) {
      const errText = await genRes.text()
      console.error('Generator error:', errText)
      return NextResponse.json({ error: 'AI-generatie mislukt' }, { status: 502 })
    }

    const genResult = await genRes.json()
    const genText = genResult.content?.[0]?.text || ''
    let generatedMenu
    try {
      generatedMenu = extractJSON(genText)
    } catch {
      return NextResponse.json({ error: 'Kon gegenereerd menu niet verwerken' }, { status: 422 })
    }

    // ==========================================
    // PASS 2: THE CRITIC
    // ==========================================
    const criticSystem = `Je bent een veeleisende culinaire criticus en mentor. Je evalueert menu's voor professionele chefs.
Je kent deze chef persoonlijk — hun sterktes, zwaktes, patronen en ambities.

${rulesetContext}

Score dit menu op 10 dimensies (elk 0-10):
1. Stijlcoherentie — past bij het DNA van deze chef?
2. Haalbaarheid — kan het team dit uitvoeren?
3. Food cost — binnen budget? Marge per gang?
4. Verfijning — is elk element doordacht?
5. Seizoensgebondenheid — maximaal seizoensproducten?
6. Ingredientenvariatie — geen herhalingen, breed palet?
7. Uitdaging — duwt dit de chef net genoeg? (push_level: ${push_level})
8. Vernieuwing — is dit verrassend of voorspelbaar?
9. Smaakbalans — zuur/zoet/umami/bitter/zout over heel het menu?
10. Culinaire logica — klopt de opbouw, zijn gangen in balans?

Geef terug als JSON:
{
  "overall_score": 8.2,
  "dimensions": {
    "stijlcoherentie": { "score": 8, "opmerking": "..." },
    "haalbaarheid": { "score": 7, "opmerking": "..." },
    "food_cost": { "score": 9, "opmerking": "..." },
    "verfijning": { "score": 8, "opmerking": "..." },
    "seizoensgebondenheid": { "score": 7, "opmerking": "..." },
    "ingredientenvariatie": { "score": 8, "opmerking": "..." },
    "uitdaging": { "score": 7, "opmerking": "..." },
    "vernieuwing": { "score": 8, "opmerking": "..." },
    "smaakbalans": { "score": 8, "opmerking": "..." },
    "culinaire_logica": { "score": 9, "opmerking": "..." }
  },
  "dish_feedback": [
    { "dish_name": "...", "score": 8, "feedback": "...", "improvement": "..." }
  ],
  "overall_feedback": "Samenvatting van sterke en zwakke punten",
  "top_improvements": ["verbetering 1", "verbetering 2", "verbetering 3"]
}`

    const criticPrompt = `Evalueer dit menu:
${JSON.stringify(generatedMenu, null, 2)}

Context: ${coursesWithLabels} voor ${num_persons} personen, €${price_per_person}/p, food cost target ${target_food_cost_pct}%
Keukentype: ${kitchenType}, Stijl: ${style}
Seizoensproducten beschikbaar: ${(seasonalPeak || []).slice(0, 15).map((s: { ingredient_name: string }) => s.ingredient_name).join(', ')}`

    const criticRes = await callAnthropic(criticSystem, criticPrompt, 3000)
    let criticFeedback = { overall_score: 7.5, dimensions: {}, dish_feedback: [], overall_feedback: '', top_improvements: [] }
    
    if (criticRes.ok) {
      const criticResult = await criticRes.json()
      const criticText = criticResult.content?.[0]?.text || ''
      try {
        criticFeedback = extractJSON(criticText)
      } catch {
        console.error('Could not parse critic feedback')
      }
    }

    // ==========================================
    // PASS 3: THE ARBITER (only if score < 8)
    // ==========================================
    let finalMenu = generatedMenu
    if (criticFeedback.overall_score < 8) {
      const arbiterSystem = `Je bent de hoofdrechter. Je ontvangt een menu van de Generator en feedback van de Criticus.
Jouw taak: produceer het BESTE mogelijke menu door conflicten op te lossen.

Regels:
- Als Criticus een gerecht < 6 scoort: MOET verbeterd of vervangen worden
- Als overall < 7.5: return needs_regeneration: true
- Behoud creatieve intentie van Generator waar Criticus slechts stilistische voorkeur heeft
- Volg altijd Criticus bij: food cost, allergenen, haalbaarheid, seizoensnauwkeurigheid
- Volg Generator bij creatief risico als push_level 'balanced' of 'challenge' is

Geef terug als JSON met dezelfde structuur als het oorspronkelijke menu, plus:
- "needs_regeneration": false (of true als overall < 7.5)
- "arbiter_notes": "wat je hebt aangepast en waarom"`

      const arbiterPrompt = `ORIGINEEL MENU:
${JSON.stringify(generatedMenu, null, 2)}

CRITICUS FEEDBACK:
${JSON.stringify(criticFeedback, null, 2)}

Produceer het definitieve menu. Behoud de JSON structuur van het origineel.`

      const arbiterRes = await callAnthropic(arbiterSystem, arbiterPrompt, 4096)
      if (arbiterRes.ok) {
        const arbiterResult = await arbiterRes.json()
        const arbiterText = arbiterResult.content?.[0]?.text || ''
        try {
          const arbiterMenu = extractJSON(arbiterText)
          if (arbiterMenu.needs_regeneration) {
            // One retry with critic feedback baked into generator
            const retryRes = await callAnthropic(
              generatorSystem,
              `${generatorPrompt}\n\nEERDERE FEEDBACK (verbeter deze punten):\n${JSON.stringify(criticFeedback.top_improvements || [])}`,
              4096
            )
            if (retryRes.ok) {
              const retryResult = await retryRes.json()
              const retryText = retryResult.content?.[0]?.text || ''
              try { finalMenu = extractJSON(retryText) } catch { /* keep arbiter result */ }
            }
          } else {
            finalMenu = arbiterMenu
          }
        } catch {
          // Keep generator output if arbiter fails
        }
      }
    }

    // ==========================================
    // SAVE TO DATABASE
    // ==========================================
    const { data: savedMenu } = await supabase.from('saved_menus').insert({
      kitchen_id: kitchenId,
      created_by: user.id,
      name: finalMenu.menu_name || `Menu ${new Date().toLocaleDateString('nl-BE')}`,
      menu_type,
      event_id: event_id || null,
      target_food_cost_pct,
      price_per_person,
      num_persons,
      season: bodySeason || null,
      style,
      dietary_restrictions,
      custom_prompt,
      kitchen_type: kitchenType,
      audit_score: criticFeedback.overall_score,
      audit_feedback: criticFeedback,
      status: 'draft',
    }).select().single()

    // Save menu items
    if (savedMenu && finalMenu.courses) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = finalMenu.courses.flatMap((course: any, ci: number) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (course.dishes || []).map((dish: any, di: number) => ({
          menu_id: savedMenu.id,
          course: course.name || course.label || `gang_${ci}`,
          course_order: ci,
          custom_name: dish.name,
          custom_description: dish.description,
          estimated_cost_pp: dish.cost_pp || null,
          source: dish.source || 'ai_generated',
          sort_order: di,
          recipe_id: dish.recipe_id || null,
          legende_dish_id: dish.legende_dish_id || null,
          classical_recipe_id: dish.classical_recipe_id || null,
        }))
      )
      if (items.length > 0) {
        await supabase.from('saved_menu_items').insert(items)
      }
    }

    // Log audit
    await supabase.from('audit_feedback_log').insert({
      kitchen_id: kitchenId,
      chef_id: user.id,
      menu_id: savedMenu?.id,
      audit_score: criticFeedback.overall_score,
      audit_feedback: criticFeedback,
    })

    return NextResponse.json({
      menu: finalMenu,
      audit: criticFeedback,
      saved_menu_id: savedMenu?.id,
    })

  } catch (error) {
    console.error('Menu engineering error:', error)
    return NextResponse.json({ error: 'Fout bij menu genereren' }, { status: 500 })
  }
}
