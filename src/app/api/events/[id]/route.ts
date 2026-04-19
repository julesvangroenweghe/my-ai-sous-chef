import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 const { id } = await params
 const supabase = await createClient()

 const { data, error } = await supabase
 .from('events')
 .select(`
 *,
 menu_items:event_menu_items(
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
 ),
 dietary_flags:event_dietary_flags(*)
 `)
 .eq('id', id)
 .single()

 if (error) return NextResponse.json({ error: error.message }, { status: 404 })
 return NextResponse.json(data)
}

export async function PUT(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 const { id } = await params
 const supabase = await createClient()
 const body = await request.json()

 const updatePayload: Record<string, unknown> = {
 updated_at: new Date().toISOString(),
 }

 const fields = [
 'name', 'event_date', 'event_type', 'num_persons', 'price_per_person',
 'location', 'contact_person', 'departure_time', 'arrival_time', 'notes', 'status'
 ]

 for (const field of fields) {
 if (body[field] !== undefined) {
 updatePayload[field] = body[field] || null
 }
 }
 // Status & name should not be nulled
 if (body.status) updatePayload.status = body.status
 if (body.name) updatePayload.name = body.name

 const { error } = await supabase
 .from('events')
 .update(updatePayload)
 .eq('id', id)

 if (error) return NextResponse.json({ error: error.message }, { status: 500 })
 return NextResponse.json({ success: true })
}

export async function DELETE(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 const { id } = await params
 const supabase = await createClient()

 // Soft delete — set status to cancelled
 const { error } = await supabase
 .from('events')
 .update({ status: 'cancelled', updated_at: new Date().toISOString() })
 .eq('id', id)

 if (error) return NextResponse.json({ error: error.message }, { status: 500 })
 return NextResponse.json({ success: true })
}
