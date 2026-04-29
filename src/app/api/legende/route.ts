import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const limit = Number(searchParams.get('limit') || '100')

  let query = supabase
    .from('legende_dishes')
    .select(`
      id,
      name,
      notes,
      service_style,
      temperature,
      is_vegetarian,
      elements:legende_dish_elements(name, quantity_text, element_type)
    `)
    .order('name', { ascending: true })
    .limit(limit)

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
