import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const kitchenId = searchParams.get('kitchen_id')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!kitchenId) {
    return NextResponse.json({ error: 'kitchen_id is required' }, { status: 400 })
  }

  const { data: integration } = await supabase
    .from('kitchen_integrations')
    .select('id, provider_email, status, connected_at, updated_at, scopes')
    .eq('kitchen_id', kitchenId)
    .eq('provider', 'google')
    .single()

  if (!integration) {
    return NextResponse.json({ connected: false })
  }

  // Get last sync time
  const { data: lastEvent } = await supabase
    .from('calendar_events')
    .select('synced_at')
    .eq('kitchen_id', kitchenId)
    .order('synced_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({
    connected: true,
    email: integration.provider_email,
    status: integration.status,
    connected_at: integration.connected_at,
    last_synced: lastEvent?.synced_at || null,
    scopes: integration.scopes,
  })
}
