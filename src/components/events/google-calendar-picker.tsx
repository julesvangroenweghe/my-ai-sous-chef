'use client'

import { useState, useEffect } from 'react'
import { Calendar, Loader2, AlertCircle, ExternalLink, Check } from 'lucide-react'

interface CalendarEvent {
  id: string
  summary: string
  start: string
  end: string
  location?: string
  description?: string
  htmlLink: string
}

interface Props {
  onSelect: (event: CalendarEvent) => void
  selectedId?: string
}

export default function GoogleCalendarPicker({ onSelect, selectedId }: Props) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsReauth, setNeedsReauth] = useState(false)

  useEffect(() => {
    fetch('/api/calendar/google/events')
      .then(r => r.json())
      .then(data => {
        if (data.error === 'needs_reauth') {
          setNeedsReauth(true)
        } else if (data.events) {
          setEvents(data.events)
        } else {
          setError(data.message || 'Kon agenda niet laden')
        }
      })
      .catch(() => setError('Verbindingsfout'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-[#9E7E60] py-4">
      <Loader2 className="w-4 h-4 animate-spin" />
      Agenda laden...
    </div>
  )

  if (needsReauth) return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2 text-amber-700 text-sm font-medium">
        <AlertCircle className="w-4 h-4" />
        Google account niet verbonden
      </div>
      <p className="text-xs text-amber-600">
        Verbind je Google account in de instellingen om agenda-events te kunnen importeren.
      </p>
      <a
        href="/instellingen/integraties"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-800"
      >
        Verbinden <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  )

  if (error) return (
    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
      <AlertCircle className="w-4 h-4" />
      {error}
    </div>
  )

  if (events.length === 0) return (
    <p className="text-sm text-[#9E7E60] py-4 text-center">
      Geen aankomende events in je agenda
    </p>
  )

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {events.map(event => {
        const isSelected = selectedId === event.id
        const startDate = new Date(event.start)
        return (
          <button
            key={event.id}
            onClick={() => onSelect(event)}
            className={`w-full text-left p-3 rounded-xl border transition-all ${
              isSelected
                ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400'
                : 'bg-white border-[#E8D5B5] hover:border-amber-300 hover:bg-amber-50/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex flex-col items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-amber-700 uppercase leading-none">
                  {startDate.toLocaleDateString('nl-BE', { month: 'short' })}
                </span>
                <span className="text-sm font-bold text-amber-700 leading-none">
                  {startDate.getDate()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#2C1810] truncate">{event.summary}</p>
                {event.location && (
                  <p className="text-xs text-[#9E7E60] truncate mt-0.5">{event.location}</p>
                )}
              </div>
              {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
            </div>
          </button>
        )
      })}
    </div>
  )
}
