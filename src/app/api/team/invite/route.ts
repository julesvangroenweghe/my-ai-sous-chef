import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const body = await req.json()
  const { email, role = 'assistant' } = body

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get kitchen
  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('id, first_name, last_name, kitchen_members(kitchen_id, role)')
    .eq('auth_user_id', user.id)
    .single()

  const membership = (profile?.kitchen_members as any)?.[0]
  if (!membership || membership.role !== 'owner') {
    return NextResponse.json({ error: 'Alleen de eigenaar kan teamleden uitnodigen' }, { status: 403 })
  }

  const kitchenId = membership.kitchen_id

  // Get kitchen name
  const { data: kitchen } = await supabase
    .from('kitchens')
    .select('name')
    .eq('id', kitchenId)
    .single()

  // Create invite record
  const { data: invite, error } = await supabase
    .from('kitchen_invites')
    .insert({
      kitchen_id: kitchenId,
      invited_by: user.id,
      email,
      role,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const inviterName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Chef'
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://my-ai-sous-chef.vercel.app'}/join?token=${invite.token}`

  // Return invite details (parent will send email via send_message or Resend)
  return NextResponse.json({
    ok: true,
    invite,
    acceptUrl,
    inviterName,
    kitchenName: kitchen?.name,
  })
}

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('id, kitchen_members(kitchen_id)')
    .eq('auth_user_id', user.id)
    .single()

  const kitchenId = (profile?.kitchen_members as any)?.[0]?.kitchen_id
  if (!kitchenId) return NextResponse.json([])

  const { data } = await supabase
    .from('kitchen_invites')
    .select('*')
    .eq('kitchen_id', kitchenId)
    .order('created_at', { ascending: false })

  return NextResponse.json(data || [])
}
