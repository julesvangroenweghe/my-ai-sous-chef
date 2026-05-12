'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { CalendarDays, MapPin, Users, ArrowRight, CheckSquare, ClipboardList } from 'lucide-react'

interface Event {
  id: string
  name: string
  event_date: string
  event_type: string
  num_persons: number | null
  location: string | null
  status: string
}

interface PacklistSummary {
  event_id: string
  total: number
  checked: number
}

const eventTypeConfig: Record<string, { label: string; color: string }> = {
  walking_dinner: { label: 'Walking Dinner', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  buffet: { label: 'Buffet', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  sit_down: { label: 'Sit-down Diner', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  cocktail: { label: 'Cocktail', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  brunch: { label: 'Brunch', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  tasting: { label: 'Tasting Menu', color: 'bg-violet-50 text-violet-700 border-violet-200' },
}

export default function PaklijstenPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [summaries, setSummaries] = useState<Record<string, PacklistSummary>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, name, event_date, event_type, num_persons, location, status')
        .gte('event_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('event_date', { ascending: true })

      if (eventsData && eventsData.length > 0) {
        setEvents(eventsData as Event[])

        // Haal paklijst stats op per event
        const ids = eventsData.map((e: Event) => e.id)
        const { data: items } = await supabase
          .from('event_packlist_items')
          .select('event_id, checked')
          .in('event_id', ids)

        if (items) {
          const grouped: Record<string, PacklistSummary> = {}
          items.forEach((item: { event_id: string; checked: boolean }) => {
            if (!grouped[item.event_id]) {
              grouped[item.event_id] = { event_id: item.event_id, total: 0, checked: 0 }
            }
            grouped[item.event_id].total++
            if (item.checked) grouped[item.event_id].checked++
          })
          setSummaries(grouped)
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  const upcoming = events.filter(e => new Date(e.event_date) >= new Date())
  const recent = events.filter(e => new Date(e.event_date) < new Date())

  function ProgressBar({ eventId }: { eventId: string }) {
    const s = summaries[eventId]
    if (!s || s.total === 0) {
      return (
        <span className="text-xs text-[#9E7E60] italic">Nog niet geopend</span>
      )
    }
    const pct = Math.round((s.checked / s.total) * 100)
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-[#E8D5B5] rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-mono text-[#9E7E60] shrink-0">{s.checked}/{s.total}</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
            <CheckSquare className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-extrabold text-stone-900 tracking-tight">
              Paklijsten
            </h1>
            <p className="text-[#9E7E60] text-sm mt-0.5">
              Keuken, materiaal en logistiek per event — gebaseerd op SIR templates
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 flex gap-4 animate-pulse">
              <div className="skeleton w-14 h-14 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton w-48 h-5 rounded" />
                <div className="skeleton w-32 h-3 rounded" />
                <div className="skeleton w-full h-2 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="card p-12 text-center animate-scale-in">
          <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ClipboardList className="w-10 h-10 text-amber-300" />
          </div>
          <h3 className="font-display text-xl font-bold text-stone-900 mb-2">
            Geen events gevonden
          </h3>
          <p className="text-[#9E7E60] text-sm max-w-xs mx-auto mb-6">
            Maak eerst een event aan om een paklijst te genereren.
          </p>
          <Link href="/events" className="btn-primary">
            Naar Events
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9E7E60] mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Komende events ({upcoming.length})
              </h2>
              <div className="space-y-2">
                {upcoming.map((event, i) => {
                  const date = new Date(event.event_date)
                  const typeConfig = eventTypeConfig[event.event_type] || { label: event.event_type, color: 'bg-stone-50 text-stone-600 border-stone-200' }
                  return (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}/paklijst`}
                      className="card-hover flex items-center gap-4 p-5 group animate-slide-up opacity-0"
                      style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}
                    >
                      {/* Date */}
                      <div className="w-14 h-14 rounded-xl bg-[#F2E8D5] flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] uppercase tracking-wide text-[#9E7E60]">
                          {date.toLocaleDateString('nl-BE', { month: 'short' }).toUpperCase()}
                        </span>
                        <span className="font-mono text-xl font-extrabold text-[#2C1810] leading-none">{date.getDate()}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="font-semibold text-stone-900 group-hover:text-amber-700 transition-colors truncate">{event.name}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${typeConfig.color}`}>
                            {typeConfig.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#9E7E60] mb-2">
                          {event.num_persons && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />{event.num_persons} pers.
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3" />{event.location}
                            </span>
                          )}
                        </div>
                        <ProgressBar eventId={event.id} />
                      </div>

                      <ArrowRight className="w-4 h-4 text-[#9E7E60] group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {recent.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9E7E60] mb-3">
                Afgelopen events ({recent.length})
              </h2>
              <div className="space-y-2 opacity-60">
                {recent.map(event => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}/paklijst`}
                    className="card flex items-center gap-4 p-4 hover:opacity-80 transition-opacity"
                  >
                    <CalendarDays className="w-4 h-4 text-[#9E7E60] shrink-0" />
                    <span className="text-sm font-medium text-stone-700 flex-1 truncate">{event.name}</span>
                    <span className="text-xs text-[#9E7E60]">
                      {new Date(event.event_date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long' })}
                    </span>
                    <ProgressBar eventId={event.id} />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
