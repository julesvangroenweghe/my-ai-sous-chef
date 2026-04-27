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
  Clock,
  ChefHat,
  ArrowRight,
  Package,
  AlertTriangle,
  Eye,
} from 'lucide-react'

interface WeekEvent {
  id: string
  name: string
  event_date: string
  event_type: string
  num_persons: number | null
  location: string | null
  status: string
  price_per_person: number | null
  menu_item_count: number
  mep_item_count: number
}

interface WeekPlan {
  id: string | null
  week_number: number
  year: number
  status: string | null
  notes: string | null
  total_prep_hours: number | null
  events: WeekEvent[]
}

type StatusFilter = 'all' | 'draft' | 'approved' | 'generated'

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

const statusColors: Record<string, string> = {
  draft: 'bg-stone-700 text-stone-300',
  confirmed: 'bg-emerald-500/20 text-emerald-400',
  in_prep: 'bg-[#E8A040]/20 text-[#E8A040]',
  approved: 'bg-emerald-500/20 text-emerald-300',
  generated: 'bg-sky-500/20 text-sky-400',
  completed: 'bg-blue-500/20 text-blue-400',
  cancelled: 'bg-red-500/20 text-red-400',
}

const statusLabels: Record<string, string> = {
  draft: 'Concept',
  confirmed: 'Bevestigd',
  in_prep: 'In voorbereiding',
  approved: 'Goedgekeurd',
  generated: 'Gegenereerd',
  completed: 'Afgerond',
  cancelled: 'Geannuleerd',
}

const dayNames = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

const filterTabs: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: 'Alle' },
  { key: 'draft', label: 'Draft' },
  { key: 'approved', label: 'Goedgekeurd' },
  { key: 'generated', label: 'Gegenereerd' },
]

