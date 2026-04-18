'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Users, FileText, ChevronRight } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { Event } from '@/types/database'

interface EventCardProps {
  event: Event
  onGenerateMep?: (id: string) => void
}

const statusColors: Record<string, 'warning' | 'success' | 'secondary' | 'destructive' | 'default'> = {
  draft: 'warning',
  confirmed: 'success',
  in_prep: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
}

const typeColors: Record<string, string> = {
  walking_dinner: 'bg-purple-100 text-purple-800',
  buffet: 'bg-blue-100 text-blue-800',
  sit_down: 'bg-emerald-100 text-emerald-800',
  cocktail: 'bg-pink-100 text-pink-800',
  brunch: 'bg-amber-100 text-amber-800',
  daily_service: 'bg-gray-100 text-gray-800',
  tasting: 'bg-rose-100 text-rose-800',
}

export function EventCard({ event, onGenerateMep }: EventCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Date badge */}
          <div className="bg-primary/10 text-primary rounded-xl p-3 text-center shrink-0 min-w-[56px]">
            <div className="text-xs font-medium uppercase">
              {new Date(event.event_date).toLocaleDateString('nl-BE', { month: 'short' })}
            </div>
            <div className="text-xl font-bold leading-tight">
              {new Date(event.event_date).getDate()}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/events/${event.id}`} className="hover:underline">
                <h3 className="font-semibold text-base truncate">{event.name}</h3>
              </Link>
              <Badge variant={statusColors[event.status] || 'secondary'} className="capitalize">
                {event.status.replace('_', ' ')}
              </Badge>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[event.event_type] || 'bg-gray-100 text-gray-700'}`}>
                {event.event_type.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(event.event_date)}
              </span>
              {event.num_persons && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {event.num_persons} pax
                </span>
              )}
              {event.price_per_person && (
                <span className="font-medium text-foreground">
                  {formatCurrency(event.price_per_person)}/pp
                </span>
              )}
              {event.location && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.location}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {onGenerateMep && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.preventDefault()
                  onGenerateMep(event.id)
                }}
              >
                <FileText className="h-3.5 w-3.5" />
                MEP
              </Button>
            )}
            <Link href={`/events/${event.id}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
