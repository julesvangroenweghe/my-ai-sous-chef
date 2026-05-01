// src/app/api/culinary-rules/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Haal kitchen_id op
  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('id, kitchens:kitchen_members(kitchen_id)')
    .eq('auth_user_id', user.id)
    .single()

  const kitchen_id = profile?.kitchens?.[0]?.kitchen_id
  if (!kitchen_id) return NextResponse.json({ error: 'No kitchen' }, { status: 400 })

  const { data: rules, error } = await supabase
    .from('chef_culinary_rules')
    .select('*')
    .eq('kitchen_id', kitchen_id)
    .eq('is_active', true)
    .order('subject', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rules })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { rule_text, rule_type, context, nuance, subject, subject_type } = body

  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('id, kitchens:kitchen_members(kitchen_id)')
    .eq('auth_user_id', user.id)
    .single()

  const kitchen_id = profile?.kitchens?.[0]?.kitchen_id
  const chef_profile_id = profile?.id

  const { data, error } = await supabase
    .from('chef_culinary_rules')
    .insert({
      kitchen_id,
      chef_profile_id,
      rule_text,
      rule_type,
      context: context || 'algemeen',
      nuance,
      subject,
      subject_type: subject_type || 'ingredient',
      source: 'handmatig',
      confidence: 100
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rule: data })
}

export async function PUT(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body

  const { data, error } = await supabase
    .from('chef_culinary_rules')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rule: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  // Soft delete — deactiveren ipv verwijderen (voor leerloop)
  const { error } = await supabase
    .from('chef_culinary_rules')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
