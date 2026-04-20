import { createClient } from '@/lib/supabase/server'
import { revokeToken } from '@/lib/google'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  const kitchenId = body.kitchen_id

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!kitchenId) {
    return NextResponse.json({ error: 'kitchen_id is required' }, { status: 400 })
  }

  // Get integration
  const { data: integration } = await supabase
    .from('kitchen_integrations')
    .select('*')
    .eq('kitchen_id', kitchenId)
    .eq('provider', 'google')
    .single()

  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  // Revoke Google tokens
  if (integration.access_token) {
    await revokeToken(integration.access_token)
  }

  // Delete integration record
  await supabase
    .from('kitchen_integrations')
    .delete()
    .eq('id', integration.id)

  // Delete synced calendar events
  await supabase
    .from('calendar_events')
    .delete()
    .eq('kitchen_id', kitchenId)

  return NextResponse.json({ success: true })
}
