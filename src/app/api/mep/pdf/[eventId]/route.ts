import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { MepListDocument, type MepListData } from '@/components/mep/mep-list-pdf'
import React from 'react'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = await createClient()
    const { eventId } = params

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    // 1. Fetch event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(
        'id, name, event_date, num_persons, event_type, location, venue_address, price_per_person, event_start_time, event_end_time, contact_person, departure_time, kitchen_arrival_time'
      )
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event niet gevonden' }, { status: 404 })
    }

    // 2. Fetch dishes
    const { data: dishes, error: dishError } = await supabase
      .from('mep_dishes')
      .select('id, title, category, sort_order, notes, timing_label')
      .eq('event_id', eventId)
      .order('sort_order')

    if (dishError) {
      console.error('MEP dishes query error:', dishError)
      return NextResponse.json({ error: 'Fout bij laden gerechten' }, { status: 500 })
    }

    if (!dishes || dishes.length === 0) {
      return NextResponse.json(
        { error: 'Geen gerechten gevonden voor dit event. Voeg eerst gerechten toe aan de MEP.' },
        { status: 404 }
      )
    }

    // 3. Fetch components for all dishes
    const dishIds = dishes.map((d) => d.id)
    const { data: components, error: compError } = await supabase
      .from('mep_components')
      .select('id, dish_id, component_name, quantity, unit, preparation, component_group, sort_order')
      .in('dish_id', dishIds)
      .order('sort_order')

    if (compError) {
      console.error('MEP components query error:', compError)
      return NextResponse.json({ error: 'Fout bij laden componenten' }, { status: 500 })
    }

    // 4. Map to MepListData
    const compsByDish: Record<string, typeof components> = {}
    for (const comp of components || []) {
      if (!compsByDish[comp.dish_id]) compsByDish[comp.dish_id] = []
      compsByDish[comp.dish_id].push(comp)
    }

    const mepData: MepListData = {
      event: {
        name: event.name,
        event_date: event.event_date,
        num_persons: event.num_persons || 0,
        event_type: event.event_type || '',
        location: event.location,
        venue_address: event.venue_address,
        price_per_person: event.price_per_person ? Number(event.price_per_person) : null,
        event_start_time: event.event_start_time,
        event_end_time: event.event_end_time,
        contact_person: event.contact_person,
        departure_time: event.departure_time,
        kitchen_arrival_time: event.kitchen_arrival_time,
      },
      dishes: dishes.map((dish) => ({
        id: dish.id,
        title: dish.title,
        category: dish.category || 'OVERIGE',
        sort_order: dish.sort_order || 0,
        notes: dish.notes,
        timing_label: dish.timing_label,
        components: (compsByDish[dish.id] || []).map((c) => ({
          component_name: c.component_name,
          quantity: c.quantity ? Number(c.quantity) : null,
          unit: c.unit,
          preparation: c.preparation,
          component_group: c.component_group,
          sort_order: c.sort_order || 0,
        })),
      })),
    }

    // 5. Generate PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(MepListDocument, { data: mepData })
    )

    const slug = event.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 40)

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="mep-${slug}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('MEP PDF generation error:', error)
    return NextResponse.json({ error: 'PDF generatie mislukt' }, { status: 500 })
  }
}
