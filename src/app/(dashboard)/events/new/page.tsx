'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useKitchen } from '@/providers/kitchen-provider'
import { CalendarDays, MapPin, Users, Clock, Euro, ArrowLeft, Save, FileText, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { MenuPdfParser } from '@/components/events/menu-pdf-parser'

const COURSE_ORDER: Record<string, number> = {
  'AMUSE': 0,
  'FINGERFOOD': 0,
  'FINGERBITES': 0,
  'HAPJES': 0,
  'VOORGERECHT': 1,
  'TUSSENGERECHT': 2,
  'WALKING DINNER': 3,
  'HOOFDGERECHT': 3,
  'KAAS': 4,
  'DESSERT': 5,
  'MIGNARDISES': 6,
  'HALFABRICAAT': 7,
}

const COURSE_LABELS: Record<number, string> = {
  0: 'Amuse',
  1: 'Voorgerecht',
  2: 'Tussengerecht',
  3: 'Hoofdgerecht',
  4: 'Kaas',
  5: 'Dessert',
  6: 'Mignardises',
}

const eventTypes = [
  { value: 'walking_dinner', label: 'Walking Dinner' },
  { value: 'buffet', label: 'Buffet' },
  { value: 'sit_down', label: 'Sit-down Dinner' },
  { value: 'cocktail', label: 'Cocktail' },
  { value: 'brunch', label: 'Brunch' },
  { value: 'tasting', label: 'Tasting Menu' },
  { value: 'daily_service', label: 'Dagdienst' },
]

interface ApprovedDish {
  name: string
  category: string
  description: string
  matched_recipe_id: string | null
  matched_recipe_name: string | null
  matched_legende_id: string | null
  matched_legende_name: string | null
  confidence: number
  approved: boolean
}

export default function NewEventPage() {
  const router = useRouter()
  const { kitchenId } = useKitchen()
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [parsedDishes, setParsedDishes] = useState<ApprovedDish[]>([])
  const [showParser, setShowParser] = useState(true)

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

  const handleEventInfoParsed = (info: {
    name: string | null
    date: string | null
    num_persons: number | null
    event_type: string | null
    location: string | null
    contact_person: string | null
    price_per_person: number | null
    notes: string | null
  }) => {
    setForm(prev => ({
      ...prev,
      name: info.name || prev.name,
      event_date: info.date || prev.event_date,
      event_type: info.event_type || prev.event_type,
      num_persons: info.num_persons ? String(info.num_persons) : prev.num_persons,
      price_per_person: info.price_per_person ? String(info.price_per_person) : prev.price_per_person,
      location: info.location || prev.location,
      contact_person: info.contact_person || prev.contact_person,
      notes: info.notes || prev.notes,
    }))
  }

  const handleDishesApproved = (dishes: ApprovedDish[]) => {
    setParsedDishes(dishes)
    setShowParser(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kitchenId) { setError('Geen keuken gevonden'); return }
    if (!form.name.trim()) { setError('Geef een naam op'); return }
    if (!form.event_date) { setError('Kies een datum'); return }

    setSaving(true)
    setError('')

    // Create the event
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

    // If we have approved dishes with matched recipes, add them as menu items
    if (parsedDishes.length > 0 && data) {
      const menuItems = parsedDishes
        .filter(d => d.matched_recipe_id)
        .map(d => ({
          event_id: data.id,
          recipe_id: d.matched_recipe_id!,
          course_order: COURSE_ORDER[d.category] ?? 3,
          course: COURSE_LABELS[COURSE_ORDER[d.category] ?? 3] || 'Hoofdgerecht',
        }))

      if (menuItems.length > 0) {
        await supabase.from('event_menu_items').insert(menuItems)
      }
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

      {/* PDF Upload Section */}
      <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-stone-400 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Menu Importeren
          </h2>
          {!showParser && parsedDishes.length > 0 && (
            <button
              type="button"
              onClick={() => setShowParser(true)}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              Opnieuw uploaden
            </button>
          )}
        </div>

        {showParser ? (
          <>
            <p className="text-xs text-stone-500">
              Upload een menu PDF of foto. AI analyseert het document en vult automatisch het formulier in.
            </p>
            <MenuPdfParser
              onEventInfoParsed={handleEventInfoParsed}
              onDishesApproved={handleDishesApproved}
              compact
            />
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <Sparkles className="w-4 h-4" />
            <span>{parsedDishes.length} gerechten geïmporteerd uit menu</span>
            {parsedDishes.filter(d => d.matched_recipe_id).length > 0 && (
              <span className="text-stone-500">
                ({parsedDishes.filter(d => d.matched_recipe_id).length} gekoppeld aan recepten)
              </span>
            )}
          </div>
        )}
      </div>

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
                  <option key={t.value} value={t.value}>{t.label}</option>
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
              <option value="draft">Concept</option>
              <option value="confirmed">Bevestigd</option>
            </select>
          </div>
        </div>

        {/* Imported Dishes Summary */}
        {parsedDishes.length > 0 && (
          <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-6 space-y-3">
            <h2 className="text-sm font-medium text-stone-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Geïmporteerde Gerechten
            </h2>
            <div className="space-y-1.5">
              {parsedDishes.map((dish, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-xs text-stone-500 font-mono w-24 shrink-0">
                    {dish.category}
                  </span>
                  <span className="text-stone-300">{dish.name}</span>
                  {dish.matched_recipe_name && (
                    <span className="text-xs text-emerald-400/80 ml-auto shrink-0">
                      &rarr; {dish.matched_recipe_name}
                    </span>
                  )}
                  {!dish.matched_recipe_id && (
                    <span className="text-xs text-stone-600 ml-auto shrink-0">
                      nieuw gerecht
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
