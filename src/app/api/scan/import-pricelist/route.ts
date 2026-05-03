import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { supplier_name, price_date, products } = body

  if (!products || !Array.isArray(products)) {
    return NextResponse.json({ error: 'Geen producten gevonden' }, { status: 400 })
  }

  // Find supplier by name
  let supplierId: string | null = null
  if (supplier_name) {
    const { data: existingSupplier } = await supabase
      .from('suppliers')
      .select('id')
      .ilike('name', `%${supplier_name}%`)
      .single()
    if (existingSupplier) supplierId = existingSupplier.id
  }

  let imported = 0
  let updated = 0

  for (const product of products) {
    if (!product.product_name || product.price == null) continue

    if (supplierId) {
      const { data: existing } = await supabase
        .from('supplier_products')
        .select('id')
        .eq('supplier_id', supplierId)
        .ilike('product_name', product.product_name)
        .single()

      if (existing) {
        await supabase
          .from('supplier_products')
          .update({
            price: product.price,
            price_per_kg: product.price_per_kg || null,
            last_updated: price_date || new Date().toISOString().split('T')[0],
          })
          .eq('id', existing.id)
        updated++
      } else {
        await supabase.from('supplier_products').insert({
          supplier_id: supplierId,
          product_name: product.product_name,
          unit: product.unit || 'kg',
          price: product.price,
          price_per_kg: product.price_per_kg || null,
          last_updated: price_date || new Date().toISOString().split('T')[0],
        })
        imported++
      }
    }
  }

  return NextResponse.json({
    success: true,
    imported,
    updated,
    supplier: supplier_name,
    message: `${imported} nieuwe producten geïmporteerd, ${updated} prijzen bijgewerkt`,
  })
}
