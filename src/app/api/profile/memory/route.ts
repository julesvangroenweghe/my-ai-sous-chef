import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '0', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
  const memoryType = searchParams.get('type')

  // Get the chef profile first
  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ data: [], hasMore: false })
  }

  let query = supabase
    .from('chef_memory')
    .select('*')
    .eq('chef_id', profile.id)
    .order('created_at', { ascending: false })
    .range(page * limit, page * limit + limit - 1)

  if (memoryType) {
    query = query.eq('memory_type', memoryType)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: data || [],
    hasMore: (data?.length || 0) === limit,
    page,
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  if (!body.memory_type || !body.content) {
    return NextResponse.json(
      { error: 'memory_type and content are required' },
      { status: 400 }
    )
  }

  // Get the chef profile
  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const validTypes = ['preference', 'technique', 'style', 'feedback', 'note']
  if (!validTypes.includes(body.memory_type)) {
    return NextResponse.json(
      { error: `memory_type must be one of: ${validTypes.join(', ')}` },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('chef_memory')
    .insert({
      chef_id: profile.id,
      memory_type: body.memory_type,
      content: body.content,
      context: body.context || {},
      importance: Math.min(Math.max(body.importance || 3, 1), 5),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
