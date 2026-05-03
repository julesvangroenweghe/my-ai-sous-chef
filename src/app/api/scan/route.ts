import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type DocumentType = 'invoice' | 'mep' | 'recipe' | 'pricelist'

interface ScanResult {
  type: DocumentType
  data: Record<string, unknown>
  confidence: number
}

function buildSystemPrompt(): string {
  return `Je bent een expert OCR-assistent voor de horeca/keukenindustrie. Je taak is het extraheren van gestructureerde data uit documenten.

CRITISCH: Reageer UITSLUITEND met pure, geldige JSON. Geen uitleg, geen inleiding, geen markdown, geen code blocks, geen tekst voor of na de JSON. Alleen de JSON-object zelf.`
}

function buildUserPrompt(typeHint?: string): string {
  return `Analyseer dit document en extraheer de data.

Detecteer het type:
- "prijslijst" / "price list" / "catalogus" / producten met prijzen maar GEEN factuurgegevens → "pricelist"
- "factuur" / "invoice" / BTW-nummer / factuurnummer → "invoice"
- "MEP" / "mise en place" / "productielijst" → "mep"
- "recept" / bereiding / ingrediënten → "recipe"

${typeHint ? `De gebruiker heeft aangegeven: "${typeHint}" — gebruik dit type tenzij 100% zeker anders.` : ''}

Gebruik exact dit JSON-formaat:

Voor prijslijst:
{"type":"pricelist","confidence":0.95,"data":{"supplier_name":"Naam leverancier","price_date":"YYYY-MM-DD of null","products":[{"product_name":"Productnaam","unit":"kg","price":10.50,"price_per_kg":10.50,"category":"vlees"}]}}

Voor factuur:
{"type":"invoice","confidence":0.95,"data":{"supplier_name":"...","invoice_date":"YYYY-MM-DD","invoice_number":"...","line_items":[{"product_name":"...","quantity":1,"unit":"kg","unit_price":10.50,"total":10.50}],"total_amount":0,"vat_amount":0}}

Voor MEP:
{"type":"mep","confidence":0.95,"data":{"title":"...","date":"YYYY-MM-DD","dishes":[{"name":"...","components":[{"name":"...","ingredients":[{"name":"...","quantity":"80","unit":"g"}]}]}]}}

Voor recept:
{"type":"recipe","confidence":0.95,"data":{"name":"...","servings":4,"prep_time_minutes":30,"ingredients":[{"name":"...","quantity":"200","unit":"g"}],"method":["Stap 1","Stap 2"],"notes":""}}

Extraheer ALLE producten. Bereken price_per_kg waar mogelijk. Reageer ALLEEN met JSON.`
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let base64Data: string
  let mediaType: string
  let typeHint: string | undefined

  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    typeHint = (formData.get('type') as string) || undefined

    if (!file) {
      return NextResponse.json({ error: 'Geen bestand geüpload' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    base64Data = Buffer.from(bytes).toString('base64')
    mediaType = file.type || 'image/jpeg'
    
    console.log('Scan upload:', { fileName: file.name, fileType: file.type, fileSize: file.size, typeHint })
  } else {
    const body = await request.json()
    base64Data = body.base64
    mediaType = body.media_type || 'image/jpeg'
    typeHint = body.type
    if (!base64Data) {
      return NextResponse.json({ error: 'base64 data is vereist' }, { status: 400 })
    }
  }

  // Normalize media type
  const isPdf = mediaType === 'application/pdf' || mediaType.includes('pdf')
  const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
  
  let normalizedMediaType = mediaType
  if (!isPdf && !supportedImageTypes.some(t => mediaType.startsWith(t))) {
    normalizedMediaType = 'image/jpeg'
  }
  // HEIC/HEIF → jpeg for API compatibility
  if (normalizedMediaType.includes('heic') || normalizedMediaType.includes('heif')) {
    normalizedMediaType = 'image/jpeg'
  }

  const contentBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } }
    : { type: 'image', source: { type: 'base64', media_type: normalizedMediaType, data: base64Data } }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set')
    return NextResponse.json({ error: 'API key niet geconfigureerd' }, { status: 500 })
  }

  try {
    const requestBody = {
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system: buildSystemPrompt(),
      messages: [{
        role: 'user',
        content: [
          contentBlock,
          { type: 'text', text: buildUserPrompt(typeHint) },
        ],
      }],
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }
    
    // Only add PDF beta header for PDF files
    if (isPdf) {
      headers['anthropic-beta'] = 'pdfs-2024-09-25'
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text()
      console.error('Anthropic API error:', anthropicResponse.status, errText)
      return NextResponse.json({ 
        error: `OCR-service fout (${anthropicResponse.status})`, 
        details: errText.substring(0, 200) 
      }, { status: 502 })
    }

    const aiResult = await anthropicResponse.json()
    const textContent = aiResult.content?.[0]?.text || ''
    
    console.log('AI response preview:', textContent.substring(0, 200))

    // Try to parse JSON - multiple strategies
    let parsed: ScanResult | null = null
    
    // Strategy 1: direct parse
    try {
      parsed = JSON.parse(textContent.trim())
    } catch { /* continue */ }
    
    // Strategy 2: extract from code block
    if (!parsed) {
      const codeBlockMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (codeBlockMatch) {
        try { parsed = JSON.parse(codeBlockMatch[1].trim()) } catch { /* continue */ }
      }
    }
    
    // Strategy 3: find first { ... } block
    if (!parsed) {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]) } catch { /* continue */ }
      }
    }
    
    // Strategy 4: find last complete JSON object
    if (!parsed) {
      const allMatches = [...textContent.matchAll(/\{[\s\S]*?\}/g)]
      for (const match of allMatches.reverse()) {
        try { 
          parsed = JSON.parse(match[0])
          if (parsed && parsed.type) break
        } catch { /* continue */ }
      }
    }

    if (!parsed) {
      console.error('Could not parse AI response:', textContent.substring(0, 500))
      return NextResponse.json({ 
        error: 'Kon document niet verwerken — AI gaf geen geldig antwoord', 
        raw: textContent.substring(0, 300)
      }, { status: 422 })
    }

    // Auto-match ingredients in DB
    const { data: ingredients } = await supabase.from('ingredients').select('id, name')

    if (ingredients) {
      const matchProduct = (name: string) => {
        const lower = name.toLowerCase()
        return ingredients.find(ing =>
          ing.name.toLowerCase().includes(lower) || lower.includes(ing.name.toLowerCase())
        )
      }

      if (parsed.type === 'pricelist' && parsed.data.products) {
        const products = parsed.data.products as Array<Record<string, unknown>>
        for (const item of products) {
          const match = matchProduct(item.product_name as string || '')
          if (match) {
            item.matched_ingredient_id = match.id
            item.matched_ingredient_name = match.name
          }
        }
      }

      if (parsed.type === 'invoice' && parsed.data.line_items) {
        const lineItems = parsed.data.line_items as Array<Record<string, unknown>>
        for (const item of lineItems) {
          const match = matchProduct(item.product_name as string || '')
          if (match) {
            item.matched_ingredient_id = match.id
            item.matched_ingredient_name = match.name
          }
        }
      }
    }

    return NextResponse.json({
      type: parsed.type,
      data: parsed.data,
      confidence: parsed.confidence || 0.85,
    })

  } catch (error) {
    console.error('Scan error:', error)
    return NextResponse.json({ 
      error: 'Fout bij verwerken van document',
      details: error instanceof Error ? error.message : 'Onbekende fout'
    }, { status: 500 })
  }
}
