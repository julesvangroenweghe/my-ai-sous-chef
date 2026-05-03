import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data: events, error } = await supabase
      .from('events')
      .select('id, name, event_date, event_type, num_persons, location, status, mep_status, price_per_person, contact_person, start_time, end_time')
      .order('event_date', { ascending: true })

    if (error) throw error

    // Get dish counts per event
    const eventIds = (events || []).map((e: any) => e.id)
    let dishCountMap: Record<string, number> = {}

    if (eventIds.length > 0) {
      const { data: dishRows } = await supabase
        .from('mep_dishes')
        .select('event_id')
        .in('event_id', eventIds)

      for (const row of dishRows || []) {
        dishCountMap[row.event_id] = (dishCountMap[row.event_id] || 0) + 1
      }
    }

    const result = (events || []).map((e: any) => ({
      ...e,
      dish_count: dishCountMap[e.id] || 0,
    }))

    return NextResponse.json({ events: result })
  } catch (err: any) {
    console.error('Events API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
