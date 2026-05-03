import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type DocumentType = 'invoice' | 'mep' | 'recipe' | 'pricelist'

interface ScanResult {
  type: DocumentType
  data: Record<string, unknown>
  confidence: number
}

function detectDocumentType(text: string, typeHint?: string): DocumentType {
  if (typeHint) {
    const hint = typeHint.toLowerCase()
    if (hint === 'invoice' || hint === 'factuur') return 'invoice'
    if (hint === 'mep' || hint === 'mise en place' || hint === 'productielijst') return 'mep'
    if (hint === 'recipe' || hint === 'recept') return 'recipe'
    if (hint === 'pricelist' || hint === 'prijslijst') return 'pricelist'
  }
  const lower = text.toLowerCase()
  if (lower.includes('prijslijst') || lower.includes('price list') || lower.includes('tarief') || lower.includes('catalogus')) return 'pricelist'
  if (lower.includes('factuur') || lower.includes('invoice') || lower.includes('btw') || lower.includes('totaal')) return 'invoice'
  if (lower.includes('mep') || lower.includes('mise en place') || lower.includes('productielijst')) return 'mep'
  if (lower.includes('recept') || lower.includes('bereidingswijze') || lower.includes('ingrediënten')) return 'recipe'
  return 'invoice'
}

function buildPrompt(typeHint?: string): string {
  const pricelistPrompt = `
Voor prijslijsten:
{"type":"pricelist","confidence":0.95,"data":{"supplier_name":"...","price_date":"YYYY-MM-DD","products":[{"product_name":"...","unit":"kg","price":10.50,"price_per_kg":10.50,"category":"vlees"}]}}
`

  return `Je bent een expert OCR-assistent voor de horeca/keukenindustrie. Analyseer dit document en extraheer gestructureerde data.

Detecteer het type document:
- "prijslijst" / "price list" / "catalogus" / producten met prijzen maar GEEN factuurgegevens → prijslijst (pricelist)
- "factuur" / "invoice" → factuurverwerking
- "MEP" / "mise en place" / "productielijst" → MEP-lijst
- "recept" / receptachtige inhoud → receptextractie

${typeHint ? `De gebruiker geeft aan dat dit een "${typeHint}" is — gebruik dit type.` : ''}

Reageer ALTIJD in exact dit JSON-formaat (geen andere tekst, geen markdown, geen uitleg):

Voor prijslijsten (pricelist):
{"type":"pricelist","confidence":0.95,"data":{"supplier_name":"...","price_date":"YYYY-MM-DD of null","products":[{"product_name":"...","unit":"kg","price":10.50,"price_per_kg":10.50,"category":"vlees/vis/groenten/zuivel/droog/overig"}]}}

Voor facturen:
{"type":"invoice","confidence":0.95,"data":{"supplier_name":"...","invoice_date":"YYYY-MM-DD","invoice_number":"...","line_items":[{"product_name":"...","quantity":1,"unit":"kg","unit_price":10.50,"total":10.50}],"total_amount":0,"vat_amount":0}}

Voor MEP-lijsten:
{"type":"mep","confidence":0.95,"data":{"title":"...","date":"YYYY-MM-DD","dishes":[{"name":"...","components":[{"name":"...","ingredients":[{"name":"...","quantity":"80","unit":"g"}]}]}]}}

Voor recepten:
{"type":"recipe","confidence":0.95,"data":{"name":"...","servings":4,"prep_time_minutes":30,"ingredients":[{"name":"...","quantity":"200","unit":"g"}],"method":["Stap 1...","Stap 2..."],"notes":"..."}}

Belangrijke regels voor prijslijsten:
- Extraheer ALLE producten met prijzen die je ziet
- Bereken price_per_kg als dat mogelijk is (bv. prijs per 500g → price_per_kg = prijs * 2)
- Als eenheid onduidelijk is, gebruik de meest logische eenheid (kg voor vlees/vis, stuk voor bepaalde producten)
- supplier_name: naam van de leverancier bovenaan of in de header

Analyseer het document nauwkeurig. Reageer ALLEEN met pure JSON, geen andere tekst.`
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
  const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!isPdf && !supportedImageTypes.some(t => mediaType.startsWith(t))) {
    mediaType = 'image/jpeg'
  }

  const contentBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } }

  try {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            contentBlock,
            { type: 'text', text: buildPrompt(typeHint) },
          ],
        }],
      }),
    })

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text()
      console.error('Anthropic API error:', errText)
      return NextResponse.json({ error: 'OCR-service fout', details: errText }, { status: 502 })
    }

    const aiResult = await anthropicResponse.json()
    const textContent = aiResult.content?.[0]?.text || ''

    let parsed: ScanResult | null = null
    try {
      parsed = JSON.parse(textContent)
    } catch {
      const codeBlockMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (codeBlockMatch) {
        try { parsed = JSON.parse(codeBlockMatch[1].trim()) } catch { /* ignore */ }
      }
      if (!parsed) {
        const jsonMatch = textContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[0]) } catch { /* ignore */ }
        }
      }
    }

    if (!parsed) {
      console.error('Could not parse AI response:', textContent.substring(0, 500))
      return NextResponse.json({ error: 'Kon document niet verwerken', raw: textContent.substring(0, 500) }, { status: 422 })
    }

    // Auto-match products for pricelist
    if (parsed.type === 'pricelist' && parsed.data.products) {
      const { data: ingredients } = await supabase.from('ingredients').select('id, name')
      if (ingredients) {
        const products = parsed.data.products as Array<Record<string, unknown>>
        for (const item of products) {
          const productName = (item.product_name as string || '').toLowerCase()
          const match = ingredients.find(
            (ing) => ing.name.toLowerCase().includes(productName) || productName.includes(ing.name.toLowerCase())
          )
          if (match) {
            item.matched_ingredient_id = match.id
            item.matched_ingredient_name = match.name
          }
        }
      }
    }

    // Auto-match products for invoices
    if (parsed.type === 'invoice' && parsed.data.line_items) {
      const { data: ingredients } = await supabase.from('ingredients').select('id, name')
      if (ingredients) {
        const lineItems = parsed.data.line_items as Array<Record<string, unknown>>
        for (const item of lineItems) {
          const productName = (item.product_name as string || '').toLowerCase()
          const match = ingredients.find(
            (ing) => ing.name.toLowerCase().includes(productName) || productName.includes(ing.name.toLowerCase())
          )
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
    return NextResponse.json({ error: 'Fout bij verwerken van document' }, { status: 500 })
  }
}
