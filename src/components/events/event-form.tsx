'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Save, ArrowLeft, ArrowRight } from 'lucide-react'
import { useEvents } from '@/hooks/use-events'
import { MenuBuilder } from '@/components/events/menu-builder'
import { EVENT_TYPES, EVENT_STATUSES } from '@/types/mep'
import type { EventFormData, MenuItemFormData } from '@/types/mep'
import type { Event } from '@/types/database'

interface EventFormProps {
  initialData?: Event
  mode?: 'create' | 'edit'
}

export function EventForm({ initialData, mode = 'create' }: EventFormProps) {
  const router = useRouter()
  const { createEvent, updateEvent, loading } = useEvents()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<EventFormData>({
    name: initialData?.name || '',
    event_date: initialData?.event_date || '',
    event_type: (initialData?.event_type as EventFormData['event_type']) || 'daily_service',
    num_persons: initialData?.num_persons || null,
    price_per_person: initialData?.price_per_person || null,
    location: initialData?.location || '',
    contact_person: initialData?.contact_person || '',
    departure_time: initialData?.departure_time || '',
    arrival_time: initialData?.arrival_time || '',
    notes: initialData?.notes || '',
    status: (initialData?.status as EventFormData['status']) || 'draft',
  })
  const [menuItems, setMenuItems] = useState<MenuItemFormData[]>(
    initialData?.menu_items?.map((mi, i) => ({
      recipe_id: mi.recipe_id,
      course_category: 'Main Course',
      sort_order: mi.course_order || i + 1,
    })) || []
  )

  const updateField = (field: keyof EventFormData, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (mode === 'edit' && initialData) {
      const result = await updateEvent(initialData.id, formData)
      if (result.success) {
        router.push(`/events/${initialData.id}`)
      }
    } else {
      const result = await createEvent(formData, menuItems)
      if (result.success && result.id) {
        router.push(`/events/${result.id}`)
      }
    }
  }

  const canProceed = formData.name && formData.event_date

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[
          { n: 1, label: 'Event Details' },
          { n: 2, label: 'Build Menu' },
          { n: 3, label: 'Review' },
        ].map(({ n, label }) => (
          <button
            key={n}
            onClick={() => n <= step && setStep(n)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              step === n
                ? 'bg-primary text-primary-foreground'
                : step > n
                ? 'bg-primary/20 text-primary cursor-pointer'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
              {n}
            </span>
            {label}
          </button>
        ))}
      </div>

      {/* Step 1: Event Details */}
      {step === 1 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name">Event Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="e.g. Wedding Van Hove — Walking Dinner"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => updateField('event_date', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.event_type}
                    onChange={(e) => updateField('event_type', e.target.value)}
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="persons">Number of Persons</Label>
                  <Input
                    id="persons"
                    type="number"
                    value={formData.num_persons || ''}
                    onChange={(e) => updateField('num_persons', e.target.value ? Number(e.target.value) : null)}
                    placeholder="e.g. 80"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price per Person (€)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price_per_person || ''}
                    onChange={(e) => updateField('price_per_person', e.target.value ? Number(e.target.value) : null)}
                    placeholder="e.g. 85.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onChange={(e) => updateField('status', e.target.value)}
                >
                  {EVENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    placeholder="e.g. Kasteel den Brandt"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact">Contact Person</Label>
                  <Input
                    id="contact"
                    value={formData.contact_person}
                    onChange={(e) => updateField('contact_person', e.target.value)}
                    placeholder="e.g. Jan Janssens"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departure">Departure Time</Label>
                  <Input
                    id="departure"
                    type="time"
                    value={formData.departure_time}
                    onChange={(e) => updateField('departure_time', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arrival">Kitchen Arrival</Label>
                  <Input
                    id="arrival"
                    type="time"
                    value={formData.arrival_time}
                    onChange={(e) => updateField('arrival_time', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Dietary requirements, special requests, logistics notes..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              disabled={!canProceed}
              onClick={() => setStep(2)}
              className="gap-2"
            >
              Next: Build Menu
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Step 2: Menu Builder */}
      {step === 2 && (
        <>
          <MenuBuilder menuItems={menuItems} onChange={setMenuItems} />
          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep(3)} className="gap-2">
              Next: Review
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Review Event</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>{' '}
                  <span className="font-medium">{formData.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>{' '}
                  <span className="font-medium">{formData.event_date}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>{' '}
                  <span className="font-medium capitalize">{formData.event_type.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Persons:</span>{' '}
                  <span className="font-medium">{formData.num_persons || '—'}</span>
                </div>
                {formData.price_per_person && (
                  <div>
                    <span className="text-muted-foreground">Price/pp:</span>{' '}
                    <span className="font-medium">€{formData.price_per_person}</span>
                  </div>
                )}
                {formData.location && (
                  <div>
                    <span className="text-muted-foreground">Location:</span>{' '}
                    <span className="font-medium">{formData.location}</span>
                  </div>
                )}
                {formData.departure_time && (
                  <div>
                    <span className="text-muted-foreground">Departure:</span>{' '}
                    <span className="font-medium">{formData.departure_time}</span>
                  </div>
                )}
                {formData.arrival_time && (
                  <div>
                    <span className="text-muted-foreground">Kitchen Arrival:</span>{' '}
                    <span className="font-medium">{formData.arrival_time}</span>
                  </div>
                )}
              </div>

              {menuItems.length > 0 && (
                <div className="pt-3 border-t">
                  <h4 className="text-sm font-semibold mb-2">Menu ({menuItems.length} dishes)</h4>
                  <div className="space-y-1">
                    {menuItems.map((item, i) => (
                      <div key={i} className="text-sm flex items-center gap-2">
                        <span className="bg-muted rounded px-2 py-0.5 text-xs font-medium">
                          #{item.sort_order}
                        </span>
                        <span className="text-xs text-muted-foreground">{item.course_category}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.notes && (
                <div className="pt-3 border-t">
                  <h4 className="text-sm font-semibold mb-1">Notes</h4>
                  <p className="text-sm text-muted-foreground">{formData.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !canProceed}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {mode === 'edit' ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
