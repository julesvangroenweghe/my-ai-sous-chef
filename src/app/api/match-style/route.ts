import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Load chef profile
  const { data: chef } = await supabase
    .from('chef_profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (!chef) return NextResponse.json({ error: 'Geen profiel gevonden' }, { status: 404 })

  // Load LEGENDE dishes + elements
  const { data: legendeDishes } = await supabase
    .from('legende_dishes')
    .select('*, elements:legende_dish_elements(*)')

  // Load chef's existing recipes
  const { data: recipes } = await supabase
    .from('recipes')
    .select(`
      id, name, category:recipe_categories(name),
      components:recipe_components(
        name,
        ingredients:recipe_component_ingredients(
          ingredient:ingredients(name, category)
        )
      )
    `)
    .eq('status', 'active')
    .limit(50)

  // Load classical recipes
  const { data: classicalRecipes } = await supabase
    .from('classical_recipes')
    .select('*')
    .limit(100)

  // Build analysis prompt
  const prompt = `Je bent een culinaire AI-expert. Analyseer het kookprofiel van deze chef en identificeer patronen.

CHEF PROFIEL:
- Naam: ${chef.display_name || 'Onbekend'}
- Keukentype: ${chef.kitchen_type || 'restaurant'}
- Keukenstijlen: ${(chef.cuisine_specialties || chef.cuisine_styles || []).join(', ') || 'niet gespecificeerd'}
- Kookfilosofie: ${chef.cooking_philosophy || chef.bio || 'niet gespecificeerd'}

BESTAANDE RECEPTEN (${recipes?.length || 0}):
${(recipes || []).slice(0, 30).map(r => {
    const comps = (r.components as Array<Record<string, unknown>> || [])
    const ingNames = comps.flatMap(c =>
      ((c.ingredients as Array<Record<string, unknown>>) || [])
        .map(i => (i.ingredient as Record<string, unknown>)?.name)
        .filter(Boolean)
    )
    return `- ${r.name} (${(r.category as Record<string, unknown>)?.name || 'geen categorie'}): ${ingNames.join(', ')}`
  }).join('\n')}

LEGENDE GERECHTEN (${legendeDishes?.length || 0}):
${(legendeDishes || []).slice(0, 20).map(d => `- ${d.name}: ${(d.elements || []).map((e: Record<string, unknown>) => e.element_name).join(', ')}`).join('\n')}

KLASSIEKE RECEPTEN BESCHIKBAAR (${classicalRecipes?.length || 0}):
${(classicalRecipes || []).slice(0, 30).map(r => `- ${r.name} (${r.cuisine || 'klassiek'}): ${r.description || ''}`).join('\n')}

Analyseer en geef terug in JSON:
{
  "style_tags": ["tag1", "tag2", "tag3"],
  "top_techniques": ["techniek1", "techniek2", "techniek3"],
  "signature_elements": ["element1", "element2"],
  "flavor_profile": "beschrijving van smaakprofiel",
  "protein_preferences": ["eiwit1", "eiwit2"],
  "sauce_families": ["saus1", "saus2"],
  "garnish_patterns": ["garnering1", "garnering2"],
  "style_description": "Een paragraaf die de kookstijl van de chef beschrijft",
  "suggested_classical_recipes": [
    { "name": "receptnaam", "reason": "waarom dit past" }
  ],
  "growth_areas": ["suggestie voor groei 1", "suggestie 2"]
}

Wees specifiek en culinair relevant. Geef 3-5 stijltags, 3-5 technieken, en 3-5 receptsuggesties.`

  try {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text()
      console.error('Anthropic API error:', errText)
      return NextResponse.json({ error: 'AI-analyse mislukt' }, { status: 502 })
    }

    const aiResult = await anthropicResponse.json()
    const textContent = aiResult.content?.[0]?.text || ''

    const jsonMatch = textContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Kon analyse niet verwerken' }, { status: 422 })
    }

    const analysis = JSON.parse(jsonMatch[0])

    // Save to chef profile
    await supabase
      .from('chef_profiles')
      .update({
        style_analysis: analysis,
        updated_at: new Date().toISOString(),
      })
      .eq('auth_user_id', user.id)

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Match style error:', error)
    return NextResponse.json({ error: 'Fout bij stijlanalyse' }, { status: 500 })
  }
}
