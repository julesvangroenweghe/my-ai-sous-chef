'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, CalendarDays, MapPin, Users, ArrowRight } from 'lucide-react'
import type { Event } from '@/types/database'

function EmptyEvents() {
  return (
    <div className="card p-12 text-center animate-scale-in">
      <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <CalendarDays className="w-8 h-8 text-emerald-400" />
      </div>
      <h3 className="font-display text-xl font-semibold text-stone-900 mb-2">No events planned yet</h3>
      <p className="text-stone-500 text-sm max-w-[45ch] mx-auto mb-8 leading-relaxed">
        Create an event and we will auto-generate your MEP production plan with exact quantities, timing, and prep lists.
      </p>
      <Link href="/events/new" className="btn-primary">
        <Plus className="w-4 h-4" />
        Plan Your First Event
      </Link>
    </div>
  )
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('events').select('*').order('event_date', { ascending: false })
      setEvents((data || []) as Event[])
      setLoading(false)
    }
    load()
  }, [])

  const statusColors: Record<string, string> = {
    draft: 'bg-stone-100 text-stone-600',
    confirmed: 'bg-emerald-50 text-emerald-700',
    completed: 'bg-sky-50 text-sky-700',
    cancelled: 'bg-red-50 text-red-600',
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">Events & MEP</h1>
          <p className="text-stone-500 mt-1">Plan events and auto-generate production plans</p>
        </div>
        <Link href="/events/new" className="btn-primary shrink-0">
          <Plus className="w-4 h-4" />
          New Event
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-6 flex gap-4">
              <div className="skeleton w-14 h-14 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton w-48 h-5 rounded" />
                <div className="skeleton w-32 h-4 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyEvents />
      ) : (
        <div className="space-y-3">
          {events.map((event, i) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="card-hover p-6 flex items-center gap-5 group animate-slide-up opacity-0"
              style={{ animationDelay: `${i * 75}ms`, animationFillMode: 'forwards' }}
            >
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex flex-col items-center justify-center shrink-0">
                {event.event_date ? (
                  <>
                    <span className="text-xs text-emerald-600 font-medium uppercase">
                      {new Date(event.event_date).toLocaleDateString('en', { month: 'short' })}
                    </span>
                    <span className="text-lg font-bold text-emerald-700 font-mono leading-none">
                      {new Date(event.event_date).getDate()}
                    </span>
                  </>
                ) : (
                  <CalendarDays className="w-6 h-6 text-emerald-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-stone-900 group-hover:text-brand-700 transition-colors truncate">
                  {event.name}
                </h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-stone-400">
                  {event.location && (
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.location}</span>
                  )}
                  {event.num_persons && (
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{event.num_persons} guests</span>
                  )}
                  <span className="capitalize text-xs">{event.event_type.replace(/_/g, ' ')}</span>
                </div>
              </div>
              <span className={`px-3 py-1 text-xs font-medium rounded-full capitalize ${statusColors[event.status] || statusColors.draft}`}>
                {event.status.replace(/_/g, ' ')}
              </span>
              <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-brand-500 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
