import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { message, context } = await request.json()
    if (!message) return NextResponse.json({ error: 'Geen bericht' }, { status: 400 })

    // Load chef profile for context
    const { data: chef } = await supabase
      .from('chef_profiles')
      .select('display_name, kitchen_type, cooking_philosophy, style_analysis')
      .eq('auth_user_id', user.id)
      .single()

    const systemPrompt = `Je bent de persoonlijke culinaire AI-assistent van ${chef?.display_name || 'Chef'}. 
Je keukentype is ${chef?.kitchen_type || 'catering'}.
Context: ${context || 'algemeen culinair advies'}.
Antwoord altijd in het Nederlands, professioneel en beknopt.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'AI-aanvraag mislukt' }, { status: 502 })
    }

    const result = await response.json()
    const text = result.content?.[0]?.text || 'Geen analyse beschikbaar.'

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error('Jules chat error:', error)
    return NextResponse.json({ error: 'Interne fout' }, { status: 500 })
  }
}
