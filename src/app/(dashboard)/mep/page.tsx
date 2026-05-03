'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
  Eye,
  FileText,
  Download,
  CheckSquare,
  Square,
} from 'lucide-react'

interface EventRow {
  id: string
  name: string
  event_date: string
  event_type: string
  num_persons: number | null
  location: string | null
  status: string
  mep_status: string | null
  price_per_person: number | null
  contact_person: string | null
  start_time: string | null
  end_time: string | null
  dish_count: number
}

type ViewMode = 'week' | 'month' | 'year'

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

const monthNames = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
const dayNames = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

function MepBadge({ mepStatus, hasDishes }: { mepStatus: string | null; hasDishes: boolean }) {
  if (!hasDishes) return <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#E8D5B5] text-[#B8997A]">Geen MEP</span>
  if (mepStatus === 'approved') return <span className="text-[10px] px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-600 border-emerald-500/20">MEP ✓</span>
  return <span className="text-[10px] px-1.5 py-0.5 rounded border bg-[#E8A040]/10 text-[#C4703A] border-[#E8A040]/20">MEP concept</span>
}

export default function MepOverviewPage() {
  const now = new Date()
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [allEvents, setAllEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Week state
  const [currentWeek, setCurrentWeek] = useState(getWeekNumber(now))
  const [currentYear, setCurrentYear] = useState(now.getFullYear())

  // Month state
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [currentMonthYear, setCurrentMonthYear] = useState(now.getFullYear())

  // Year state
  const [currentYearView, setCurrentYearView] = useState(now.getFullYear())

  // PDF selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState(false)

  // Fetch all events once via API route (admin client, no RLS issues)
  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/mep/events')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setAllEvents(data.events || [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── WEEK VIEW ──────────────────────────────────────────────────────────────
  const { start: weekStart, end: weekEnd } = getWeekDates(currentWeek, currentYear)
  const weekStartStr = weekStart.toISOString().split('T')[0]
  const weekEndStr = weekEnd.toISOString().split('T')[0]
  const weekEvents = allEvents.filter(e => e.event_date >= weekStartStr && e.event_date <= weekEndStr)

  const dayGrid: Record<string, EventRow[]> = {}
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    dayGrid[d.toISOString().split('T')[0]] = []
  }
  for (const ev of weekEvents) {
    if (dayGrid[ev.event_date]) dayGrid[ev.event_date].push(ev)
  }

  const navigateWeek = (delta: number) => {
    let w = currentWeek + delta, y = currentYear
    if (w < 1) { w = 52; y-- }
    if (w > 52) { w = 1; y++ }
    setCurrentWeek(w); setCurrentYear(y)
  }

  // ── MONTH VIEW ─────────────────────────────────────────────────────────────
  const monthEvents = allEvents.filter(e => {
    const d = new Date(e.event_date + 'T12:00:00')
    return d.getMonth() === currentMonth && d.getFullYear() === currentMonthYear
  })

  const navigateMonth = (delta: number) => {
    let m = currentMonth + delta, y = currentMonthYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setCurrentMonth(m); setCurrentMonthYear(y)
  }

  // ── YEAR VIEW ──────────────────────────────────────────────────────────────
  const yearEvents = allEvents.filter(e => new Date(e.event_date + 'T12:00:00').getFullYear() === currentYearView)
  const eventsByMonth: Record<number, EventRow[]> = {}
  for (let m = 0; m < 12; m++) eventsByMonth[m] = []
  for (const ev of yearEvents) {
    const m = new Date(ev.event_date + 'T12:00:00').getMonth()
    eventsByMonth[m].push(ev)
  }

  // ── PDF BULK DOWNLOAD ──────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const downloadSelected = async () => {
    setDownloading(true)
    const ids = Array.from(selected)
    for (let i = 0; i < ids.length; i++) {
      const ev = allEvents.find(e => e.id === ids[i])
      if (!ev || ev.dish_count === 0) continue
      const a = document.createElement('a')
      a.href = `/api/mep/pdf/${ids[i]}`
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      if (i < ids.length - 1) await new Promise(r => setTimeout(r, 500))
    }
    setDownloading(false)
    setSelected(new Set())
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-24">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-[#2C1810] tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-[#E8A040]" />
            MEP Planning
          </h1>
          <p className="text-[#B8997A] text-sm mt-1">{allEvents.length} events · {allEvents.filter(e => e.mep_status === 'approved').length} MEP klaar</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-white border border-[#E8D5B5] rounded-xl overflow-hidden">
            {(['week', 'month', 'year'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 text-xs font-medium transition-all ${viewMode === v ? 'bg-[#E8A040] text-stone-900' : 'text-[#9E7E60] hover:text-[#2C1810]'}`}
              >
                {v === 'week' ? 'Week' : v === 'month' ? 'Maand' : 'Jaar'}
              </button>
            ))}
          </div>
          <Link
            href="/events/new"
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-[#E8A040] hover:bg-[#d4922e] text-stone-900 text-sm font-bold rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            Nieuw Event
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#E8A040] animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600 text-sm">
          Fout bij laden: {error}
        </div>
      ) : (
        <>
          {/* ────── WEEK VIEW ────── */}
          {viewMode === 'week' && (
            <div className="space-y-4">
              {/* Navigator */}
              <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <button onClick={() => navigateWeek(-1)} className="p-2 rounded-xl bg-white border border-[#E8D5B5] text-[#9E7E60] hover:text-[#2C1810] transition-all">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="text-center">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-display font-bold text-[#2C1810]">Week {currentWeek}</h2>
                      <span className="text-[#B8997A]">·</span>
                      <span className="text-[#9E7E60] text-sm">
                        {weekStart.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })} — {weekEnd.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {getWeekNumber(now) !== currentWeek && (
                      <button onClick={() => { setCurrentWeek(getWeekNumber(now)); setCurrentYear(now.getFullYear()) }} className="text-xs text-[#E8A040] hover:text-[#d4922e] mt-1">
                        Terug naar huidige week
                      </button>
                    )}
                  </div>
                  <button onClick={() => navigateWeek(1)} className="p-2 rounded-xl bg-white border border-[#E8D5B5] text-[#9E7E60] hover:text-[#2C1810] transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-[#FDF8F2]/80 rounded-xl p-3 text-center">
                    <div className="text-xs text-[#B8997A]">Events</div>
                    <div className="text-lg font-bold text-[#2C1810] font-mono">{weekEvents.length}</div>
                    <div className="text-xs text-emerald-600">{weekEvents.filter(e => e.mep_status === 'approved').length} MEP klaar</div>
                  </div>
                  <div className="bg-[#FDF8F2]/80 rounded-xl p-3 text-center">
                    <div className="text-xs text-[#B8997A]">Totaal pax</div>
                    <div className="text-lg font-bold text-[#2C1810] font-mono">{weekEvents.reduce((s, e) => s + (e.num_persons || 0), 0) || '—'}</div>
                  </div>
                  <div className="bg-[#FDF8F2]/80 rounded-xl p-3 text-center">
                    <div className="text-xs text-[#B8997A]">MEP status</div>
                    <div className="text-lg font-bold text-[#2C1810] font-mono">
                      {weekEvents.length > 0 ? `${weekEvents.filter(e => e.mep_status === 'approved').length}/${weekEvents.length}` : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-2">
                {Object.entries(dayGrid).map(([dateStr, dayEvs], i) => {
                  const date = new Date(dateStr + 'T12:00:00')
                  const isToday = dateStr === now.toISOString().split('T')[0]
                  return (
                    <div key={dateStr} className={`rounded-xl border p-3 min-h-[100px] transition-all ${isToday ? 'border-[#E8A040]/50 bg-[#E8A040]/5' : dayEvs.length > 0 ? 'border-[#E8D5B5] bg-[#FDFAF6]/80' : 'border-[#E8D5B5]/50 bg-white/20'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-medium uppercase ${isToday ? 'text-[#E8A040]' : 'text-[#B8997A]'}`}>{dayNames[i]}</span>
                        <span className={`text-sm font-mono ${isToday ? 'text-[#E8A040] font-bold' : 'text-[#9E7E60]'}`}>{date.getDate()}</span>
                      </div>
                      {dayEvs.map(ev => (
                        <Link key={ev.id} href={`/mep/${ev.id}`} className="block p-2 rounded-lg bg-[#FDF8F2]/80 hover:bg-white border border-[#E8D5B5]/60 hover:border-[#E8A040]/30 transition-all mb-1 group">
                          <div className="text-xs font-medium text-[#2C1810] truncate group-hover:text-[#E8A040]">{ev.name}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            {ev.num_persons && <span className="text-[10px] text-[#B8997A]">{ev.num_persons}p</span>}
                            <span className={`text-[9px] px-1 py-0.5 rounded border ${ev.mep_status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-[#E8A040]/10 text-[#C4703A] border-[#E8A040]/20'}`}>
                              {ev.mep_status === 'approved' ? '✓' : '~'}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )
                })}
              </div>

              {/* Event list */}
              {weekEvents.length > 0 ? (
                <EventList events={weekEvents} selected={selected} onToggle={toggleSelect} />
              ) : (
                <EmptyWeek week={currentWeek} allEvents={allEvents} onJumpToWeek={(w, y) => { setCurrentWeek(w); setCurrentYear(y) }} />
              )}
            </div>
          )}

          {/* ────── MONTH VIEW ────── */}
          {viewMode === 'month' && (
            <div className="space-y-4">
              <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <button onClick={() => navigateMonth(-1)} className="p-2 rounded-xl bg-white border border-[#E8D5B5] text-[#9E7E60] hover:text-[#2C1810] transition-all">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="text-center">
                    <h2 className="text-xl font-display font-bold text-[#2C1810] capitalize">
                      {monthNames[currentMonth]} {currentMonthYear}
                    </h2>
                    <p className="text-sm text-[#9E7E60]">{monthEvents.length} events · {monthEvents.reduce((s, e) => s + (e.num_persons || 0), 0)} pax</p>
                  </div>
                  <button onClick={() => navigateMonth(1)} className="p-2 rounded-xl bg-white border border-[#E8D5B5] text-[#9E7E60] hover:text-[#2C1810] transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {monthEvents.length === 0 ? (
                <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-10 text-center">
                  <CalendarDays className="w-10 h-10 text-[#9E7E60] mx-auto mb-3" />
                  <p className="text-[#9E7E60]">Geen events in {monthNames[currentMonth]} {currentMonthYear}</p>
                </div>
              ) : (
                <EventList events={monthEvents} selected={selected} onToggle={toggleSelect} showDate />
              )}
            </div>
          )}

          {/* ────── YEAR VIEW ────── */}
          {viewMode === 'year' && (
            <div className="space-y-4">
              <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <button onClick={() => setCurrentYearView(y => y - 1)} className="p-2 rounded-xl bg-white border border-[#E8D5B5] text-[#9E7E60] hover:text-[#2C1810] transition-all">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="text-center">
                    <h2 className="text-xl font-display font-bold text-[#2C1810]">{currentYearView}</h2>
                    <p className="text-sm text-[#9E7E60]">{yearEvents.length} events · {yearEvents.reduce((s, e) => s + (e.num_persons || 0), 0)} pax</p>
                  </div>
                  <button onClick={() => setCurrentYearView(y => y + 1)} className="p-2 rounded-xl bg-white border border-[#E8D5B5] text-[#9E7E60] hover:text-[#2C1810] transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 12 }, (_, m) => {
                  const evs = eventsByMonth[m] || []
                  const isCurrentMonth = m === now.getMonth() && currentYearView === now.getFullYear()
                  return (
                    <div key={m} className={`rounded-2xl border p-4 transition-all ${evs.length === 0 ? 'border-[#E8D5B5]/50 bg-white/20 opacity-50' : isCurrentMonth ? 'border-[#E8A040]/50 bg-[#E8A040]/5' : 'border-[#E8D5B5] bg-[#FDFAF6]/80'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className={`text-sm font-semibold capitalize ${isCurrentMonth ? 'text-[#E8A040]' : 'text-[#2C1810]'}`}>
                          {monthNames[m]}
                        </h3>
                        {evs.length > 0 && (
                          <span className="text-xs bg-[#E8A040]/15 text-[#C4703A] px-2 py-0.5 rounded-full font-medium">{evs.length}</span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {evs.slice(0, 4).map(ev => (
                          <Link key={ev.id} href={`/mep/${ev.id}`} className="flex items-center gap-2 group">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ev.mep_status === 'approved' ? 'bg-emerald-500' : 'bg-[#E8A040]'}`} />
                            <span className="text-xs text-[#5C4730] truncate group-hover:text-[#E8A040] transition-colors">
                              <span className="text-[#B8997A] mr-1">{new Date(ev.event_date + 'T12:00:00').getDate()}</span>
                              {ev.name}
                            </span>
                          </Link>
                        ))}
                        {evs.length > 4 && (
                          <button
                            onClick={() => { setViewMode('month'); setCurrentMonth(m); setCurrentMonthYear(currentYearView) }}
                            className="text-xs text-[#E8A040] hover:text-[#d4922e]"
                          >
                            +{evs.length - 4} meer →
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Sticky PDF toolbar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-[#2C1810] text-white px-6 py-3 rounded-2xl shadow-xl">
          <span className="text-sm font-medium">{selected.size} geselecteerd</span>
          <button onClick={() => setSelected(new Set())} className="text-xs text-[#B8997A] hover:text-white transition-colors">Wissen</button>
          <button
            onClick={downloadSelected}
            disabled={downloading}
            className="flex items-center gap-2 bg-[#E8A040] hover:bg-[#d4922e] text-stone-900 text-sm font-bold px-4 py-1.5 rounded-xl transition-all disabled:opacity-50"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            PDF's downloaden
          </button>
        </div>
      )}
    </div>
  )
}

