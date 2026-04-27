'use client'

import { useEffect, useState } from 'react'
import {
  CalendarDays,
  Clock,
  MapPin,
  ExternalLink,
  RefreshCw,
  Link2,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

interface CalendarEvent {
  id: string
  title: string
  description: string | null
  location: string | null
  start: string | null
  end: string | null
  isAllDay: boolean
  status: string
  link: string
}

interface CalendarData {
  connected: boolean
  email?: string
  events?: CalendarEvent[]
  error?: string
}

function formatEventTime(start: string | null, end: string | null, isAllDay: boolean): string {
  if (!start) return ''
  if (isAllDay) {
    return new Date(start).toLocaleDateString('nl-BE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }
  const startDate = new Date(start)
  const endDate = end ? new Date(end) : null
  const dateStr = startDate.toLocaleDateString('nl-BE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const startTime = startDate.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })
  const endTime = endDate ? endDate.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }) : ''
  return `${dateStr} ${startTime}${endTime ? ` - ${endTime}` : ''}`
}

export function CalendarWidget() {
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCalendar = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/calendar/events')
      const json = await res.json()
      setData(json)
    } catch {
      setData({ connected: false, error: 'Kon agenda niet laden' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCalendar()
  }, [])

  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-display font-semibold text-stone-900">Google Agenda</h3>
          </div>
        </div>
        <div className="px-6 pb-5 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="skeleton w-10 h-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton w-40 h-4 rounded" />
                <div className="skeleton w-28 h-3 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Not connected state
  if (!data?.connected) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-semibold text-stone-900 text-sm">Google Agenda</h3>
            <p className="text-xs text-[#9E7E60] mt-0.5">
              Koppel je Google account om je agenda hier te zien
            </p>
          </div>
          <Link
            href="/settings/integrations"
            className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <Link2 className="w-3 h-3" />
            Koppel je agenda
          </Link>
        </div>
      </div>
    )
  }

  const events = data.events || []

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-stone-900">Google Agenda</h3>
            {data.email && (
              <p className="text-[11px] text-[#9E7E60]">{data.email}</p>
            )}
          </div>
        </div>
        <button
          onClick={fetchCalendar}
          className="text-[#5C4730] hover:text-[#B8997A] transition-colors"
          title="Vernieuw"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {events.length === 0 ? (
        <div className="px-6 pb-6 text-center">
          <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CalendarDays className="w-5 h-5 text-[#5C4730]" />
          </div>
          <p className="text-sm text-[#9E7E60]">Geen komende afspraken</p>
        </div>
      ) : (
        <div className="divide-y divide-stone-100">
          {events.slice(0, 8).map((event) => {
            const startDate = event.start ? new Date(event.start) : null
            const isToday = startDate
              ? startDate.toDateString() === new Date().toDateString()
              : false

            return (
              <a
                key={event.id}
                href={event.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 px-6 py-3 hover:bg-stone-50/80 transition-all group"
              >
                {/* Time indicator */}
                <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 ${isToday ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-[#B8997A]'}`}>
                  {startDate && (
                    <>
                      <span className="text-[10px] uppercase leading-none font-medium">
                        {startDate.toLocaleDateString('nl-BE', { month: 'short' })}
                      </span>
                      <span className="text-sm font-bold leading-none mt-0.5">
                        {startDate.getDate()}
                      </span>
                    </>
                  )}
                </div>
                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-700 group-hover:text-blue-700 transition-colors truncate">
                    {event.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[#9E7E60] mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{formatEventTime(event.start, event.end, event.isAllDay)}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-xs text-[#9E7E60] mt-0.5">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                </div>
                <ExternalLink className="w-3 h-3 text-[#5C4730] group-hover:text-blue-500 shrink-0 mt-1 transition-colors" />
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
