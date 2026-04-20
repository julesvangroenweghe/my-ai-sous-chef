import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Niet gemachtigd' }, { status: 401 })
  }

  // Load chef profile
  const { data: profile, error: profileError } = await supabase
    .from('chef_profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profiel niet gevonden' }, { status: 404 })
  }

  // Load last 50 style events
  const { data: events } = await supabase
    .from('chef_style_events')
    .select('*')
    .eq('chef_profile_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const styleEvents = events || []

  // Build prompt
  const prompt = `Je bent een culinaire AI-assistent. Analyseer de stijldata van deze chef en genereer een bijgewerkte style_analysis JSON.

Chef profiel:
- Naam: ${profile.display_name || 'Onbekend'}
- Rol: ${profile.current_role || 'Onbekend'}
- Jaren ervaring: ${profile.years_experience || 'Onbekend'}
- Keukentype: ${profile.kitchen_type || 'Onbekend'}
- Kookfilosofie: ${profile.cooking_philosophy || 'Niet opgegeven'}
- Culinaire invloeden: ${(profile.cuisine_styles || []).join(', ') || 'Geen'}
- Favoriete technieken: ${(profile.preferred_techniques || profile.signature_techniques || []).join(', ') || 'Geen'}
- Favoriete ingrediënten: ${(profile.preferred_ingredients || []).join(', ') || 'Geen'}
- Te vermijden: ${(profile.avoided_ingredients || []).join(', ') || 'Geen'}

Recente stijl-events (${styleEvents.length} events):
${styleEvents
  .slice(0, 20)
  .map(
    (e: Record<string, unknown>) =>
      `- ${e.event_type}: ${e.entity_name || ''} ${e.metadata ? JSON.stringify(e.metadata) : ''}`,
  )
  .join('\n')}

Genereer een style_analysis JSON object met deze exacte structuur (antwoord ALLEEN met het JSON object, geen extra tekst):
{
  "signature_techniques": ["lijst van top technieken"],
  "preferred_ingredients": ["lijst van top ingrediënten"],
  "cuisine_influences": ["lijst van culinaire invloeden"],
  "cooking_philosophy": "samenvatting kookfilosofie",
  "avoid_ingredients": ["te vermijden ingrediënten"],
  "style_summary": "Een zin die de culinaire stijl van deze chef samenват",
  "confidence": "analyzed",
  "last_updated": "${new Date().toISOString()}"
}`

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : ''

    let styleAnalysis: Record<string, unknown>
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Geen JSON gevonden in antwoord')
      styleAnalysis = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json(
        { error: 'Kon AI-antwoord niet verwerken' },
        { status: 500 },
      )
    }

    // Save to chef_profiles
    const { data: updated, error: updateError } = await supabase
      .from('chef_profiles')
      .update({
        style_analysis: styleAnalysis,
        updated_at: new Date().toISOString(),
      })
      .eq('auth_user_id', user.id)
      .select('style_analysis')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(updated?.style_analysis || styleAnalysis)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
