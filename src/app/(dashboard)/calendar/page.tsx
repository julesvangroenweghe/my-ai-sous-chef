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
  MapPin, Users, Clock, ExternalLink, X,
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isVandaag, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'

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

function getEventTypeLabel(event: CalendarEventRow): string | null {
  if (event.event_type === 'confirmed_booking') return 'Bevestigd'
  if (event.event_type === 'option') return 'Optie'
  if (event.guest_count && event.guest_count > 0) return 'Catering'
  return null
}

function ConnectCTA({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="bg-stone-900/50 border-stone-800 max-w-md w-full">
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-stone-800 flex items-center justify-center mx-auto">
            <CalendarDays className="w-8 h-8 text-stone-400" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-stone-100 mb-2">
              Google Calendar koppelen
            </h2>
            <p className="text-stone-400 text-sm leading-relaxed">
              Synchroniseer je Google Calendar om al je events, boekingen en afspraken
              rechtstreeks in je keukenplanning te zien.
            </p>
          </div>
          <Button
            onClick={onConnect}
            className="bg-brand-600 hover:bg-brand-700 text-white w-full"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Koppel Google Account
          </Button>
          <p className="text-stone-500 text-xs">
            We vragen enkel leestoegang tot je agenda. Je gegevens blijven privaat.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function EventDetail({ event, onClose }: { event: CalendarEventRow; onClose: () => void }) {
  const colors = getEventColor(event)
  const typeLabel = getEventTypeLabel(event)
  
  return (
    <Card className="bg-stone-900/70 border-stone-700 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-stone-100 text-lg leading-tight">{event.title}</CardTitle>
            {typeLabel && (
              <Badge className={`mt-2 ${colors.bg} ${colors.text} border ${colors.border}`}>
                {typeLabel}
              </Badge>
            )}
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 p-1 -mt-1 -mr-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {event.start_time && (
          <div className="flex items-center gap-2 text-stone-400">
            <Clock className="w-4 h-4 shrink-0" />
            <span>
              {event.is_all_day
                ? format(parseISO(event.start_time), 'd MMMM yyyy', { locale: nl })
                : `${format(parseISO(event.start_time), 'd MMM HH:mm', { locale: nl })}${event.end_time ? ` - ${format(parseISO(event.end_time), 'HH:mm')}` : ''}`
              }
            </span>
          </div>
        )}
        {event.location && (
          <div className="flex items-center gap-2 text-stone-400">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}
        {event.guest_count && event.guest_count > 0 && (
          <div className="flex items-center gap-2 text-stone-400">
            <Users className="w-4 h-4 shrink-0" />
            <span>{event.guest_count} personen</span>
          </div>
        )}
        {event.description && (
          <div className="pt-2 border-t border-stone-800">
            <p className="text-stone-400 text-xs whitespace-pre-wrap line-clamp-4">{event.description}</p>
          </div>
        )}
        {event.calendar_name && (
          <div className="pt-2 border-t border-stone-800">
            <span className="text-stone-500 text-xs">Agenda: {event.calendar_name}</span>
          </div>
        )}
        <div className="flex items-center gap-2 pt-1">
          {event.html_link && (
            <a
              href={event.html_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300"
            >
              <ExternalLink className="w-3 h-3" />
              Open in Google
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function CalendarPage() {
  const { kitchenId } = useKitchen()
  const { connected, loading: integrationLoading, connect, syncing, syncCalendar } = useGoogleIntegration()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<CalendarEventRow[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventRow | null>(null)
  const supabase = createClient()

  const fetchEvents = useCallback(async () => {
    if (!kitchenId || !connected) return
    setLoadingEvents(true)
    try {
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)
      
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('kitchen_id', kitchenId)
        .gte('start_time', monthStart.toISOString())
        .lte('start_time', monthEnd.toISOString())
        .order('start_time', { ascending: true })

      if (!error && data) {
        setEvents(data)
      }
    } catch (err) {
      console.error('Error fetching events:', err)
    } finally {
      setLoadingEvents(false)
    }
  }, [kitchenId, connected, currentMonth, supabase])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleSync = async () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    await syncCalendar(monthStart.toISOString(), monthEnd.toISOString())
    await fetchEvents()
  }

  // Calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEventRow[]> = {}
    for (const event of events) {
      if (!event.start_time) continue
      const dayKey = format(parseISO(event.start_time), 'yyyy-MM-dd')
      if (!map[dayKey]) map[dayKey] = []
      map[dayKey].push(event)
    }
    return map
  }, [events])

  if (integrationLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-100">Kalender</h1>
          <p className="text-stone-400 mt-1">Laden...</p>
        </div>
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-100">Kalender</h1>
          <p className="text-stone-400 mt-1">Synchroniseer je Google Calendar met je keukenplanning</p>
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
          <h1 className="text-2xl font-display font-bold text-stone-100">Kalender</h1>
          <p className="text-stone-400 mt-1">
            {format(currentMonth, 'MMMM yyyy', { locale: nl })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="border-stone-700 text-stone-300 hover:bg-stone-800"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchroniseren...' : 'Sync'}
          </Button>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth(m => subMonths(m, 1))}
          className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentMonth(new Date())}
          className="text-sm text-stone-400 hover:text-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-800 transition-colors"
        >
          Vandaag
        </button>
        <button
          onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="flex gap-6">
        {/* Calendar grid */}
        <div className="flex-1">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-stone-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-px bg-stone-800/50 rounded-xl overflow-hidden border border-stone-800">
            {calendarDays.map(day => {
              const dayKey = format(day, 'yyyy-MM-dd')
              const dayEvents = eventsByDay[dayKey] || []
              const inMonth = isSameMonth(day, currentMonth)
              const today = isVandaag(day)
              
              return (
                <div
                  key={dayKey}
                  className={`
                    min-h-[100px] p-1.5 bg-stone-900/80 transition-colors
                    ${!inMonth ? 'opacity-30' : ''}
                    ${today ? 'ring-1 ring-inset ring-brand-500/40' : ''}
                  `}
                >
                  <div className={`
                    text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                    ${today ? 'bg-brand-600 text-white' : 'text-stone-400'}
                  `}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(event => {
                      const colors = getEventColor(event)
                      return (
                        <button
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className={`
                            w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded
                            truncate ${colors.bg} ${colors.text} hover:opacity-80 transition-opacity
                          `}
                          title={event.title}
                        >
                          {!event.is_all_day && event.start_time && (
                            <span className="font-mono opacity-70">
                              {format(parseISO(event.start_time), 'HH:mm')}{' '}
                            </span>
                          )}
                          {event.title}
                          {event.guest_count ? ` (${event.guest_count}p)` : ''}
                        </button>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-stone-500 px-1">
                        +{dayEvents.length - 3} meer
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Event detail panel */}
        {selectedEvent && (
          <div className="w-80 shrink-0">
            <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {loadingEvents && (
        <div className="text-center text-stone-500 text-sm py-4">
          Events laden...
        </div>
      )}
    </div>
  )
}
