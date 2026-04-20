import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Niet gemachtigd' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }

  const { event_type, entity_id, entity_name, metadata } = body

  if (!event_type || typeof event_type !== 'string') {
    return NextResponse.json({ error: 'event_type is verplicht' }, { status: 400 })
  }

  // Get chef profile id
  const { data: profile, error: profileError } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profiel niet gevonden' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('chef_style_events')
    .insert({
      chef_profile_id: profile.id,
      event_type,
      entity_id: entity_id || null,
      entity_name: entity_name || null,
      metadata: metadata || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
