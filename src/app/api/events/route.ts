import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
 const supabase = await createClient()
 const { searchParams } = new URL(request.url)

 const search = searchParams.get('search')
 const status = searchParams.get('status')
 const event_type = searchParams.get('event_type')
 const date_from = searchParams.get('date_from')
 const date_to = searchParams.get('date_to')

 let query = supabase
 .from('events')
 .select('*')
 .neq('status', 'cancelled')
 .order('event_date', { ascending: true })

 if (search) query = query.ilike('name', `%${search}%`)
 if (status) query = query.eq('status', status)
 if (event_type) query = query.eq('event_type', event_type)
 if (date_from) query = query.gte('event_date', date_from)
 if (date_to) query = query.lte('event_date', date_to)

 const { data, error } = await query
 if (error) return NextResponse.json({ error: error.message }, { status: 500 })
 return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
 const supabase = await createClient()
 const body = await request.json()

 const { data: { user } } = await supabase.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const { data: membership } = await supabase
 .from('kitchen_members')
 .select('kitchen_id')
 .limit(1)
 .single()

 const { data: event, error: eventError } = await supabase
 .from('events')
 .insert({
 name: body.name,
 event_date: body.event_date,
 event_type: body.event_type || 'daily_service',
 num_persons: body.num_persons || null,
 price_per_person: body.price_per_person || null,
 location: body.location || null,
 contact_person: body.contact_person || null,
 departure_time: body.departure_time || null,
 arrival_time: body.arrival_time || null,
 notes: body.notes || null,
 status: body.status || 'draft',
 kitchen_id: membership?.kitchen_id,
 })
 .select()
 .single()

 if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 })

 // Insert menu items if provided
 if (body.menu_items && body.menu_items.length > 0) {
 await supabase.from('event_menu_items').insert(
 body.menu_items.map((item: { recipe_id: string; course_order: number }) => ({
 event_id: event.id,
 recipe_id: item.recipe_id,
 course_order: item.course_order,
 }))
 )
 }

 return NextResponse.json(event, { status: 201 })
}
