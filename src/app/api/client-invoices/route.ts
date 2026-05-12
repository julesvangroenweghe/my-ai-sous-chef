import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// GET: lijst facturen voor kitchen
export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: kitchens } = await supabase.rpc('get_my_kitchen_ids')
  if (!kitchens?.length) return NextResponse.json([])

  const { data, error } = await supabase
    .from('client_invoices')
    .select('*')
    .in('kitchen_id', kitchens)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST: nieuwe factuur aanmaken (eventueel vanuit event)
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const serviceSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const body = await req.json()
  const { event_id, kitchen_id } = body

  // Genereer factuurnummer via DB function
  const { data: numData } = await serviceSupabase.rpc('generate_client_invoice_number')
  const invoice_number = numData || `SIR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`

  // Als event_id meegegeven: haal event data op voor prefill
  let eventData: Record<string, any> | null = null
  if (event_id) {
    const { data: ev } = await supabase
      .from('events')
      .select('*, saved_menus(*)')
      .eq('id', event_id)
      .single()
    eventData = ev
  }

  // Bouw line items op vanuit event
  const line_items: Array<{ description: string; quantity: number; unit_price: number; vat_rate: number; total: number }> = []
  if (eventData) {
    const pricePerPerson = eventData.price_per_person || (eventData.saved_menus?.[0] as any)?.price_per_person || 0
    const persons = eventData.num_persons || 1
    if (pricePerPerson > 0) {
      line_items.push({
        description: `Catering ${eventData.name} — ${persons} personen`,
        quantity: persons,
        unit_price: Number(pricePerPerson),
        vat_rate: 6,
        total: persons * Number(pricePerPerson),
      })
    }
  }

  const subtotal = line_items.reduce((s, i) => s + i.total, 0)
  const vat_amount = line_items.reduce((s, i) => s + (i.total * i.vat_rate / 100), 0)

  const invoice = {
    kitchen_id: kitchen_id || eventData?.kitchen_id,
    event_id: event_id || null,
    invoice_number,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'concept',
    client_name: body.client_name || eventData?.contact_person || '',
    client_email: body.client_email || '',
    client_address: body.client_address || '',
    client_vat: body.client_vat || '',
    line_items,
    subtotal,
    vat_amount,
    total_amount: subtotal + vat_amount,
    payment_terms: '30 dagen netto',
    bank_account: body.bank_account || '',
    notes: body.notes || '',
  }

  const { data, error } = await serviceSupabase
    .from('client_invoices')
    .insert(invoice)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
