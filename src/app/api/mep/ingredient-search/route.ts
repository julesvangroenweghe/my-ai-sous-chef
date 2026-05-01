import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q') || ''
  if (q.length < 2) return NextResponse.json({ results: [] })

  // Zoek ingrediënten
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, current_price')
    .ilike('name', `%${q}%`)
    .limit(10)

  // Zoek supplier_products
  const { data: products } = await supabase
    .from('supplier_products')
    .select('id, product_name, price_per_kg, supplier:suppliers(name)')
    .ilike('product_name', `%${q}%`)
    .limit(10)

  const results = [
    ...(ingredients || []).map((i: any) => ({
      id: i.id,
      name: i.name,
      price_per_kg: i.current_price,
      type: 'ingredient' as const,
    })),
    ...(products || []).map((p: any) => ({
      id: p.id,
      name: p.product_name,
      price_per_kg: p.price_per_kg,
      supplier_name: p.supplier?.name,
      type: 'supplier_product' as const,
    })),
  ]

  return NextResponse.json({ results })
}
