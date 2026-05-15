import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createAdminClient()
  const { eventId } = params

  try {
    // Get all dish IDs for this event
    const { data: dishes } = await supabase
      .from('mep_dishes')
      .select('id')
      .eq('event_id', eventId)

    const dishIds = (dishes || []).map((d: any) => d.id)

    // Delete components first
    if (dishIds.length > 0) {
      await supabase.from('mep_components').delete().in('dish_id', dishIds)
    }

    // Delete dishes
    await supabase.from('mep_dishes').delete().eq('event_id', eventId)

    // Delete event
    const { error } = await supabase.from('events').delete().eq('id', eventId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
