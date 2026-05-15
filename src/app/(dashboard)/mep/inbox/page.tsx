'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Inbox, Loader2, AlertTriangle, ShieldCheck, ChefHat,
  CalendarDays, Users, MapPin, ArrowRight, X, Loader, Upload, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DraftEvent {
  id: string
  name: string
  event_date: string
  event_type: string | null
  num_persons: number | null
  location: string | null
  mep_status: string
  totalDishes: number
  aiDishes: number
  aiComponents: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('nl-BE', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00')
  const onejan = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7)
}

function getWeekRange(weekEvents: DraftEvent[]): string {
  const dates = weekEvents.map((e) => new Date(e.event_date + 'T12:00:00'))
  const min = new Date(Math.min(...dates.map((d) => d.getTime())))
  const max = new Date(Math.max(...dates.map((d) => d.getTime())))
  const fmtDay = (d: Date) => d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })
  return min.getTime() === max.getTime() ? fmtDay(min) : `${fmtDay(min)} – ${fmtDay(max)}`
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  walking_dinner: 'Walking Dinner',
  buffet: 'Buffet',
  sit_down: 'Diner aan tafel',
  seated_dinner: 'Diner aan tafel',
  cocktail: 'Cocktailreceptie',
  brunch: 'Brunch',
  tasting: 'Proeverijtje',
  daily_service: 'Dagdienst',
}

// ─── EventCard ────────────────────────────────────────────────────────────────

