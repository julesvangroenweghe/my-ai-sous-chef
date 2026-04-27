import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const menuType = searchParams.get('menu_type')

    // Get chef profile first (kitchen_members.chef_id = chef_profiles.id)
    const { data: chefProfile } = await supabase
      .from('chef_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!chefProfile) return NextResponse.json({ error: 'Geen profiel' }, { status: 404 })

    const { data: memberData } = await supabase
      .from('kitchen_members')
      .select('kitchen_id')
      .eq('chef_id', chefProfile.id)
      .single()

    if (!memberData?.kitchen_id) return NextResponse.json({ error: 'Geen keuken' }, { status: 404 })

    let query = supabase
      .from('saved_menus')
      .select('*, saved_menu_items(*)')
      .eq('kitchen_id', memberData.kitchen_id)
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
