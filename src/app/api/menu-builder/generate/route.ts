import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const body = await req.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    menuType = 'walking_dinner',
    numPersons = 20,
    pricePerPerson = 65,
    exclusions = [],
    concept = '',
    specialRequests = '',
    preferences = {},
    season = 'current',
  } = body

  // Get chef profile for style DNA
  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('style_analysis, preferred_ingredients, cuisine_styles')
    .eq('auth_user_id', user.id)
    .single()

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const exclusionsText = exclusions.length > 0 ? `\nExclusies/allergieën: ${exclusions.join(', ')}` : ''
  const conceptText = concept ? `\nConcept/stijl: ${concept}` : ''
  const prefsText = Object.keys(preferences).length > 0 
    ? `\nVoorkeuren per gang:\n${Object.entries(preferences).map(([k,v]) => `- ${k}: ${v}`).join('\n')}` 
    : ''
  const styleText = profile?.style_analysis 
    ? `\nChef stijl DNA: ${typeof profile.style_analysis === 'string' ? profile.style_analysis : JSON.stringify(profile.style_analysis)}` 
    : ''

  const prompt = `Je bent een Michelin-niveau sous chef AI. Genereer een menu voor een ${menuType.replace(/_/g, ' ')} event.

Parameters:
- ${numPersons} personen
- Budget: €${pricePerPerson}/persoon (food cost 28-32%)
- Seizoen: ${season}${exclusionsText}${conceptText}${prefsText}${styleText}${specialRequests ? `\nBijzondere wensen: ${specialRequests}` : ''}

Genereer een menu met de juiste gangstructuur voor dit format. Elk gerecht moet in Jules' stijl zijn: hedendaags Belgisch-Frans met Japanse umami-accenten.

Geef je antwoord als JSON:
{
  "courses": [
    {
      "name": "Amuse",
      "dishes": [
        { "name": "Gerechtnaam", "description": "Korte beschrijving", "cost_per_person": 4.50 }
      ]
    }
  ]
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'AI returned no valid JSON' }, { status: 500 })
    
    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('Menu builder error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
