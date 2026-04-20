import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const supplierId = searchParams.get('supplier_id')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

  if (!q && !supplierId) {
    return NextResponse.json({ products: [] })
  }

  let query = supabase
    .from('supplier_products')
    .select(`
      id, product_name, price, price_per_kg, unit, category, article_number,
      supplier:suppliers(id, name)
    `)

  if (q) {
    query = query.ilike('product_name', `%${q}%`)
  }
  if (supplierId) {
    query = query.eq('supplier_id', supplierId)
  }

  query = query.order('product_name').limit(limit)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ products: data })
}
