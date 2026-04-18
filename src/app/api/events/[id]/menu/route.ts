import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('event_menu_items')
    .select(`
      *,
      recipe:recipes(
        *,
        category:recipe_categories(id, name),
        components:recipe_components(
          *,
          ingredients:recipe_component_ingredients(
            *,
            ingredient:ingredients(*)
          )
        )
      )
    `)
    .eq('event_id', id)
    .order('course_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('event_menu_items')
    .insert({
      event_id: id,
      recipe_id: body.recipe_id,
      course_order: body.course_order || 0,
    })
    .select(`
      *,
      recipe:recipes(id, name)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()

  // Replace all menu items with the new set
  await supabase.from('event_menu_items').delete().eq('event_id', id)

  if (body.items && body.items.length > 0) {
    const { error } = await supabase
      .from('event_menu_items')
      .insert(
        body.items.map((item: { recipe_id: string; course_order: number }) => ({
          event_id: id,
          recipe_id: item.recipe_id,
          course_order: item.course_order,
        }))
      )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const itemId = searchParams.get('item_id')

  if (itemId) {
    // Delete specific menu item
    const { error } = await supabase
      .from('event_menu_items')
      .delete()
      .eq('id', itemId)
      .eq('event_id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // Delete all menu items for the event
    const { error } = await supabase
      .from('event_menu_items')
      .delete()
      .eq('event_id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
