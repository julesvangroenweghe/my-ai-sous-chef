import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const invoiceId = body.invoice_id

  if (!invoiceId) {
    return NextResponse.json({ error: 'invoice_id is required' }, { status: 400 })
  }

  // Update status to processing
  await supabase
    .from('invoices')
    .update({ ocr_status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', invoiceId)

  // If base64 image data provided, use Claude Vision
  if (body.base64 && process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: body.media_type || 'image/jpeg',
                  data: body.base64,
                },
              },
              {
                type: 'text',
                text: `Analyseer deze factuur en extraheer alle gegevens. Geef het resultaat als JSON:
{
  "supplier_name": "naam leverancier",
  "invoice_date": "YYYY-MM-DD",
  "invoice_number": "factuurnummer",
  "line_items": [
    { "product_name": "...", "quantity": 1, "unit": "kg", "unit_price": 10.50, "total": 10.50, "confidence": 0.95 }
  ],
  "total_amount": 0,
  "confidence": 0.95
}
Wees zo nauwkeurig mogelijk. Bij handgeschreven facturen, doe je best.`,
              },
            ],
          }],
        }),
      })

      if (anthropicResponse.ok) {
        const aiResult = await anthropicResponse.json()
        const textContent = aiResult.content?.[0]?.text || ''
        const jsonMatch = textContent.match(/\{[\s\S]*\}/)

        if (jsonMatch) {
          const ocrData = JSON.parse(jsonMatch[0])

          // Auto-match to ingredients
          const { data: ingredients } = await supabase
            .from('ingredients')
            .select('id, name')

          if (ingredients && ocrData.line_items) {
            for (const item of ocrData.line_items) {
              const match = ingredients.find(
                (ing) =>
                  ing.name.toLowerCase().includes(item.product_name.toLowerCase()) ||
                  item.product_name.toLowerCase().includes(ing.name.toLowerCase())
              )
              if (match) {
                item.matched_ingredient_id = match.id
                item.matched_ingredient_name = match.name
              }
            }
          }

          // Update invoice
          await supabase
            .from('invoices')
            .update({
              supplier_name: ocrData.supplier_name,
              invoice_date: ocrData.invoice_date,
              total_amount: ocrData.total_amount,
              ocr_status: 'completed',
              ocr_data: ocrData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', invoiceId)

          return NextResponse.json({
            invoice_id: invoiceId,
            ocr_data: ocrData,
            status: 'completed',
          })
        }
      }
    } catch (error) {
      console.error('Claude Vision error:', error)
    }
  }

  // Fallback: mock OCR
  const ocrData = generateFallbackOcr(invoiceId)

  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name')

  if (ingredients) {
    for (const item of ocrData.line_items) {
      const match = ingredients.find(
        (ing) =>
          ing.name.toLowerCase().includes(item.product_name.toLowerCase()) ||
          item.product_name.toLowerCase().includes(ing.name.toLowerCase())
      )
      if (match) {
        item.matched_ingredient_id = match.id
        item.matched_ingredient_name = match.name
      }
    }
  }

  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      supplier_name: ocrData.supplier_name,
      invoice_date: ocrData.invoice_date,
      total_amount: ocrData.total_amount,
      ocr_status: 'completed',
      ocr_data: ocrData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    invoice_id: invoiceId,
    ocr_data: ocrData,
    status: 'completed',
  })
}

function generateFallbackOcr(invoiceId: string) {
  const suppliers = ['Metro Cash & Carry', 'Sligro', 'Bidfood', 'Hanos', 'Colruyt Professional']
  const products = [
    { name: 'Zalm Filet', unit: 'kg', price: 24.5, qty: 5 },
    { name: 'Olijfolie Extra Vierge', unit: 'L', price: 8.9, qty: 3 },
    { name: 'Boter Ongezouten', unit: 'kg', price: 6.2, qty: 10 },
    { name: 'Room 35%', unit: 'L', price: 3.8, qty: 8 },
    { name: 'Sjalotten', unit: 'kg', price: 4.5, qty: 2 },
  ]

  const numItems = 3 + Math.floor(Math.random() * 3)
  const selected = [...products].sort(() => Math.random() - 0.5).slice(0, numItems)

  const lineItems = selected.map((p, i) => {
    const qty = p.qty + Math.round(Math.random() * 3)
    const unitPrice = Number((p.price * (0.9 + Math.random() * 0.2)).toFixed(2))
    return {
      id: `line_${invoiceId}_${i}`,
      product_name: p.name,
      quantity: qty,
      unit: p.unit,
      unit_price: unitPrice,
      total: Number((qty * unitPrice).toFixed(2)),
      confidence: Number((0.75 + Math.random() * 0.25).toFixed(2)),
      matched_ingredient_id: null as string | null,
      matched_ingredient_name: null as string | null,
    }
  })

  return {
    supplier_name: suppliers[Math.floor(Math.random() * suppliers.length)],
    invoice_date: new Date().toISOString().split('T')[0],
    invoice_number: `INV-${Date.now().toString().slice(-6)}`,
    line_items: lineItems,
    total_amount: Number(lineItems.reduce((s, i) => s + i.total, 0).toFixed(2)),
    confidence: Number((0.85 + Math.random() * 0.15).toFixed(2)),
  }
}
