'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MepView } from '@/components/events/mep-view'
import { MepShoppingList } from '@/components/events/mep-shopping-list'
import {
  ArrowLeft,
  Edit,
  FileText,
  ShoppingCart,
  Info,
  Loader2,
  RefreshCw,
  MapPin,
  Users,
  Clock,
  Phone,
  Truck,
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useEvents } from '@/hooks/use-events'
import { useMep } from '@/hooks/use-mep'
import type { Event } from '@/types/database'
import type { MepPlanGenerated } from '@/types/mep'

type TabId = 'details' | 'mep' | 'shopping'

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getEvent, loading: evLoading } = useEvents()
  const { generateMep, loading: mepLoading } = useMep()

  const [event, setEvent] = useState<Event | null>(null)
  const [mepPlan, setMepPlan] = useState<MepPlanGenerated | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>(
    (searchParams.get('tab') as TabId) || 'details'
  )
  const [initialLoad, setInitialLoad] = useState(true)

  const loadEvent = useCallback(async () => {
    const data = await getEvent(id)
    if (data) setEvent(data)
    setInitialLoad(false)
  }, [id])

  useEffect(() => {
    loadEvent()
  }, [loadEvent])

  // Auto-generate MEP if requested via URL
  useEffect(() => {
    if (searchParams.get('generate') === 'true' && event && !mepPlan) {
      handleGenerateMep()
    }
  }, [event])

  const handleGenerateMep = async () => {
    const plan = await generateMep(id)
    if (plan) {
      setMepPlan(plan)
      setActiveTab('mep')
    }
  }

  if (initialLoad) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Event not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/events')}>
          Back to Events
        </Button>
      </div>
    )
  }

  const statusColors: Record<string, 'warning' | 'success' | 'secondary' | 'destructive' | 'default'> = {
    draft: 'warning',
    confirmed: 'success',
    in_prep: 'default',
    completed: 'secondary',
    cancelled: 'destructive',
  }

  const menuItemCount = event.menu_items?.length || 0

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'details', label: 'Details', icon: <Info className="h-4 w-4" /> },
    { id: 'mep', label: 'MEP Plan', icon: <FileText className="h-4 w-4" /> },
    { id: 'shopping', label: 'Shopping List', icon: <ShoppingCart className="h-4 w-4" /> },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/events')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant={statusColors[event.status] || 'secondary'} className="capitalize">
              {event.status.replace(/_/g, ' ')}
            </Badge>
            <span className="text-sm text-muted-foreground">{formatDate(event.event_date)}</span>
            <Badge variant="outline" className="capitalize">
              {event.event_type.replace(/_/g, ' ')}
            </Badge>
            {menuItemCount > 0 && (
              <span className="text-sm text-muted-foreground">
                · {menuItemCount} dish{menuItemCount !== 1 ? 'es' : ''}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => router.push(`/events/new`)} // TODO: edit page
        >
          <Edit className="h-4 w-4" /> Edit
        </Button>
        <Button
          className="gap-2"
          onClick={handleGenerateMep}
          disabled={mepLoading || menuItemCount === 0}
        >
          {mepLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mepPlan ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          {mepPlan ? 'Regenerate MEP' : 'Generate MEP'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'mep' && mepPlan && (
              <span className="w-2 h-2 rounded-full bg-green-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'details' && (
        <div className="space-y-4">
          {/* Info cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {event.num_persons && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Persons</p>
                    <p className="font-semibold">{event.num_persons} pax</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {event.price_per_person && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <span className="text-lg text-muted-foreground">€</span>
                  <div>
                    <p className="text-xs text-muted-foreground">Price/pp</p>
                    <p className="font-semibold">{formatCurrency(event.price_per_person)}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {event.location && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-semibold text-sm">{event.location}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {event.contact_person && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="font-semibold text-sm">{event.contact_person}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Logistics */}
          {(event.departure_time || event.arrival_time) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Logistics</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-6">
                {event.departure_time && (
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Departure:</strong> {event.departure_time}
                    </span>
                  </div>
                )}
                {event.arrival_time && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Kitchen Arrival:</strong> {event.arrival_time}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dietary flags */}
          {event.dietary_flags && event.dietary_flags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dietary Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {event.dietary_flags.map((df) => (
                    <div key={df.id} className="flex items-center gap-2">
                      <Badge variant="outline">🟧 {df.flag_name}</Badge>
                      {df.guest_name && (
                        <span className="text-sm text-muted-foreground">— {df.guest_name}</span>
                      )}
                      {df.notes && (
                        <span className="text-sm text-muted-foreground">({df.notes})</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Menu items preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Menu Items ({menuItemCount})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {!event.menu_items || event.menu_items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No dishes added yet. Edit the event to build a menu.
                </p>
              ) : (
                <div className="space-y-2">
                  {[...event.menu_items]
                    .sort((a, b) => a.course_order - b.course_order)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                      >
                        <div className="bg-muted rounded px-2 py-0.5 text-xs font-medium">
                          #{item.course_order}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">
                            {item.recipe?.name || 'Unknown recipe'}
                          </span>
                          {item.recipe?.category?.name && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {item.recipe.category.name}
                            </span>
                          )}
                        </div>
                        {item.recipe?.total_cost_per_serving != null && (
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(item.recipe.total_cost_per_serving)}/pp
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {event.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{event.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'mep' && (
        <MepView event={event} mepPlan={mepPlan} />
      )}

      {activeTab === 'shopping' && (
        mepPlan ? (
          <MepShoppingList mepPlan={mepPlan} guestCount={event.num_persons || 1} />
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No MEP generated yet</p>
              <p className="text-sm mt-1">Generate a MEP plan first to see the shopping list.</p>
              <Button
                className="mt-4 gap-2"
                onClick={handleGenerateMep}
                disabled={mepLoading || menuItemCount === 0}
              >
                {mepLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Generate MEP
              </Button>
            </CardContent>
          </Card>
        )
      )}
    </div>
  )
}
