'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Calendar,
  Users,
  MapPin,
  FileText,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  CheckSquare,
  Square,
  FileDown,
  X,
  LayoutGrid,
  List,
  CalendarDays,
} from 'lucide-react'

type ViewMode = 'week' | 'month' | 'year'

interface MepEvent {
  id: string
  name: string
  event_date: string
  status: string
  mep_status: string | null
  num_persons: number | null
  price_per_person: number | null
  location: string | null
  event_type: string | null
  contact_person: string | null
  start_time: string | null
  end_time: string | null
  dish_count?: number
  ai_count?: number
}

interface WeekGroup {
  weekNum: number
  year: number
  dateRange: string
  events: MepEvent[]
}

interface MonthGroup {
  month: number
  year: number
  label: string
  events: MepEvent[]
}

// ── helpers ──────────────────────────────────────────────────────────────────

const MONTHS_NL = [
  'Januari','Februari','Maart','April','Mei','Juni',
  'Juli','Augustus','September','Oktober','November','December',
]

function getWeekNumber(dateStr: string): { week: number; year: number } {
  const d = new Date(dateStr + 'T12:00:00')
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const diff = d.getTime() - startOfWeek1.getTime()
  const weekNum = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1
  return { week: weekNum, year: d.getFullYear() }
}

function getWeekDateRange(weekNum: number, year: number): string {
  const jan4 = new Date(year, 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const weekStart = new Date(startOfWeek1)
  weekStart.setDate(startOfWeek1.getDate() + (weekNum - 1) * 7)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${weekStart.toLocaleDateString('nl-BE', opts)} – ${weekEnd.toLocaleDateString('nl-BE', opts)}`
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })
}

function translateEventType(t: string | null): string {
  if (!t) return ''
  const map: Record<string, string> = {
    cocktail: 'Cocktail',
    walking_dinner: 'Walking dinner',
    sit_down: 'Diner',
    seated_dinner: 'Diner',
    buffet: 'Buffet',
    tasting: 'Proeverij',
    reception: 'Receptie',
    bbq: 'BBQ',
    brunch: 'Brunch',
    lunch: 'Lunch',
  }
  return map[t] || t
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ mepStatus }: { mepStatus: string | null }) {
  if (mepStatus === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
        <CheckCircle2 className="w-3 h-3" />
        Goedgekeurd
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
      <Clock className="w-3 h-3" />
      Concept
    </span>
  )
}

function EventRow({
  event,
  selected,
  onToggle,
  anySelected,
}: {
  event: MepEvent
  selected: boolean
  onToggle: (id: string) => void
  anySelected: boolean
}) {
  const [downloading, setDownloading] = useState(false)

  async function handlePdf(e: React.MouseEvent) {
    e.stopPropagation()
    setDownloading(true)
    try {
      const res = await fetch(`/api/mep/pdf/${event.id}`)
      if (!res.ok) throw new Error('PDF fout')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `MEP_${event.name.replace(/[^a-z0-9]/gi, '_')}_${event.event_date}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('PDF genereren mislukt')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      className={`flex items-center gap-3 py-2 px-3 rounded-xl transition-all group cursor-pointer ${
        anySelected
          ? selected
            ? 'bg-amber-50/80 ring-1 ring-[#E8A040]/40'
            : 'opacity-50 hover:opacity-70'
          : 'hover:bg-[#F2E8D5]/60'
      }`}
      onClick={() => onToggle(event.id)}
    >
      <div className="shrink-0 w-5">
        {selected ? (
          <CheckSquare className="w-4 h-4 text-[#E8A040]" />
        ) : (
          <Square className="w-4 h-4 text-[#C4B09A] group-hover:text-[#9E7E60] transition-colors" />
        )}
      </div>
      <div className="w-24 shrink-0">
        <p className="text-xs font-semibold text-[#2C1810]">{formatEventDate(event.event_date)}</p>
        {event.start_time && (
          <p className="text-xs text-[#9E7E60]">{event.start_time.slice(0, 5)}</p>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/mep/${event.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-semibold text-[#2C1810] hover:text-[#E8A040] transition-colors"
          >
            {event.name}
          </Link>
          <StatusBadge mepStatus={event.mep_status} />
          {event.ai_count && event.ai_count > 0 ? (
            <span className="text-xs text-orange-500 font-medium">{event.ai_count} AI</span>
          ) : null}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-[#9E7E60] flex-wrap">
          {event.num_persons && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {event.num_persons} pers.
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {event.location}
            </span>
          )}
          {event.event_type && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {translateEventType(event.event_type)}
            </span>
          )}
          {event.price_per_person && (
            <span className="font-medium text-[#2C1810]">€{event.price_per_person} pp</span>
          )}
          {event.dish_count && event.dish_count > 0 ? (
            <span>{event.dish_count} gerechten</span>
          ) : null}
        </div>
      </div>
      <div
        className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Link
          href={`/mep/${event.id}`}
          className="p-1.5 rounded-lg text-[#9E7E60] hover:text-[#E8A040] hover:bg-[#E8A040]/10 transition-all"
          title="Bekijken"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
        <button
          onClick={handlePdf}
          disabled={downloading}
          className="p-1.5 rounded-lg text-[#9E7E60] hover:text-[#2d6a4f] hover:bg-emerald-50 transition-all disabled:opacity-50"
          title="PDF downloaden"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── WEEK VIEW ─────────────────────────────────────────────────────────────────

function WeekCard({
  group,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
  anySelected,
}: {
  group: WeekGroup
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onSelectAll: (ids: string[]) => void
  onDeselectAll: (ids: string[]) => void
  anySelected: boolean
}) {
  const [collapsed, setCollapsed] = useState(false)
  const approvedCount = group.events.filter((e) => e.mep_status === 'approved').length
  const totalPax = group.events.reduce((sum, e) => sum + (e.num_persons || 0), 0)
  const weekEventIds = group.events.map((e) => e.id)
  const allWeekSelected = weekEventIds.every((id) => selectedIds.has(id))
  const someWeekSelected = weekEventIds.some((id) => selectedIds.has(id))

  function handleWeekCheckbox(e: React.MouseEvent) {
    e.stopPropagation()
    if (allWeekSelected) onDeselectAll(weekEventIds)
    else onSelectAll(weekEventIds)
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm border border-[#E8D5BC] rounded-2xl overflow-hidden shadow-sm mb-4">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FDF8F2]/60 transition-all"
      >
        <div className="flex items-center gap-3">
          <div onClick={handleWeekCheckbox} className="shrink-0">
            {allWeekSelected ? (
              <CheckSquare className="w-4 h-4 text-[#E8A040]" />
            ) : someWeekSelected ? (
              <div className="w-4 h-4 border-2 border-[#E8A040] rounded bg-[#E8A040]/30 flex items-center justify-center">
                <div className="w-2 h-0.5 bg-[#E8A040]" />
              </div>
            ) : (
              <Square className="w-4 h-4 text-[#C4B09A] hover:text-[#9E7E60] transition-colors" />
            )}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[#2C1810]">Week {group.weekNum}</span>
              <span className="text-sm text-[#9E7E60]">{group.dateRange}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
              {group.events.map((ev) => (
                <span key={ev.id} className="text-xs text-[#6B4E3D] flex items-center gap-1">
                  <span className="text-[#E8A040]">·</span>
                  {ev.name}
                  {ev.num_persons ? <span className="text-[#B8997A]">({ev.num_persons}p)</span> : null}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#9E7E60]">{group.events.length} event{group.events.length !== 1 ? 's' : ''}</span>
            {totalPax > 0 && <span className="text-[#9E7E60]">· {totalPax} pers.</span>}
            {approvedCount > 0 && (
              <span className="text-emerald-600 font-medium">· {approvedCount} goedgekeurd</span>
            )}
          </div>
          {collapsed ? <ChevronRight className="w-4 h-4 text-[#9E7E60]" /> : <ChevronDown className="w-4 h-4 text-[#9E7E60]" />}
        </div>
      </button>
      {!collapsed && (
        <div className="border-t border-[#E8D5BC]/60 px-3 py-2">
          {group.events.map((ev) => (
            <EventRow
              key={ev.id}
              event={ev}
              selected={selectedIds.has(ev.id)}
              onToggle={onToggle}
              anySelected={anySelected}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── MONTH VIEW ────────────────────────────────────────────────────────────────

function MonthCard({
  group,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
  anySelected,
}: {
  group: MonthGroup
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onSelectAll: (ids: string[]) => void
  onDeselectAll: (ids: string[]) => void
  anySelected: boolean
}) {
  const [collapsed, setCollapsed] = useState(false)
  const approvedCount = group.events.filter((e) => e.mep_status === 'approved').length
  const totalPax = group.events.reduce((sum, e) => sum + (e.num_persons || 0), 0)
  const monthEventIds = group.events.map((e) => e.id)
  const allSelected = monthEventIds.every((id) => selectedIds.has(id))
  const someSelected = monthEventIds.some((id) => selectedIds.has(id))

  function handleCheckbox(e: React.MouseEvent) {
    e.stopPropagation()
    if (allSelected) onDeselectAll(monthEventIds)
    else onSelectAll(monthEventIds)
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm border border-[#E8D5BC] rounded-2xl overflow-hidden shadow-sm mb-4">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FDF8F2]/60 transition-all"
      >
        <div className="flex items-center gap-3">
          <div onClick={handleCheckbox} className="shrink-0">
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-[#E8A040]" />
            ) : someSelected ? (
              <div className="w-4 h-4 border-2 border-[#E8A040] rounded bg-[#E8A040]/30 flex items-center justify-center">
                <div className="w-2 h-0.5 bg-[#E8A040]" />
              </div>
            ) : (
              <Square className="w-4 h-4 text-[#C4B09A] hover:text-[#9E7E60] transition-colors" />
            )}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[#2C1810]">{group.label}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
              {group.events.map((ev) => (
                <span key={ev.id} className="text-xs text-[#6B4E3D] flex items-center gap-1">
                  <span className="text-[#E8A040]">·</span>
                  <span className="text-[#B8997A]">{formatShortDate(ev.event_date)}</span>
                  {ev.name}
                  {ev.num_persons ? <span className="text-[#B8997A]">({ev.num_persons}p)</span> : null}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#9E7E60]">{group.events.length} event{group.events.length !== 1 ? 's' : ''}</span>
            {totalPax > 0 && <span className="text-[#9E7E60]">· {totalPax} pers.</span>}
            {approvedCount > 0 && (
              <span className="text-emerald-600 font-medium">· {approvedCount} goedgekeurd</span>
            )}
          </div>
          {collapsed ? <ChevronRight className="w-4 h-4 text-[#9E7E60]" /> : <ChevronDown className="w-4 h-4 text-[#9E7E60]" />}
        </div>
      </button>
      {!collapsed && (
        <div className="border-t border-[#E8D5BC]/60 px-3 py-2">
          {group.events.map((ev) => (
            <EventRow
              key={ev.id}
              event={ev}
              selected={selectedIds.has(ev.id)}
              onToggle={onToggle}
              anySelected={anySelected}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── YEAR VIEW ─────────────────────────────────────────────────────────────────

function YearView({
  events,
  selectedYear,
  onSetYear,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
  anySelected,
}: {
  events: MepEvent[]
  selectedYear: number
  onSetYear: (y: number) => void
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onSelectAll: (ids: string[]) => void
  onDeselectAll: (ids: string[]) => void
  anySelected: boolean
}) {
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null)

  const years = Array.from(new Set(events.map((e) => new Date(e.event_date + 'T12:00:00').getFullYear()))).sort()

  const yearEvents = events.filter(
    (e) => new Date(e.event_date + 'T12:00:00').getFullYear() === selectedYear
  )

  // Build 12-month grid
  const monthData = MONTHS_NL.map((name, idx) => {
    const monthEvents = yearEvents.filter(
      (e) => new Date(e.event_date + 'T12:00:00').getMonth() === idx
    )
    return { month: idx, name, events: monthEvents }
  })

  const totalPax = yearEvents.reduce((s, e) => s + (e.num_persons || 0), 0)
  const approvedCount = yearEvents.filter((e) => e.mep_status === 'approved').length

  return (
    <div>
      {/* Year selector + stats */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => { onSetYear(y); setExpandedMonth(null) }}
              className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                y === selectedYear
                  ? 'bg-[#2C1810] text-white'
                  : 'border border-[#E8D5BC] text-[#9E7E60] hover:bg-[#F2E8D5]/40'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
        <div className="text-xs text-[#9E7E60] flex gap-3">
          <span>{yearEvents.length} events</span>
          {totalPax > 0 && <span>· {totalPax} pers.</span>}
          <span className="text-emerald-600">· {approvedCount} goedgekeurd</span>
        </div>
      </div>

      {/* 12-month grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {monthData.map(({ month, name, events: mEvents }) => {
          const isExpanded = expandedMonth === month
          const hasPast = new Date(selectedYear, month + 1, 0) < new Date()
          const hasEvents = mEvents.length > 0
          const monthSelected = mEvents.every((e) => selectedIds.has(e.id)) && mEvents.length > 0
          const someSelected = mEvents.some((e) => selectedIds.has(e.id))
          const monthIds = mEvents.map((e) => e.id)

          return (
            <div
              key={month}
              className={`border rounded-2xl overflow-hidden transition-all ${
                hasEvents
                  ? 'border-[#E8D5BC] bg-white/70 shadow-sm cursor-pointer hover:shadow-md'
                  : 'border-[#F0E6D6] bg-white/30 opacity-60'
              }`}
            >
              {/* Month header */}
              <div
                className={`px-4 py-3 flex items-center justify-between ${hasEvents ? 'hover:bg-[#FDF8F2]/60' : ''}`}
                onClick={() => hasEvents && setExpandedMonth(isExpanded ? null : month)}
              >
                <div className="flex items-center gap-2">
                  {hasEvents && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        if (monthSelected) onDeselectAll(monthIds)
                        else onSelectAll(monthIds)
                      }}
                    >
                      {monthSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-[#E8A040]" />
                      ) : someSelected ? (
                        <div className="w-3.5 h-3.5 border-2 border-[#E8A040] rounded bg-[#E8A040]/30" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-[#C4B09A]" />
                      )}
                    </div>
                  )}
                  <span className={`text-sm font-bold ${hasEvents ? 'text-[#2C1810]' : 'text-[#C4B09A]'}`}>
                    {name}
                  </span>
                </div>
                {hasEvents && (
                  <div className="flex items-center gap-2">
                    {/* Event dots */}
                    <div className="flex gap-0.5">
                      {mEvents.slice(0, 6).map((ev) => (
                        <div
                          key={ev.id}
                          className={`w-2 h-2 rounded-full ${
                            ev.mep_status === 'approved' ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                          title={ev.name}
                        />
                      ))}
                      {mEvents.length > 6 && (
                        <span className="text-xs text-[#9E7E60]">+{mEvents.length - 6}</span>
                      )}
                    </div>
                    <span className="text-xs text-[#9E7E60]">{mEvents.length}</span>
                    {isExpanded
                      ? <ChevronDown className="w-3.5 h-3.5 text-[#9E7E60]" />
                      : <ChevronRight className="w-3.5 h-3.5 text-[#9E7E60]" />
                    }
                  </div>
                )}
              </div>

              {/* Compact event list inside month */}
              {hasEvents && !isExpanded && (
                <div className="px-4 pb-3 space-y-1">
                  {mEvents.map((ev) => (
                    <div key={ev.id} className="flex items-center gap-2 text-xs">
                      <span className="text-[#B8997A] shrink-0 w-12">{formatShortDate(ev.event_date)}</span>
                      <Link
                        href={`/mep/${ev.id}`}
                        className="text-[#2C1810] hover:text-[#E8A040] truncate transition-colors font-medium"
                      >
                        {ev.name}
                      </Link>
                      {ev.num_persons && (
                        <span className="text-[#B8997A] shrink-0">{ev.num_persons}p</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Expanded full event rows */}
              {hasEvents && isExpanded && (
                <div className="border-t border-[#E8D5BC]/60 px-2 py-1">
                  {mEvents.map((ev) => (
                    <EventRow
                      key={ev.id}
                      event={ev}
                      selected={selectedIds.has(ev.id)}
                      onToggle={onToggle}
                      anySelected={anySelected}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function MepPlanningPage() {
  const [allEvents, setAllEvents] = useState<MepEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDownloading, setBulkDownloading] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: events, error } = await supabase
        .from('events')
        .select(
          'id, name, event_date, status, mep_status, num_persons, price_per_person, location, event_type, contact_person, start_time, end_time'
        )
        .in('mep_status', ['approved', 'draft'])
        .order('event_date', { ascending: true })

      if (error || !events) {
        setLoading(false)
        return
      }

      const { data: dishCounts } = await supabase
        .from('mep_dishes')
        .select('event_id, is_ai_suggestion')

      const countMap: Record<string, { total: number; ai: number }> = {}
      for (const d of dishCounts || []) {
        if (!countMap[d.event_id]) countMap[d.event_id] = { total: 0, ai: 0 }
        countMap[d.event_id].total++
        if (d.is_ai_suggestion) countMap[d.event_id].ai++
      }

      const enriched: MepEvent[] = events.map((e) => ({
        ...e,
        dish_count: countMap[e.id]?.total || 0,
        ai_count: countMap[e.id]?.ai || 0,
      }))

      setAllEvents(enriched)

      // Default year = first year with events
      const years = Array.from(new Set(enriched.map((e) => new Date(e.event_date + 'T12:00:00').getFullYear()))).sort()
      if (years.length > 0) setSelectedYear(years[0])

      setLoading(false)
    }
    load()
  }, [])

  // Group for week view
  const weeks = (() => {
    const weekMap = new Map<string, WeekGroup>()
    for (const ev of allEvents) {
      const { week, year } = getWeekNumber(ev.event_date)
      const key = `${year}-${week}`
      if (!weekMap.has(key)) {
        weekMap.set(key, { weekNum: week, year, dateRange: getWeekDateRange(week, year), events: [] })
      }
      weekMap.get(key)!.events.push(ev)
    }
    return Array.from(weekMap.values()).sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.weekNum - b.weekNum
    )
  })()

  // Group for month view
  const months = (() => {
    const monthMap = new Map<string, MonthGroup>()
    for (const ev of allEvents) {
      const d = new Date(ev.event_date + 'T12:00:00')
      const m = d.getMonth()
      const y = d.getFullYear()
      const key = `${y}-${m}`
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          month: m,
          year: y,
          label: `${MONTHS_NL[m]} ${y}`,
          events: [],
        })
      }
      monthMap.get(key)!.events.push(ev)
    }
    return Array.from(monthMap.values()).sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month
    )
  })()

  const allEventIds = allEvents.map((e) => e.id)

  function toggleEvent(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll(ids: string[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return next
    })
  }

  function deselectAll(ids: string[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
  }

  function clearSelection() { setSelectedIds(new Set()) }
  function selectAllEvents() { setSelectedIds(new Set(allEventIds)) }

  async function downloadSelected() {
    if (selectedIds.size === 0) return
    setBulkDownloading(true)
    const ids = Array.from(selectedIds)
    let downloaded = 0
    for (const id of ids) {
      try {
        const ev = allEvents.find((e) => e.id === id)
        const res = await fetch(`/api/mep/pdf/${id}`)
        if (!res.ok) continue
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `MEP_${(ev?.name || id).replace(/[^a-z0-9]/gi, '_')}_${ev?.event_date || ''}.pdf`
        a.click()
        URL.revokeObjectURL(url)
        downloaded++
        await new Promise((r) => setTimeout(r, 400))
      } catch { /* skip */ }
    }
    setBulkDownloading(false)
    if (downloaded > 0) clearSelection()
  }

  const anySelected = selectedIds.size > 0
  const totalEvents = allEvents.length
  const approvedEvents = allEvents.filter((e) => e.mep_status === 'approved').length

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2C1810]">Planning</h1>
          <p className="text-sm text-[#9E7E60] mt-0.5">
            {totalEvents} events · {approvedEvents} goedgekeurd
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-[#F2E8D5]/60 border border-[#E8D5BC] rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'week'
                  ? 'bg-white shadow-sm text-[#2C1810]'
                  : 'text-[#9E7E60] hover:text-[#2C1810]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'month'
                  ? 'bg-white shadow-sm text-[#2C1810]'
                  : 'text-[#9E7E60] hover:text-[#2C1810]'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Maand
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'year'
                  ? 'bg-white shadow-sm text-[#2C1810]'
                  : 'text-[#9E7E60] hover:text-[#2C1810]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Jaar
            </button>
          </div>

          <button
            onClick={selectAllEvents}
            className="px-3 py-2 text-xs text-[#9E7E60] hover:text-[#2C1810] transition-colors border border-[#E8D5BC] rounded-xl hover:bg-[#F2E8D5]/40"
          >
            Alles selecteren
          </button>
          <Link
            href="/mep/inbox"
            className="px-3 py-2 text-sm bg-[#E8A040]/20 text-[#6B4E3D] rounded-xl hover:bg-[#E8A040]/30 transition-all"
          >
            Inbox
          </Link>
        </div>
      </div>

      {/* Bulk toolbar */}
      {anySelected && (
        <div className="sticky top-4 z-20 mb-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#2C1810] text-white rounded-2xl shadow-lg">
            <CheckSquare className="w-4 h-4 text-[#E8A040] shrink-0" />
            <span className="text-sm font-medium flex-1">
              {selectedIds.size} event{selectedIds.size !== 1 ? 's' : ''} geselecteerd
            </span>
            <button
              onClick={downloadSelected}
              disabled={bulkDownloading}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#E8A040] text-[#2C1810] rounded-xl text-sm font-semibold hover:bg-[#d4922e] transition-colors disabled:opacity-60"
            >
              <FileDown className="w-4 h-4" />
              {bulkDownloading ? 'Bezig...' : `${selectedIds.size} PDF${selectedIds.size !== 1 ? 's' : ''} downloaden`}
            </button>
            <button
              onClick={clearSelection}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#E8A040] border-t-transparent" />
        </div>
      ) : allEvents.length === 0 ? (
        <div className="text-center py-20 text-[#9E7E60]">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Geen events gevonden</p>
        </div>
      ) : (
        <>
          {viewMode === 'week' && (
            <div>
              {weeks.map((group) => (
                <WeekCard
                  key={`${group.year}-${group.weekNum}`}
                  group={group}
                  selectedIds={selectedIds}
                  onToggle={toggleEvent}
                  onSelectAll={selectAll}
                  onDeselectAll={deselectAll}
                  anySelected={anySelected}
                />
              ))}
            </div>
          )}

          {viewMode === 'month' && (
            <div>
              {months.map((group) => (
                <MonthCard
                  key={`${group.year}-${group.month}`}
                  group={group}
                  selectedIds={selectedIds}
                  onToggle={toggleEvent}
                  onSelectAll={selectAll}
                  onDeselectAll={deselectAll}
                  anySelected={anySelected}
                />
              ))}
            </div>
          )}

          {viewMode === 'year' && (
            <YearView
              events={allEvents}
              selectedYear={selectedYear}
              onSetYear={setSelectedYear}
              selectedIds={selectedIds}
              onToggle={toggleEvent}
              onSelectAll={selectAll}
              onDeselectAll={deselectAll}
              anySelected={anySelected}
            />
          )}
        </>
      )}
    </div>
  )
}
