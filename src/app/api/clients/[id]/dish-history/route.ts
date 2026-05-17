import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Haal kitchen ID op van de ingelogde user
    const { data: chefProfile } = await supabase
      .from('chef_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!chefProfile) return NextResponse.json({ error: 'No chef profile' }, { status: 403 })

    const { data: membership } = await supabase
      .from('kitchen_members')
      .select('kitchen_id')
      .eq('chef_id', chefProfile.id)
      .single()

    if (!membership) return NextResponse.json({ error: 'No kitchen' }, { status: 403 })

    // Haal alle events voor deze klant op met menu items
    const { data: events, error } = await supabase
      .from('events')
      .select(`
        id,
        name,
        event_date,
        status,
        num_persons,
        saved_menus (
          id,
          proposal_status,
          saved_menu_items (
            id,
            course,
            custom_name,
            custom_description,
            is_crew_food,
            legende_dish_id,
            recipe_id,
            legende_dishes (
              id,
              name,
              display_name
            )
          )
        )
      `)
      .eq('client_id', clientId)
      .eq('kitchen_id', membership.kitchen_id)
      .in('status', ['confirmed', 'completed'])
      .order('event_date', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Flatten naar dish history
    const history: {
      eventId: string
      eventName: string
      eventDate: string
      numPersons: number | null
      dishes: {
        id: string
        name: string
        course: string
        description?: string
      }[]
    }[] = []

    for (const event of (events || [])) {
      const dishes: { id: string; name: string; course: string; description?: string }[] = []
      
      for (const menu of (event.saved_menus || [])) {
        // Neem enkel de meest recente bevestigde versie
        if (menu.proposal_status !== 'approved' && menu.proposal_status !== 'sent' && menu.proposal_status !== 'confirmed') continue
        
        for (const item of (menu.saved_menu_items || [])) {
          if (item.is_crew_food) continue
          
          const dishName = item.custom_name || 
            (item.legende_dishes as { name: string; display_name?: string } | null)?.display_name ||
            (item.legende_dishes as { name: string; display_name?: string } | null)?.name ||
            'Onbekend gerecht'
          
          dishes.push({
            id: item.id,
            name: dishName,
            course: item.course,
            description: item.custom_description || undefined
          })
        }
      }
      
      if (dishes.length > 0) {
        history.push({
          eventId: event.id,
          eventName: event.name,
          eventDate: event.event_date,
          numPersons: event.num_persons,
          dishes
        })
      }
    }

    // Bouw ook een flat list van alle dish names voor snelle check
    const allDishNames = history.flatMap(e => e.dishes.map(d => ({
      name: d.name.toLowerCase(),
      eventName: e.eventName,
      eventDate: e.eventDate,
      course: d.course
    })))

    return NextResponse.json({ 
      clientId,
      history,
      allDishNames,
      totalEvents: history.length,
      totalDishes: allDishNames.length
    })
  } catch (err) {
    console.error('Client dish history error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
