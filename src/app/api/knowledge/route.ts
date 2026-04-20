import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const tab = searchParams.get('tab') || 'recipes'
  const search = searchParams.get('q') || ''
  const source = searchParams.get('source')
  const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')

  if (tab === 'recipes') {
    let query = supabase
      .from('classical_recipes')
      .select('id, name_original, name_french, name_english, source, category, chapter, chapter_title, description, techniques, source_number, source_tier, source_year', { count: 'exact' })

    if (search) {
      query = query.or(`name_original.ilike.%${search}%,name_french.ilike.%${search}%,name_english.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`)
    }
    if (source) {
      query = query.eq('source', source)
    }

    query = query.order('name_original').range(offset, offset + limit - 1)
    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data, total: count })
  }

  if (tab === 'techniques') {
    let query = supabase
      .from('techniques')
      .select('id, name, name_fr, category, description, difficulty', { count: 'exact' })

    if (search) {
      query = query.or(`name.ilike.%${search}%,name_fr.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`)
    }

    query = query.order('name').range(offset, offset + limit - 1)
    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data, total: count })
  }

  if (tab === 'ratios') {
    let query = supabase
      .from('classical_ratios')
      .select('id, name, ratio, description, components, category, source', { count: 'exact' })

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`)
    }

    query = query.order('name').range(offset, offset + limit - 1)
    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data, total: count })
  }

  if (tab === 'parameters') {
    let query = supabase
      .from('technique_parameters')
      .select('*', { count: 'exact' })

    if (search) {
      query = query.or(`protein.ilike.%${search}%,cut.ilike.%${search}%`)
    }

    query = query.range(offset, offset + limit - 1)
    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data, total: count })
  }

  // Stats endpoint
  if (tab === 'stats') {
    const [recipes, techniques, ratios, params] = await Promise.all([
      supabase.from('classical_recipes').select('id', { count: 'exact', head: true }),
      supabase.from('techniques').select('id', { count: 'exact', head: true }),
      supabase.from('classical_ratios').select('id', { count: 'exact', head: true }),
      supabase.from('technique_parameters').select('id', { count: 'exact', head: true }),
    ])
    return NextResponse.json({
      recipes: recipes.count || 0,
      techniques: techniques.count || 0,
      ratios: ratios.count || 0,
      parameters: params.count || 0,
    })
  }

  return NextResponse.json({ error: 'Invalid tab' }, { status: 400 })
}
