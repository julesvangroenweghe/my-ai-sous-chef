import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('saved_menus')
    .select(`
      *,
      items:saved_menu_items(*)
    `)
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const body = await req.json()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { items, ...menuData } = body

  // Update menu
  const { data: menu, error: menuError } = await supabase
    .from('saved_menus')
    .update({
      ...menuData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single()

  if (menuError) return NextResponse.json({ error: menuError.message }, { status: 500 })

  // Replace items if provided
  if (items !== undefined) {
    await supabase.from('saved_menu_items').delete().eq('menu_id', params.id)
    if (items.length > 0) {
      const { error: itemsError } = await supabase.from('saved_menu_items').insert(
        items.map((item: any, index: number) => ({
          menu_id: params.id,
          course: item.course,
          dish_name: item.dish_name,
          dish_description: item.dish_description || null,
          source_type: item.source_type || 'custom',
          source_id: item.source_id || null,
          cost_per_person: item.cost_per_person || null,
          sort_order: item.sort_order ?? index,
        }))
      )
      if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }
  }

  return NextResponse.json(menu)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('saved_menu_items').delete().eq('menu_id', params.id)
  const { error } = await supabase.from('saved_menus').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
