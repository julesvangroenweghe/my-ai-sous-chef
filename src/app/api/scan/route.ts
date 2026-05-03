// src/app/api/scan/route.ts
// OCR scan route — streaming response (60s timeout op Hobby plan)
// auto-saves naar scanned_documents na verwerking

import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

// Streaming response = 60s timeout op Vercel Hobby (ipv 10s)
export const maxDuration = 60

type DocumentType = 'invoice' | 'mep' | 'recipe' | 'pricelist' | 'other'

interface ScanResult {
  type: DocumentType
  data: Record<string, unknown>
  confidence: number
}

function buildSystemPrompt(): string {
  return `Je bent een expert OCR-assistent voor de horeca/keukenindustrie. Je taak is het extraheren van gestructureerde data uit documenten.

KRITISCH: Reageer UITSLUITEND met pure, geldige JSON. Absoluut geen uitleg, geen inleiding, geen markdown code blocks, geen tekst voor of na de JSON. Alleen de JSON zelf. Start direct met { en eindig met }.`
}

function buildUserPrompt(typeHint?: string): string {
  const hint = typeHint && typeHint !== 'auto'
    ? `De gebruiker heeft aangegeven dat dit een "${typeHint}" is — gebruik dit type.`
    : ''

  return `Analyseer dit document en extraheer de data.

Detecteer het type:
- "prijslijst" / "price list" / producten met prijzen maar GEEN factuurgegevens → "pricelist"
- "factuur" / "invoice" / BTW-nummer / factuurnummer → "invoice"
- "MEP" / "mise en place" / "productielijst" → "mep"
- "recept" / bereiding / ingrediënten → "recipe"
- Alles wat niet past → "other"

${hint}

Gebruik exact dit JSON-formaat op basis van type:

Voor pricelist:
{"type":"pricelist","confidence":0.95,"data":{"supplier_name":"Naam leverancier","price_date":"YYYY-MM-DD","products":[{"product_name":"Naam","unit":"kg","price":10.50,"price_per_kg":10.50,"category":"vlees"}]}}

Voor invoice:
{"type":"invoice","confidence":0.95,"data":{"supplier_name":"...","invoice_date":"YYYY-MM-DD","invoice_number":"...","line_items":[{"product_name":"...","quantity":1,"unit":"kg","unit_price":10.50,"total":10.50}],"total_amount":0,"vat_amount":0}}

Voor mep:
{"type":"mep","confidence":0.95,"data":{"title":"...","date":"YYYY-MM-DD","dishes":[{"name":"...","components":[{"name":"...","ingredients":[{"name":"...","quantity":"80","unit":"g"}]}]}]}}

Voor recipe:
{"type":"recipe","confidence":0.95,"data":{"name":"...","servings":4,"prep_time_minutes":30,"ingredients":[{"name":"...","quantity":"200","unit":"g"}],"method":["Stap 1","Stap 2"],"notes":""}}

Voor other:
{"type":"other","confidence":0.90,"data":{"description":"Korte beschrijving van wat er in het document staat","content":"Samenvatting van de inhoud"}}

Extraheer ALLE producten. Bereken price_per_kg waar mogelijk. Reageer ALLEEN met JSON — begin direct met {`
}

