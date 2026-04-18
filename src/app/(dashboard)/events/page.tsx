'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, Calendar as CalIcon, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EventCard } from '@/components/events/event-card'
import type { Event } from '@/types/database'

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true })
      .then(({ data }) => {
        if (data) setEvents(data as Event[])
        setLoading(false)
      })
  }, [])

  const upcoming = events.filter((e) => new Date(e.event_date) >= new Date())
  const past = events.filter((e) => new Date(e.event_date) < new Date())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events & MEP</h1>
          <p className="text-muted-foreground text-sm mt-1">{upcoming.length} upcoming events</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border rounded-lg">
            <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-muted' : ''}`}>
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('calendar')} className={`p-2 ${viewMode === 'calendar' ? 'bg-muted' : ''}`}>
              <CalIcon className="h-4 w-4" />
            </button>
          </div>
          <Link href="/events/new">
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Event</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No events yet. Create your first event!</p>
          <Link href="/events/new"><Button className="mt-4 gap-2"><Plus className="h-4 w-4" /> Create Event</Button></Link>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Upcoming</h2>
              {upcoming.map((event) => <EventCard key={event.id} event={event} />)}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Past</h2>
              {past.map((event) => <EventCard key={event.id} event={event} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
