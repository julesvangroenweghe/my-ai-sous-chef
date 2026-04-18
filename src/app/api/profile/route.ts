import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('chef_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Auto-create profile if it doesn't exist
  if (!data) {
    const { data: newProfile, error: createError } = await supabase
      .from('chef_profiles')
      .insert({
        user_id: user.id,
        display_name: user.email?.split('@')[0] || 'Chef',
        cuisine_styles: [],
        signature_techniques: [],
        preferred_ingredients: [],
        avoided_ingredients: [],
        is_public: false,
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }
    return NextResponse.json(newProfile)
  }

  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Only allow updating specific fields
  const allowedFields = [
    'display_name',
    'bio',
    'cuisine_styles',
    'signature_techniques',
    'preferred_ingredients',
    'avoided_ingredients',
    'cooking_philosophy',
    'years_experience',
    'current_role',
    'avatar_url',
    'is_public',
  ]

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field]
    }
  }

  const { data, error } = await supabase
    .from('chef_profiles')
    .update(updates)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
