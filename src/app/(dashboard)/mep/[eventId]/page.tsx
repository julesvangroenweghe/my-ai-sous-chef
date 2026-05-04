'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ArrowLeft, Users, Euro, Clock, MapPin, CalendarDays,
  Plus, Trash2, Pencil, Check, X, Loader2, Download,
  ChefHat, AlertTriangle, Sparkles
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MepEvent {
  id: string
  name: string
  event_date: string
  num_persons: number | null
  price_per_person: number | null
  location: string | null
  contact_person: string | null
  event_start_time: string | null
  event_end_time: string | null
  mep_status: string
  event_type: string | null
  travel_time_minutes: number | null
  kitchen_arrival_time: string | null
  venue_address: string | null
}

interface MepDish {
  id: string
  title: string
  category: string
  sort_order: number
  is_ai_suggestion: number
  notes: string | null
  components: MepComponent[]
}

interface MepComponent {
  id: string
  dish_id: string
  component_name: string
  quantity: string | null
  unit: string | null
  preparation: string | null
  supplier: string | null
  component_group: string | null
  sort_order: number
  is_ai_suggestion: number
}

// ─── Category ordering (partial matching, same logic as sandbox) ──────────────

const CAT_ORDER: [string, number][] = [
  ['DRANKEN', 1], ['MOCKTAILS', 2], ['INFUSED', 2.5], ['LUNCH', 3],
  ['FINGERFOOD', 4], ['FINGERBITES', 5], ['HAPJES', 6], ['HAPJE', 6.5],
  ['APPETIZERS', 7], ['AMUSE', 8], ['WALKING', 10], ['SHARING', 11],
  ['VOORGERECHT', 11], ['TUSSENGERECHT', 12], ['FOODSTAND', 15.5],
  ['HOOFDGERECHT', 16], ['BROOD', 17], ['ON THE SIDE', 18], ['SAUZEN', 19],
  ['KAAS', 20], ['DESSERT', 21], ['PETIT', 22], ['BARISTA', 24.5],
  ['MIGNARDISES', 25], ['KIDS', 26], ['KINDERMENU', 26], ['LATE NIGHT', 27],
  ['AFTER SNACK', 28], ['HALFABRICAAT', 50],
]

function getCategoryOrder(cat: string): number {
  const upper = cat.toUpperCase()
  const isMiddag = upper.includes('MIDDAG')
  const isApero = upper.includes('APERO')
  let best = 100
  let bestLen = 0
  for (const [key, score] of CAT_ORDER) {
    if (upper.includes(key) && key.length > bestLen) {
      let s = score
      if (isMiddag) s += 0.1
      if (isApero) s += 0.5
      best = s
      bestLen = key.length
    }
  }
  return best
}

const CAT_LABELS: Record<string, string> = {
  'DRANKEN': 'Dranken', 'MOCKTAILS': 'Mocktails', 'INFUSED WATERS': 'Infused Waters',
  'LUNCH': 'Lunch', 'FINGERFOOD': 'Fingerfood', 'FINGERBITES': 'Fingerbites',
  'HAPJES': 'Hapjes', 'HAPJE_WARM': 'Hapjes Warm', 'APPETIZERS': 'Appetizers',
  'AMUSE': 'Amuse', 'WALKING DINNER': 'Walking Dinner',
  'SHARING VOORGERECHT': 'Sharing Voorgerecht', 'VOORGERECHT': 'Voorgerecht',
  'TUSSENGERECHT': 'Tussengerecht', 'HOOFDGERECHT': 'Hoofdgerecht',
  'HOOFDGERECHT PREMIUM': 'Hoofdgerecht Premium', 'BROOD': 'Brood & Boter',
  'BROOD & BOTER': 'Brood & Boter', 'ON THE SIDE': 'On the Side',
  'KAAS': 'Kaas', 'DESSERT': 'Dessert', 'PETITS FOURS': 'Petits Fours',
  'MIGNARDISES': 'Mignardises', 'KIDS': 'Kids', 'KINDERMENU': 'Kindermenu',
  'LATE NIGHT SNACK': 'Late Night Snack', 'HALFABRICAAT': 'Halfabricaat',
  'KOFFIE & THEE': 'Koffie & Thee',
}

function catLabel(cat: string): string {
  return CAT_LABELS[cat.toUpperCase()] || cat
}

function formatDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('nl-BE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

const eventTypeLabels: Record<string, string> = {
  cocktail: 'Cocktailreceptie',
  walking_dinner: 'Walking Dinner',
  sit_down: 'Diner aan tafel',
  seated_dinner: 'Diner aan tafel',
  buffet: 'Buffet',
  daily_service: 'Dagservice',
  tasting: 'Proeverij',
  lunch: 'Lunch',
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MepDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string
  const supabase = createClient()

  const [event, setEvent] = useState<MepEvent | null>(null)
  const [dishes, setDishes] = useState<MepDish[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [approveError, setApproveError] = useState<string | null>(null)

  // Edit state for components
  const [editingComponent, setEditingComponent] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    component_name: '', quantity: '', unit: '', preparation: '', supplier: '', component_group: ''
  })

  // Add component state
  const [addingToDish, setAddingToDish] = useState<string | null>(null)
  const [addForm, setAddForm] = useState({ name: '', qty: '', unit: '', prep: '', supplier: '' })
  const [addingComp, setAddingComp] = useState(false)

  // Delete component confirm
  const [deletingComp, setDeletingComp] = useState<string | null>(null)

  // Delete dish confirm
  const [deletingDish, setDeletingDish] = useState<string | null>(null)

  // Edit dish title
  const [editingDishId, setEditingDishId] = useState<string | null>(null)
  const [editDishTitle, setEditDishTitle] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [evtRes, dishRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase.from('mep_dishes').select('*').eq('event_id', eventId).order('sort_order'),
    ])

    if (evtRes.data) setEvent(evtRes.data as MepEvent)

    if (dishRes.data && dishRes.data.length > 0) {
      const dishIds = dishRes.data.map((d: any) => d.id)
      const { data: compData } = await supabase
        .from('mep_components')
        .select('*')
        .in('dish_id', dishIds)
        .order('sort_order')

      const components: MepComponent[] = (compData || []) as MepComponent[]
      const dishesWithComps: MepDish[] = (dishRes.data as any[]).map(d => ({
        ...d,
        components: components.filter(c => c.dish_id === d.id),
      }))
      setDishes(dishesWithComps)
    } else {
      setDishes([])
    }
    setLoading(false)
  }, [eventId])

  useEffect(() => { fetchData() }, [fetchData])

  // Group dishes by category, sorted
  const byCategory: Map<string, MepDish[]> = new Map()
  for (const dish of dishes) {
    const cat = dish.category || 'OVERIG'
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(dish)
  }
  const sortedCategories = Array.from(byCategory.keys()).sort(
    (a, b) => getCategoryOrder(a) - getCategoryOrder(b)
  )

  // Approve event
  const handleApprove = async () => {
    setApproving(true)
    setApproveError(null)
    try {
      const res = await fetch(`/api/mep/approve/${eventId}`, { method: 'POST' })
      if (!res.ok) throw new Error('Approve mislukt')
      await fetchData()
    } catch (e: any) {
      setApproveError(e.message)
    }
    setApproving(false)
  }

  // Start editing a component
  const startEdit = (comp: MepComponent) => {
    setEditingComponent(comp.id)
    setEditForm({
      component_name: comp.component_name,
      quantity: comp.quantity || '',
      unit: comp.unit || '',
      preparation: comp.preparation || '',
      supplier: comp.supplier || '',
      component_group: comp.component_group || '',
    })
  }

  // Save edited component
  const saveComponent = async (compId: string) => {
    await supabase.from('mep_components').update({
      component_name: editForm.component_name,
      quantity: editForm.quantity || null,
      unit: editForm.unit || null,
      preparation: editForm.preparation || null,
      supplier: editForm.supplier || null,
      component_group: editForm.component_group || null,
      is_ai_suggestion: 0,
    }).eq('id', compId)
    setEditingComponent(null)
    await fetchData()
  }

  // Delete component
  const deleteComponent = async (compId: string) => {
    await supabase.from('mep_components').delete().eq('id', compId)
    setDeletingComp(null)
    await fetchData()
  }

  // Delete dish
  const deleteDish = async (dishId: string) => {
    await supabase.from('mep_components').delete().eq('dish_id', dishId)
    await supabase.from('mep_dishes').delete().eq('id', dishId)
    setDeletingDish(null)
    await fetchData()
  }

  // Save dish title
  const saveDishTitle = async (dishId: string) => {
    if (!editDishTitle.trim()) return
    await supabase.from('mep_dishes').update({ title: editDishTitle.trim() }).eq('id', dishId)
    setEditingDishId(null)
    await fetchData()
  }

  // Add component
  const addComponent = async (dishId: string) => {
    if (!addForm.name.trim()) return
    setAddingComp(true)
    const { data: existing } = await supabase
      .from('mep_components')
      .select('sort_order')
      .eq('dish_id', dishId)
      .order('sort_order', { ascending: false })
      .limit(1)
    const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order || 0) + 1 : 0
    await supabase.from('mep_components').insert({
      dish_id: dishId,
      component_name: addForm.name.trim(),
      quantity: addForm.qty || null,
      unit: addForm.unit || null,
      preparation: addForm.prep || null,
      supplier: addForm.supplier || null,
      sort_order: nextOrder,
      is_ai_suggestion: 0,
    })
    setAddForm({ name: '', qty: '', unit: '', prep: '', supplier: '' })
    setAddingToDish(null)
    setAddingComp(false)
    await fetchData()
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <p className="text-[#9E7E60]">MEP niet gevonden</p>
        <Link href="/mep" className="text-amber-600 hover:text-amber-700 text-sm mt-2 inline-block">← Terug naar overzicht</Link>
      </div>
    )
  }

  const isApproved = event.mep_status === 'approved'

  return (
    <div className="space-y-4 pb-12">

      {/* ── Header ── */}
      <div className="bg-[#FAF6EF] border border-[#E8D5B5] rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Link href="/mep" className="p-2 rounded-xl bg-white border border-[#E8D5B5] text-[#9E7E60] hover:text-[#2C1810] transition-all mt-0.5 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl font-bold text-[#2C1810]">{event.name}</h1>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${
                isApproved
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                {isApproved ? 'Goedgekeurd' : 'Concept'}
              </span>
              {event.event_type && (
                <span className="text-xs text-[#9E7E60] bg-white border border-[#E8D5B5] px-2 py-0.5 rounded-full">
                  {eventTypeLabels[event.event_type] || event.event_type}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#9E7E60]">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                {formatDate(event.event_date)}
              </span>
              {event.event_start_time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {event.event_start_time}{event.event_end_time ? ` – ${event.event_end_time}` : ''}
                </span>
              )}
              {event.num_persons && (
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{event.num_persons} pax</span>
              )}
              {event.price_per_person && (
                <span className="flex items-center gap-1"><Euro className="w-3.5 h-3.5" />€{event.price_per_person}/pp</span>
              )}
              {event.location && (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.location}</span>
              )}
              {event.contact_person && (
                <span className="text-[#B8997A]">Contact: {event.contact_person}</span>
              )}
              {event.travel_time_minutes && (
                <span className="text-[#B8997A]">Reistijd: {event.travel_time_minutes} min</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`/api/mep/pdf/${eventId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E8D5B5] bg-white text-[#5C4730] text-xs hover:bg-[#F2E8D5] transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              PDF
            </a>
            {!isApproved && (
              <button
                onClick={handleApprove}
                disabled={approving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all disabled:opacity-50"
              >
                {approving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Goedkeuren
              </button>
            )}
          </div>
        </div>

        {approveError && (
          <div className="flex items-center gap-2 px-3 py-2 mt-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {approveError}
          </div>
        )}
      </div>

      {/* ── MEP Content ── */}
      {dishes.length === 0 ? (
        <div className="bg-white border border-[#E8D5B5] rounded-2xl p-12 text-center">
          <ChefHat className="w-10 h-10 text-[#D4B896] mx-auto mb-3" />
          <p className="text-[#9E7E60]">Nog geen MEP gerechten voor dit event</p>
          <p className="text-xs text-[#B8997A] mt-1">Upload een menu PDF via de Inbox om automatisch een MEP te genereren</p>
        </div>
      ) : (
        <div className="space-y-5">
          {sortedCategories.map(cat => {
            const catDishes = byCategory.get(cat)!
            return (
              <div key={cat}>
                {/* Category header */}
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#9E7E60] shrink-0">{catLabel(cat)}</h2>
                  <div className="flex-1 h-px bg-[#E8D5B5]" />
                  <span className="text-[10px] text-[#C4B090]">{catDishes.length} gerecht{catDishes.length !== 1 ? 'en' : ''}</span>
                </div>

                {/* Dishes */}
                <div className="space-y-2">
                  {catDishes.map(dish => {
                    const isAiDish = dish.is_ai_suggestion === 1
                    const isDeletingThisDish = deletingDish === dish.id
                    const isEditingTitle = editingDishId === dish.id

                    if (isDeletingThisDish) {
                      return (
                        <div key={dish.id} className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3">
                          <span className="text-sm text-red-700">Verwijder <strong>{dish.title}</strong> + alle componenten?</span>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => deleteDish(dish.id)} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg">Ja</button>
                            <button onClick={() => setDeletingDish(null)} className="px-3 py-1 border border-red-200 text-red-600 text-xs rounded-lg">Nee</button>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={dish.id} className="bg-white border border-[#E8D5B5] rounded-xl overflow-hidden">
                        {/* Dish header */}
                        <div className={`px-3 py-1.5 flex items-center gap-2 group border-b border-[#F0E8D8] ${
                          isAiDish ? 'bg-orange-50' : 'bg-[#FAF6EF]'
                        }`}>
                          {isEditingTitle ? (
                            <div className="flex gap-1.5 flex-1">
                              <input
                                type="text"
                                value={editDishTitle}
                                onChange={e => setEditDishTitle(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveDishTitle(dish.id); if (e.key === 'Escape') setEditingDishId(null); }}
                                className="flex-1 px-2 py-0.5 text-sm border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                                autoFocus
                              />
                              <button onClick={() => saveDishTitle(dish.id)} className="p-1 rounded bg-emerald-500 text-white"><Check className="w-3 h-3" /></button>
                              <button onClick={() => setEditingDishId(null)} className="p-1 rounded border border-[#E8D5B5] text-[#9E7E60]"><X className="w-3 h-3" /></button>
                            </div>
                          ) : (
                            <>
                              <span className={`flex-1 text-sm font-semibold truncate ${
                                isAiDish ? 'text-orange-600' : 'text-[#2C1810]'
                              }`}>
                                {dish.title}
                                {isAiDish && <Sparkles className="inline w-3 h-3 ml-1 text-orange-400" />}
                              </span>
                              {dish.notes && (
                                <span className="text-xs text-[#9E7E60] italic truncate max-w-[200px]">{dish.notes}</span>
                              )}
                              {/* Action buttons — always slightly visible, full on hover */}
                              <div className="flex items-center gap-0 opacity-30 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  onClick={() => setAddingToDish(addingToDish === dish.id ? null : dish.id)}
                                  className="p-1 rounded text-[#9E7E60] hover:text-amber-600 hover:bg-amber-50 transition-all"
                                  title="Component toevoegen"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => { setEditingDishId(dish.id); setEditDishTitle(dish.title) }}
                                  className="p-1 rounded text-[#9E7E60] hover:text-amber-600 hover:bg-amber-50 transition-all"
                                  title="Naam bewerken"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setDeletingDish(dish.id)}
                                  className="p-1 rounded text-[#9E7E60] hover:text-red-500 hover:bg-red-50 transition-all"
                                  title="Gerecht verwijderen"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Components */}
                        <div>
                          {(() => {
                            const groups: Map<string | null, MepComponent[]> = new Map()
                            for (const comp of dish.components) {
                              const grp = comp.component_group || null
                              if (!groups.has(grp)) groups.set(grp, [])
                              groups.get(grp)!.push(comp)
                            }
                            const mainComps = groups.get(null) || []
                            const subGroups = Array.from(groups.entries()).filter(([k]) => k !== null)

                            return (
                              <>
                                {mainComps.map((comp) => (
                                  <ComponentRowItem
                                    key={comp.id}
                                    comp={comp}
                                    editingId={editingComponent}
                                    editForm={editForm}
                                    setEditForm={setEditForm}
                                    onStartEdit={startEdit}
                                    onSave={saveComponent}
                                    onCancel={() => setEditingComponent(null)}
                                    deletingId={deletingComp}
                                    onDeleteClick={id => setDeletingComp(id)}
                                    onDeleteConfirm={deleteComponent}
                                    onDeleteCancel={() => setDeletingComp(null)}
                                  />
                                ))}
                                {subGroups.map(([grpName, comps]) => (
                                  <div key={grpName}>
                                    <div className="px-3 py-0.5 bg-[#F5EDE0]/60 border-t border-[#F0E8D8]">
                                      <span className="text-[10px] font-semibold text-[#B8997A] uppercase tracking-wider">{grpName}</span>
                                    </div>
                                    {comps.map((comp) => (
                                      <ComponentRowItem
                                        key={comp.id}
                                        comp={comp}
                                        editingId={editingComponent}
                                        editForm={editForm}
                                        setEditForm={setEditForm}
                                        onStartEdit={startEdit}
                                        onSave={saveComponent}
                                        onCancel={() => setEditingComponent(null)}
                                        deletingId={deletingComp}
                                        onDeleteClick={id => setDeletingComp(id)}
                                        onDeleteConfirm={deleteComponent}
                                        onDeleteCancel={() => setDeletingComp(null)}
                                      />
                                    ))}
                                  </div>
                                ))}
                              </>
                            )
                          })()}
                        </div>

                        {/* Add component form */}
                        {addingToDish === dish.id && (
                          <div className="px-3 py-2.5 bg-amber-50 border-t border-amber-100">
                            <div className="flex gap-1.5 flex-wrap">
                              <input
                                type="text"
                                placeholder="Naam component *"
                                value={addForm.name}
                                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && addComponent(dish.id)}
                                autoFocus
                                className="flex-1 min-w-36 px-2.5 py-1 text-xs border border-amber-200 rounded-lg bg-white text-[#2C1810] focus:outline-none focus:ring-1 focus:ring-amber-400"
                              />
                              <input
                                type="text"
                                placeholder="Qty"
                                value={addForm.qty}
                                onChange={e => setAddForm(f => ({ ...f, qty: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && addComponent(dish.id)}
                                className="w-16 px-2.5 py-1 text-xs border border-amber-200 rounded-lg bg-white text-[#2C1810] focus:outline-none focus:ring-1 focus:ring-amber-400"
                              />
                              <input
                                type="text"
                                placeholder="Eenh."
                                value={addForm.unit}
                                onChange={e => setAddForm(f => ({ ...f, unit: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && addComponent(dish.id)}
                                className="w-16 px-2.5 py-1 text-xs border border-amber-200 rounded-lg bg-white text-[#2C1810] focus:outline-none focus:ring-1 focus:ring-amber-400"
                              />
                              <input
                                type="text"
                                placeholder="Bereiding"
                                value={addForm.prep}
                                onChange={e => setAddForm(f => ({ ...f, prep: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && addComponent(dish.id)}
                                className="flex-1 min-w-28 px-2.5 py-1 text-xs border border-amber-200 rounded-lg bg-white text-[#2C1810] focus:outline-none focus:ring-1 focus:ring-amber-400"
                              />
                              <input
                                type="text"
                                placeholder="Leverancier"
                                value={addForm.supplier}
                                onChange={e => setAddForm(f => ({ ...f, supplier: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && addComponent(dish.id)}
                                className="w-28 px-2.5 py-1 text-xs border border-amber-200 rounded-lg bg-white text-[#2C1810] focus:outline-none focus:ring-1 focus:ring-amber-400"
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={() => addComponent(dish.id)}
                                  disabled={addingComp || !addForm.name.trim()}
                                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50"
                                >
                                  {addingComp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => { setAddingToDish(null); setAddForm({ name: '', qty: '', unit: '', prep: '', supplier: '' }) }}
                                  className="px-3 py-1 border border-[#E8D5B5] text-[#9E7E60] text-xs rounded-lg hover:bg-white transition-all"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Component Row Sub-Component ─────────────────────────────────────────────

interface ComponentRowItemProps {
  comp: MepComponent
  editingId: string | null
  editForm: { component_name: string; quantity: string; unit: string; preparation: string; supplier: string; component_group: string }
  setEditForm: (fn: (prev: any) => any) => void
  onStartEdit: (comp: MepComponent) => void
  onSave: (id: string) => void
  onCancel: () => void
  deletingId: string | null
  onDeleteClick: (id: string) => void
  onDeleteConfirm: (id: string) => void
  onDeleteCancel: () => void
}

function ComponentRowItem({
  comp,
  editingId, editForm, setEditForm,
  onStartEdit, onSave, onCancel,
  deletingId, onDeleteClick, onDeleteConfirm, onDeleteCancel,
}: ComponentRowItemProps) {
  const isEditing = editingId === comp.id
  const isDeleting = deletingId === comp.id
  const isAi = comp.is_ai_suggestion === 1

  if (isEditing) {
    return (
      <div className="px-3 py-2 bg-amber-50 border-t border-amber-100">
        <div className="flex gap-1.5 flex-wrap mb-1.5">
          <input
            type="text"
            value={editForm.component_name}
            onChange={e => setEditForm((f: any) => ({ ...f, component_name: e.target.value }))}
            className="flex-1 min-w-36 px-2 py-1 text-xs border border-amber-300 rounded-lg bg-white text-[#2C1810] focus:outline-none focus:ring-1 focus:ring-amber-400"
            placeholder="Naam"
            autoFocus
          />
          <input
            type="text"
            value={editForm.quantity}
            onChange={e => setEditForm((f: any) => ({ ...f, quantity: e.target.value }))}
            className="w-16 px-2 py-1 text-xs border border-amber-200 rounded-lg bg-white text-[#2C1810] focus:outline-none focus:ring-1 focus:ring-amber-400"
            placeholder="Qty"
          />
          <input
            type="text"
            value={editForm.unit}
            onChange={e => setEditForm((f: any) => ({ ...f, unit: e.target.value }))}
            className="w-16 px-2 py-1 text-xs border border-amber-200 rounded-lg bg-white text-[#2C1810] focus:outline-none focus:ring-1 focus:ring-amber-400"
            placeholder="Eenh."
          />
          <input
            type="text"
            value={editForm.preparation}
            onChange={e => setEditForm((f: any) => ({ ...f, preparation: e.target.value }))}
            className="flex-1 min-w-28 px-2 py-1 text-xs border border-amber-200 rounded-lg bg-white text-[#2C1810] focus:outline-none focus:ring-1 focus:ring-amber-400"
            placeholder="Bereiding"
          />
          <input
            type="text"
            value={editForm.supplier}
            onChange={e => setEditForm((f: any) => ({ ...f, supplier: e.target.value }))}
            className="w-28 px-2 py-1 text-xs border border-amber-200 rounded-lg bg-white text-[#2C1810] focus:outline-none focus:ring-1 focus:ring-amber-400"
            placeholder="Leverancier"
          />
        </div>
        <div className="flex gap-1">
          <button onClick={() => onSave(comp.id)} className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-all">Opslaan</button>
          <button onClick={onCancel} className="px-3 py-1 border border-[#E8D5B5] text-[#9E7E60] text-xs rounded-lg hover:bg-white transition-all">Annuleren</button>
        </div>
      </div>
    )
  }

  if (isDeleting) {
    return (
      <div className="px-3 py-1.5 bg-red-50 border-t border-red-100 flex items-center justify-between gap-3">
        <span className="text-xs text-red-700">Verwijder <strong>{comp.component_name}</strong>?</span>
        <div className="flex gap-1">
          <button onClick={() => onDeleteConfirm(comp.id)} className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg">Ja</button>
          <button onClick={onDeleteCancel} className="px-2.5 py-1 border border-red-200 text-red-600 text-xs rounded-lg">Nee</button>
        </div>
      </div>
    )
  }

  // Inline display: naam (qty unit) (bereiding) — like sandbox
  const qtyStr = comp.quantity ? `${comp.quantity}${comp.unit ? ` ${comp.unit}` : ''}` : null
  const prepStr = comp.preparation || null

  return (
    <div className="group px-3 py-0.5 flex items-center gap-1.5 hover:bg-[#F5EDE0]/40 transition-colors border-t border-[#F5EDE0] first:border-t-0">
      <div className="flex-1 min-w-0 flex items-baseline gap-0 flex-wrap">
        <span className={`text-sm leading-relaxed ${
          isAi ? 'text-orange-500' : 'text-[#2C1810]'
        }`}>
          {comp.component_name}
          {isAi && <Sparkles className="inline w-3 h-3 ml-0.5 text-orange-400" />}
        </span>
        {(qtyStr || prepStr) && (
          <span className="text-xs text-[#9E7E60] ml-1.5">
            {qtyStr && `(${qtyStr})`}
            {qtyStr && prepStr && ' '}
            {prepStr && `(${prepStr})`}
          </span>
        )}
        {comp.supplier && (
          <span className="text-xs text-[#C4B090] ml-1.5 italic">{comp.supplier}</span>
        )}
      </div>
      {/* Buttons: always 30% visible, full on hover — like sandbox */}
      <div className="flex items-center gap-0 opacity-30 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onStartEdit(comp)}
          className="p-1 rounded text-[#B8997A] hover:text-amber-600 hover:bg-amber-50 transition-all"
          title="Bewerken"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={() => onDeleteClick(comp.id)}
          className="p-1 rounded text-[#B8997A] hover:text-red-500 hover:bg-red-50 transition-all"
          title="Verwijderen"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
