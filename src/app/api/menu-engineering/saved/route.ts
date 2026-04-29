import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function getKitchenAndChef(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: chefProfile } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('auth_user_id', userId)
    .single()
  if (!chefProfile) return null

  const { data: memberData } = await supabase
    .from('kitchen_members')
    .select('kitchen_id')
    .eq('chef_id', chefProfile.id)
    .single()
  if (!memberData?.kitchen_id) return null

  return { chefId: chefProfile.id, kitchenId: memberData.kitchen_id }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const menuType = searchParams.get('menu_type')

    const ctx = await getKitchenAndChef(supabase, user.id)
    if (!ctx) return NextResponse.json({ error: 'Geen profiel of keuken' }, { status: 404 })

    let query = supabase
      .from('saved_menus')
      .select('*, saved_menu_items(*)')
      .eq('kitchen_id', ctx.kitchenId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (menuType) query = query.eq('menu_type', menuType)

    const { data, error } = await query.limit(50)
    if (error) throw error

    return NextResponse.json({ menus: data || [] })
  } catch (error) {
    console.error('Saved menus error:', error)
    return NextResponse.json({ error: 'Fout bij ophalen menus' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      name,
      menu_type = 'event',
      num_persons,
      price_per_person,
      target_food_cost_pct,
      status = 'draft',
      audit_score,
      items = [],
    } = body

    if (!name) return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 })

    const ctx = await getKitchenAndChef(supabase, user.id)
    if (!ctx) return NextResponse.json({ error: 'Geen profiel of keuken' }, { status: 404 })

    // Insert saved menu
    const { data: savedMenu, error: menuError } = await supabase
      .from('saved_menus')
      .insert({
        name,
        menu_type,
        num_persons: num_persons ?? null,
        price_per_person: price_per_person ?? null,
        target_food_cost_pct: target_food_cost_pct ?? null,
        status,
        audit_score: audit_score ?? null,
        kitchen_id: ctx.kitchenId,
        chef_id: ctx.chefId,
      })
      .select()
      .single()

    if (menuError) throw menuError

    // Insert menu items
    if (items.length > 0) {
      const menuItems = items.map((item: {
        course: string
        sort_order?: number
        custom_name?: string
        recipe_id?: string | null
        legende_dish_id?: string | null
        source?: string
        estimated_cost_pp?: number | null
        description?: string | null
      }) => ({
        menu_id: savedMenu.id,
        course: item.course,
        sort_order: item.sort_order ?? 0,
        custom_name: item.custom_name ?? null,
        recipe_id: item.recipe_id ?? null,
        legende_dish_id: item.legende_dish_id ?? null,
        source: item.source ?? 'manual',
        estimated_cost_pp: item.estimated_cost_pp ?? null,
        description: item.description ?? null,
      }))

      const { error: itemsError } = await supabase
        .from('saved_menu_items')
        .insert(menuItems)

      if (itemsError) {
        console.error('Items insert error:', itemsError)
        // Don't fail the whole request — menu header was saved
      }
    }

    return NextResponse.json({ menu_id: savedMenu.id, ...savedMenu }, { status: 201 })
  } catch (error) {
    console.error('Save menu error:', error)
    return NextResponse.json({ error: 'Fout bij opslaan menu' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { menu_id, status, name } = body

    if (!menu_id) return NextResponse.json({ error: 'menu_id is verplicht' }, { status: 400 })

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (status) updates.status = status
    if (name) updates.name = name

    const { error } = await supabase.from('saved_menus').update(updates).eq('id', menu_id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update menu error:', error)
    return NextResponse.json({ error: 'Fout bij bijwerken' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const menuId = searchParams.get('menu_id')
    if (!menuId) return NextResponse.json({ error: 'menu_id is verplicht' }, { status: 400 })

    const { error } = await supabase.from('saved_menus').delete().eq('id', menuId)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete menu error:', error)
    return NextResponse.json({ error: 'Fout bij verwijderen' }, { status: 500 })
  }
}