export default function MepWeekPage() {
  const now = new Date()
  const [currentWeek, setCurrentWeek] = useState(getWeekNumber(now))
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [prepHours, setPrepHours] = useState<number | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useState<{ name: string; event_date: string; week: number }[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const supabase = createClient()

  const fetchWeekData = useCallback(async () => {
    setLoading(true)
    const { start, end } = getWeekDates(currentWeek, currentYear)
    const startStr = start.toISOString().split('T')[0]
    const endStr = end.toISOString().split('T')[0]

    const { data: events } = await supabase
      .from('events')
      .select('id, name, event_date, event_type, num_persons, location, status, price_per_person')
      .gte('event_date', startStr)
      .lte('event_date', endStr)
      .order('event_date')

    const { data: plan } = await supabase
      .from('mep_weekly_plans')
      .select('*')
      .eq('week_number', currentWeek)
      .eq('year', currentYear)
      .maybeSingle()

    const weekEvents: WeekEvent[] = []
    for (const event of events || []) {
      const { count: menuCount } = await supabase
        .from('event_menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)

      const { count: mepCount } = await supabase
        .from('mep_items')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)

      weekEvents.push({
        ...event,
        menu_item_count: menuCount || 0,
        mep_item_count: mepCount || 0,
      })
    }

    setWeekPlan({
      id: plan?.id || null,
      week_number: currentWeek,
      year: currentYear,
      status: plan?.status || null,
      notes: plan?.notes || null,
      total_prep_hours: plan?.total_prep_hours || null,
      events: weekEvents,
    })

    if (weekEvents.length === 0) {
      const today = new Date().toISOString().split('T')[0]
      const { data: upcoming } = await supabase
        .from('events')
        .select('name, event_date')
        .gte('event_date', today)
        .order('event_date')
        .limit(3)
      setUpcomingEvents(
        (upcoming || []).map((e: any) => ({
          ...e,
          week: getWeekNumber(new Date(e.event_date)),
        }))
      )
    } else {
      setUpcomingEvents([])
    }

    // Calculate prep hours
    let totalPrepMinutes = 0
    const eventIds = (events || []).map((e: any) => e.id)
    if (eventIds.length > 0) {
      const { data: menuItems } = await supabase
        .from('event_menu_items')
        .select('recipe_id')
        .in('event_id', eventIds)
      const recipeIds = [...new Set((menuItems || []).map((m: any) => m.recipe_id).filter(Boolean))]
      if (recipeIds.length > 0) {
        const { data: recipes } = await supabase
          .from('recipes')
          .select('prep_time_minutes')
          .in('id', recipeIds)
        totalPrepMinutes = (recipes || []).reduce(
          (sum: number, r: any) => sum + (r.prep_time_minutes || 0),
          0
        )
      }
    }
    setPrepHours(totalPrepMinutes > 0 ? totalPrepMinutes / 60 : null)

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
  const allEvents = weekPlan?.events || []

  // Apply status filter
  const filteredEvents = allEvents.filter((e) => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'draft') return e.status === 'draft' || e.status === 'confirmed' || e.status === 'in_prep'
    if (statusFilter === 'approved') return e.status === 'approved'
    if (statusFilter === 'generated') return e.status === 'generated'
    return true
  })

  const totalPersons = allEvents.reduce((s, e) => s + (e.num_persons || 0), 0)
  const totalEvents = allEvents.length
  const approvedEvents = allEvents.filter((e) => e.status === 'approved' || e.status === 'generated').length

  // Build day grid
  const dayGrid: Record<string, WeekEvent[]> = {}
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dayGrid[d.toISOString().split('T')[0]] = []
  }
  for (const event of allEvents) {
    if (dayGrid[event.event_date]) {
      dayGrid[event.event_date].push(event)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-100 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-[#E8A040]" />
            MEP Planning
          </h1>
          <p className="text-stone-500 text-sm mt-1">Weekoverzicht en productieplannen</p>
        </div>
        <Link
          href="/events/new"
          className="btn-primary shrink-0 flex items-center gap-1.5 px-4 py-2 bg-[#E8A040] hover:bg-[#d4922e] text-stone-900 text-sm font-bold rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          Nieuw Event
        </Link>
      </div>

      {/* Week Navigator */}
      <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-400 hover:text-white transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-display font-bold text-stone-100">Week {currentWeek}</h2>
              <span className="text-stone-500">·</span>
              <span className="text-stone-400 text-sm">
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
            className="p-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-400 hover:text-white transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Week stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-stone-800/50 rounded-xl p-3 text-center">
            <div className="text-xs text-stone-500">Events</div>
            <div className="text-lg font-bold text-stone-200 font-mono">{totalEvents}</div>
            <div className="text-xs text-emerald-400">{approvedEvents} goedgekeurd</div>
          </div>
          <div className="bg-stone-800/50 rounded-xl p-3 text-center">
            <div className="text-xs text-stone-500">Totaal personen</div>
            <div className="text-lg font-bold text-stone-200 font-mono">{totalPersons}</div>
          </div>
          <div className="bg-stone-800/50 rounded-xl p-3 text-center">
            <div className="text-xs text-stone-500">Prep uren</div>
            <div className="text-lg font-bold text-stone-200 font-mono">
              {prepHours
                ? `${prepHours.toFixed(1)} uur`
                : weekPlan?.total_prep_hours
                ? `${weekPlan.total_prep_hours} uur`
                : '—'}
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
            {Object.entries(dayGrid).map(([dateStr, events], i) => {
              const date = new Date(dateStr + 'T12:00:00')
              const isVandaag = dateStr === now.toISOString().split('T')[0]
              const hasEvents = events.length > 0

              return (
                <div
                  key={dateStr}
                  className={`rounded-xl border p-3 min-h-[120px] transition-all ${
                    isVandaag
                      ? 'border-[#E8A040]/50 bg-[#E8A040]/5'
                      : hasEvents
                      ? 'border-stone-700 bg-stone-900/50'
                      : 'border-stone-800/50 bg-stone-900/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium uppercase ${isVandaag ? 'text-[#E8A040]' : 'text-stone-500'}`}>
                      {dayNames[i]}
                    </span>
                    <span className={`text-sm font-mono ${isVandaag ? 'text-[#E8A040] font-bold' : 'text-stone-400'}`}>
                      {date.getDate()}
                    </span>
                  </div>
                  {events.map((event) => (
                    <Link
                      key={event.id}
                      href={`/mep/${event.id}`}
                      className="block p-2 rounded-lg bg-stone-800/50 hover:bg-stone-800 border border-stone-700/50 hover:border-[#E8A040]/30 transition-all mb-1 group"
                    >
                      <div className="text-xs font-medium text-stone-200 truncate group-hover:text-[#E8A040] transition-colors">
                        {event.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-stone-500">
                        {event.num_persons && <span>{event.num_persons}p</span>}
                        <span
                          className={`px-1 py-0.5 rounded text-[9px] ${statusColors[event.status] || statusColors.draft}`}
                        >
                          {statusLabels[event.status] || event.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Status filter tabs */}
          {allEvents.length > 0 && (
            <div className="flex items-center gap-1 bg-stone-900/50 border border-stone-800 rounded-xl p-1 w-fit">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    statusFilter === tab.key
                      ? 'bg-[#E8A040] text-stone-900 font-bold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {tab.label}
                  {tab.key !== 'all' && (
                    <span className="ml-1.5 opacity-60">
                      ({
                        allEvents.filter((e) => {
                          if (tab.key === 'draft') return e.status === 'draft' || e.status === 'confirmed' || e.status === 'in_prep'
                          if (tab.key === 'approved') return e.status === 'approved'
                          if (tab.key === 'generated') return e.status === 'generated'
                          return false
                        }).length
                      })
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Event list */}
          {filteredEvents.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wider">Events deze week</h3>
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-stone-900/50 border border-stone-800 rounded-2xl p-5 hover:border-[#E8A040]/30 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#E8A040]/10 rounded-xl flex items-center justify-center">
                        <CalendarDays className="w-5 h-5 text-[#E8A040]" />
                      </div>
                      <div>
                        <h4 className="font-display font-semibold text-stone-100 group-hover:text-[#E8A040] transition-colors">
                          {event.name}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
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
                              {event.num_persons} personen
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="flex items-center gap-1 text-stone-400">
                            <ChefHat className="w-3 h-3" /> {event.menu_item_count} gerechten
                          </span>
                          {event.mep_item_count > 0 ? (
                            <span className="flex items-center gap-1 text-emerald-400">
                              <Package className="w-3 h-3" /> MEP klaar
                            </span>
                          ) : event.menu_item_count > 0 ? (
                            <span className="flex items-center gap-1 text-[#E8A040]">
                              <AlertTriangle className="w-3 h-3" /> MEP nodig
                            </span>
                          ) : null}
                        </div>
                        {event.price_per_person && (
                          <div className="text-xs text-stone-500 mt-1">
                            €{Number(event.price_per_person).toFixed(0)}/pp
                          </div>
                        )}
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[event.status] || statusColors.draft}`}>
                        {statusLabels[event.status] || event.status}
                      </span>
                      <Link
                        href={`/mep/${event.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E8A040]/10 hover:bg-[#E8A040]/20 border border-[#E8A040]/30 text-[#E8A040] text-xs font-medium rounded-lg transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        MEP bekijken
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-12 text-center">
              <CalendarDays className="w-12 h-12 text-stone-600 mx-auto mb-4" />
              <h3 className="text-lg font-display font-semibold text-stone-300 mb-2">
                {allEvents.length > 0
                  ? `Geen events met status "${filterTabs.find((t) => t.key === statusFilter)?.label}"`
                  : `Geen events in week ${currentWeek}`}
              </h3>
              {allEvents.length === 0 && upcomingEvents.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-stone-500 uppercase tracking-wider">Komende events:</p>
                  {upcomingEvents.map((ue, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCurrentWeek(ue.week)
                        setCurrentYear(new Date(ue.event_date).getFullYear())
                      }}
                      className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg bg-stone-800/50 border border-stone-700 hover:border-[#E8A040]/50 transition-all group"
                    >
                      <CalendarDays className="w-4 h-4 text-[#E8A040]" />
                      <div className="flex-1">
                        <div className="text-sm text-stone-300 group-hover:text-white transition-colors">
                          {ue.name}
                        </div>
                        <div className="text-xs text-stone-500">
                          {new Date(ue.event_date).toLocaleDateString('nl-BE', {
                            day: 'numeric',
                            month: 'long',
                          })}{' '}
                          — Week {ue.week}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-stone-600 group-hover:text-[#E8A040] transition-colors" />
                    </button>
                  ))}
                </div>
              )}
              {allEvents.length === 0 && (
                <div className="mt-4">
                  <p className="text-stone-500 text-sm max-w-md mx-auto mb-4">
                    Plan een nieuw event of navigeer naar een andere week.
                  </p>
                  <Link
                    href="/events"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E8A040] hover:bg-[#d4922e] text-stone-900 text-sm font-bold rounded-xl transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Naar Events
                  </Link>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
