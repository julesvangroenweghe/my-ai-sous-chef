import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('q') || ''
  const source = searchParams.get('source')
  const category = searchParams.get('category')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('classic_recipes')
    .select('id, title, source, category, cuisine, base_ingredient, cooking_method, yield_text, description, ratio_reference', { count: 'exact' })

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,base_ingredient.ilike.%${search}%`)
  }
  if (source) {
    query = query.eq('source', source)
  }
  if (category) {
    query = query.ilike('category', `%${category}%`)
  }

  query = query.order('title').range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ recipes: data, total: count })
}
