import { createClient } from '@/lib/supabase/server'
import { getAuthorizationUrl } from '@/lib/google'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const kitchenId = searchParams.get('kitchen_id')

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!kitchenId) {
    return NextResponse.json({ error: 'kitchen_id is required' }, { status: 400 })
  }

  // Verify user has access to this kitchen
  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'No chef profile found' }, { status: 403 })
  }

  const { data: membership } = await supabase
    .from('kitchen_members')
    .select('kitchen_id')
    .eq('chef_id', profile.id)
    .eq('kitchen_id', kitchenId)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'No access to this kitchen' }, { status: 403 })
  }

  const authUrl = getAuthorizationUrl(kitchenId)
  return NextResponse.redirect(authUrl)
}
