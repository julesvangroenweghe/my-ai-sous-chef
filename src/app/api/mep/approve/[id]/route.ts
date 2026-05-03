import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Service role client — bypasses RLS voor server-side admin operaties
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqeWRzd3JpaXNtcWV1Z2tjYXF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ5OTk0NywiZXhwIjoyMDkyMDc1OTQ3fQ.G3eA8nUQDUtKjFEhNfXe1CwZevC36CBRP0tz0G_Kjbo'
)

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id
    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 })
    }

    // Update event status
    const { error: eventError } = await supabaseAdmin
      .from('events')
      .update({ status: 'approved', mep_status: 'approved' })
      .eq('id', eventId)

    if (eventError) {
      console.error('Event update error:', eventError)
      return NextResponse.json({ error: eventError.message }, { status: 500 })
    }

    // Mark all AI suggestions as approved (cascade)
    await supabaseAdmin
      .from('mep_dishes')
      .update({ is_ai_suggestion: false })
      .eq('event_id', eventId)

    const { data: dishes } = await supabaseAdmin
      .from('mep_dishes')
      .select('id')
      .eq('event_id', eventId)

    if (dishes && dishes.length > 0) {
      const dishIds = dishes.map((d: { id: string }) => d.id)
      await supabaseAdmin
        .from('mep_components')
        .update({ is_ai_suggestion: false })
        .in('dish_id', dishIds)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Approve error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
