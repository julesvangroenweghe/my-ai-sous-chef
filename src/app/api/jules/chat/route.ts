import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { messages } = await request.json()

  // Load chef context
  const [profileRes, recipesRes, ingredientsRes, eventsRes, prepsRes] = await Promise.all([
    supabase.from('chef_profiles').select('*').eq('auth_user_id', user.id).single(),
    supabase.from('recipes').select('id, name, category:recipe_categories(name), total_cost_per_serving, selling_price, food_cost_percentage').eq('status', 'active').limit(50),
    supabase.from('ingredients').select('name, category, current_price, unit').order('name').limit(100),
    supabase.from('events').select('id, title, event_date, pax, status, event_type').order('event_date', { ascending: false }).limit(10),
    supabase.from('preparation_templates').select('name, method, yield_percentage, shelf_life').limit(30),
  ])

  const profile = profileRes.data
  const recipes = recipesRes.data || []
  const ingredients = ingredientsRes.data || []
  const events = eventsRes.data || []
  const preparations = prepsRes.data || []

  // Load seasonal data
  const currentMonth = new Date().getMonth() + 1
  const { data: seasonal } = await supabase
    .from('seasonal_products')
    .select('product_name, category, peak_months')

  const inSeason = (seasonal || []).filter((s: any) => {
    const peaks = s.peak_months || []
    return peaks.includes(currentMonth)
  })

  // Load classical recipe suggestions
  const { data: classicalRecipes } = await supabase
    .from('classical_recipes')
    .select('name, source, cuisine, description')
    .limit(30)

  // Load technique parameters
  const { data: techniques } = await supabase
    .from('technique_parameters')
    .select('*')
    .limit(20)

  const systemPrompt = `Je bent Jules AI, de persoonlijke keukenassistent van ${profile?.display_name || 'chef'}. Je bent een ervaren sous-chef met encyclopedische kennis.

PROFIEL VAN DE CHEF:
- Naam: ${profile?.display_name || 'Chef'}
- Stijl: ${(profile?.cuisine_specialties || profile?.cuisine_styles || []).join(', ') || 'niet gespecificeerd'}
- Filosofie: ${profile?.cooking_philosophy || 'niet gespecificeerd'}
- Technieken: ${(profile?.signature_techniques || []).join(', ') || 'niet gespecificeerd'}

BESCHIKBARE RECEPTEN (${recipes.length}):
${recipes.map((r: any) => `- ${r.name} (${r.category?.name || '?'}) — food cost: ${r.food_cost_percentage ? r.food_cost_percentage.toFixed(1) + '%' : '?'}`).join('\n')}

INGREDIENTEN MET PRIJS (top 50):
${ingredients.filter((i: any) => i.current_price).slice(0, 50).map((i: any) => `- ${i.name}: EUR${i.current_price}/kg`).join('\n')}

KOMENDE EVENTS:
${events.map((e: any) => `- ${e.title} (${e.event_date}, ${e.pax} pax, ${e.event_type})`).join('\n')}

HALFFABRICATEN:
${preparations.map((p: any) => `- ${p.name} (${p.method || '?'}, yield: ${p.yield_percentage || '?'}%, houdbaarheid: ${p.shelf_life || '?'})`).join('\n')}

IN SEIZOEN (${new Date().toLocaleString('nl-BE', { month: 'long' })}):
${inSeason.map((s: any) => `- ${s.product_name} (${s.category})`).join('\n')}

KLASSIEKE RECEPTEN (referentie):
${(classicalRecipes || []).slice(0, 15).map((r: any) => `- ${r.name} (${r.source}): ${r.description?.substring(0, 80) || ''}`).join('\n')}

TECHNIEKEN & PARAMETERS:
${(techniques || []).map((t: any) => `- ${t.technique}: ${t.parameter_name} = ${t.value} ${t.unit || ''}`).join('\n')}

REGELS:
1. Antwoord ALTIJD in het Nederlands
2. Geef professioneel advies op chef-niveau — geen huishoudtips
3. Gebruik de echte data hierboven (ingredienten, prijzen, recepten) in je antwoorden
4. Bij receptsuggesties: geef altijd grammen per persoon
5. Bij food cost vragen: bereken met de echte prijzen uit de database
6. Wees bondig maar volledig — chefs hebben geen tijd voor essays
7. Verwijs naar klassieke technieken en bronnen waar relevant
8. Bij seizoensgebonden vragen: gebruik de seizoenskalender data
9. Gebruik NOOIT emoji — professionele toon
10. Bij sous vide of andere techniek-parameters: gebruik de exacte waarden uit de database`

  // Call Claude API with streaming
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      stream: true,
      messages: messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error('Claude API error:', errText)
    return new Response(JSON.stringify({ error: 'AI-service niet beschikbaar' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Forward the stream
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
