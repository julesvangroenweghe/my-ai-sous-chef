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
} from 'lucide-react'

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
  const s = weekStart.toLocaleDateString('nl-BE', opts)
  const e = weekEnd.toLocaleDateString('nl-BE', opts)
  return `${s} – ${e}`
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })
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

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved') {
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
      {/* Checkbox */}
      <div className="shrink-0 w-5">
        {selected ? (
          <CheckSquare className="w-4 h-4 text-[#E8A040]" />
        ) : (
          <Square className="w-4 h-4 text-[#C4B09A] group-hover:text-[#9E7E60] transition-colors" />
        )}
      </div>

      {/* Date */}
      <div className="w-24 shrink-0">
        <p className="text-xs font-semibold text-[#2C1810]">{formatEventDate(event.event_date)}</p>
        {event.start_time && (
          <p className="text-xs text-[#9E7E60]">{event.start_time.slice(0, 5)}</p>
        )}
      </div>

      {/* Client + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/mep/${event.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-semibold text-[#2C1810] hover:text-[#E8A040] transition-colors"
          >
            {event.name}
          </Link>
          <StatusBadge status={event.status} />
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

      {/* Actions */}
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
  const approvedCount = group.events.filter((e) => e.status === 'approved').length
  const totalPax = group.events.reduce((sum, e) => sum + (e.num_persons || 0), 0)
  const weekEventIds = group.events.map((e) => e.id)
  const allWeekSelected = weekEventIds.every((id) => selectedIds.has(id))
  const someWeekSelected = weekEventIds.some((id) => selectedIds.has(id))

  function handleWeekCheckbox(e: React.MouseEvent) {
    e.stopPropagation()
    if (allWeekSelected) {
      onDeselectAll(weekEventIds)
    } else {
      onSelectAll(weekEventIds)
    }
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm border border-[#E8D5BC] rounded-2xl overflow-hidden shadow-sm mb-4">
      {/* Week header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FDF8F2]/60 transition-all"
      >
        <div className="flex items-center gap-3">
          {/* Week-level checkbox */}
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
            {/* Bullet list of event names */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
              {group.events.map((ev) => (
                <span key={ev.id} className="text-xs text-[#6B4E3D] flex items-center gap-1">
                  <span className="text-[#E8A040]">·</span>
                  {ev.name}
                  {ev.num_persons ? (
                    <span className="text-[#B8997A]">({ev.num_persons}p)</span>
                  ) : null}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#9E7E60]">
              {group.events.length} event{group.events.length !== 1 ? 's' : ''}
            </span>
            {totalPax > 0 && <span className="text-[#9E7E60]">· {totalPax} pers.</span>}
            {approvedCount > 0 && (
              <span className="text-emerald-600 font-medium">· {approvedCount} goedgekeurd</span>
            )}
          </div>
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-[#9E7E60]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#9E7E60]" />
          )}
        </div>
      </button>

      {/* Events list */}
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

export default function MepPlanningPage() {
  const [weeks, setWeeks] = useState<WeekGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDownloading, setBulkDownloading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: events, error } = await supabase
        .from('events')
        .select(
          'id, name, event_date, status, mep_status, num_persons, price_per_person, location, event_type, contact_person, start_time, end_time'
        )
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

      const weekMap = new Map<string, WeekGroup>()
      for (const ev of enriched) {
        const { week, year } = getWeekNumber(ev.event_date)
        const key = `${year}-${week}`
        if (!weekMap.has(key)) {
          weekMap.set(key, {
            weekNum: week,
            year,
            dateRange: getWeekDateRange(week, year),
            events: [],
          })
        }
        weekMap.get(key)!.events.push(ev)
      }

      const sorted = Array.from(weekMap.values()).sort((a, b) =>
        a.year !== b.year ? a.year - b.year : a.weekNum - b.weekNum
      )

      setWeeks(sorted)
      setLoading(false)
    }

    load()
  }, [])

  const allEventIds = weeks.flatMap((w) => w.events.map((e) => e.id))

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

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function selectAllEvents() {
    setSelectedIds(new Set(allEventIds))
  }

  async function downloadSelected() {
    if (selectedIds.size === 0) return
    setBulkDownloading(true)

    const ids = Array.from(selectedIds)
    let downloaded = 0

    for (const id of ids) {
      try {
        const ev = weeks.flatMap((w) => w.events).find((e) => e.id === id)
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
        // small delay between downloads
        await new Promise((r) => setTimeout(r, 400))
      } catch {
        // skip failed
      }
    }

    setBulkDownloading(false)
    if (downloaded > 0) clearSelection()
  }

  const totalEvents = weeks.reduce((s, w) => s + w.events.length, 0)
  const totalApproved = weeks.reduce(
    (s, w) => s + w.events.filter((e) => e.status === 'approved').length,
    0
  )
  const anySelected = selectedIds.size > 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2C1810]">Planning</h1>
          <p className="text-sm text-[#9E7E60] mt-0.5">
            Weekoverzicht · {totalEvents} events · {totalApproved} goedgekeurd
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={selectAllEvents}
            className="px-3 py-2 text-xs text-[#9E7E60] hover:text-[#2C1810] transition-colors border border-[#E8D5BC] rounded-xl hover:bg-[#F2E8D5]/40"
          >
            Alles selecteren
          </button>
          <Link
            href="/mep"
            className="px-3 py-2 text-sm text-[#9E7E60] hover:text-[#2C1810] transition-colors"
          >
            Overzicht
          </Link>
          <Link
            href="/mep/inbox"
            className="px-3 py-2 text-sm bg-[#E8A040]/20 text-[#6B4E3D] rounded-xl hover:bg-[#E8A040]/30 transition-all"
          >
            Inbox
          </Link>
        </div>
      </div>

      {/* Bulk selection toolbar */}
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
              title="Selectie wissen"
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
      ) : weeks.length === 0 ? (
        <div className="text-center py-20 text-[#9E7E60]">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Geen events gevonden</p>
        </div>
      ) : (
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
    </div>
  )
}
