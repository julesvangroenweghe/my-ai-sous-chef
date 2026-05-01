import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'Geen bestand' }, { status: 400 })

  const mimeType = file.type
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  if (
    mimeType === 'text/plain' ||
    mimeType === 'text/markdown' ||
    file.name.endsWith('.txt') ||
    file.name.endsWith('.md')
  ) {
    const text = buffer.toString('utf-8')
    return NextResponse.json({ text })
  }

  if (mimeType === 'application/pdf' || file.name.endsWith('.pdf')) {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

      const base64 = buffer.toString('base64')
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64,
                },
              } as any,
              {
                type: 'text',
                text: 'Extraheer alle tekst uit dit document. Behoud de structuur zo goed mogelijk. Geef ALLEEN de ruwe tekst terug, geen uitleg.',
              },
            ],
          },
        ],
      })

      const text =
        response.content[0].type === 'text' ? response.content[0].text : ''
      return NextResponse.json({ text })
    } catch (err) {
      console.error('PDF extraction error:', err)
      return NextResponse.json({ error: 'PDF extractie mislukt' }, { status: 500 })
    }
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.name.endsWith('.docx')
  ) {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

      const base64 = buffer.toString('base64')
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extraheer alle tekst uit dit Word-document (base64 encoded DOCX). Behoud de structuur zo goed mogelijk. Geef ALLEEN de ruwe tekst terug, geen uitleg.\n\nBestand (base64): ${base64.substring(0, 100)}...`,
              },
            ],
          },
        ],
      })

      const text =
        response.content[0].type === 'text' ? response.content[0].text : ''
      return NextResponse.json({ text })
    } catch (err) {
      console.error('DOCX extraction error:', err)
      return NextResponse.json({ error: 'DOCX extractie mislukt' }, { status: 500 })
    }
  }

  return NextResponse.json(
    { error: 'Bestandstype niet ondersteund. Gebruik .txt, .md, .pdf of .docx' },
    { status: 400 }
  )
}
