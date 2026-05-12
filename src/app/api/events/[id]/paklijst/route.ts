import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: haal paklijst items op, of initialiseer vanuit templates
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Haal bestaande items op
  const { data: items } = await supabase
    .from('event_packlist_items')
    .select('*')
    .eq('event_id', eventId)
    .order('category')
    .order('sort_order')

  // Als geen items → initialiseer vanuit global templates
  if (!items || items.length === 0) {
    const { data: event } = await supabase
      .from('events')
      .select('kitchen_id')
      .eq('id', eventId)
      .single()

    if (!event) return NextResponse.json({ error: 'Event niet gevonden' }, { status: 404 })

    const { data: templates } = await supabase
      .from('packlist_templates')
      .select('*')
      .eq('is_global', true)
      .order('category')
      .order('sort_order')

    if (templates && templates.length > 0) {
      const newItems = templates.map(t => ({
        event_id: eventId,
        kitchen_id: event.kitchen_id,
        category: t.category,
        subcategory: t.subcategory,
        item_name: t.item_name,
        quantity: t.default_quantity,
        unit: t.unit,
        supplier: t.supplier,
        notes: t.notes,
        checked: false,
        sort_order: t.sort_order
      }))

      const { data: created, error } = await supabase
        .from('event_packlist_items')
        .insert(newItems)
        .select()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ items: created, initialized: true })
    }
  }

  return NextResponse.json({ items: items || [] })
}

// POST: voeg item toe
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const { data: event } = await supabase
    .from('events')
    .select('kitchen_id')
    .eq('id', eventId)
    .single()

  if (!event) return NextResponse.json({ error: 'Event niet gevonden' }, { status: 404 })

  const { data, error } = await supabase
    .from('event_packlist_items')
    .insert({ ...body, event_id: eventId, kitchen_id: event.kitchen_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
