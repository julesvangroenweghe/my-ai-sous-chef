import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { num_persons } = await req.json()

    if (!num_persons || num_persons < 1) {
      return NextResponse.json({ error: 'Ongeldig aantal personen' }, { status: 400 })
    }

    const { data, error } = await supabase.rpc('recalculate_event_ripple', {
      p_event_id: id,
      p_new_persons: num_persons
    })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
