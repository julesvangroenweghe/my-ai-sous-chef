'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MenuBuilder } from '@/components/events/menu-builder'
import { Loader2, Save } from 'lucide-react'
import type { Recipe } from '@/types/database'

const EVENT_TYPES = ['walking_dinner', 'buffet', 'sit_down', 'cocktail', 'brunch', 'daily_service', 'tasting']

export function EventForm() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [name, setName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventType, setEventType] = useState('daily_service')
  const [numPersons, setNumPersons] = useState('')
  const [pricePerPerson, setPricePerPerson] = useState('')
  const [location, setLocation] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [arrivalTime, setArrivalTime] = useState('')
  const [notes, setNotes] = useState('')
  const [menuItems, setMenuItems] = useState<Array<{ recipe_id: string; course_order: number }>>([])

  useEffect(() => {
    supabase
      .from('recipes')
      .select('*')
      .eq('status', 'active')
      .order('name')
      .then(({ data }) => { if (data) setRecipes(data as Recipe[]) })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: membership } = await supabase
        .from('kitchen_members')
        .select('kitchen_id')
        .limit(1)
        .single()

      const { data: event, error } = await supabase
        .from('events')
        .insert({
          name,
          event_date: eventDate,
          event_type: eventType,
          num_persons: numPersons ? Number(numPersons) : null,
          price_per_person: pricePerPerson ? Number(pricePerPerson) : null,
          location: location || null,
          contact_person: contactPerson || null,
          departure_time: departureTime || null,
          arrival_time: arrivalTime || null,
          notes: notes || null,
          kitchen_id: membership?.kitchen_id,
        })
        .select()
        .single()

      if (error) throw error

      if (menuItems.length > 0) {
        await supabase.from('event_menu_items').insert(
          menuItems.map((item) => ({ event_id: event.id, ...item }))
        )
      }

      router.push(`/events/${event.id}`)
    } catch (err) {
      console.error('Failed to create event:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Event Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Event Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wedding Van Hove" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input id="date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="persons">Number of Persons</Label>
              <Input id="persons" type="number" value={numPersons} onChange={(e) => setNumPersons(e.target.value)} placeholder="e.g. 80" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price per Person (€)</Label>
              <Input id="price" type="number" step="0.01" value={pricePerPerson} onChange={(e) => setPricePerPerson(e.target.value)} placeholder="e.g. 85.00" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Logistics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Kasteel den Brandt" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Contact Person</Label>
              <Input id="contact" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="e.g. Jan Janssens" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departure">Departure Time</Label>
              <Input id="departure" type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrival">Arrival Time</Label>
              <Input id="arrival" type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Additional notes..."
            />
          </div>
        </CardContent>
      </Card>

      <MenuBuilder recipes={recipes} menuItems={menuItems} onChange={setMenuItems} />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading || !name || !eventDate} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Event
        </Button>
      </div>
    </form>
  )
}
