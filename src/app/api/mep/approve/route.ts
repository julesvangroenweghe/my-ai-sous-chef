import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { eventId } = await request.json()
    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 })
    }

    // Server-side client leest auth cookie → voldoet aan RLS
    const supabase = await createClient()

    // Update event status to approved
    const { error: eventError } = await supabase
      .from('events')
      .update({ status: 'approved', mep_status: 'approved' })
      .eq('id', eventId)

    if (eventError) {
      console.error('Event update error:', eventError)
      return NextResponse.json({ error: eventError.message }, { status: 500 })
    }

    // Mark all AI suggestions as approved
    const { error: dishError } = await supabase
      .from('mep_dishes')
      .update({ is_ai_suggestion: false })
      .eq('event_id', eventId)

    if (dishError) {
      console.error('Dish update error:', dishError)
    }

    // Get all dish IDs for this event
    const { data: dishes } = await supabase
      .from('mep_dishes')
      .select('id')
      .eq('event_id', eventId)

    if (dishes && dishes.length > 0) {
      const dishIds = dishes.map((d: { id: string }) => d.id)
      const { error: compError } = await supabase
        .from('mep_components')
        .update({ is_ai_suggestion: false })
        .in('dish_id', dishIds)

      if (compError) {
        console.error('Component update error:', compError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Approve error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