async function processScan(request: NextRequest): Promise<Response> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Niet ingelogd' }), { status: 401 })

  // Kitchen ophalen
  const kitchenId = await supabase.rpc('get_my_kitchen_ids').then(({ data }) => data?.[0] ?? null)

  let base64Data: string
  let mediaType: string
  let typeHint: string | undefined
  let fileName: string = 'document'

  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    typeHint = (formData.get('type') as string) || undefined
    if (!file) return new Response(JSON.stringify({ error: 'Geen bestand geüpload' }), { status: 400 })
    
    // HEIC detectie — Claude ondersteunt geen HEIC
    const lowerName = (file.name || '').toLowerCase()
    const lowerType = (file.type || '').toLowerCase()
    if (lowerName.endsWith('.heic') || lowerName.endsWith('.heif') || 
        lowerType.includes('heic') || lowerType.includes('heif')) {
      return new Response(JSON.stringify({ 
        error: 'HEIC-formaat niet ondersteund. Maak een screenshot van de foto (Cmd+Shift+4 op Mac, of gebruik de Screenshots app op iPhone) en upload dat.' 
      }), { status: 415 })
    }

    const bytes = await file.arrayBuffer()
    
    // Controleer HEIC magic bytes ook als MIME type ontbreekt
    const header = new Uint8Array(bytes.slice(0, 12))
    const isFtypHeic = header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70
    if (isFtypHeic) {
      return new Response(JSON.stringify({ 
        error: 'HEIC-formaat niet ondersteund. Maak een screenshot van de foto en upload dat.' 
      }), { status: 415 })
    }

    base64Data = Buffer.from(bytes).toString('base64')
    mediaType = file.type || 'image/jpeg'
    fileName = file.name || 'document'
  } else {
    const body = await request.json()
    base64Data = body.base64
    mediaType = body.media_type || 'image/jpeg'
    typeHint = body.type
    fileName = body.file_name || 'document'
    if (!base64Data) return new Response(JSON.stringify({ error: 'base64 data is vereist' }), { status: 400 })
  }

  // Normalize media type
  const isPdf = mediaType === 'application/pdf' || mediaType.includes('pdf')
  const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  let normalizedMediaType = mediaType
  if (!isPdf && !supportedImageTypes.some(t => mediaType.startsWith(t))) normalizedMediaType = 'image/jpeg'

  const contentBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } }
    : { type: 'image', source: { type: 'base64', media_type: normalizedMediaType, data: base64Data } }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return new Response(JSON.stringify({ error: 'API key niet geconfigureerd' }), { status: 500 })

  const requestBody = {
    model: 'claude-sonnet-4-6',
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
  if (isPdf) headers['anthropic-beta'] = 'pdfs-2024-09-25'

  const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  })

  if (!anthropicResponse.ok) {
    const errText = await anthropicResponse.text()
    console.error('Anthropic API error:', anthropicResponse.status, errText)
    
    // Rate limit
    if (anthropicResponse.status === 429) {
      return new Response(JSON.stringify({
        error: 'Scanner tijdelijk bezet — wacht even en probeer opnieuw',
      }), { status: 429 })
    }
    
    return new Response(JSON.stringify({
      error: `OCR-service fout (${anthropicResponse.status}) — probeer opnieuw`,
      details: errText.substring(0, 200)
    }), { status: 502 })
  }

  const aiResult = await anthropicResponse.json()
  const textContent = aiResult.content?.[0]?.text || ''

  // JSON parse — 4 strategieën
  let parsed: ScanResult | null = null
  try { parsed = JSON.parse(textContent.trim()) } catch { /* continue */ }
  if (!parsed) {
    const cbMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (cbMatch) { try { parsed = JSON.parse(cbMatch[1].trim()) } catch { /* continue */ } }
  }
  if (!parsed) {
    const jsonMatch = textContent.match(/\{[\s\S]*\}/)
    if (jsonMatch) { try { parsed = JSON.parse(jsonMatch[0]) } catch { /* continue */ } }
  }
  if (!parsed) {
    console.error('OCR parse failed. Raw response:', textContent.substring(0, 400))
    return new Response(JSON.stringify({
      error: 'Kon document niet verwerken — probeer een duidelijkere foto of ander bestandstype',
      hint: textContent.length === 0 
        ? 'Claude kon de afbeelding niet lezen — zorg voor goede belichting en scherpe foto'
        : 'Resultaat was geen geldig formaat — probeer het document opnieuw te fotograferen',
    }), { status: 422 })
  }

  // Auto-match ingrediënten in DB
  const { data: ingredients } = await supabase.from('ingredients').select('id, name')
  if (ingredients) {
    const matchProduct = (name: string) => {
      const lower = name.toLowerCase()
      return ingredients.find(ing =>
        ing.name.toLowerCase().includes(lower) || lower.includes(ing.name.toLowerCase())
      )
    }
    if (parsed.type === 'pricelist' && parsed.data.products) {
      for (const item of parsed.data.products as Array<Record<string, unknown>>) {
        const match = matchProduct(item.product_name as string || '')
        if (match) { item.matched_ingredient_id = match.id; item.matched_ingredient_name = match.name }
      }
    }
    if (parsed.type === 'invoice' && parsed.data.line_items) {
      for (const item of parsed.data.line_items as Array<Record<string, unknown>>) {
        const match = matchProduct(item.product_name as string || '')
        if (match) { item.matched_ingredient_id = match.id; item.matched_ingredient_name = match.name }
      }
    }
  }

  // Auto-save naar scanned_documents
  let savedId: string | null = null
  let autoImportResult: Record<string, unknown> | null = null

  if (kitchenId) {
    const docTitle = parsed.type === 'pricelist'
      ? `Prijslijst — ${(parsed.data.supplier_name as string) || fileName}`
      : parsed.type === 'invoice'
      ? `Factuur — ${(parsed.data.supplier_name as string) || (parsed.data.invoice_number as string) || fileName}`
      : parsed.type === 'recipe'
      ? `Recept — ${(parsed.data.name as string) || fileName}`
      : parsed.type === 'mep'
      ? `MEP — ${(parsed.data.title as string) || fileName}`
      : `Document — ${fileName}`

    const { data: savedDoc } = await supabase
      .from('scanned_documents')
      .insert({
        kitchen_id: kitchenId,
        document_type: parsed.type,
        title: docTitle,
        raw_data: parsed.data,
        confidence: parsed.confidence || 0.85,
        auto_imported: false,
      })
      .select('id')
      .single()

    savedId = savedDoc?.id ?? null

    // Auto-import prijslijst
    if (parsed.type === 'pricelist' && savedId) {
      const importResult = await autoImportPricelist(supabase, parsed.data, kitchenId)
      autoImportResult = importResult
      if (importResult.imported > 0) {
        await supabase
          .from('scanned_documents')
          .update({ auto_imported: true, import_summary: importResult })
          .eq('id', savedId)
      }
    }

    // Auto-import recept
    if (parsed.type === 'recipe' && parsed.data.name && savedId) {
      const recipeData = parsed.data
      const { data: newRecipe } = await supabase
        .from('recipes')
        .insert({
          kitchen_id: kitchenId,
          name: recipeData.name as string,
          number_of_servings: (recipeData.servings as number) || 4,
          prep_time_minutes: (recipeData.prep_time_minutes as number) || null,
          notes: (recipeData.notes as string) || `Geïmporteerd via OCR scan`,
        })
        .select('id')
        .single()

      autoImportResult = { recipe_id: newRecipe?.id, recipe_name: recipeData.name }
      if (newRecipe?.id) {
        await supabase
          .from('scanned_documents')
          .update({ auto_imported: true, import_summary: autoImportResult })
          .eq('id', savedId)
      }
    }
  }

  return new Response(JSON.stringify({
    type: parsed.type,
    data: parsed.data,
    confidence: parsed.confidence || 0.85,
    saved: !!savedId,
    saved_id: savedId,
    auto_imported: !!autoImportResult,
    import_result: autoImportResult,
  }), { 
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

export async function POST(request: NextRequest) {
  // Gebruik streaming response → Vercel geeft 60s timeout (ipv 10s op Hobby)
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await processScan(request)
        const body = await response.text()
        controller.enqueue(encoder.encode(body))
      } catch (error) {
        console.error('Scan error:', error)
        controller.enqueue(encoder.encode(JSON.stringify({
          error: 'Fout bij verwerken van document',
          details: error instanceof Error ? error.message : 'Onbekende fout'
        })))
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/json' }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function autoImportPricelist(
  supabase: any,
  data: Record<string, unknown>,
  kitchenId: string
): Promise<{ imported: number; skipped: number; supplier_name: string }> {
  const supplierName = (data.supplier_name as string) || 'Onbekende leverancier'
  const products = (data.products as Array<Record<string, unknown>>) || []

  // Zoek of maak leverancier
  let { data: supplier } = await supabase
    .from('suppliers')
    .select('id')
    .ilike('name', supplierName)
    .single()

  if (!supplier) {
    const { data: newSupplier } = await supabase
      .from('suppliers')
      .insert({ name: supplierName, kitchen_id: kitchenId })
      .select('id')
      .single()
    supplier = newSupplier
  }

  if (!supplier) return { imported: 0, skipped: products.length, supplier_name: supplierName }

  let imported = 0
  let skipped = 0

  for (const product of products) {
    if (!product.product_name || product.price == null) { skipped++; continue }

    try {
      await supabase
        .from('supplier_products')
        .upsert({
          supplier_id: supplier.id,
          product_name: product.product_name as string,
          unit: (product.unit as string) || 'kg',
          price: product.price as number,
          price_per_kg: (product.price_per_kg as number) || null,
          last_updated: new Date().toISOString(),
        }, { onConflict: 'supplier_id,product_name' })
      imported++
    } catch {
      skipped++
    }
  }

  return { imported, skipped, supplier_name: supplierName }
}
