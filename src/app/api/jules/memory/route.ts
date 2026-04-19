import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
 const supabase = await createClient()

 const { data: { user } } = await supabase.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const { data: chef } = await supabase
 .from('chef_profiles')
 .select('id')
 .eq('auth_user_id', user.id)
 .single()

 if (!chef) return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 })

 const { data, error } = await supabase
 .from('chef_memory')
 .select('*')
 .eq('chef_id', chef.id)
 .order('created_at', { ascending: false })

 if (error) return NextResponse.json({ error: error.message }, { status: 500 })
 return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
 const supabase = await createClient()
 const body = await request.json()

 const { data: { user } } = await supabase.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const { data: chef } = await supabase
 .from('chef_profiles')
 .select('id')
 .eq('auth_user_id', user.id)
 .single()

 if (!chef) return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 })

 const { data, error } = await supabase
 .from('chef_memory')
 .insert({
 chef_id: chef.id,
 memory_type: body.memory_type,
 content: body.content,
 context: body.context || null,
 importance: body.importance || 5,
 })
 .select()
 .single()

 if (error) return NextResponse.json({ error: error.message }, { status: 500 })
 return NextResponse.json(data, { status: 201 })
}
