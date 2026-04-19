'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useKitchen } from '@/providers/kitchen-provider'
import { CalendarDays, MapPin, Users, Clock, Euro, ArrowLeft, Save, FileText } from 'lucide-react'
import Link from 'next/link'

const eventTypes = [
  { value: 'walking_dinner', label: 'Walking Dinner', emoji: '🍽️' },
  { value: 'buffet', label: 'Buffet', emoji: '🍱' },
  { value: 'sit_down', label: 'Sit-down Dinner', emoji: '🪑' },
  { value: 'cocktail', label: 'Cocktail', emoji: '🍸' },
  { value: 'brunch', label: 'Brunch', emoji: '🥐' },
  { value: 'tasting', label: 'Tasting Menu', emoji: '🥄' },
  { value: 'daily_service', label: 'Dagdienst', emoji: '📅' },
]

export default function NewEventPage() {
  const router = useRouter()
  const { kitchenId } = useKitchen()
  const supabase = createClient()
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  const [form, setForm] = useState({
    name: '',
    event_date: '',
    event_type: 'walking_dinner',
    num_persons: '',
    price_per_person: '',
    location: '',
    contact_person: '',
    departure_time: '',
    arrival_time: '',
    notes: '',
    status: 'draft',
  })

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kitchenId) { setError('Geen keuken gevonden'); return }
    if (!form.name.trim()) { setError('Geef een naam op'); return }
    if (!form.event_date) { setError('Kies een datum'); return }
    
    setSaving(true)
    setError('')

    const { data, error: insertError } = await supabase
      .from('events')
      .insert({
        kitchen_id: kitchenId,
        name: form.name.trim(),
        event_date: form.event_date,
        event_type: form.event_type,
        num_persons: form.num_persons ? Number(form.num_persons) : null,
        price_per_person: form.price_per_person ? Number(form.price_per_person) : null,
        location: form.location || null,
        contact_person: form.contact_person || null,
        departure_time: form.departure_time || null,
        arrival_time: form.arrival_time || null,
        notes: form.notes || null,
        status: form.status,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    router.push(`/events/${data.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/events" className="p-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-400 hover:text-white transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-100">Nieuw Event</h1>
          <p className="text-stone-400 mt-0.5 text-sm">Plan een event en genereer automatisch je MEP</p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-medium text-stone-400 uppercase tracking-wider flex items-center gap-2">
            <CalendarDays className="w-4 h-4" /> Basis Info
          </h2>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-300">Event Naam *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="bv. Huwelijk De Smedt - Van Hoeck"
              className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-300">Datum *</label>
              <input
                type="date"
                value={form.event_date}
                onChange={(e) => updateField('event_date', e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-300">Type</label>
              <select
                value={form.event_type}
                onChange={(e) => updateField('event_type', e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              >
                {eventTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Aantal Personen
              </label>
              <input
                type="number"
                value={form.num_persons}
                onChange={(e) => updateField('num_persons', e.target.value)}
                placeholder="bv. 80"
                className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                min={1}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-300 flex items-center gap-1.5">
                <Euro className="w-3.5 h-3.5" /> Prijs per Persoon
              </label>
              <input
                type="number"
                value={form.price_per_person}
                onChange={(e) => updateField('price_per_person', e.target.value)}
                placeholder="bv. 85"
                className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                min={0}
                step="0.01"
              />
            </div>
          </div>
        </div>

        {/* Location & Contact */}
        <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-medium text-stone-400 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Locatie & Contact
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-300">Locatie</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="bv. Kasteel van Laarne"
                className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-300">Contactpersoon</label>
              <input
                type="text"
                value={form.contact_person}
                onChange={(e) => updateField('contact_person', e.target.value)}
                placeholder="bv. Marie De Smedt"
                className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Vertrektijd
              </label>
              <input
                type="time"
                value={form.departure_time}
                onChange={(e) => updateField('departure_time', e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Aankomsttijd
              </label>
              <input
                type="time"
                value={form.arrival_time}
                onChange={(e) => updateField('arrival_time', e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-medium text-stone-400 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4" /> Extra
          </h2>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-300">Notities</label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Dieetwensen, allergieën, speciale verzoeken..."
              rows={3}
              className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-300">Status</label>
            <select
              value={form.status}
              onChange={(e) => updateField('status', e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            >
              <option value="draft">📝 Concept</option>
              <option value="confirmed">✅ Bevestigd</option>
            </select>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 text-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Opslaan...' : 'Event Aanmaken'}
          </button>
          <Link href="/events" className="px-6 py-3 text-stone-400 hover:text-white text-sm transition-colors">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  )
}