// ── Reusable event list ────────────────────────────────────────────────────────
function EventList({ events, selected, onToggle, showDate = false }: {
  events: EventRow[]
  selected: Set<string>
  onToggle: (id: string) => void
  showDate?: boolean
}) {
  return (
    <div className="space-y-2">
      {events.map(ev => {
        const isSelected = selected.has(ev.id)
        return (
          <div key={ev.id} className={`flex items-stretch gap-2 transition-all ${selected.size > 0 && !isSelected ? 'opacity-60' : ''}`}>
            {/* Checkbox */}
            {ev.dish_count > 0 && (
              <button onClick={() => onToggle(ev.id)} className="shrink-0 flex items-center justify-center w-10 rounded-xl border border-[#E8D5B5] bg-white hover:border-[#E8A040]/50 transition-all">
                {isSelected ? <CheckSquare className="w-4 h-4 text-[#E8A040]" /> : <Square className="w-4 h-4 text-[#B8997A]" />}
              </button>
            )}
            <Link
              href={`/mep/${ev.id}`}
              className="flex-1 bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-4 hover:border-[#E8A040]/50 hover:bg-[#FEF9F2] transition-all group"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h4 className="font-semibold text-[#2C1810] group-hover:text-[#E8A040] transition-colors truncate">
                    {showDate && (
                      <span className="text-[#B8997A] font-normal mr-2 text-sm">
                        {new Date(ev.event_date + 'T12:00:00').toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    {ev.name}
                  </h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[#B8997A] flex-wrap">
                    {!showDate && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(ev.event_date + 'T12:00:00').toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                    )}
                    {ev.num_persons && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ev.num_persons} pax</span>}
                    {ev.location && <span className="flex items-center gap-1 truncate max-w-[160px]"><MapPin className="w-3 h-3 shrink-0" />{ev.location}</span>}
                    {ev.event_type && <span className="text-[#9E7E60]">{eventTypeLabels[ev.event_type] || ev.event_type}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:flex items-center gap-1 text-xs text-[#9E7E60]">
                    <ChefHat className="w-3 h-3" />{ev.dish_count}
                  </span>
                  <MepBadge mepStatus={ev.mep_status} hasDishes={ev.dish_count > 0} />
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-[#E8A040]/10 border border-[#E8A040]/30 text-[#C4703A] text-xs font-medium rounded-lg">
                    <Eye className="w-3 h-3" /> Bekijken
                  </span>
                  {ev.dish_count > 0 && (
                    <a href={`/api/mep/pdf/${ev.id}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#F2E8D5] border border-[#E8D5B5] text-[#9E7E60] hover:text-[#2C1810] text-xs font-medium rounded-lg transition-all">
                      <FileText className="w-3 h-3" /> PDF
                    </a>
                  )}
                </div>
              </div>
            </Link>
          </div>
        )
      })}
    </div>
  )
}

function EmptyWeek({ week, allEvents, onJumpToWeek }: { week: number; allEvents: EventRow[]; onJumpToWeek: (w: number, y: number) => void }) {
  const today = new Date().toISOString().split('T')[0]
  const upcoming = allEvents.filter(e => e.event_date >= today).slice(0, 4)
  return (
    <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-10 text-center">
      <CalendarDays className="w-10 h-10 text-[#9E7E60] mx-auto mb-3" />
      <h3 className="text-base font-semibold text-[#5C4730] mb-2">Geen events in week {week}</h3>
      {upcoming.length > 0 && (
        <div className="mt-4 space-y-2 max-w-xs mx-auto">
          <p className="text-xs text-[#B8997A] uppercase tracking-wider mb-2">Volgende events:</p>
          {upcoming.map((ev, i) => {
            const d = new Date(ev.event_date + 'T12:00:00')
            const w = getWeekNumber(d)
            return (
              <button key={i} onClick={() => onJumpToWeek(w, d.getFullYear())}
                className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg bg-[#FDF8F2]/80 border border-[#E8D5B5] hover:border-[#E8A040]/50 transition-all group">
                <CalendarDays className="w-4 h-4 text-[#E8A040]" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#5C4730] group-hover:text-[#2C1810] truncate">{ev.name}</div>
                  <div className="text-xs text-[#B8997A]">{d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long' })} — Week {w}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#5C4730] group-hover:text-[#E8A040] shrink-0" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
