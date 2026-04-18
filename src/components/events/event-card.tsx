import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Users } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Event } from '@/types/database'

interface EventCardProps {
  event: Event
}

const statusColor = {
  draft: 'warning' as const,
  confirmed: 'success' as const,
  completed: 'secondary' as const,
  cancelled: 'destructive' as const,
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link href={`/events/${event.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{event.name}</h3>
              <Badge variant={statusColor[event.status]} className="shrink-0">{event.status}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span>{formatDate(event.event_date)}</span>
              <Badge variant="outline" className="text-xs capitalize">{event.event_type.replace('_', ' ')}</Badge>
              {event.num_persons && (
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{event.num_persons} pax</span>
              )}
              {event.location && (
                <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{event.location}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
