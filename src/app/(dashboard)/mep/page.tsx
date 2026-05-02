'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Users,
  MapPin,
  ClipboardList,
  Plus,
  Loader2,
  ChefHat,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Eye,
  FileText,
} from 'lucide-react'

interface WeekEvent {
  id: string
  name: string
  event_date: string
  event_type: string
  num_persons: number | null
  location: string | null
  status: string
  mep_status: string | null
  price_per_person: number | null
  dish_count: number
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function getWeekDates(week: number, year: number): { start: Date; end: Date } {
  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = jan4.getDay() || 7
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: monday, end: sunday }
}

const eventTypeLabels: Record<string, string> = {
  cocktail: 'Cocktail',
  walking_dinner: 'Walking Dinner',
  sit_down: 'Diner aan tafel',
  buffet: 'Buffet',
  daily_service: 'Dagservice',
  tasting: 'Proeverij',
}

const mepStatusConfig: Record<string, { color: string; label: string; icon: string }> = {
  approved: { color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', label: 'MEP ✓', icon: '✓' },
  draft: { color: 'bg-[#E8A040]/20 text-[#E8A040] border-[#E8A040]/30', label: 'MEP concept', icon: '~' },
  pending: { color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', label: 'MEP nodig', icon: '!' },
}

const dayNames = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

export default function MepWeekPage() {
  const now = new Date()
  const [currentWeek, setCurrentWeek] = useState(getWeekNumber(now))
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [events, setEvents] = useState<WeekEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [upcomingEvents, setUpcomingEvents] = useState<{ name: string; event_date: string; week: number }[]>([])
  const supabase = createClient()

  const fetchWeekData = useCallback(async () => {
    setLoading(true)
    const { start, end } = getWeekDates(currentWeek, currentYear)
    const startStr = start.toISOString().split('T')[0]
    const endStr = end.toISOString().split('T')[0]

    // Get events for this week
    const { data: eventRows } = await supabase
      .from('events')
      .select('id, name, event_date, event_type, num_persons, location, status, mep_status, price_per_person')
      .gte('event_date', startStr)
      .lte('event_date', endStr)
      .order('event_date')

    const eventIds = (eventRows || []).map((e: any) => e.id)

    // Batch count mep_dishes per event
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

    const weekEvents: WeekEvent[] = (eventRows || []).map((e: any) => ({
      ...e,
      dish_count: dishCountMap[e.id] || 0,
    }))

    setEvents(weekEvents)

    if (weekEvents.length === 0) {
      const today = new Date().toISOString().split('T')[0]
      const { data: upcoming } = await supabase
        .from('events')
        .select('name, event_date')
        .gte('event_date', today)
        .order('event_date')
        .limit(4)
      setUpcomingEvents(
        (upcoming || []).map((e: any) => ({
          ...e,
          week: getWeekNumber(new Date(e.event_date)),
        }))
      )
    } else {
      setUpcomingEvents([])
    }

    setLoading(false)
  }, [currentWeek, currentYear])

  useEffect(() => {
    fetchWeekData()
  }, [fetchWeekData])

  const navigateWeek = (delta: number) => {
    let w = currentWeek + delta
    let y = currentYear
    if (w < 1) { w = 52; y-- }
    if (w > 52) { w = 1; y++ }
    setCurrentWeek(w)
    setCurrentYear(y)
  }

  const goToCurrentWeek = () => {
    setCurrentWeek(getWeekNumber(now))
    setCurrentYear(now.getFullYear())
  }

  const { start, end } = getWeekDates(currentWeek, currentYear)
  const totalPersons = events.reduce((s, e) => s + (e.num_persons || 0), 0)
  const approvedMep = events.filter(e => e.mep_status === 'approved').length

  // Day grid
  const dayGrid: Record<string, WeekEvent[]> = {}
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dayGrid[d.toISOString().split('T')[0]] = []
  }
  for (const event of events) {
    if (dayGrid[event.event_date]) {
      dayGrid[event.event_date].push(event)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-[#2C1810] tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-[#E8A040]" />
            MEP Planning
          </h1>
          <p className="text-[#B8997A] text-sm mt-1">Weekoverzicht en mise en place</p>
        </div>
        <Link
          href="/events/new"
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-[#E8A040] hover:bg-[#d4922e] text-stone-900 text-sm font-bold rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          Nieuw Event
        </Link>
      </div>

      {/* Week Navigator */}
      <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-2 rounded-xl bg-white border border-[#E8D5B5] text-[#9E7E60] hover:text-[#2C1810] transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-display font-bold text-[#2C1810]">Week {currentWeek}</h2>
              <span className="text-[#B8997A]">·</span>
              <span className="text-[#9E7E60] text-sm">
                {start.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })} —{' '}
                {end.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            {getWeekNumber(now) !== currentWeek && (
              <button onClick={goToCurrentWeek} className="text-xs text-[#E8A040] hover:text-[#d4922e] mt-1">
                Terug naar huidige week
              </button>
            )}
          </div>
          <button
            onClick={() => navigateWeek(1)}
            className="p-2 rounded-xl bg-white border border-[#E8D5B5] text-[#9E7E60] hover:text-[#2C1810] transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Week stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-[#FDF8F2]/80 rounded-xl p-3 text-center">
            <div className="text-xs text-[#B8997A]">Events</div>
            <div className="text-lg font-bold text-[#3D2810] font-mono">{events.length}</div>
            <div className="text-xs text-emerald-400">{approvedMep} MEP klaar</div>
          </div>
          <div className="bg-[#FDF8F2]/80 rounded-xl p-3 text-center">
            <div className="text-xs text-[#B8997A]">Totaal pax</div>
            <div className="text-lg font-bold text-[#3D2810] font-mono">{totalPersons || '—'}</div>
          </div>
          <div className="bg-[#FDF8F2]/80 rounded-xl p-3 text-center">
            <div className="text-xs text-[#B8997A]">MEP status</div>
            <div className="text-lg font-bold text-[#3D2810] font-mono">
              {events.length > 0 ? `${approvedMep}/${events.length}` : '—'}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#E8A040] animate-spin" />
        </div>
      ) : (
        <>
          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-2">
            {Object.entries(dayGrid).map(([dateStr, dayEvents], i) => {
              const date = new Date(dateStr + 'T12:00:00')
              const isVandaag = dateStr === now.toISOString().split('T')[0]
              const hasEvents = dayEvents.length > 0

              return (
                <div
                  key={dateStr}
                  className={`rounded-xl border p-3 min-h-[100px] transition-all ${
                    isVandaag
                      ? 'border-[#E8A040]/50 bg-[#E8A040]/5'
                      : hasEvents
                      ? 'border-[#E8D5B5] bg-[#FDFAF6]/80'
                      : 'border-[#E8D5B5]/50 bg-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium uppercase ${isVandaag ? 'text-[#E8A040]' : 'text-[#B8997A]'}`}>
                      {dayNames[i]}
                    </span>
                    <span className={`text-sm font-mono ${isVandaag ? 'text-[#E8A040] font-bold' : 'text-[#9E7E60]'}`}>
                      {date.getDate()}
                    </span>
                  </div>
                  {dayEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/mep/${event.id}`}
                      className="block p-2 rounded-lg bg-[#FDF8F2]/80 hover:bg-white border border-[#E8D5B5]/60 hover:border-[#E8A040]/30 transition-all mb-1 group"
                    >
                      <div className="text-xs font-medium text-[#3D2810] truncate group-hover:text-[#E8A040] transition-colors">
                        {event.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {event.num_persons && (
                          <span className="text-[10px] text-[#B8997A]">{event.num_persons}p</span>
                        )}
                        <span className={`text-[9px] px-1 py-0.5 rounded border ${
                          event.mep_status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-[#E8A040]/10 text-[#E8A040] border-[#E8A040]/20'
                        }`}>
                          {event.mep_status === 'approved' ? '✓' : '~'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Event list */}
          {events.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#9E7E60] uppercase tracking-wider">
                {events.length} event{events.length !== 1 ? 's' : ''} deze week
              </h3>
              {events.map((event) => {
                const mepCfg = mepStatusConfig[event.mep_status || 'pending'] || mepStatusConfig.pending
                return (
                  <div
                    key={event.id}
                    className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-5 hover:border-[#E8A040]/30 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-11 h-11 bg-[#E8A040]/10 rounded-xl flex items-center justify-center shrink-0">
                          <CalendarDays className="w-5 h-5 text-[#E8A040]" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-display font-semibold text-[#2C1810] group-hover:text-[#E8A040] transition-colors truncate">
                            {event.name}
                          </h4>
                          <div className="flex items-center gap-3 mt-1 text-xs text-[#B8997A] flex-wrap">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {new Date(event.event_date + 'T12:00:00').toLocaleDateString('nl-BE', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                              })}
                            </span>
                            {event.num_persons && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {event.num_persons} pax
                              </span>
                            )}
                            {event.location && (
                              <span className="flex items-center gap-1 truncate max-w-[180px]">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {event.location}
                              </span>
                            )}
                            {event.event_type && (
                              <span className="text-[#9E7E60]">
                                {eventTypeLabels[event.event_type] || event.event_type}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <div className="flex items-center gap-2 text-xs justify-end">
                            <span className="flex items-center gap-1 text-[#9E7E60]">
                              <ChefHat className="w-3 h-3" />
                              {event.dish_count} gerechten
                            </span>
                          </div>
                          {event.price_per_person && (
                            <div className="text-xs text-[#B8997A] mt-0.5">
                              €{Number(event.price_per_person).toFixed(0)}/pp
                            </div>
                          )}
                        </div>

                        <span className={`px-2 py-1 text-xs font-medium rounded-lg border ${mepCfg.color}`}>
                          {event.dish_count > 0 ? (event.mep_status === 'approved' ? 'MEP ✓' : 'MEP concept') : 'Geen MEP'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/mep/${event.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E8A040]/10 hover:bg-[#E8A040]/20 border border-[#E8A040]/30 text-[#E8A040] text-xs font-medium rounded-lg transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Bekijken
                          </Link>
                          {event.dish_count > 0 && (
                            <a
                              href={`/api/mep/pdf/${event.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F2E8D5] border border-[#E8D5B5] text-[#9E7E60] hover:text-[#2C1810] text-xs font-medium rounded-lg transition-all"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              PDF
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-12 text-center">
              <CalendarDays className="w-12 h-12 text-[#5C4730] mx-auto mb-4" />
              <h3 className="text-lg font-display font-semibold text-[#5C4730] mb-2">
                Geen events in week {currentWeek}
              </h3>
              {upcomingEvents.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-[#B8997A] uppercase tracking-wider">Volgende events:</p>
                  {upcomingEvents.map((ue, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCurrentWeek(ue.week)
                        setCurrentYear(new Date(ue.event_date).getFullYear())
                      }}
                      className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg bg-[#FDF8F2]/80 border border-[#E8D5B5] hover:border-[#E8A040]/50 transition-all group"
                    >
                      <CalendarDays className="w-4 h-4 text-[#E8A040]" />
                      <div className="flex-1">
                        <div className="text-sm text-[#5C4730] group-hover:text-[#2C1810] transition-colors">
                          {ue.name}
                        </div>
                        <div className="text-xs text-[#B8997A]">
                          {new Date(ue.event_date + 'T12:00:00').toLocaleDateString('nl-BE', {
                            day: 'numeric', month: 'long',
                          })}{' '}— Week {ue.week}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#5C4730] group-hover:text-[#E8A040] transition-colors" />
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[#B8997A] text-sm mt-4">
                Navigeer naar een andere week of maak een nieuw event aan.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
