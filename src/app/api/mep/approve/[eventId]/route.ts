import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { eventId } = params
  if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })

  const supabase = createAdminClient()

  // 1. Approve event — only update mep_status (status field has different check constraint)
  const { error: eventErr } = await supabase
    .from('events')
    .update({ mep_status: 'approved' })
    .eq('id', eventId)

  if (eventErr) {
    console.error('Approve event error:', eventErr)
    return NextResponse.json({ error: eventErr.message }, { status: 500 })
  }

  // 2. Get all dish IDs for this event
  const { data: dishes } = await supabase
    .from('mep_dishes')
    .select('id')
    .eq('event_id', eventId)

  const dishIds = (dishes || []).map((d: any) => d.id)

  if (dishIds.length > 0) {
    await supabase
      .from('mep_dishes')
      .update({ is_ai_suggestion: false })
      .in('id', dishIds)

    await supabase
      .from('mep_components')
      .update({ is_ai_suggestion: false })
      .in('dish_id', dishIds)
  }

  return NextResponse.json({ ok: true })
}
