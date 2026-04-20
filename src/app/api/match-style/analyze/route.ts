import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function extractMainIngredient(dishName: string, elements: Array<{name: string}>): string {
  const proteins = ['kalf', 'rund', 'varken', 'lam', 'kip', 'eend', 'parelhoen', 'forel', 'zalm', 'zeebaars', 'garnaal', 'coquille', 'kreeft', 'tong', 'tarbot', 'rib', 'buik', 'schouder']
  for (const protein of proteins) {
    if (dishName.toLowerCase().includes(protein)) return protein
    if (elements.some(e => e.name.toLowerCase().includes(protein))) return protein
  }
  const stopWords = ['met', 'van', 'en', 'op', 'in', 'de', 'het', 'een', 'la', 'le', 'au', 'aux', 'sauce', 'jus', 'crème', 'soep', 'salade', 'gerecht', 'bereid']
  const words = dishName.toLowerCase().split(/[\s,&]+/)
  return words.find(w => w.length > 3 && !stopWords.includes(w)) || words[0]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { dishId, dishName, categoryName, elements } = await request.json()
    if (!dishId) return NextResponse.json({ error: 'Geen gerecht opgegeven' }, { status: 400 })

    const mainIngredient = extractMainIngredient(dishName, elements || [])

    const [profileRes, recipesRes, prepsRes, classicalRes] = await Promise.all([
      supabase.from('chef_profiles').select('display_name, kitchen_type, style_analysis, cooking_philosophy').eq('auth_user_id', user.id).single(),
      supabase.from('recipes').select(`
        id, name, description,
        components:recipe_components(
          name,
          ingredients:recipe_component_ingredients(
            quantity_per_person, cost_per_unit,
            ingredient:ingredients(name, category)
          )
        )
      `).eq('status', 'active').limit(30),
      supabase.from('preparations').select('name, method, yield_amount, yield_unit, shelf_life_hours').limit(50),
      supabase.from('classical_recipes').select('id, name_original, category, source, description').or(
        `name_original.ilike.%${mainIngredient}%,description.ilike.%${mainIngredient}%`
      ).limit(12),
    ])

    const chef = profileRes.data
    const recipes = recipesRes.data || []
    const preps = prepsRes.data || []
    const classical = classicalRes.data || []

    const styleAnalysis = (chef?.style_analysis as Record<string, unknown>) || {}

    const elementsText = (elements || [])
      .map((e: {name: string; quantity_grams?: number}) => `${e.name}${e.quantity_grams ? ` (${e.quantity_grams}g)` : ''}`)
      .join(', ')

    const recipeText = recipes.map(r => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const comps = (r.components as any[]) || []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ings = comps.flatMap((c: any) => (c.ingredients || []).map((i: any) => i.ingredient?.name)).filter(Boolean)
      return `- ${r.name}: ${ings.join(', ')}`
    }).join('\n')

    const classicalText = classical.map(c =>
      `- ${c.name_original} (${c.source || 'klassiek'})${c.description ? `: ${String(c.description).substring(0, 80)}` : ''}`
    ).join('\n')

    const prepsText = preps.map(p =>
      `- ${p.name}${p.method ? ` [${p.method}]` : ''}${p.shelf_life_hours ? `, houdbaar ${p.shelf_life_hours}u` : ''}`
    ).join('\n')

    const prompt = `Je bent een professionele culinaire AI-coach voor een Belgische chef.

CHEF PROFIEL:
- Naam: ${chef?.display_name || 'Chef'}
- Keukentype: ${chef?.kitchen_type || 'catering'}
- Stijltags: ${((styleAnalysis.style_tags as string[]) || []).join(', ') || 'niet gespecificeerd'}
- Signatuurtechnieken: ${((styleAnalysis.top_techniques as string[]) || []).join(', ') || 'niet gespecificeerd'}
- Sausfamilies: ${((styleAnalysis.sauce_families as string[]) || []).join(', ')}
- Stijlbeschrijving: ${(styleAnalysis.style_description as string) || chef?.cooking_philosophy || 'niet gespecificeerd'}

LEGENDE GERECHT TE ANALYSEREN:
- Naam: ${dishName}
- Categorie: ${categoryName}
- Elementen: ${elementsText}
- Hoofdingrediënt: ${mainIngredient}

CHEF'S EIGEN RECEPTEN:
${recipeText || 'Geen recepten'}

KLASSIEKE RECEPTEN UIT DATABASE (${mainIngredient}):
${classicalText || 'Geen klassieke variaties gevonden voor dit ingrediënt'}

HALFFABRICATEN IN KEUKEN:
${prepsText || 'Geen halffabricaten'}

Geef uitsluitend geldige JSON terug (geen markdown, geen uitleg buiten JSON):
{
  "eigen_recepten_match": [
    {
      "naam": "naam van eigen recept",
      "overeenkomst": "concrete uitleg waarom dit matcht qua techniek of ingrediënten",
      "score": 75,
      "transfereerbare_elementen": ["element 1", "element 2"]
    }
  ],
  "klassieke_variaties": [
    {
      "naam": "naam klassiek recept",
      "bron": "bronvermelding",
      "techniek": "kernbereidingstechniek",
      "hertaling": "hoe dit eruitziet in Jules' moderne stijl"
    }
  ],
  "toe_te_passen_halffabricaten": [
    {
      "naam": "naam halffabricaat",
      "toepassing": "concrete toepassing in dit gerecht"
    }
  ],
  "stijl_aanpassing": {
    "klassiek_concept": "het klassieke smaakanker bv. ${mainIngredient} + saus + garnituur",
    "moderne_uitvoering": "concrete moderne hertaling in Jules' stijl",
    "stappen": ["Upgrade ingrediënt: ...", "Moderne techniek: ...", "Umami-laag: ...", "Zuur-accent: ..."],
    "mise_en_place_tip": "praktische MEP-tip voor catering/restaurant"
  },
  "food_cost_inschatting": {
    "range": "€X - €Y per persoon",
    "food_cost_pct": "XX-XX%",
    "toelichting": "korte toelichting gebaseerd op ingrediëntkostprijs"
  }
}

REGELS:
- Match ALLEEN gelijksoortige gerechten: ${mainIngredient} → gevogelte/vlees/vis in dezelfde categorie, NIET biefstuk bij gevogelte
- Maximaal 3 eigen recept matches, 3 klassieke variaties, 2 halffabricaten
- Wees specifiek en professioneel — dit is voor een chef, niet een thuiskok
- Hertaalfilosofie: klassiek smaakanker behouden, maar upgrade naar moderne technieken en premium ingrediënten`

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text()
      console.error('Anthropic error:', errText)
      return NextResponse.json({ error: 'AI-analyse mislukt' }, { status: 502 })
    }

    const aiResult = await anthropicResponse.json()
    const textContent = aiResult.content?.[0]?.text || ''

    const jsonMatch = textContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON in response:', textContent)
      return NextResponse.json({ error: 'Kon analyse niet verwerken' }, { status: 422 })
    }

    const analysis = JSON.parse(jsonMatch[0])
    return NextResponse.json({
      analysis,
      meta: { classical_count: classical.length, preps_count: preps.length, main_ingredient: mainIngredient }
    })

  } catch (error) {
    console.error('Match analyze error:', error)
    return NextResponse.json({ error: 'Interne fout' }, { status: 500 })
  }
}
