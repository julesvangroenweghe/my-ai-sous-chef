import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('q') || ''

  const results: any = {}

  let tq = supabase.from('culinary_techniques').select('*')
  if (search) tq = tq.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  const { data: techniques } = await tq.order('name').limit(20)
  results.techniques = techniques || []

  let rq = supabase.from('culinary_ratios').select('*')
  if (search) rq = rq.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  const { data: ratios } = await rq.order('name').limit(20)
  results.ratios = ratios || []

  let pq = supabase.from('technique_parameters').select('*')
  if (search) pq = pq.or(`technique_name.ilike.%${search}%,item_name.ilike.%${search}%`)
  const { data: params } = await pq.order('technique_name').limit(20)
  results.parameters = params || []

  return NextResponse.json(results)
}
