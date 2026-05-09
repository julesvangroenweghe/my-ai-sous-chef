'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, CalendarDays, MapPin, Users, Euro, Clock,
  Plus, Trash2, ClipboardList, ChefHat, Loader2,
  X, AlertTriangle, ShoppingCart, Package, Edit2, Save, FileText, Check, Sparkles
} from 'lucide-react'
import { MepInlineEditor } from '@/components/mep/mep-inline-editor'
import { MepShoppingAggregate } from '@/components/mep/mep-shopping-aggregate'
import { EventAllergenSection } from '@/components/allergens/event-allergen-section'

interface EventDetail {
  id: string
  name: string
  event_date: string
  event_type: string
  num_persons: number | null
  price_per_person: number | null
  location: string | null
  contact_person: string | null
  departure_time: string | null
  arrival_time: string | null
  notes: string | null
  status: string
  menu_items: {
    id: string
    recipe_id: string
    course_order: number
    course?: string
    recipe: {
      id: string
      name: string
      description: string | null
      total_cost_per_serving: number | null
      components: {
        id: string
        name: string
        ingredients: {
          id: string
          quantity: number
          quantity_per_person: number | null
          unit: string
          ingredient: {
            id: string
            name: string
            category: string | null
            unit: string | null
            current_price: number | null
          } | null
        }[]
      }[]
    }
  }[]
  dietary_flags: {
    id: string
    flag_name: string
    guest_name: string | null
    notes: string | null
  }[]
}

const courseLabels: Record<number, string> = {
  0: 'Amuse',
  1: 'Voorgerecht',
  2: 'Tussengerecht',
  3: 'Hoofdgerecht',
  4: 'Kaas',
  5: 'Dessert',
  6: 'Mignardises',
}

const statusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  draft: { label: 'Concept', dot: 'bg-stone-400', badge: 'bg-stone-100 text-[#5C4730] border border-[#E8D5B5]' },
  confirmed: { label: 'Bevestigd', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  in_prep: { label: 'In voorbereiding', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border border-amber-200' },
  approved: { label: 'Goedgekeurd', dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  generated: { label: 'Gegenereerd', dot: 'bg-sky-400', badge: 'bg-sky-50 text-sky-700 border border-sky-200' },
  completed: { label: 'Afgerond', dot: 'bg-blue-400', badge: 'bg-blue-50 text-blue-700 border border-blue-200' },
  cancelled: { label: 'Geannuleerd', dot: 'bg-red-400', badge: 'bg-red-50 text-red-600 border border-red-200' },
}

const eventTypeLabels: Record<string, string> = {
  walking_dinner: 'Walking Dinner',
  buffet: 'Buffet',
  sit_down: 'Sit-down Diner',
  cocktail: 'Cocktail Dînatoire',
  brunch: 'Brunch',
  tasting: 'Tasting Menu',
  daily_service: 'Dagdienst',
}

type TabId = 'menu' | 'mep' | 'shopping' | 'voorstel'

interface EditForm {
  name: string
  event_date: string
  event_type: string
  num_persons: string
  price_per_person: string
  location: string
  contact_person: string
  departure_time: string
  arrival_time: string
  notes: string
  status: string
}

interface MepStatus {
  hasMep: boolean
  mepDishCount: number
  hasProposal: boolean
  proposals: { id: string; name: string; revision_number: number; proposal_status: string }[]
}

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const supabase = createClient()

  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [recipes, setRecipes] = useState<{ id: string; name: string }[]>([])
  const [showAddRecipe, setShowAddRecipe] = useState(false)
  const [selectedRecipeId, setSelectedRecipeId] = useState('')
  const [selectedCourse, setSelectedCourse] = useState(3)
  const [addingRecipe, setAddingRecipe] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('menu')
  const [mepRefreshKey, setMepRefreshKey] = useState(0)

  // MEP auto-link state
  const [mepStatus, setMepStatus] = useState<MepStatus | null>(null)
  const [showMepBanner, setShowMepBanner] = useState(false)
  const [creatingMep, setCreatingMep] = useState(false)
  const [mepCreated, setMepCreated] = useState(false)

  // Edit state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>({
    name: '', event_date: '', event_type: 'walking_dinner',
    num_persons: '', price_per_person: '', location: '',
    contact_person: '', departure_time: '', arrival_time: '',
    notes: '', status: 'draft',
  })
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const fetchEvent = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select(`
        *,
        menu_items:event_menu_items(
          id, recipe_id, course_order, course,
          recipe:recipes(
            id, name, description, total_cost_per_serving,
            components:recipe_components(
              id, name,
              ingredients:recipe_component_ingredients(
                id, quantity, quantity_per_person, unit,
                ingredient:ingredients(id, name, category, unit, current_price)
              )
            )
          )
        ),
        dietary_flags:event_dietary_flags(id, flag_name, guest_name, notes)
      `)
      .eq('id', eventId)
      .single()

    if (data) {
      data.menu_items = (data.menu_items || []).sort((a: any, b: any) => a.course_order - b.course_order)
      setEvent(data as unknown as EventDetail)
    }
    setLoading(false)
  }, [eventId])

  const fetchMepStatus = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/create-mep`)
    if (res.ok) {
      const data = await res.json()
      setMepStatus(data)
    }
  }, [eventId])

  const fetchRecipes = useCallback(async () => {
    const { data } = await supabase
      .from('recipes')
      .select('id, name')
      .eq('status', 'active')
      .order('name')
    setRecipes(data || [])
  }, [])

  useEffect(() => {
    fetchEvent()
    fetchRecipes()
    fetchMepStatus()
  }, [fetchEvent, fetchRecipes, fetchMepStatus])

  // Populate edit form when event loads
  useEffect(() => {
    if (event) {
      setEditForm({
        name: event.name || '',
        event_date: event.event_date ? event.event_date.split('T')[0] : '',
        event_type: event.event_type || 'walking_dinner',
        num_persons: event.num_persons?.toString() || '',
        price_per_person: event.price_per_person?.toString() || '',
        location: event.location || '',
        contact_person: event.contact_person || '',
        departure_time: event.departure_time || '',
        arrival_time: event.arrival_time || '',
        notes: event.notes || '',
        status: event.status || 'draft',
      })
    }
  }, [event])

  const handleSaveEdit = async () => {
    if (!event || !editForm.name || !editForm.event_date) return
    setSaving(true)
    const updates: Record<string, any> = {
      name: editForm.name.trim(),
      event_date: editForm.event_date,
      event_type: editForm.event_type,
      status: editForm.status,
      location: editForm.location.trim() || null,
      contact_person: editForm.contact_person.trim() || null,
      departure_time: editForm.departure_time || null,
      arrival_time: editForm.arrival_time || null,
      notes: editForm.notes.trim() || null,
    }
    if (editForm.num_persons) updates.num_persons = parseInt(editForm.num_persons)
    else updates.num_persons = null
    if (editForm.price_per_person) updates.price_per_person = parseFloat(editForm.price_per_person)
    else updates.price_per_person = null

    const wasNotConfirmed = event.status !== 'confirmed'
    const nowConfirmed = editForm.status === 'confirmed'

    const { error } = await supabase.from('events').update(updates).eq('id', event.id)
    setSaving(false)
    if (!error) {
      setSaveSuccess(true)
      setShowEditModal(false)
      await fetchEvent()
      await fetchMepStatus()

      // Show MEP banner when transitioning to confirmed
      if (wasNotConfirmed && nowConfirmed) {
        setShowMepBanner(true)
      }

      setTimeout(() => setSaveSuccess(false), 2000)
    }
  }

  const handleCreateMep = async () => {
    setCreatingMep(true)
    try {
      const res = await fetch(`/api/events/${eventId}/create-mep`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setMepCreated(true)
        setShowMepBanner(false)
        await fetchMepStatus()
        // Navigate to MEP page after short delay
        setTimeout(() => router.push(`/mep/${eventId}`), 800)
      }
    } finally {
      setCreatingMep(false)
    }
  }

  const addRecipeToEvent = async () => {
    if (!selectedRecipeId || !event) return
    setAddingRecipe(true)
    await supabase.from('event_menu_items').insert({
      event_id: event.id,
      recipe_id: selectedRecipeId,
      course_order: selectedCourse,
      course: courseLabels[selectedCourse] || `Gang ${selectedCourse}`,
    })
    await fetchEvent()
    setShowAddRecipe(false)
    setSelectedRecipeId('')
    setAddingRecipe(false)
  }

  const removeRecipeFromEvent = async (menuItemId: string) => {
    await supabase.from('event_menu_items').delete().eq('id', menuItemId)
    await fetchEvent()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <p className="text-[#9E7E60]">Event niet gevonden</p>
        <Link href="/events" className="text-brand-400 hover:text-brand-300 text-sm mt-2 inline-block">Terug naar events</Link>
      </div>
    )
  }

  const menuByCourse: Record<string, { order: number; items: typeof event.menu_items }> = {}
  for (const item of event.menu_items) {
    const label = (item.course || courseLabels[item.course_order] || `Gang ${item.course_order}`).toUpperCase()
    if (!menuByCourse[label]) menuByCourse[label] = { order: item.course_order, items: [] }
    menuByCourse[label].items.push(item)
    if (item.course_order < menuByCourse[label].order) menuByCourse[label].order = item.course_order
  }

  const totalMenuCost = event.menu_items.reduce((sum, item) => sum + (Number(item.recipe?.total_cost_per_serving) || 0), 0)
  const totalEventCost = totalMenuCost * (event.num_persons || 0)
  const revenue = (event.price_per_person || 0) * (event.num_persons || 0)
  const foodCostPct = revenue > 0 ? (totalEventCost / revenue) * 100 : 0

  const status = statusConfig[event.status] || statusConfig.draft
  const isConfirmed = event.status === 'confirmed' || event.status === 'in_prep' || event.status === 'approved'

  const tabs = [
    { id: 'menu' as TabId, label: 'Menu', icon: ChefHat, count: event.menu_items.length },
    { id: 'mep' as TabId, label: 'MEP Plan', icon: ClipboardList },
    { id: 'shopping' as TabId, label: 'Boodschappen', icon: ShoppingCart },
    { id: 'voorstel' as TabId, label: 'Voorstellen', icon: FileText },
  ]

  return (
    <div className="space-y-6">
      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[#E8D5B5]">
            <div className="sticky top-0 bg-white border-b border-[#E8D5B5] px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="font-display text-lg font-bold text-[#2C1810] flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-600" />
                Event bewerken
              </h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 rounded-lg hover:bg-[#F2E8D5] text-[#9E7E60] hover:text-[#2C1810] transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#9E7E60] uppercase tracking-wider">Naam event</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#FAF6EF] border border-[#E8D5B5] rounded-xl text-[#2C1810] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                  placeholder="bv. Bruiloft Janssen-De Smet" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#9E7E60] uppercase tracking-wider">Datum</label>
                  <input type="date" value={editForm.event_date} onChange={e => setEditForm(f => ({ ...f, event_date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#FAF6EF] border border-[#E8D5B5] rounded-xl text-[#2C1810] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#9E7E60] uppercase tracking-wider">Type event</label>
                  <select value={editForm.event_type} onChange={e => setEditForm(f => ({ ...f, event_type: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#FAF6EF] border border-[#E8D5B5] rounded-xl text-[#2C1810] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all">
                    {Object.entries(eventTypeLabels).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#9E7E60] uppercase tracking-wider">Aantal personen</label>
                  <input type="number" min="1" value={editForm.num_persons} onChange={e => setEditForm(f => ({ ...f, num_persons: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#FAF6EF] border border-[#E8D5B5] rounded-xl text-[#2C1810] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                    placeholder="bv. 80" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#9E7E60] uppercase tracking-wider">Prijs per persoon (€)</label>
                  <input type="number" min="0" step="0.01" value={editForm.price_per_person} onChange={e => setEditForm(f => ({ ...f, price_per_person: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#FAF6EF] border border-[#E8D5B5] rounded-xl text-[#2C1810] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                    placeholder="bv. 95.00" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#9E7E60] uppercase tracking-wider">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(statusConfig).map(([val, cfg]) => (
                    <button key={val} type="button" onClick={() => setEditForm(f => ({ ...f, status: val }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                        editForm.status === val
                          ? 'border-amber-400 bg-amber-50 text-[#2C1810] shadow-sm'
                          : 'border-[#E8D5B5] bg-[#FAF6EF] text-[#9E7E60] hover:bg-[#F2E8D5]'
                      }`}>
                      <span className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />
                      {cfg.label}
                      {editForm.status === val && <Check className="w-3 h-3 ml-auto text-amber-600" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#9E7E60] uppercase tracking-wider">Locatie</label>
                <input type="text" value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#FAF6EF] border border-[#E8D5B5] rounded-xl text-[#2C1810] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                  placeholder="bv. Kasteel Gravenhof, Dilbeek" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#9E7E60] uppercase tracking-wider">Contactpersoon</label>
                <input type="text" value={editForm.contact_person} onChange={e => setEditForm(f => ({ ...f, contact_person: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#FAF6EF] border border-[#E8D5B5] rounded-xl text-[#2C1810] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                  placeholder="bv. Karen Janssen" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#9E7E60] uppercase tracking-wider">Aankomsttijd</label>
                  <input type="time" value={editForm.arrival_time} onChange={e => setEditForm(f => ({ ...f, arrival_time: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#FAF6EF] border border-[#E8D5B5] rounded-xl text-[#2C1810] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#9E7E60] uppercase tracking-wider">Vertrektijd</label>
                  <input type="time" value={editForm.departure_time} onChange={e => setEditForm(f => ({ ...f, departure_time: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#FAF6EF] border border-[#E8D5B5] rounded-xl text-[#2C1810] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#9E7E60] uppercase tracking-wider">Notities</label>
                <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  className="w-full px-3.5 py-2.5 bg-[#FAF6EF] border border-[#E8D5B5] rounded-xl text-[#2C1810] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all resize-none"
                  placeholder="Extra info, bijzonderheden..." />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-[#E8D5B5] px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setShowEditModal(false)}
                className="px-4 py-2.5 rounded-xl border border-[#E8D5B5] text-[#9E7E60] text-sm font-medium hover:bg-[#F2E8D5] hover:text-[#2C1810] transition-all">
                Annuleren
              </button>
              <button onClick={handleSaveEdit} disabled={saving || !editForm.name || !editForm.event_date}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 shadow-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/events" className="p-2 rounded-xl bg-[#FAF6EF] border border-[#E8D5B5] text-[#9E7E60] hover:text-[#2C1810] transition-all mt-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-2xl font-display font-extrabold text-[#2C1810] truncate">{event.name}</h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${status.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            {saveSuccess && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check className="w-3 h-3" /> Opgeslagen
              </span>
            )}
            {mepCreated && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <ClipboardList className="w-3 h-3" /> MEP aangemaakt
              </span>
            )}
            {isConfirmed && mepStatus?.hasMep && !mepCreated && (
              <Link href={`/mep/${eventId}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">
                <ClipboardList className="w-3 h-3" /> MEP bekijken
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-[#9E7E60]">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              {event.event_date
                ? new Date(event.event_date + 'T12:00:00').toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                : 'Geen datum'}
            </span>
            <span className="text-[#B8997A]">{eventTypeLabels[event.event_type] || event.event_type}</span>
            {event.num_persons && (
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{event.num_persons} personen</span>
            )}
            {event.location && (
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{event.location}</span>
            )}
            {event.departure_time && (
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />Vertrek: {event.departure_time}</span>
            )}
          </div>
        </div>
        <button onClick={() => setShowEditModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E8D5B5] bg-white text-[#5C4730] text-sm font-medium hover:bg-[#F2E8D5] hover:border-amber-300 transition-all shrink-0 mt-1">
          <Edit2 className="w-4 h-4 text-amber-600" />
          Bewerken
        </button>
      </div>

      {/* MEP Auto-link Banner — shown when status just changed to confirmed */}
      {showMepBanner && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-800">Event bevestigd!</p>
            {mepStatus?.hasProposal ? (
              <p className="text-xs text-emerald-600 mt-0.5">
                Importeer voorstel V{mepStatus.proposals[0]?.revision_number || 1} naar de MEP productielijst.
              </p>
            ) : (
              <p className="text-xs text-emerald-600 mt-0.5">
                Nog geen voorstel gevonden — maak eerst een voorstel aan.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {mepStatus?.hasProposal ? (
              <button onClick={handleCreateMep} disabled={creatingMep}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60">
                {creatingMep ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                {creatingMep ? 'Aanmaken...' : 'MEP aanmaken'}
              </button>
            ) : (
              <Link href={`/events/${eventId}/voorstel`}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-all">
                <FileText className="w-4 h-4" />
                Voorstel aanmaken
              </Link>
            )}
            <button onClick={() => setShowMepBanner(false)} className="p-2 text-emerald-400 hover:text-emerald-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MEP CTA banner — always visible when confirmed & no MEP yet */}
      {isConfirmed && mepStatus && !mepStatus.hasMep && !showMepBanner && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="flex-1 text-sm text-amber-800">
            {mepStatus.hasProposal
              ? `Voorstel aanwezig — importeer naar MEP om de productielijst klaar te maken.`
              : `Event is bevestigd maar heeft nog geen MEP. Maak eerst een voorstel aan.`}
          </p>
          {mepStatus.hasProposal ? (
            <button onClick={handleCreateMep} disabled={creatingMep}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-60 shrink-0">
              {creatingMep ? <Loader2 className="w-3 h-3 animate-spin" /> : <ClipboardList className="w-3 h-3" />}
              MEP aanmaken
            </button>
          ) : (
            <Link href={`/events/${eventId}/voorstel`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-all shrink-0">
              <Plus className="w-3 h-3" /> Voorstel aanmaken
            </Link>
          )}
        </div>
      )}

      {/* Cost Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E8D5B5] rounded-xl p-4">
          <div className="text-xs text-[#9E7E60] mb-1">Kost/persoon</div>
          <div className="text-lg font-mono font-bold text-[#2C1810]">€{totalMenuCost.toFixed(2)}</div>
        </div>
        <div className="bg-white border border-[#E8D5B5] rounded-xl p-4">
          <div className="text-xs text-[#9E7E60] mb-1">Totale kost</div>
          <div className="text-lg font-mono font-bold text-[#2C1810]">€{totalEventCost.toFixed(2)}</div>
        </div>
        <div className="bg-white border border-[#E8D5B5] rounded-xl p-4">
          <div className="text-xs text-[#9E7E60] mb-1">Omzet</div>
          <div className="text-lg font-mono font-bold text-[#2C1810]">€{revenue.toFixed(2)}</div>
        </div>
        <div className="bg-white border border-[#E8D5B5] rounded-xl p-4">
          <div className="text-xs text-[#9E7E60] mb-1">Food Cost</div>
          <div className={`text-lg font-mono font-bold ${
            foodCostPct === 0 ? 'text-[#9E7E60]' :
            foodCostPct < 30 ? 'text-green-600' :
            foodCostPct <= 35 ? 'text-amber-700' : 'text-red-500'
          }`}>
            {foodCostPct > 0 ? `${foodCostPct.toFixed(1)}%` : '—'}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-white border border-[#E8D5B5] rounded-xl p-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-brand-600 text-[#2C1810] shadow-lg shadow-brand-500/20'
                : 'text-[#9E7E60] hover:text-[#2C1810] hover:bg-[#F2E8D5]'
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-stone-100'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'menu' && (
        <div className="bg-white border border-[#E8D5B5] rounded-2xl">
          <div className="px-6 py-4 border-b border-[#E8D5B5] flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold text-[#2C1810] flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-brand-400" /> Menu
            </h2>
            <button onClick={() => setShowAddRecipe(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-[#2C1810] text-xs font-medium rounded-lg transition-all">
              <Plus className="w-3.5 h-3.5" /> Gerecht toevoegen
            </button>
          </div>

          {showAddRecipe && (
            <div className="px-6 py-4 border-b border-[#E8D5B5] bg-[#FAF6EF]">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs text-[#9E7E60]">Recept</label>
                  <select value={selectedRecipeId} onChange={e => setSelectedRecipeId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E8D5B5] rounded-lg text-[#2C1810] text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Kies een recept...</option>
                    {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div className="w-44 space-y-1.5">
                  <label className="text-xs text-[#9E7E60]">Gang</label>
                  <select value={selectedCourse} onChange={e => setSelectedCourse(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-[#E8D5B5] rounded-lg text-[#2C1810] text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {Object.entries(courseLabels).map(([num, label]) => <option key={num} value={num}>{label}</option>)}
                  </select>
                </div>
                <button onClick={addRecipeToEvent} disabled={!selectedRecipeId || addingRecipe}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-[#2C1810] text-sm rounded-lg transition-all disabled:opacity-50">
                  {addingRecipe ? '...' : 'Toevoegen'}
                </button>
                <button onClick={() => setShowAddRecipe(false)} className="p-2 text-[#9E7E60] hover:text-[#2C1810] transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {event.menu_items.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <ChefHat className="w-10 h-10 text-[#B8997A] mx-auto mb-3" />
              <p className="text-[#9E7E60] text-sm">Nog geen gerechten toegevoegd</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0E8D8]">
              {Object.entries(menuByCourse).sort(([, a], [, b]) => a.order - b.order).map(([courseLabel, { items }]) => (
                <div key={courseLabel}>
                  <div className="px-6 py-2.5 bg-[#F5EDE0]">
                    <span className="text-xs font-medium text-[#9E7E60] uppercase tracking-wider">{courseLabel}</span>
                  </div>
                  {items.map(item => (
                    <div key={item.id} className="px-6 py-3 flex items-center gap-4 hover:bg-[#F5EDE0] transition-colors">
                      <div className="flex-1">
                        <Link href={`/recipes/${item.recipe?.id}`} className="text-sm font-medium text-[#2C1810] hover:text-brand-400 transition-colors">
                          {item.recipe?.name || 'Onbekend recept'}
                        </Link>
                        {item.recipe?.components && (
                          <div className="text-xs text-[#9E7E60] mt-0.5">
                            {item.recipe.components.length} componenten · {item.recipe.components.reduce((s, c) => s + (c.ingredients?.length || 0), 0)} ingrediënten
                          </div>
                        )}
                        {item.recipe?.total_cost_per_serving && (
                          <span className="text-xs font-mono text-[#9E7E60]">€{Number(item.recipe.total_cost_per_serving).toFixed(2)}/p</span>
                        )}
                      </div>
                      <button onClick={() => removeRecipeFromEvent(item.id)} className="p-1.5 text-[#B8997A] hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'mep' && event.num_persons && (
        <MepInlineEditor key={mepRefreshKey} eventId={eventId} eventName={event.name}
          numPersons={event.num_persons} onMepGenerated={() => setMepRefreshKey(k => k + 1)} />
      )}

      {activeTab === 'mep' && !event.num_persons && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-3" />
          <p className="text-amber-800 font-medium">Vul eerst het aantal personen in</p>
          <p className="text-[#9E7E60] text-sm mt-1">Het MEP plan heeft het aantal gasten nodig om hoeveelheden te berekenen.</p>
          <button onClick={() => setShowEditModal(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-all mx-auto">
            <Edit2 className="w-4 h-4" /> Event bewerken
          </button>
        </div>
      )}

      {activeTab === 'shopping' && event.num_persons && (
        <MepShoppingAggregate eventId={eventId} numPersons={event.num_persons} />
      )}

      {activeTab === 'voorstel' && (
        <div className="bg-white border border-[#E8D5B5] rounded-2xl p-8 text-center">
          <FileText className="w-10 h-10 text-[#D4B896] mx-auto mb-3" />
          <h3 className="text-lg font-display font-semibold text-[#2C1810] mb-2">Menu Voorstellen</h3>
          <p className="text-[#9E7E60] text-sm mb-5">Maak en beheer menu voorstellen voor dit event. Volg revisies en klantfeedback op.</p>
          <Link href={`/events/${eventId}/voorstel`} className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-[#2C1810] font-semibold text-sm rounded-xl transition-all">
            <FileText className="w-4 h-4" /> Voorstellen beheren
          </Link>
        </div>
      )}

      {/* Link naar MEP module */}
      {activeTab === 'menu' && (
        <div className="bg-[#FAF6EF] border border-[#E8D5B5] rounded-2xl p-5 flex items-center gap-4">
          <ClipboardList className="w-6 h-6 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#2C1810]">MEP Productielijst</p>
            <p className="text-xs text-[#9E7E60] mt-0.5">
              {mepStatus?.hasMep
                ? `${mepStatus.mepDishCount} gerechten in de MEP — bekijk of bewerk de productielijst.`
                : 'Beheer de volledige MEP lijst met gerechten en componenten.'}
            </p>
          </div>
          <Link href={`/mep/${eventId}`}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-all whitespace-nowrap shrink-0">
            <ArrowRight className="w-4 h-4" />
            {mepStatus?.hasMep ? 'MEP bekijken' : 'Open MEP'}
          </Link>
        </div>
      )}

      {/* Allergen Overview */}
      <EventAllergenSection eventId={eventId} />

      {event.notes && (
        <div className="bg-white border border-[#E8D5B5] rounded-2xl p-6">
          <h3 className="text-sm font-medium text-[#9E7E60] mb-2">Notities</h3>
          <p className="text-[#5C4730] text-sm whitespace-pre-wrap">{event.notes}</p>
        </div>
      )}
    </div>
  )
}
