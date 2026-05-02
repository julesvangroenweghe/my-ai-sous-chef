import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q') || ''
  const mode = request.nextUrl.searchParams.get('mode') || 'search' // 'search' | 'suggest'

  // Suggest mode: auto-suggest based on name (no minimum length)
  const minLength = mode === 'suggest' ? 1 : 2
  if (q.length < minLength) return NextResponse.json({ results: [], groups: [] })

  // Zoek in ingredients tabel
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, current_price, default_supplier_id')
    .ilike('name', `%${q}%`)
    .limit(8)

  // Zoek in supplier_products tabel
  const { data: products } = await supabase
    .from('supplier_products')
    .select(`
      id, 
      product_name, 
      price_per_kg, 
      price,
      supplier:suppliers(id, name)
    `)
    .ilike('product_name', `%${q}%`)
    .not('price', 'is', null)
    .order('price_per_kg', { ascending: false, nullsFirst: false })
    .limit(12)

  // Verwerk resultaten
  const ingredientResults = (ingredients || []).map((i: any) => ({
    id: i.id,
    name: i.name,
    price_per_kg: i.current_price ? Number(i.current_price) : null,
    unit_price: null,
    supplier_name: null,
    supplier_id: i.default_supplier_id,
    type: 'ingredient' as const,
    group: 'Ingrediënten',
  }))

  const productResults = (products || []).map((p: any) => {
    const pricePerKg = p.price_per_kg ? Number(p.price_per_kg) : null
    const unitPrice = p.price ? Number(p.price) : null
    return {
      id: p.id,
      name: p.product_name,
      price_per_kg: pricePerKg,
      unit_price: unitPrice,
      supplier_name: p.supplier?.name || null,
      supplier_id: p.supplier?.id || null,
      type: 'supplier_product' as const,
      group: p.supplier?.name || 'Leveranciers',
    }
  })

  // Combineer en groepeer
  const allResults = [...ingredientResults, ...productResults]

  // Bouw groepen voor UI
  const groupMap = new Map<string, typeof allResults>()
  for (const r of allResults) {
    const g = r.group
    if (!groupMap.has(g)) groupMap.set(g, [])
    groupMap.get(g)!.push(r)
  }

  const groups = Array.from(groupMap.entries()).map(([name, items]) => ({
    name,
    items,
  }))

  return NextResponse.json({ results: allResults, groups })
}
