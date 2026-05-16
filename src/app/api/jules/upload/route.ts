import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Geen bestand' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf'
  
  // Voor PDF: stuur als document, voor afbeeldingen: als image
  const isPdf = mediaType === 'application/pdf'
  
  const content = isPdf 
    ? [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 }, title: file.name },
        { type: 'text', text: 'Analyseer dit document en geef een samenvatting van de relevante culinaire informatie.' }
      ]
    : [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: 'Wat zie je in deze afbeelding? Beschrijf de gerechten, ingrediënten of culinaire informatie die je ziet.' }
      ]

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
      system: 'Je bent Jules AI, een professionele keukenassistent. Analyseer het aangeleverde bestand en geef nuttige culinaire informatie. Antwoord in het Nederlands.',
      messages: [{ role: 'user', content }],
    }),
  })

  if (!response.ok) {
    return NextResponse.json({ error: 'Analyse mislukt' }, { status: 502 })
  }

  const result = await response.json()
  const analysis = result.content?.[0]?.text || 'Kon bestand niet analyseren.'

  return NextResponse.json({ 
    analysis,
    filename: file.name,
    type: isPdf ? 'pdf' : 'image'
  })
}
