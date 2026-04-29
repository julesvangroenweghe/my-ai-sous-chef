import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

// GET /api/proposals?event_id=xxx — list proposals for event
// POST /api/proposals — create new proposal
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('event_id')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let query = supabase
    .from('saved_menus')
    .select(`
      id, name, menu_type, event_id, num_persons, price_per_person,
      target_food_cost_pct, status, proposal_status, revision_number,
      client_feedback, event_requirements, audit_score, created_at, updated_at,
      items:saved_menu_items(id, course, dish_name, dish_description, source_type, cost_per_person, sort_order)
    `)
    .order('revision_number', { ascending: false })
    .order('created_at', { ascending: false })

  if (eventId) {
    query = query.eq('event_id', eventId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get kitchen_id from chef profile
  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('id, kitchen_members(kitchen_id)')
    .eq('auth_user_id', user.id)
    .single()

  const kitchenId = (profile?.kitchen_members as any)?.[0]?.kitchen_id
  if (!kitchenId) return NextResponse.json({ error: 'No kitchen found' }, { status: 400 })

  // Get next revision number for this event
  let revisionNumber = 1
  if (body.event_id) {
    const { data: existing } = await supabase
      .from('saved_menus')
      .select('revision_number')
      .eq('event_id', body.event_id)
      .order('revision_number', { ascending: false })
      .limit(1)
      .single()
    if (existing) revisionNumber = (existing.revision_number || 1) + 1
  }

  const { data, error } = await supabase
    .from('saved_menus')
    .insert({
      kitchen_id: kitchenId,
      created_by: user.id,
      name: body.name || `Voorstel V${revisionNumber}`,
      menu_type: body.menu_type || 'walking_dinner',
      event_id: body.event_id || null,
      num_persons: body.num_persons || null,
      price_per_person: body.price_per_person || null,
      target_food_cost_pct: body.target_food_cost_pct || 30,
      season: body.season || 'current',
      status: 'draft',
      proposal_status: 'draft',
      revision_number: revisionNumber,
      event_requirements: body.event_requirements || {},
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
