'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useKitchen } from '@/providers/kitchen-provider'
import { useGoogleIntegration } from '@/hooks/use-google-integration'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CalendarDays, ChevronLeft, ChevronRight, RefreshCw,
  MapPin, Users, Clock, ExternalLink, X, Link, Check,
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, addMonths, subMonths,
  startOfWeek, endOfWeek, parseISO,
} from 'date-fns'
import { nl } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEventRow {
  id: string
  google_event_id: string
  google_calendar_id: string
  calendar_name: string | null
  title: string
  description: string | null
  location: string | null
  start_time: string | null
  end_time: string | null
  is_all_day: boolean
  event_status: string | null
  guest_count: number | null
  event_type: string | null
  html_link: string | null
  meet_link: string | null
  attendees: Array<{ email: string; displayName?: string }> | null
}

interface AppEventRow {
  id: string
  name: string
  event_date: string
  status: string | null
  num_persons: number | null
  location: string | null
  google_calendar_event_id: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEventColor(event: CalendarEventRow): { bg: string; text: string; border: string } {
  if (event.event_type === 'confirmed_booking') {
    return { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' }
  }
  if (event.event_type === 'option') {
    return { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/30' }
  }
  if (event.guest_count && event.guest_count > 0) {
    return { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' }
  }
  const title = event.title.toLowerCase()
  if (title.includes('tasting') || title.includes('degustatie') || title.includes('proef')) {
    return { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' }
  }
  return { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' }
}

// ─── ConnectCTA ───────────────────────────────────────────────────────────────

function ConnectCTA({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="bg-[#FDFAF6]/80 border-[#E8D5B5] max-w-md w-full">
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mx-auto">
            <CalendarDays className="w-8 h-8 text-[#9E7E60]" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-[#2C1810] mb-2">
              Google Calendar koppelen
            </h2>
            <p className="text-[#9E7E60] text-sm leading-relaxed">
              Synchroniseer je Google Calendar om al je events, boekingen en afspraken
              rechtstreeks in je keukenplanning te zien.
            </p>
          </div>
          <Button
            onClick={onConnect}
            className="bg-brand-600 hover:bg-brand-700 text-[#2C1810] w-full"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Koppel Google Account
          </Button>
          <p className="text-[#B8997A] text-xs">
            We vragen enkel leestoegang tot je agenda. Je gegevens blijven privaat.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── LinkModal ────────────────────────────────────────────────────────────────

interface LinkModalProps {
  calEvent: CalendarEventRow
  appEvent: AppEventRow
  onCancel: () => void
  onConfirm: (options: { location: boolean; numPersons: boolean }) => Promise<void>
}

function LinkModal({ calEvent, appEvent, onCancel, onConfirm }: LinkModalProps) {
  const [copyLocation, setCopyLocation] = useState(
    !!(calEvent.location && !appEvent.location)
  )
  const [copyPersons, setCopyPersons] = useState(
    !!(calEvent.guest_count && !appEvent.num_persons)
  )
  const [saving, setSaving] = useState(false)

  const handleConfirm = async () => {
    setSaving(true)
    await onConfirm({ location: copyLocation, numPersons: copyPersons })
    setSaving(false)
  }

  const hasExtraData = (calEvent.location && !appEvent.location) || (calEvent.guest_count && !appEvent.num_persons)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-[#FDFAF6] border border-[#E8D5B5] rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-5">
        {/* Title */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-[#2C1810] flex items-center gap-2">
            <Link className="w-5 h-5 text-amber-500" />
            Koppelen?
          </h2>
          <button onClick={onCancel} className="text-[#B8997A] hover:text-[#5C4730] p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Google Calendar event */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">~</span>
            <span className="text-sm font-medium text-[#2C1810] truncate">{calEvent.title}</span>
          </div>
          {calEvent.start_time && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700">
              <Clock className="w-3 h-3" />
              {calEvent.is_all_day
                ? format(parseISO(calEvent.start_time), 'd MMM yyyy', { locale: nl })
                : format(parseISO(calEvent.start_time), 'd MMM HH:mm', { locale: nl })}
            </div>
          )}
          {calEvent.location && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{calEvent.location}</span>
            </div>
          )}
          {calEvent.guest_count && calEvent.guest_count > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700">
              <Users className="w-3 h-3" />
              {calEvent.guest_count} personen
            </div>
          )}
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center text-[#B8997A]">
          <div className="flex flex-col items-center gap-1">
            <div className="w-px h-4 bg-[#E8D5B5]" />
            <Link className="w-4 h-4 text-amber-500" />
            <div className="w-px h-4 bg-[#E8D5B5]" />
          </div>
        </div>

        {/* App event */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-1">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-green-600" />
            <span className="text-sm font-medium text-[#2C1810] truncate">{appEvent.name}</span>
          </div>
          {appEvent.event_date && (
            <div className="flex items-center gap-1.5 text-xs text-green-700">
              <Clock className="w-3 h-3" />
              {format(parseISO(appEvent.event_date), 'd MMM yyyy', { locale: nl })}
            </div>
          )}
          {appEvent.location && (
            <div className="flex items-center gap-1.5 text-xs text-green-700">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{appEvent.location}</span>
            </div>
          )}
          {appEvent.num_persons && appEvent.num_persons > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-green-700">
              <Users className="w-3 h-3" />
              {appEvent.num_persons} personen
            </div>
          )}
        </div>

        {/* Extra data checkboxes */}
        {hasExtraData && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-medium text-[#9E7E60]">Extra data overnemen?</p>
            {calEvent.location && !appEvent.location && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyLocation}
                  onChange={e => setCopyLocation(e.target.checked)}
                  className="rounded border-amber-300 text-amber-500 focus:ring-amber-400"
                />
                <span className="text-sm text-[#2C1810]">
                  <MapPin className="w-3 h-3 inline mr-1 text-amber-500" />
                  Locatie: <span className="text-[#5C4730]">{calEvent.location}</span>
                </span>
              </label>
            )}
            {calEvent.guest_count && !appEvent.num_persons && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyPersons}
                  onChange={e => setCopyPersons(e.target.checked)}
                  className="rounded border-amber-300 text-amber-500 focus:ring-amber-400"
                />
                <span className="text-sm text-[#2C1810]">
                  <Users className="w-3 h-3 inline mr-1 text-amber-500" />
                  Personen: <span className="text-[#5C4730]">{calEvent.guest_count}</span>
                </span>
              </label>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-[#E8D5B5] text-[#5C4730] hover:bg-white"
            disabled={saving}
          >
            Annuleren
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <Check className="w-4 h-4 mr-1.5" />
            )}
            Koppelen
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-2">
      <Check className="w-4 h-4" />
      {message}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { kitchenId } = useKitchen()
  const { connected, loading: integrationLoading, connect, syncing, syncCalendar } = useGoogleIntegration()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calEvents, setCalEvents] = useState<CalendarEventRow[]>([])
  const [appEvents, setAppEvents] = useState<AppEventRow[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  // Drag state
  const [draggedCalEvent, setDraggedCalEvent] = useState<CalendarEventRow | null>(null)
  const [draggedAppEvent, setDraggedAppEvent] = useState<AppEventRow | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // Modal & toast
  const [linkModal, setLinkModal] = useState<{ calEvent: CalendarEventRow; appEvent: AppEventRow } | null>(null)
  const [linkedCalEventIds, setLinkedCalEventIds] = useState<string[]>([])
  const [toast, setToast] = useState<string | null>(null)

  const supabase = createClient()

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchEvents = useCallback(async () => {
    if (!kitchenId || !connected) return
    setLoadingEvents(true)
    try {
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)

      const [calResult, appResult] = await Promise.all([
        supabase
          .from('calendar_events')
          .select('*')
          .eq('kitchen_id', kitchenId)
          .gte('start_time', monthStart.toISOString())
          .lte('start_time', monthEnd.toISOString())
          .order('start_time', { ascending: true }),

        supabase
          .from('events')
          .select('id, name, event_date, status, num_persons, location, google_calendar_event_id')
          .eq('kitchen_id', kitchenId)
          .gte('event_date', monthStart.toISOString())
          .lte('event_date', monthEnd.toISOString()),
      ])

      if (!calResult.error && calResult.data) setCalEvents(calResult.data)
      if (!appResult.error && appResult.data) setAppEvents(appResult.data)
    } catch (err) {
      console.error('Error fetching events:', err)
    } finally {
      setLoadingEvents(false)
    }
  }, [kitchenId, connected, currentMonth, supabase])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const handleSync = async () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    await syncCalendar(monthStart.toISOString(), monthEnd.toISOString())
    await fetchEvents()
  }

  // ── Calendar grid ──────────────────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  // Set of google_event_ids already linked to an app event
  const linkedGoogleIds = useMemo(() => {
    const ids = new Set<string>()
    for (const ae of appEvents) {
      if (ae.google_calendar_event_id) ids.add(ae.google_calendar_event_id)
    }
    // Also include locally-tracked linked ids
    for (const id of linkedCalEventIds) ids.add(id)
    return ids
  }, [appEvents, linkedCalEventIds])

  const calEventsByDay = useMemo(() => {
    const map: Record<string, CalendarEventRow[]> = {}
    for (const ev of calEvents) {
      if (!ev.start_time) continue
      if (linkedGoogleIds.has(ev.google_event_id)) continue // already linked, hide it
      const dayKey = format(parseISO(ev.start_time), 'yyyy-MM-dd')
      if (!map[dayKey]) map[dayKey] = []
      map[dayKey].push(ev)
    }
    return map
  }, [calEvents, linkedGoogleIds])

  const appEventsByDay = useMemo(() => {
    const map: Record<string, AppEventRow[]> = {}
    for (const ev of appEvents) {
      if (!ev.event_date) continue
      const dayKey = format(parseISO(ev.event_date), 'yyyy-MM-dd')
      if (!map[dayKey]) map[dayKey] = []
      map[dayKey].push(ev)
    }
    return map
  }, [appEvents])

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handleCalEventDragStart = (e: React.DragEvent, calEvent: CalendarEventRow) => {
    e.dataTransfer.effectAllowed = 'link'
    setDraggedCalEvent(calEvent)
    setDraggedAppEvent(null)
  }

  const handleAppEventDragStart = (e: React.DragEvent, appEvent: AppEventRow) => {
    e.dataTransfer.effectAllowed = 'link'
    setDraggedAppEvent(appEvent)
    setDraggedCalEvent(null)
  }

  const handleAppEventDragOver = (e: React.DragEvent, appEventId: string) => {
    if (draggedCalEvent) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'link'
      setDragOverId(`app-${appEventId}`)
    }
  }

  const handleCalEventDragOver = (e: React.DragEvent, calEventId: string) => {
    if (draggedAppEvent) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'link'
      setDragOverId(`cal-${calEventId}`)
    }
  }

  const handleAppEventDrop = (e: React.DragEvent, appEvent: AppEventRow) => {
    e.preventDefault()
    setDragOverId(null)
    if (draggedCalEvent) {
      setLinkModal({ calEvent: draggedCalEvent, appEvent })
      setDraggedCalEvent(null)
    }
  }

  const handleCalEventDrop = (e: React.DragEvent, calEvent: CalendarEventRow) => {
    e.preventDefault()
    setDragOverId(null)
    if (draggedAppEvent) {
      setLinkModal({ calEvent, appEvent: draggedAppEvent })
      setDraggedAppEvent(null)
    }
  }

  const handleDragEnd = () => {
    setDraggedCalEvent(null)
    setDraggedAppEvent(null)
    setDragOverId(null)
  }

  // ── Link handler ───────────────────────────────────────────────────────────

  const handleLink = async (options: { location: boolean; numPersons: boolean }) => {
    if (!linkModal) return
    const body: Record<string, unknown> = {
      google_calendar_event_id: linkModal.calEvent.google_event_id,
    }
    if (options.location && linkModal.calEvent.location && !linkModal.appEvent.location) {
      body.location = linkModal.calEvent.location
    }
    if (options.numPersons && linkModal.calEvent.guest_count && !linkModal.appEvent.num_persons) {
      body.num_persons = linkModal.calEvent.guest_count
    }

    const res = await fetch(`/api/events/${linkModal.appEvent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      setAppEvents(prev =>
        prev.map(e =>
          e.id === linkModal.appEvent.id ? { ...e, ...body } : e
        )
      )
      setLinkedCalEventIds(prev => [...prev, linkModal.calEvent.google_event_id])
      setLinkModal(null)
      setToast('Succesvol gekoppeld!')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (integrationLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-[#2C1810]">Kalender</h1>
          <p className="text-[#9E7E60] mt-1">Laden...</p>
        </div>
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-[#2C1810]">Kalender</h1>
          <p className="text-[#9E7E60] mt-1">Synchroniseer je Google Calendar met je keukenplanning</p>
        </div>
        <ConnectCTA onConnect={connect} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-[#2C1810]">Kalender</h1>
          <p className="text-[#9E7E60] mt-1">
            {format(currentMonth, 'MMMM yyyy', { locale: nl })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="border-[#E8D5B5] text-[#5C4730] hover:bg-white"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchroniseren...' : 'Sync'}
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-[#9E7E60]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-amber-100 border border-amber-300" />
          Google Calendar (ongelinkt)
        </span>
        <span className="flex items-center gap-1.5">
          <Check className="w-3 h-3 text-green-600" />
          App event
        </span>
        <span className="flex items-center gap-1.5">
          <Link className="w-3 h-3 text-green-600" />
          Gekoppeld
        </span>
        <span className="ml-auto text-[#B8997A] italic">Sleep kaartjes naar elkaar om te koppelen</span>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth(m => subMonths(m, 1))}
          className="p-2 text-[#9E7E60] hover:text-[#3D2810] hover:bg-white rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentMonth(new Date())}
          className="text-sm text-[#9E7E60] hover:text-[#3D2810] px-3 py-1.5 rounded-lg hover:bg-white transition-colors"
        >
          Vandaag
        </button>
        <button
          onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          className="p-2 text-[#9E7E60] hover:text-[#3D2810] hover:bg-white rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar grid */}
      <div>
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-[#B8997A] py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px bg-[#FDF8F2]/80 rounded-xl overflow-hidden border border-[#E8D5B5]">
          {calendarDays.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd')
            const dayCal = calEventsByDay[dayKey] || []
            const dayApp = appEventsByDay[dayKey] || []
            const inMonth = isSameMonth(day, currentMonth)
            const today = isToday(day)

            return (
              <div
                key={dayKey}
                className={`
                  min-h-[110px] p-1.5 bg-white/90 transition-colors
                  ${!inMonth ? 'opacity-30' : ''}
                  ${today ? 'ring-1 ring-inset ring-brand-500/40' : ''}
                `}
              >
                {/* Day number */}
                <div className={`
                  text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                  ${today ? 'bg-brand-600 text-[#2C1810]' : 'text-[#9E7E60]'}
                `}>
                  {format(day, 'd')}
                </div>

                <div className="space-y-0.5">
                  {/* App events */}
                  {dayApp.map(appEvent => {
                    const isLinked = !!appEvent.google_calendar_event_id
                    const isDragOver = dragOverId === `app-${appEvent.id}`
                    return (
                      <div
                        key={`app-${appEvent.id}`}
                        draggable={true}
                        onDragStart={e => handleAppEventDragStart(e, appEvent)}
                        onDragOver={e => handleAppEventDragOver(e, appEvent.id)}
                        onDrop={e => handleAppEventDrop(e, appEvent)}
                        onDragEnd={handleDragEnd}
                        title={`${appEvent.name}${draggedCalEvent ? ' — laat los om te koppelen' : ''}`}
                        className={`
                          w-full text-left text-[10px] leading-tight px-1.5 py-0.5 rounded
                          flex items-center gap-1 cursor-grab select-none
                          transition-all
                          ${isLinked
                            ? 'bg-green-50 border border-green-200 text-green-700'
                            : 'bg-green-50/70 border border-green-100 text-green-800'}
                          ${isDragOver ? 'ring-2 ring-amber-400 bg-amber-50/60 border-amber-300' : ''}
                          ${draggedAppEvent?.id === appEvent.id ? 'opacity-50' : ''}
                        `}
                      >
                        {isLinked
                          ? <Link className="w-2.5 h-2.5 shrink-0 text-green-600" />
                          : <Check className="w-2.5 h-2.5 shrink-0 text-green-600" />}
                        <span className="truncate">{appEvent.name}</span>
                      </div>
                    )
                  })}

                  {/* Google Calendar events (unlinked) */}
                  {dayCal.map(calEvent => {
                    const colors = getEventColor(calEvent)
                    const isDragOver = dragOverId === `cal-${calEvent.id}`
                    return (
                      <div
                        key={`cal-${calEvent.id}`}
                        draggable={true}
                        onDragStart={e => handleCalEventDragStart(e, calEvent)}
                        onDragOver={e => handleCalEventDragOver(e, calEvent.id)}
                        onDrop={e => handleCalEventDrop(e, calEvent)}
                        onDragEnd={handleDragEnd}
                        title={`${calEvent.title}${draggedAppEvent ? ' — laat los om te koppelen' : ''}`}
                        className={`
                          w-full text-left text-[10px] leading-tight px-1.5 py-0.5 rounded
                          flex items-center gap-1 cursor-grab select-none
                          transition-all
                          bg-amber-50 border border-amber-200 text-amber-800
                          ${isDragOver ? 'ring-2 ring-green-400 bg-green-50/60 border-green-300' : ''}
                          ${draggedCalEvent?.id === calEvent.id ? 'opacity-50' : ''}
                        `}
                      >
                        <span className="font-bold text-amber-500 shrink-0">~</span>
                        {!calEvent.is_all_day && calEvent.start_time && (
                          <span className="font-mono opacity-70 shrink-0">
                            {format(parseISO(calEvent.start_time), 'HH:mm')}{' '}
                          </span>
                        )}
                        <span className="truncate">{calEvent.title}</span>
                        {calEvent.guest_count ? ` (${calEvent.guest_count}p)` : ''}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Loading */}
      {loadingEvents && (
        <div className="text-center text-[#B8997A] text-sm py-4">
          Events laden...
        </div>
      )}

      {/* Link modal */}
      {linkModal && (
        <LinkModal
          calEvent={linkModal.calEvent}
          appEvent={linkModal.appEvent}
          onCancel={() => setLinkModal(null)}
          onConfirm={handleLink}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
