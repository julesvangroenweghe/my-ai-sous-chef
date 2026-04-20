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

// Map course types to classical_recipes categories for inspiration
const COURSE_TO_CLASSICAL: Record<string, string[]> = {
  AMUSE: ['hors_doeuvres', 'soups', 'savouries'],
  FINGERFOOD: ['hors_doeuvres', 'savouries', 'entrees', 'eggs'],
  VOORGERECHT: ['entrees', 'fish', 'soups', 'hors_doeuvres', 'eggs'],
  TUSSENGERECHT: ['fish', 'entrees', 'soups', 'vegetables'],
  HOOFDGERECHT: ['meat', 'poultry', 'poultry_game', 'fish', 'braised', 'roasts', 'game'],
  KAAS: ['savouries', 'entrees'],
  DESSERT: ['desserts', 'frozen_desserts', 'pastry', 'entremets'],
  MIGNARDISES: ['desserts', 'pastry', 'general'],
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

    // Load ALL own kitchen recipes with components for richer context
    const recipesQuery = supabase
      .from('recipes')
      .select(`
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
      `)
      .eq('status', 'active')
      .limit(100)

    if (kitchenId) {
      recipesQuery.eq('kitchen_id', kitchenId)
    }

    const { data: ownRecipes } = await recipesQuery

    // Load LEGENDE dishes with elements
    const { data: legendeDishes } = await supabase
      .from('legende_dishes')
      .select('id, name, category_id, notes, service_style, temperature, is_vegetarian, elements:legende_dish_elements(name, quantity_text, element_type)')
      .limit(100)

    // Determine month from date
    const eventDate = date ? new Date(date) : new Date()
    const monthNum = eventDate.getMonth() + 1
    const monthKey = MONTH_NAMES[monthNum] as string

    // Load seasonal peak products (this month)
    const { data: seasonalItems } = await supabase
      .from('seasonal_calendar')
      .select(`id, ingredient_name, category, ${monthKey}`)
      .eq(monthKey, 2)
      .limit(30)

    // Load seasonal available products (score 1 = available)
    const { data: seasonalAvailable } = await supabase
      .from('seasonal_calendar')
      .select(`ingredient_name, category, ${monthKey}`)
      .eq(monthKey, 1)
      .limit(20)

    // Load classical recipes as inspiration — filter by relevant categories for requested courses
    const allClassicalCategories = [...new Set(
      courses.flatMap((c: string) => COURSE_TO_CLASSICAL[c] || [])
    )]

    let classicalInspirationByCourse: Record<string, { name_original: string; name_english: string | null; description: string | null; category: string }[]> = {}

    if (allClassicalCategories.length > 0) {
      const { data: classicalRecipes } = await supabase
        .from('classical_recipes')
        .select('name_original, name_english, description, category, techniques')
        .in('category', allClassicalCategories)
        .not('name_original', 'ilike', '%recipe%')
        .not('name_original', 'ilike', '%chapter%')
        .limit(200)

      // Group by course mapping
      if (classicalRecipes) {
        for (const course of courses as string[]) {
          const relevantCategories = COURSE_TO_CLASSICAL[course] || []
          const relevant = classicalRecipes
            .filter(r => relevantCategories.includes(r.category))
            .filter(r => r.name_original && r.name_original.length > 3 && r.name_original.length < 80)
            .sort(() => Math.random() - 0.5) // random selection
            .slice(0, 8)
          classicalInspirationByCourse[course] = relevant
        }
      }
    }

    const maxFoodCost = ((price_per_person * food_cost_target) / 100).toFixed(2)

    // Build chef style info
    const styleInfo = chef?.style_analysis
      ? (typeof chef.style_analysis === 'object'
        ? (chef.style_analysis as Record<string, unknown>)['style_description'] || JSON.stringify(chef.style_analysis).slice(0, 300)
        : String(chef.style_analysis).slice(0, 300))
      : chef?.cooking_philosophy || chef?.bio || 'niet gespecificeerd'

    // Build own recipes list with ingredient details
    const recipesList = (ownRecipes || []).map(r => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cat = (r.recipe_categories as any)?.name || 'geen categorie'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const components = (r.recipe_components as any[] || []).map((comp: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ingrs = (comp.recipe_component_ingredients || []).map((ci: any) => 
          ci.ingredients?.name
        ).filter(Boolean).slice(0, 4).join(', ')
        return `${comp.name}${ingrs ? ` (${ingrs})` : ''}`
      }).join(' | ')
      
      return `- [EIGEN RECEPT] "${r.name}" | categorie: ${cat} | €${Number(r.total_cost_per_serving || 0).toFixed(2)}/p kostprijs${r.selling_price ? ` | €${r.selling_price} verkoopprijs` : ''} | ${r.food_cost_percentage ? `${Number(r.food_cost_percentage).toFixed(1)}% food cost` : ''} | id: ${r.id}${components ? `\n  Componenten: ${components}` : ''}`
    }).join('\n')

    // Build LEGENDE list
    const legendeList = (legendeDishes || []).map(d => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const elems = (d.elements as Array<{ name: string; quantity_text: string | null; element_type: string }> || [])
        .map(e => e.name).join(', ')
      return `- [LEGENDE] "${d.name}" | stijl: ${d.service_style || 'nvt'} | temp: ${d.temperature || 'nvt'}${d.is_vegetarian ? ' | vegetarisch' : ''} | id: ${d.id}${elems ? `\n  Elementen: ${elems}` : ''}`
    }).join('\n')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seasonalPeakList = (seasonalItems || []).map((s: any) => `- ${s.ingredient_name} (${s.category}) [PIEKSEIZOEN]`).join('\n')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seasonalAvailList = (seasonalAvailable || []).map((s: any) => `- ${s.ingredient_name} (${s.category})`).join('\n')

    const coursesWithLabels = courses.map((c: string) => COURSE_LABELS[c] || c).join(', ')

    // Build classical inspiration section per course
    const classicalSection = courses.map((c: string) => {
      const items = classicalInspirationByCourse[c] || []
      if (items.length === 0) return ''
      const label = COURSE_LABELS[c] || c
      const itemsList = items.map(r => 
        `  • ${r.name_english || r.name_original}${r.name_english && r.name_original !== r.name_english ? ` (${r.name_original})` : ''}${r.description ? `: ${r.description.slice(0, 100)}` : ''}`
      ).join('\n')
      return `${label}:\n${itemsList}`
    }).filter(Boolean).join('\n\n')

    const prompt = `Je bent een culinaire AI-assistent die een professioneel menu samenstelt voor een chef.
Je hebt toegang tot de volledige receptbibliotheek van de chef (eigen recepten + LEGENDE gerechten) én klassieke culinaire referentiewerken.

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
${style === 'Klassiek' 
  ? '→ Klassiek-Europese uitvoering gewenst. Traditionele presentaties, Escoffier-stijl bereidingen zijn oké. Focus op technische correctheid.' 
  : style === 'Fusion'
  ? '→ Fusion: combineer Europese basis met Aziatische of Midden-Oosterse technieken. Miso, dashi, yuzu, ponzu welkom. Moderne presentaties verplicht.'
  : style === 'Seizoensgebonden'
  ? '→ Seizoensgebonden EN modern: laat seizoensproducten centraal staan maar hertaal klassieke bereidingen naar 2024-2026 fine dining niveau. Geen gedateerde catering-hapjes.'
  : '→ Modern fine dining catering niveau (2024-2026). Zie HEDENDAAGSE RICHTLIJNEN hieronder — strict toepassen.'}
- Allergieën: ${allergies.length > 0 ? allergies.join(', ') : 'geen'}
- Hint van de chef: ${hint || 'geen'}

EIGEN RECEPTEN UIT DE LIBRARY (${ownRecipes?.length || 0} recepten):
${recipesList || '(nog geen recepten aangemaakt)'}

LEGENDE GERECHTEN (${legendeDishes?.length || 0} gerechten):
${legendeList || '(geen LEGENDE gerechten)'}

SEIZOENSPIEK PRODUCTEN (nu in piekseizoen — gebruik bij voorkeur):
${seasonalPeakList || '(geen data)'}

SEIZOEN BESCHIKBAAR (beschikbaar maar niet piek):
${seasonalAvailList || '(geen data)'}

KLASSIEKE CULINAIRE INSPIRATIE (Escoffier, Hirtzler, e.a. — ter referentie):
${classicalSection || '(geen klassieke inspiratie beschikbaar)'}

---

INSTRUCTIES:
1. Prioriteer ALTIJD: (1) eigen recepten, (2) LEGENDE gerechten, (3) nieuw AI-voorstel gebaseerd op klassieke inspiratie
2. Gebruik seizoenspiekproducten als sleutelingrediënten
3. Houd rekening met food cost budget (max €${maxFoodCost}/p totaal)
4. Vermijd allergieën volledig
5. Zorg voor een logisch verloop: licht → zwaar → zoet
6. Elk gerecht moet passen bij het chef-profiel en de kookstijl

HEDENDAAGSE CATERING FILOSOFIE (2024-2026 fine dining catering niveau):

KERNPRINCIPE: "Hertaal, vervang niet"
Klassieke smaakcombinaties zijn tijdloos. De uitvoering upgrade je.
Voorbeeld (Jules' eigen aanpak): asperge × ham × hollandaise = tijdloos flavor triplet.
Niet vervangen door iets compleet anders, maar hertalen:
→ Iberico ham i.p.v. Parmaham, gepekelde eierdooier i.p.v. klassieke hollandaise, shiitake poeder als umami-laag, kapperblad als zuur accent.
Het gerecht is herkenbaar maar voelt 2025 aan.

HERTAALREGEL — voor elk klassiek gerecht, pas toe:
1. UPGRADE het hoofdingrediënt naar een premium variant (Parma → Iberico, gewone champignon → trumpet royale, kip → kapoen, zalm → wilde Schotse zalm)
2. TRANSFORMEER één klassieke saus/bereiding (hollandaise → gepekelde dooier, bearnaise → tarragon gel, mayo → aioli met miso of yuzu)
3. VOEG één umami/diepte-laag toe (shiitake poeder, bonito flakes, dashi gel, gefermenteerde crème, gereduceerde jus)
4. VOEG één zuur/fris element toe (kapperblad, gezouten citroen, pickles, kombucha gel, elderflower)

WAT NOOIT MAG (uitvoering is verouderd, niet het concept):
- Letterlijk opgerold vleeswaar als fingerfood — wel: vleeswaar als dun lint, crispy chip, of fijn gesneden accent
- Gevulde tomaatjes/champignons — wel: geroosterde tomaat als basis, tartaar in tarteletje
- Cocktailprikkers als presentatievorm
- Sauzen naast het bord in een potje (culinaire kermis) tenzij bewust ironisch
- Klassieke garnituur-decoratie: gekrulde peterselie, tomatenbloem, citroenwig

STREEF NAAR (hedendaagse uitvoering):
- Mono-ingredient focus: één seizoensproduct centraal, 3-5 elementen max per hapje
- Texturespel: crumble, crunch, gel, crispy sheet, krokante huid — espuma spaarzaam
- Koud/warm contrast op één bord
- Geroosterd / à la plancha voor karamelisatie en Maillard
- Bouillons en consommés in shotglaasjes bij walking dinner
- Één-hand eetbaar (walking dinner principe)

Bij Escoffier/historische recepten als inspiratie: neem CONCEPT + SMAAKLOGICA, hertaal de uitvoering via bovenstaande regels.

Geef terug als JSON (ALLEEN JSON, geen markdown):
{
  "menu": [
    {
      "course": "AMUSE",
      "course_label": "Amuse-bouche",
      "items": [
        {
          "name": "Naam gerecht",
          "description": "Korte beschrijving (max 2 zinnen)",
          "source": "own_recipe",
          "recipe_id": "uuid of null",
          "legende_id": "uuid of null",
          "classical_reference": "naam van klassiek recept of null",
          "key_ingredients": ["ingredient1", "ingredient2"],
          "seasonal_highlights": ["seizoensingrediënt"],
          "estimated_cost_pp": 2.50,
          "notes": "optionele technische opmerking voor de chef"
        }
      ]
    }
  ],
  "total_estimated_cost_pp": 18.50,
  "total_food_cost_pct": 28.5,
  "chef_note": "Persoonlijke noot over dit menu en de gemaakte keuzes",
  "seasonal_score": 85
}

source moet "own_recipe", "legende" of "new" zijn.
Als je eigen recept of LEGENDE gebruikt, zet het echte id uit de lijst hierboven.
Realistische kostenschattingen: amuse €1-3/p, voorgerecht €3-6/p, tussengerecht €4-7/p, hoofdgerecht €6-12/p, dessert €2-5/p, mignardises €1-2/p, fingerfood (3 stuks) €3-6/p.`

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
      own_recipe_count: ownRecipes?.length || 0,
      legende_count: legendeDishes?.length || 0,
    })
  } catch (error) {
    console.error('Menu builder error:', error)
    return NextResponse.json({ error: 'Fout bij menu aanmaken' }, { status: 500 })
  }
}
