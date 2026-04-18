'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MepView } from '@/components/events/mep-view'
import { ArrowLeft, Edit, FileDown, MapPin, Users, Clock, Phone } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { Event } from '@/types/database'

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('events')
        .select(`
          *,
          menu_items:event_menu_items(
            *,
            recipe:recipes(
              *,
              components:recipe_components(
                *,
                ingredients:recipe_component_ingredients(
                  *,
                  ingredient:ingredients(*)
                )
              )
            )
          ),
          dietary_flags:event_dietary_flags(*)
        `)
        .eq('id', id)
        .single()

      if (data) setEvent(data as unknown as Event)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>

  if (!event) return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">Event not found</p>
      <Button variant="outline" className="mt-4" onClick={() => router.push('/events')}>Back to Events</Button>
    </div>
  )

  const statusColor = {
    draft: 'warning' as const,
    confirmed: 'success' as const,
    completed: 'secondary' as const,
    cancelled: 'destructive' as const,
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/events')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={statusColor[event.status]}>{event.status}</Badge>
            <span className="text-sm text-muted-foreground">{formatDate(event.event_date)}</span>
            <Badge variant="outline" className="capitalize">{event.event_type.replace('_', ' ')}</Badge>
          </div>
        </div>
        <Button variant="outline" className="gap-2"><Edit className="h-4 w-4" /> Edit</Button>
        <Button className="gap-2"><FileDown className="h-4 w-4" /> Download MEP PDF</Button>
      </div>

      {/* Event info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {event.num_persons && (
          <Card><CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">Persons</p><p className="font-semibold">{event.num_persons}</p></div>
          </CardContent></Card>
        )}
        {event.price_per_person && (
          <Card><CardContent className="p-4 flex items-center gap-3">
            <span className="text-lg">€</span>
            <div><p className="text-xs text-muted-foreground">Price/pp</p><p className="font-semibold">{formatCurrency(event.price_per_person)}</p></div>
          </CardContent></Card>
        )}
        {event.location && (
          <Card><CardContent className="p-4 flex items-center gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">Location</p><p className="font-semibold text-sm">{event.location}</p></div>
          </CardContent></Card>
        )}
        {event.contact_person && (
          <Card><CardContent className="p-4 flex items-center gap-3">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">Contact</p><p className="font-semibold text-sm">{event.contact_person}</p></div>
          </CardContent></Card>
        )}
      </div>

      {/* Logistics */}
      {(event.departure_time || event.arrival_time) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Logistics</CardTitle></CardHeader>
          <CardContent className="flex gap-6">
            {event.departure_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm"><strong>Departure:</strong> {event.departure_time}</span>
              </div>
            )}
            {event.arrival_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm"><strong>Arrival:</strong> {event.arrival_time}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dietary flags */}
      {event.dietary_flags && event.dietary_flags.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Dietary Requirements</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {event.dietary_flags.map((df) => (
                <div key={df.id} className="flex items-center gap-2">
                  <Badge variant="outline">{df.flag_name}</Badge>
                  {df.guest_name && <span className="text-sm text-muted-foreground">— {df.guest_name}</span>}
                  {df.notes && <span className="text-sm text-muted-foreground">({df.notes})</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MEP View */}
      <MepView event={event} />
    </div>
  )
}
