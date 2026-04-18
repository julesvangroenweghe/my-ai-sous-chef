'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, Calendar as CalIcon, List, Grid3X3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { EventCard } from '@/components/events/event-card'
import { useEvents } from '@/hooks/use-events'
import { EVENT_TYPES, EVENT_STATUSES } from '@/types/mep'
import type { Event } from '@/types/database'

export default function EventsPage() {
  const router = useRouter()
  const { getEvents, loading } = useEvents()
  const [events, setEvents] = useState<Event[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const loadEvents = useCallback(async () => {
    const data = await getEvents({
      search: search || undefined,
      status: statusFilter || undefined,
      event_type: typeFilter || undefined,
    })
    setEvents(data)
  }, [search, statusFilter, typeFilter])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const upcoming = events.filter((e) => new Date(e.event_date) >= now)
  const past = events.filter((e) => new Date(e.event_date) < now)

  const handleGenerateMep = (id: string) => {
    router.push(`/events/${id}?tab=mep&generate=true`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events & MEP</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {upcoming.length} upcoming event{upcoming.length !== 1 ? 's' : ''}
            {events.length > 0 && ` · ${events.length} total`}
          </p>
        </div>
        <Link href="/events/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Event
          </Button>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events..."
              className="pl-9"
            />
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1.5"
          >
            <Filter className="h-4 w-4" /> Filters
          </Button>
        </div>

        {showFilters && (
          <div className="flex items-center gap-3 flex-wrap">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-40"
            >
              <option value="">All statuses</option>
              {EVENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </Select>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-44"
            >
              <option value="">All types</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </Select>
            {(statusFilter || typeFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter('')
                  setTypeFilter('')
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Event list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16">
          <CalIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">
            {search || statusFilter || typeFilter
              ? 'No events match your filters'
              : 'No events yet'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {search || statusFilter || typeFilter
              ? 'Try adjusting your search or filters'
              : 'Create your first event to get started'}
          </p>
          {!search && !statusFilter && !typeFilter && (
            <Link href="/events/new">
              <Button className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> Create Event
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Upcoming ({upcoming.length})
              </h2>
              {upcoming.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onGenerateMep={handleGenerateMep}
                />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                Past ({past.length})
              </h2>
              {past.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