function EventCard({
  event,
  onApproveAll,
  onDelete,
}: {
  event: DraftEvent
  onApproveAll: (eventId: string) => Promise<void>
  onDelete: (eventId: string) => Promise<void>
}) {
  const [confirmingApprove, setConfirmingApprove] = useState(false)
  const [approving, setApproving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const totalAI = event.aiDishes + event.aiComponents
  const hasAI = totalAI > 0

  const handleApprove = async () => {
    setApproving(true)
    await onApproveAll(event.id)
    setApproving(false)
    setConfirmingApprove(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(event.id)
    setDeleting(false)
    setConfirmingDelete(false)
  }

  return (
    <div className={`bg-white/80 border rounded-2xl overflow-hidden transition-all hover:shadow-sm ${
      hasAI ? 'border-orange-200/80' : 'border-[#E8D5B5]'
    }`}>
      {/* Top bar */}
      <div className={`px-4 py-3 flex items-center justify-between gap-3 ${
        hasAI ? 'bg-orange-50/50' : 'bg-[#FDFAF6]/90'
      }`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/mep/${event.id}`}
              className="text-sm font-bold text-[#2C1810] truncate hover:text-[#E8A040] hover:underline underline-offset-2 transition-colors cursor-pointer"
            >
              {event.name}
            </Link>
            {hasAI && (
              <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md font-semibold border border-orange-200 shrink-0">
                {totalAI} AI
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-[#9E7E60] flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {formatDate(event.event_date)}
            </span>
            {event.num_persons && (
              <span className="text-xs text-[#9E7E60] flex items-center gap-1">
                <Users className="w-3 h-3" />
                {event.num_persons} pax
              </span>
            )}
            {event.location && (
              <span className="text-xs text-[#9E7E60] flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{event.location}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Approve button */}
          {confirmingApprove ? (
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1.5">
              <span className="text-xs text-emerald-700 font-medium">Zeker?</span>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded transition-all disabled:opacity-50"
              >
                {approving ? <Loader className="w-3 h-3 animate-spin" /> : 'Ja'}
              </button>
              <button onClick={() => setConfirmingApprove(false)} className="text-[#9E7E60] hover:text-[#3D2810] transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingApprove(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 rounded-xl transition-all font-semibold border border-emerald-500/20"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Goedkeuren
            </button>
          )}

          <Link
            href={`/mep/${event.id}`}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#9E7E60] hover:text-[#2C1810] hover:bg-[#F2E8D5] rounded-xl transition-all border border-[#E8D5B5]"
          >
            Bekijken
            <ArrowRight className="w-3 h-3" />
          </Link>

          {/* Delete button */}
          {confirmingDelete ? (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-2.5 py-1.5">
              <span className="text-xs text-red-700 font-medium">Wissen?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-all disabled:opacity-50"
              >
                {deleting ? <Loader className="w-3 h-3 animate-spin" /> : 'Ja'}
              </button>
              <button onClick={() => setConfirmingDelete(false)} className="text-red-400 hover:text-red-700 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="p-1.5 text-[#B8997A] hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-200"
              title="Verwijderen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Stats footer */}
      <div className="px-4 py-2 flex items-center gap-4 bg-[#FDFAF6]/40 border-t border-[#E8D5B5]/50">
        <span className="text-xs text-[#B8997A]">
          <span className="font-semibold text-[#5C4730]">{event.totalDishes}</span> gerechten
        </span>
        {event.aiDishes > 0 && (
          <span className="text-xs text-orange-500">
            <span className="font-semibold">{event.aiDishes}</span> AI-gerechten
          </span>
        )}
        {event.aiComponents > 0 && (
          <span className="text-xs text-orange-400">
            <span className="font-semibold">{event.aiComponents}</span> AI-componenten
          </span>
        )}
        {event.event_type && (
          <span className="text-xs text-[#B8997A] ml-auto">
            {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MepInboxPage() {
  const supabase = createClient()
  const [events, setEvents] = useState<DraftEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePdfImport = async (file: File) => {
    setImporting(true)
    setImportError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/mep/import-pdf', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import mislukt')
      toast.success(`✓ ${data.eventName} — ${data.numDishes} gerechten aangemaakt`)
      await loadDraftEvents()
    } catch (err: any) {
      setImportError(err.message)
      toast.error(err.message)
    } finally {
      setImporting(false)
    }
  }

  const loadDraftEvents = useCallback(async () => {
    setLoading(true)

    const { data: eventData, error } = await supabase
      .from('events')
      .select('id, name, event_date, event_type, num_persons, location, mep_status')
      .eq('mep_status', 'draft')
      .order('event_date')

    if (error || !eventData) {
      setLoading(false)
      return
    }

    if (eventData.length === 0) {
      setEvents([])
      setLoading(false)
      return
    }

    const eventIds = eventData.map((e: any) => e.id)

    const { data: dishData } = await supabase
      .from('mep_dishes')
      .select('id, event_id, is_ai_suggestion')
      .in('event_id', eventIds)

    const dishIds = (dishData || []).map((d: any) => d.id)

    let componentData: any[] = []
    if (dishIds.length > 0) {
      const { data: compData } = await supabase
        .from('mep_components')
        .select('id, dish_id, is_ai_suggestion')
        .in('dish_id', dishIds)
      componentData = compData || []
    }

    const dishesByEvent: Record<string, { total: number; ai: number }> = {}
    for (const d of dishData || []) {
      if (!dishesByEvent[d.event_id]) dishesByEvent[d.event_id] = { total: 0, ai: 0 }
      dishesByEvent[d.event_id].total++
      if (d.is_ai_suggestion) dishesByEvent[d.event_id].ai++
    }

    const dishEventMap: Record<string, string> = {}
    for (const d of dishData || []) {
      dishEventMap[d.id] = d.event_id
    }

    const aiCompByEvent: Record<string, number> = {}
    for (const c of componentData) {
      if (c.is_ai_suggestion) {
        const evId = dishEventMap[c.dish_id]
        if (evId) aiCompByEvent[evId] = (aiCompByEvent[evId] || 0) + 1
      }
    }

    setEvents(
      eventData.map((e: any) => ({
        id: e.id,
        name: e.name,
        event_date: e.event_date,
        event_type: e.event_type,
        num_persons: e.num_persons,
        location: e.location,
        mep_status: e.mep_status,
        totalDishes: dishesByEvent[e.id]?.total || 0,
        aiDishes: dishesByEvent[e.id]?.ai || 0,
        aiComponents: aiCompByEvent[e.id] || 0,
      }))
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    loadDraftEvents()
  }, [loadDraftEvents])

  const handleApproveAll = async (eventId: string) => {
    const res = await fetch(`/api/mep/approve/${eventId}`, { method: 'POST' })
    if (!res.ok) {
      toast.error('Goedkeuren mislukt')
      return
    }
    toast.success('Event goedgekeurd ✓ — staat nu in planning')
    setEvents((prev) => prev.filter((e) => e.id !== eventId))
  }

  const handleDeleteEvent = async (eventId: string) => {
    const res = await fetch(`/api/mep/events/${eventId}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Verwijderen mislukt')
      return
    }
    toast.success('Event verwijderd')
    setEvents((prev) => prev.filter((e) => e.id !== eventId))
  }

  const byWeek: Record<number, DraftEvent[]> = {}
  for (const ev of events) {
    const wk = getWeekNumber(ev.event_date)
    if (!byWeek[wk]) byWeek[wk] = []
    byWeek[wk].push(ev)
  }
  const sortedWeeks = Object.entries(byWeek)
    .map(([wk, evs]) => ({ week: Number(wk), events: evs }))
    .sort((a, b) => a.week - b.week)

  const totalAIPending = events.reduce((sum, e) => sum + e.aiDishes + e.aiComponents, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#E8A040] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-16">
      {/* PDF Upload */}
      <div
        className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
          importing
            ? 'border-amber-300 bg-amber-50/50 cursor-wait'
            : 'border-[#E8D5B5] hover:border-amber-300 hover:bg-[#FAF6EF]/60 bg-white/40'
        }`}
        onClick={() => !importing && fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file && !importing) handlePdfImport(file)
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handlePdfImport(file)
            e.target.value = ''
          }}
        />
        {importing ? (
          <div className="flex items-center justify-center gap-3 py-1">
            <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
            <div className="text-left">
              <p className="text-sm font-semibold text-[#2C1810]">Menu verwerken...</p>
              <p className="text-xs text-[#9E7E60]">AI analyseert het menu PDF</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 py-1">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-[#2C1810]">Sleep een menu PDF hierheen</p>
              <p className="text-xs text-[#9E7E60]">of klik om te bladeren — PDF, JPG, PNG</p>
            </div>
          </div>
        )}
        {importError && <p className="text-xs text-red-500 mt-2">{importError}</p>}
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-[#2C1810]">MEP Inbox</h1>
          <p className="text-[#9E7E60] text-sm mt-0.5">
            Concepten die wachten op review en goedkeuring
          </p>
        </div>
        {totalAIPending > 0 && (
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="text-sm text-orange-700 font-medium">
              {totalAIPending} AI-suggesties te reviewen
            </span>
          </div>
        )}
      </div>

      {events.length === 0 && (
        <div className="text-center py-20 bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-[#F2E8D5] flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-7 h-7 text-[#9E7E60]" />
          </div>
          <h3 className="font-display font-semibold text-[#5C4730] mb-2">Inbox is leeg</h3>
          <p className="text-[#B8997A] text-sm max-w-sm mx-auto">
            Alle concepten zijn goedgekeurd. Upload een nieuw menu PDF om een concept aan te maken.
          </p>
          <Link
            href="/mep"
            className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 bg-[#E8A040] hover:bg-[#d4922e] text-stone-900 text-sm font-semibold rounded-xl transition-all"
          >
            <ChefHat className="w-4 h-4" />
            Naar MEP Planning
          </Link>
        </div>
      )}

      {sortedWeeks.map(({ week, events: weekEvents }) => (
        <section key={week}>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#5C4730]">
                Week {week}
              </span>
              <span className="text-xs text-[#B8997A]">
                {getWeekRange(weekEvents)}
              </span>
            </div>
            <div className="flex-1 h-px bg-[#E8D5B5]" />
            <span className="text-xs text-[#B8997A] shrink-0">
              {weekEvents.length} event{weekEvents.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-3">
            {weekEvents.map((ev) => (
              <EventCard key={ev.id} event={ev} onApproveAll={handleApproveAll} onDelete={handleDeleteEvent} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
