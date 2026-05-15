// src/components/events/tasting-sessions-section.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Plus, CalendarDays, Users, Loader2, Link2, Unlink } from 'lucide-react'
import Link from 'next/link'

interface LinkedEvent {
  id: string
  name: string
  event_date: string
  num_persons: number | null
  status: string
  tasting_attended: boolean
  event_type: string
  location: string | null
}

interface AllEvent {
  id: string
  name: string
  event_date: string
  num_persons: number | null
  event_type: string
}

const statusColors: Record<string, string> = {
  draft: 'text-stone-500',
  confirmed: 'text-emerald-600',
  in_prep: 'text-amber-600',
  approved: 'text-emerald-500',
  completed: 'text-blue-500',
  cancelled: 'text-red-400',
}
const statusLabels: Record<string, string> = {
  draft: 'Concept', confirmed: 'Bevestigd', in_prep: 'In voorbereiding',
  approved: 'Goedgekeurd', completed: 'Afgerond', cancelled: 'Geannuleerd',
}

export function TastingSessionsSection({ tastingEventId }: { tastingEventId: string }) {
  const [links, setLinks] = useState<LinkedEvent[]>([])
  const [allEvents, setAllEvents] = useState<AllEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState('')
  const [linking, setLinking] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const supabase = createClient()

  const fetchLinks = useCallback(async () => {
    const res = await fetch(`/api/events/${tastingEventId}/tasting-links`)
    if (res.ok) {
      const data = await res.json()
      setLinks(data.links || [])
    }
    setLoading(false)
  }, [tastingEventId])

  const fetchAllEvents = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('id, name, event_date, num_persons, event_type')
      .neq('id', tastingEventId)
      .order('event_date', { ascending: true })
    setAllEvents(data || [])
  }, [tastingEventId])

  useEffect(() => {
    fetchLinks()
    fetchAllEvents()
  }, [fetchLinks, fetchAllEvents])

  const handleLink = async () => {
    if (!selectedEventId) return
    setLinking(true)
    const res = await fetch(`/api/events/${tastingEventId}/tasting-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ future_event_id: selectedEventId }),
    })
    if (res.ok) {
      await fetchLinks()
      setSelectedEventId('')
      setShowAddPanel(false)
    }
    setLinking(false)
  }

  const handleToggleAttended = async (eventId: string, currentAttended: boolean) => {
    setToggling(eventId)
    await fetch(`/api/events/${tastingEventId}/tasting-links`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, attended: !currentAttended }),
    })
    setLinks(prev => prev.map(e => e.id === eventId ? { ...e, tasting_attended: !currentAttended } : e))
    setToggling(null)
  }

  const handleUnlink = async (eventId: string) => {
    await fetch(`/api/events/${tastingEventId}/tasting-links`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId }),
    })
    setLinks(prev => prev.filter(e => e.id !== eventId))
  }

  // Filter out already linked events
  const availableEvents = allEvents.filter(e => !links.some(l => l.id === e.id))

  const attendedCount = links.filter(l => l.tasting_attended).length

  return (
    <div className="bg-white border border-[#E8D5B5] rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E8D5B5] flex items-center justify-between">
        <div>
          <h2 className="text-base font-display font-semibold text-[#2C1810] flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-500" />
            Tasting Sessies
          </h2>
          <p className="text-xs text-[#9E7E60] mt-0.5">
            Welke koppels / feesten komen proeven op deze avond?
          </p>
        </div>
        <div className="flex items-center gap-3">
          {links.length > 0 && (
            <span className="text-xs font-medium text-[#9E7E60] bg-[#F2E8D5] px-3 py-1 rounded-full">
              {attendedCount}/{links.length} aanwezig
            </span>
          )}
          <button
            onClick={() => setShowAddPanel(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 text-xs font-medium rounded-lg transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Koppel aan event
          </button>
        </div>
      </div>

      {/* Add panel */}
      {showAddPanel && (
        <div className="px-6 py-4 bg-violet-50 border-b border-violet-100 flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-semibold text-violet-700 uppercase tracking-wider">
              Toekomstig event koppelen
            </label>
            <select
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-violet-200 rounded-xl text-[#2C1810] text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition-all"
            >
              <option value="">Kies een event...</option>
              {availableEvents.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name} — {new Date(e.event_date + 'T12:00:00').toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {e.num_persons ? ` (${e.num_persons}p)` : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleLink}
            disabled={!selectedEventId || linking}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50"
          >
            {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            Koppelen
          </button>
          <button onClick={() => setShowAddPanel(false)} className="p-2.5 text-violet-400 hover:text-violet-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="px-6 py-8 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-[#9E7E60] animate-spin" />
        </div>
      ) : links.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <Users className="w-8 h-8 text-[#D4B896] mx-auto mb-3" />
          <p className="text-sm text-[#9E7E60] font-medium">Nog geen events gekoppeld</p>
          <p className="text-xs text-[#B8997A] mt-1">
            Voeg de toekomstige feesten toe die op deze tasting avond komen proeven.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#F0E8D8]">
          {links.map(event => {
            const date = new Date(event.event_date + 'T12:00:00')
            const isToggling = toggling === event.id
            return (
              <div key={event.id} className="px-5 py-4 flex items-center gap-4 hover:bg-[#FAF6EF] transition-colors">
                {/* Aanwezig toggle */}
                <button
                  onClick={() => handleToggleAttended(event.id, event.tasting_attended)}
                  disabled={isToggling}
                  title={event.tasting_attended ? 'Aanwezig — klik om te wijzigen' : 'Niet aanwezig — klik om te bevestigen'}
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                    event.tasting_attended
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-stone-300 bg-white text-stone-300 hover:border-emerald-400 hover:text-emerald-400'
                  } ${isToggling ? 'opacity-50' : ''}`}
                >
                  {isToggling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>

                {/* Event info */}
                <Link href={`/events/${event.id}`} className="flex-1 min-w-0 group">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#2C1810] group-hover:text-violet-700 transition-colors truncate">
                      {event.name}
                    </span>
                    <span className={`text-xs font-medium ${statusColors[event.status] || 'text-stone-500'}`}>
                      {statusLabels[event.status] || event.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-[#9E7E60]">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {date.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    {event.num_persons && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {event.num_persons} pers.
                      </span>
                    )}
                    {event.location && (
                      <span className="truncate">{event.location}</span>
                    )}
                  </div>
                </Link>

                {/* Unlink */}
                <button
                  onClick={() => handleUnlink(event.id)}
                  title="Ontkoppelen van deze tasting"
                  className="p-1.5 text-[#B8997A] hover:text-red-400 transition-colors shrink-0"
                >
                  <Unlink className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary */}
      {links.length > 0 && (
        <div className="px-6 py-3 bg-[#F5EDE0] border-t border-[#E8D5B5] flex items-center justify-between">
          <span className="text-xs text-[#9E7E60]">
            Totaal: {links.reduce((s, e) => s + (e.num_persons || 0), 0)} personen over {links.length} events
          </span>
          <span className="text-xs font-medium text-emerald-700">
            {attendedCount} bevestigd aanwezig
          </span>
        </div>
      )}
    </div>
  )
}
