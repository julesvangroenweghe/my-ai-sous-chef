import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
 const supabase = await createClient()
 const { searchParams } = new URL(request.url)
 const search = searchParams.get('search')
 const category = searchParams.get('category')

 let query = supabase.from('ingredients').select('*').order('name')
 if (search) query = query.ilike('name', `%${search}%`)
 if (category) query = query.eq('category', category)

 const { data, error } = await query
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

 const { data: membership } = await supabase
 .from('kitchen_members')
 .select('kitchen_id')
 .eq('chef_id', chef?.id)
 .limit(1)
 .single()

 const { data, error } = await supabase
 .from('ingredients')
 .insert({
 name: body.name,
 category: body.category || null,
 unit: body.unit || null,
 current_price: body.current_price || null,
 supplier: body.supplier || null,
 kitchen_id: membership?.kitchen_id || null,
 last_updated: new Date().toISOString(),
 })
 .select()
 .single()

 if (error) return NextResponse.json({ error: error.message }, { status: 500 })

 if (body.current_price && data) {
 await supabase.from('ingredient_prices').insert({
 ingredient_id: data.id,
 price: body.current_price,
 source: 'manual',
 recorded_at: new Date().toISOString(),
 })
 }

 return NextResponse.json(data, { status: 201 })
}
