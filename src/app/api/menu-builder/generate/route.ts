import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    menuType = 'walking_dinner',
    numPersons = 20,
    pricePerPerson = 65,
    exclusions = [] as string[],
    concept = '',
    specialRequests = '',
    preferences = {} as Record<string, string>,
    season = 'current',
  } = body

  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('style_analysis, preferred_ingredients, cuisine_styles')
    .eq('auth_user_id', user.id)
    .single()

  const exclusionsText = exclusions.length > 0 ? `\nExclusies/allergie\u00ebn: ${exclusions.join(', ')}` : ''
  const conceptText = concept ? `\nConcept/stijl: ${concept}` : ''
  const prefsText = Object.keys(preferences).length > 0
    ? `\nVoorkeuren per gang:\n${Object.entries(preferences).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
    : ''
  const styleText = profile?.style_analysis
    ? `\nChef stijl DNA: ${typeof profile.style_analysis === 'string' ? profile.style_analysis : JSON.stringify(profile.style_analysis)}`
    : ''

  const prompt = `Je bent een Michelin-niveau culinaire AI. Genereer een menu voor een ${menuType.replace(/_/g, ' ')} event.\n\nParameters:\n- ${numPersons} personen\n- Budget: \u20ac${pricePerPerson}/persoon (food cost 28-32%)\n- Seizoen: ${season}${exclusionsText}${conceptText}${prefsText}${styleText}${specialRequests ? `\nBijzondere wensen: ${specialRequests}` : ''}\n\nGenereer een menu met de juiste gangstructuur. Hedendaags Belgisch-Frans met Japanse umami-accenten.\n\nAntwoord ALLEEN als JSON:\n{\n  "courses": [\n    {\n      "name": "Amuse",\n      "dishes": [\n        { "name": "Naam", "description": "Beschrijving", "cost_per_person": 4.50 }\n      ]\n    }\n  ]\n}`

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
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) return NextResponse.json({ error: 'AI call failed' }, { status: 500 })

    const aiResult = await response.json()
    const text: string = aiResult.content?.[0]?.text || ''
    const cleaned = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'No valid JSON in AI response' }, { status: 500 })

    return NextResponse.json(JSON.parse(match[0]))
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
