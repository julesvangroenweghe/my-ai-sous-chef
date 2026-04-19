import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Mock OCR response — in production, this would call a real OCR service
// (e.g. Google Vision API, AWS Textract, Azure Document Intelligence)
function generateMockOcrResult(invoiceId: string) {
 const suppliers = ['Metro Cash & Carry', 'Sligro', 'Bidfood', 'Hanos', 'Colruyt Professional']
 const products = [
 { name: 'Salmon Fillet', unit: 'kg', price: 24.5, qty: 5 },
 { name: 'Olive Oil Extra Virgin', unit: 'L', price: 8.9, qty: 3 },
 { name: 'Butter Unsalted', unit: 'kg', price: 6.2, qty: 10 },
 { name: 'Heavy Cream 35%', unit: 'L', price: 3.8, qty: 8 },
 { name: 'Shallots', unit: 'kg', price: 4.5, qty: 2 },
 { name: 'Fresh Thyme', unit: 'bunch', price: 1.2, qty: 5 },
 { name: 'Chicken Breast', unit: 'kg', price: 12.8, qty: 8 },
 { name: 'Sea Salt Flakes', unit: 'kg', price: 18.0, qty: 1 },
 ]

 // Pick 3-6 random products
 const numItems = 3 + Math.floor(Math.random() * 4)
 const selectedProducts = [...products]
 .sort(() => Math.random() - 0.5)
 .slice(0, numItems)

 const lineItems = selectedProducts.map((p, i) => ({
 id: `line_${invoiceId}_${i}`,
 product_name: p.name,
 quantity: p.qty + Math.round(Math.random() * 3),
 unit: p.unit,
 unit_price: p.price * (0.9 + Math.random() * 0.2), // slight price variation
 total: 0,
 confidence: 0.75 + Math.random() * 0.25, // 0.75 - 1.0
 matched_ingredient_id: null,
 matched_ingredient_name: null,
 }))

 // Calculate totals
 lineItems.forEach((item) => {
 item.unit_price = Number(item.unit_price.toFixed(2))
 item.total = Number((item.quantity * item.unit_price).toFixed(2))
 })

 const totalAmount = lineItems.reduce((sum, item) => sum + item.total, 0)

 return {
 supplier_name: suppliers[Math.floor(Math.random() * suppliers.length)],
 invoice_date: new Date().toISOString().split('T')[0],
 invoice_number: `INV-${Date.now().toString().slice(-6)}`,
 line_items: lineItems,
 total_amount: Number(totalAmount.toFixed(2)),
 confidence: 0.85 + Math.random() * 0.15,
 }
}

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

 // Generate mock OCR data
 const ocrData = generateMockOcrResult(invoiceId)

 // Try to auto-match scanned items to existing ingredients
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

 // Update invoice with OCR data
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
