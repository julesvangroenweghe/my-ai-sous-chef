import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const supplier = searchParams.get('supplier')

  let query = supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('ocr_status', status)
  if (supplier) query = query.ilike('supplier_name', `%${supplier}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data: membership } = await supabase
    .from('kitchen_members')
    .select('kitchen_id')
    .limit(1)
    .single()

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      kitchen_id: membership?.kitchen_id || body.kitchen_id,
      supplier_name: body.supplier_name || null,
      invoice_date: body.invoice_date || null,
      total_amount: body.total_amount || null,
      image_url: body.image_url || null,
      ocr_status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(invoice, { status: 201 })
}
