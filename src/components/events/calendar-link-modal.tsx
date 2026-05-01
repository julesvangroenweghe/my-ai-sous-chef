'use client'

import { useEffect, useState } from 'react'
import { X, Calendar, MapPin, Link2, Loader2, AlertTriangle, ExternalLink, Search } from 'lucide-react'

interface CalendarEvent {
  id: string
  summary: string
  start: string
  end: string
  location?: string
  htmlLink: string
  isAllDay: boolean
}

interface CalendarLinkModalProps {
  eventId: string
  currentCalendarEventId?: string | null
  onLinked: (calEvent: CalendarEvent | null) => void
  onClose: () => void
}

export default function CalendarLinkModal({ eventId, currentCalendarEventId, onLinked, onClose }: CalendarLinkModalProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsAuth, setNeedsAuth] = useState(false)
  const [search, setSearch] = useState('')
  const [linking, setLinking] = useState<string | null>(null)
  const [unlinking, setUnlinking] = useState(false)

  useEffect(() => {
    fetch('/api/calendar/events')
      .then(r => r.json())
      .then(data => {
        if (data.needsAuth) { setNeedsAuth(true); setLoading(false); return }
        if (data.error) { setError(data.error); setLoading(false); return }
        setEvents(data.events || [])
        setLoading(false)
      })
      .catch(() => { setError('Laden mislukt'); setLoading(false) })
  }, [])

  const formatDate = (dateStr: string, isAllDay: boolean) => {
    const date = new Date(dateStr)
    if (isAllDay) {
      return date.toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'long' })
    }
    return date.toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
  }

  const handleLink = async (calEvent: CalendarEvent) => {
    setLinking(calEvent.id)
    const res = await fetch(`/api/events/${eventId}/link-calendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        calendarEventId: calEvent.id,
        summary: calEvent.summary,
        htmlLink: calEvent.htmlLink,
      })
    })
    if (res.ok) {
      onLinked(calEvent)
      onClose()
    }
    setLinking(null)
  }

  const handleUnlink = async () => {
    setUnlinking(true)
    const res = await fetch(`/api/events/${eventId}/link-calendar`, { method: 'DELETE' })
    if (res.ok) {
      onLinked(null)
      onClose()
    }
    setUnlinking(false)
  }

  const filtered = events.filter(e =>
    e.summary.toLowerCase().includes(search.toLowerCase()) ||
    (e.location || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-[#FDF8F2] border border-[#E8D5B5] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8D5B5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FEF3E2] border border-[#E8D5B5] flex items-center justify-center">
              <Calendar className="w-4 h-4 text-[#E8A040]" />
            </div>
            <div>
              <h2 className="font-display font-bold text-[#2C1810]">Koppel aan Google Agenda</h2>
              <p className="text-xs text-[#9E7E60]">Selecteer een agenda-item om te koppelen</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F2E8D5] text-[#9E7E60] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current link */}
        {currentCalendarEventId && (
          <div className="px-6 py-3 border-b border-[#E8D5B5] bg-[#FEF3E2] flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Link2 className="w-3.5 h-3.5 text-[#E8A040]" />
              <span className="text-[#2C1810] font-medium">Momenteel gekoppeld</span>
            </div>
            <button
              onClick={handleUnlink}
              disabled={unlinking}
              className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
            >
              {unlinking ? 'Bezig...' : 'Ontkoppelen'}
            </button>
          </div>
        )}

        {/* Search */}
        {!loading && !needsAuth && !error && (
          <div className="px-6 py-3 border-b border-[#E8D5B5]">
            <div className="flex items-center gap-2 bg-white border border-[#E8D5B5] rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-[#9E7E60] shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Zoek agenda-items..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-[#2C1810] placeholder-[#B8997A] outline-none"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-[#E8A040] animate-spin" />
            </div>
          )}
          
          {needsAuth && (
            <div className="text-center py-10">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <p className="text-[#2C1810] font-semibold mb-2">Google account niet gekoppeld</p>
              <p className="text-[#9E7E60] text-sm mb-4">Verbind je Google account om agenda-items te koppelen.</p>
              <a href="/instellingen/integraties" className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8A040] text-[#2C1810] rounded-xl font-medium text-sm">
                Verbinden in Instellingen
              </a>
            </div>
          )}
          
          {error && !needsAuth && (
            <div className="text-center py-8">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}
          
          {!loading && !needsAuth && !error && filtered.length === 0 && (
            <div className="text-center py-8">
              <p className="text-[#9E7E60] text-sm">
                {search ? 'Geen items gevonden voor deze zoekopdracht.' : 'Geen komende agenda-items gevonden.'}
              </p>
            </div>
          )}
          
          {filtered.map(calEvent => (
            <button
              key={calEvent.id}
              onClick={() => handleLink(calEvent)}
              disabled={linking === calEvent.id}
              className={`w-full text-left p-4 rounded-xl border transition-all group ${
                currentCalendarEventId === calEvent.id
                  ? 'border-[#E8A040] bg-[#FEF3E2]'
                  : 'border-[#E8D5B5] bg-white hover:border-[#E8A040] hover:bg-[#FEF3E2]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {currentCalendarEventId === calEvent.id && (
                      <Link2 className="w-3.5 h-3.5 text-[#E8A040] shrink-0" />
                    )}
                    <span className="font-medium text-[#2C1810] text-sm truncate">{calEvent.summary}</span>
                  </div>
                  <div className="text-xs text-[#9E7E60] flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(calEvent.start, calEvent.isAllDay)}
                    </span>
                    {calEvent.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3" />
                        {calEvent.location}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {linking === calEvent.id ? (
                    <Loader2 className="w-4 h-4 text-[#E8A040] animate-spin" />
                  ) : currentCalendarEventId === calEvent.id ? (
                    <span className="text-[10px] font-semibold text-[#E8A040] bg-[#FEF3E2] border border-[#E8A040]/30 px-2 py-0.5 rounded-full">Gekoppeld</span>
                  ) : (
                    <span className="text-[10px] font-medium text-[#9E7E60] group-hover:text-[#E8A040] transition-colors">Koppelen</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
