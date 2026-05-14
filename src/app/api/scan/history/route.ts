// src/app/api/scan/history/route.ts
// Geeft persistente scanhistorie terug uit scanned_documents tabel

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const kitchenId = await supabase.rpc('get_my_kitchen_ids').then(({ data }) => data?.[0] ?? null)
  if (!kitchenId) return NextResponse.json([])

  const { data, error } = await supabase
    .from('scanned_documents')
    .select('id, document_type, title, confidence, auto_imported, import_summary, created_at')
    .eq('kitchen_id', kitchenId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json([])

  return NextResponse.json(data || [])
}
