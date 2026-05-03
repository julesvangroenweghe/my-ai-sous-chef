'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, CalendarDays, Users, MapPin, Clock, Euro,
  ChefHat, Loader2, Check, X, Pencil, Trash2,
  AlertTriangle, ShieldCheck, Plus,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MepEvent {
  id: string
  name: string
  event_date: string
  event_type: string | null
  num_persons: number | null
  location: string | null
  contact_person: string | null
  departure_time: string | null
  arrival_time: string | null
  price_per_person: number | null
  status: string
  notes: string | null
}

interface MepDish {
  id: string
  event_id: string
  title: string
  category: string
  sort_order: number
  is_ai_suggestion: boolean
  notes: string | null
  timing_label: string | null
  components: MepComponent[]
}

interface MepComponent {
  id: string
  dish_id: string
  component_name: string
  quantity: number | null
  unit: string | null
  preparation: string | null
  sort_order: number
  is_ai_suggestion: boolean
  component_group: string | null
  supplier: string | null
}

// ─── Category ordering ────────────────────────────────────────────────────────

const CAT_ORDER: Record<string, number> = {
  'dranken': 1,
  'mocktails': 2,
  'fingerfood middag': 3,
  'fingerfood apero': 4,
  'fingerfood': 5,
  'fingerbites': 10,
  'hapjes': 15,
  'hapje_warm': 15,
  'amuse': 20,
  'appetizers': 25,
  'appetizer': 25,
  'walking voorgerecht': 28,
  'walking dinner': 30,
  'walking': 30,
  'foodstand': 33,
  'bbq': 34,
  'voorgerecht': 35,
  'buffet': 37,
  'tussengerecht': 40,
  'hoofdgerecht': 45,
  'on the side': 50,
  'sauzen': 52,
  'kaas': 60,
  'dessert middag': 63,
  'dessert': 65,
  'dessert avond': 66,
  'walking dessert': 68,
  'after snacks': 72,
  'petits fours': 70,
  'barista mignardises': 200,
  'mignardises': 200,
  'halfabricaat': 250,
}

function getCategoryOrder(cat: string): number {
  const lower = cat.toLowerCase().trim()
  // Exact match first
  if (CAT_ORDER[lower] !== undefined) return CAT_ORDER[lower]
  // MIDDAG/APERO awareness: check these before partial matching
  if (lower.includes('middag')) {
    if (lower.includes('fingerfood')) return CAT_ORDER['fingerfood middag']
    if (lower.includes('dessert')) return CAT_ORDER['dessert middag']
    return 3
  }
  if (lower.includes('apero')) {
    if (lower.includes('fingerfood')) return CAT_ORDER['fingerfood apero']
    return 4
  }
  if (lower.includes('avond') && lower.includes('dessert')) return CAT_ORDER['dessert avond']
  // Sort by key length descending so more-specific keys match first
  const sortedKeys = Object.keys(CAT_ORDER).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    if (lower.includes(key)) return CAT_ORDER[key]
  }
  return 99
}

const CAT_LABELS: Record<string, string> = {
  'DRANKEN': 'Dranken',
  'MOCKTAILS': 'Mocktails',
  'FINGERFOOD': 'Fingerfood',
  'FINGERFOOD MIDDAG': 'Fingerfood — Middag receptie',
  'FINGERFOOD APERO': 'Fingerfood — Avond receptie',
  'FINGERBITES': 'Fingerbites',
  'HAPJES': 'Hapjes',
  'HAPJE_WARM': 'Hapjes (warm)',
  'AMUSE': 'Amuse',
  'APPETIZERS': 'Appetizers',
  'WALKING DINNER': 'Walking Dinner',
  'WALKING VOORGERECHT': 'Walking Voorgerecht',
  'VOORGERECHT': 'Voorgerecht',
  'TUSSENGERECHT': 'Tussengerecht',
  'HOOFDGERECHT': 'Hoofdgerecht',
  'ON THE SIDE': 'On the Side',
  'SAUZEN': 'Sauzen',
  'KAAS': 'Kaasgang',
  'DESSERT': 'Dessert',
  'DESSERT MIDDAG': 'Dessert — Middag receptie',
  'DESSERT AVOND': 'Dessert — Avond receptie',
  'WALKING DESSERT': 'Walking Dessert',
  'PETITS FOURS': 'Petits Fours',
  'MIGNARDISES': 'Mignardises',
  'BARISTA MIGNARDISES': 'Mignardises (Barista)',
  'HALFABRICAAT': 'Halfabricaten',
  'BBQ': 'BBQ',
  'BUFFET': 'Buffet',
  'AFTER SNACKS': 'After Snacks',
}

function getCategoryLabel(cat: string): string {
  return CAT_LABELS[cat.toUpperCase()] || cat
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  walking_dinner: 'Walking Dinner',
  buffet: 'Buffet',
  sit_down: 'Diner aan tafel',
  seated_dinner: 'Diner aan tafel',
  cocktail: 'Cocktailreceptie',
  brunch: 'Brunch',
  tasting: 'Proeverijtje',
  daily_service: 'Dagdienst',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('nl-BE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatQty(qty: number | null, unit: string | null): string {
  if (!qty) return ''
  const u = unit || ''
  if (qty >= 1000 && (u === 'g' || u === 'ml')) {
    return `${qty % 1000 === 0 ? qty / 1000 : (qty / 1000).toFixed(1)} ${u === 'g' ? 'kg' : 'L'}`
  }
  return `${qty % 1 === 0 ? qty : qty.toFixed(1)} ${u}`.trim()
}

// ─── AddComponentForm ─────────────────────────────────────────────────────────

function AddComponentForm({
  onSave,
  onCancel,
}: {
  onSave: (data: {
    name: string
    qty: number | null
    unit: string | null
    prep: string | null
    supplier: string | null
  }) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [unit, setUnit] = useState('')
  const [prep, setPrep] = useState('')
  const [supplier, setSupplier] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave({
      name: name.trim(),
      qty: qty ? parseFloat(qty) : null,
      unit: unit.trim() || null,
      prep: prep.trim() || null,
      supplier: supplier.trim() || null,
    })
    setSaving(false)
  }

  return (
    <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-3 space-y-2 mt-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Plus className="w-3 h-3 text-emerald-600" />
        <span className="text-xs font-semibold text-emerald-700">Nieuw component</span>
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
        className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-sm text-[#2C1810] focus:border-emerald-400 focus:outline-none"
        placeholder="Naam component *"
      />
      <div className="flex gap-2">
        <input
          type="number"
          step="any"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
          className="w-20 px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-sm text-[#2C1810] focus:border-emerald-400 focus:outline-none"
          placeholder="Qty"
        />
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
          className="w-16 px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-sm text-[#2C1810] focus:border-emerald-400 focus:outline-none"
          placeholder="Unit"
        />
        <input
          value={prep}
          onChange={(e) => setPrep(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
          className="flex-1 px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-sm text-[#2C1810] focus:border-emerald-400 focus:outline-none"
          placeholder="Bereiding (optioneel)"
        />
      </div>
      <input
        value={supplier}
        onChange={(e) => setSupplier(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
        className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-sm text-[#2C1810] focus:border-emerald-400 focus:outline-none"
        placeholder="Leverancier (optioneel)"
      />
      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-[#9E7E60] hover:text-[#3D2810] transition-colors"
        >
          Annuleren
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
        >
          {saving ? 'Toevoegen...' : '+ Toevoegen'}
        </button>
      </div>
    </div>
  )
}

// ─── InlineComponentEdit ──────────────────────────────────────────────────────

function InlineComponentEdit({
  component,
  onSave,
  onCancel,
}: {
  component: MepComponent
  onSave: (updates: Partial<MepComponent>) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(component.component_name)
  const [qty, setQty] = useState(component.quantity?.toString() || '')
  const [unit, setUnit] = useState(component.unit || '')
  const [prep, setPrep] = useState(component.preparation || '')
  const [supplier, setSupplier] = useState(component.supplier || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave({
      component_name: name.trim(),
      quantity: qty ? parseFloat(qty) : null,
      unit: unit.trim() || null,
      preparation: prep.trim() || null,
      supplier: supplier.trim() || null,
    })
    setSaving(false)
  }

  return (
    <div className="bg-[#FDF8F2]/80 border border-[#E8A040]/30 rounded-xl p-3 space-y-2 my-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
        className="w-full px-2.5 py-1.5 bg-white border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:border-[#E8A040]/50 focus:outline-none"
        placeholder="Naam component"
      />
      <div className="flex gap-2">
        <input
          type="number"
          step="any"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-20 px-2.5 py-1.5 bg-white border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:border-[#E8A040]/50 focus:outline-none"
          placeholder="Qty"
        />
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="w-16 px-2.5 py-1.5 bg-white border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:border-[#E8A040]/50 focus:outline-none"
          placeholder="Unit"
        />
        <input
          value={prep}
          onChange={(e) => setPrep(e.target.value)}
          className="flex-1 px-2.5 py-1.5 bg-white border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:border-[#E8A040]/50 focus:outline-none"
          placeholder="Bereiding / instructie"
        />
      </div>
      <input
        value={supplier}
        onChange={(e) => setSupplier(e.target.value)}
        className="w-full px-2.5 py-1.5 bg-white border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:border-[#E8A040]/50 focus:outline-none"
        placeholder="Leverancier (optioneel)"
      />
      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-[#9E7E60] hover:text-[#3D2810] transition-colors"
        >
          Annuleren
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="px-3 py-1.5 bg-[#E8A040] hover:bg-[#d4922e] text-stone-900 text-xs font-bold rounded-lg transition-all disabled:opacity-50"
        >
          {saving ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>
    </div>
  )
}

// ─── ComponentRow ─────────────────────────────────────────────────────────────

function ComponentRow({
  component,
  onApprove,
  onEdit,
  onDelete,
}: {
  component: MepComponent
  onApprove: () => void
  onEdit: (updates: Partial<MepComponent>) => Promise<void>
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isAI = component.is_ai_suggestion

  if (editing) {
    return (
      <InlineComponentEdit
        component={component}
        onSave={async (updates) => {
          await onEdit(updates)
          setEditing(false)
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div
      className={`group flex items-start gap-2 py-0.5 px-2 rounded hover:bg-[#FDF8F2]/60 transition-all ${
        isAI ? 'border-l-2 border-orange-400/60 pl-3 ml-0' : ''
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          {(component.quantity || component.unit) && (
            <span
              className={`text-sm font-mono font-semibold shrink-0 ${
                isAI ? 'text-orange-500' : 'text-[#E8A040]'
              }`}
            >
              {formatQty(component.quantity, component.unit)}
            </span>
          )}
          <span className={`text-sm ${isAI ? 'text-orange-700' : 'text-[#2C1810]'}`}>
            {component.component_name}
          </span>
          {component.supplier && (
            <span className="text-xs text-[#B8997A] shrink-0">({component.supplier})</span>
          )}
        </div>
        {component.preparation && (
          <p className={`text-xs mt-0.5 italic leading-relaxed ${isAI ? 'text-orange-400' : 'text-[#9E7E60]'}`}>
            {component.preparation}
          </p>
        )}
      </div>

      {/* Action buttons — always slightly visible, full on hover */}
      <div className="flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
        {isAI && (
          <button
            onClick={onApprove}
            className="p-1 rounded bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 transition-all"
            title="Goedkeuren"
          >
            <Check className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={() => setEditing(true)}
          className="p-1 rounded text-[#B8997A] hover:text-[#E8A040] hover:bg-[#E8A040]/10 transition-all"
          title="Aanpassen"
        >
          <Pencil className="w-3 h-3" />
        </button>
        {confirmDelete ? (
          <>
            <button
              onClick={onDelete}
              className="px-2 py-0.5 rounded bg-red-500/20 text-red-500 hover:bg-red-500/30 text-xs font-medium transition-all"
            >
              Ja
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="p-1 rounded text-[#9E7E60] hover:text-[#3D2810] transition-all"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-1 rounded text-[#B8997A] hover:text-red-500 hover:bg-red-500/10 transition-all"
            title="Verwijderen"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── DishCard ─────────────────────────────────────────────────────────────────

function DishCard({
  dish,
  onApproveComponent,
  onUpdateComponent,
  onDeleteComponent,
  onApproveDish,
  onAddComponent,
  onEditTitle,
}: {
  dish: MepDish
  onApproveComponent: (componentId: string) => void
  onUpdateComponent: (componentId: string, updates: Partial<MepComponent>) => Promise<void>
  onDeleteComponent: (componentId: string) => void
  onApproveDish: (dishId: string) => void
  onAddComponent: (dishId: string, data: { name: string; qty: number | null; unit: string | null; prep: string | null; supplier: string | null }) => Promise<void>
  onEditTitle: (dishId: string, newTitle: string) => Promise<void>
}) {
  const isAI = dish.is_ai_suggestion
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(dish.title)
  const [savingTitle, setSavingTitle] = useState(false)

  const handleSaveTitle = async () => {
    if (!titleValue.trim() || titleValue === dish.title) {
      setEditingTitle(false)
      return
    }
    setSavingTitle(true)
    await onEditTitle(dish.id, titleValue.trim())
    setSavingTitle(false)
    setEditingTitle(false)
  }

  // Sort components and group by component_group
  const sorted = [...dish.components].sort((a, b) => a.sort_order - b.sort_order)
  const ungrouped: MepComponent[] = sorted.filter((c) => !c.component_group)
  const groupsMap: Record<string, MepComponent[]> = {}
  for (const c of sorted.filter((c) => c.component_group)) {
    const g = c.component_group!
    if (!groupsMap[g]) groupsMap[g] = []
    groupsMap[g].push(c)
  }

  return (
    <div
      className={`bg-white/70 border rounded-xl overflow-hidden transition-all ${
        isAI ? 'border-orange-300/60 shadow-orange-100/50 shadow-sm' : 'border-[#E8D5B5]'
      }`}
    >
      {/* Dish header */}
      <div
        className={`px-3 py-1.5 flex items-center justify-between gap-3 ${
          isAI ? 'bg-orange-50/60' : 'bg-[#FDFAF6]/90'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isAI && (
            <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md font-semibold shrink-0 border border-orange-200">
              AI
            </span>
          )}

          {/* Inline title edit */}
          {editingTitle ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <input
                autoFocus
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle()
                  if (e.key === 'Escape') { setTitleValue(dish.title); setEditingTitle(false) }
                }}
                className="flex-1 px-2 py-0.5 text-sm font-semibold bg-white border border-[#E8A040]/50 rounded focus:outline-none text-[#2C1810]"
              />
              <button
                onClick={handleSaveTitle}
                disabled={savingTitle}
                className="p-1 rounded bg-[#E8A040]/20 text-[#E8A040] hover:bg-[#E8A040]/30 transition-all"
              >
                {savingTitle ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              </button>
              <button
                onClick={() => { setTitleValue(dish.title); setEditingTitle(false) }}
                className="p-1 rounded text-[#9E7E60] hover:text-[#3D2810] transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-1 min-w-0 group/title">
              <h4
                className={`text-sm font-semibold truncate cursor-pointer hover:underline decoration-dotted ${
                  isAI ? 'text-orange-700' : 'text-[#2C1810]'
                }`}
                onClick={() => setEditingTitle(true)}
                title="Klik om te bewerken"
              >
                {dish.title}
              </h4>
              <button
                onClick={() => setEditingTitle(true)}
                className="opacity-0 group-hover/title:opacity-60 hover:!opacity-100 p-0.5 rounded text-[#B8997A] transition-all"
                title="Titel bewerken"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}

          {dish.timing_label && (
            <span className="text-xs text-[#B8997A] shrink-0 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {dish.timing_label}
            </span>
          )}
        </div>
        {isAI && (
          <button
            onClick={() => onApproveDish(dish.id)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-emerald-500/20 text-emerald-700 hover:bg-emerald-500/30 rounded-lg transition-all font-semibold shrink-0 border border-emerald-500/20"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Goedkeuren
          </button>
        )}
      </div>

      {/* Dish notes */}
      {dish.notes && (
        <div className="px-4 py-1.5 text-xs italic text-[#9E7E60] border-b border-[#E8D5B5]/50 bg-[#FDF8F2]/30">
          {dish.notes}
        </div>
      )}

      {/* Components */}
      <div className="px-2 py-1 space-y-0">
        {ungrouped.map((c) => (
          <ComponentRow
            key={c.id}
            component={c}
            onApprove={() => onApproveComponent(c.id)}
            onEdit={(updates) => onUpdateComponent(c.id, updates)}
            onDelete={() => onDeleteComponent(c.id)}
          />
        ))}

        {Object.entries(groupsMap).map(([groupName, components]) => (
          <div key={groupName} className="mt-2.5">
            <div className="flex items-center gap-2 px-2 mb-1">
              <span className="h-px flex-1 bg-[#E8D5B5]/70" />
              <span className="text-[10px] font-semibold text-[#B8997A] uppercase tracking-wider">
                {groupName}
              </span>
              <span className="h-px flex-1 bg-[#E8D5B5]/70" />
            </div>
            {components.map((c) => (
              <ComponentRow
                key={c.id}
                component={c}
                onApprove={() => onApproveComponent(c.id)}
                onEdit={(updates) => onUpdateComponent(c.id, updates)}
                onDelete={() => onDeleteComponent(c.id)}
              />
            ))}
          </div>
        ))}

        {/* Add component form or button */}
        {showAddForm ? (
          <AddComponentForm
            onSave={async (data) => {
              await onAddComponent(dish.id, data)
              setShowAddForm(false)
            }}
            onCancel={() => setShowAddForm(false)}
          />
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full mt-1.5 py-1.5 flex items-center justify-center gap-1.5 text-xs text-[#B8997A] hover:text-[#E8A040] hover:bg-[#E8A040]/5 rounded-lg border border-dashed border-[#E8D5B5] hover:border-[#E8A040]/40 transition-all"
          >
            <Plus className="w-3 h-3" />
            Component toevoegen
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MepDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const supabase = createClient()

  const [event, setEvent] = useState<MepEvent | null>(null)
  const [dishes, setDishes] = useState<MepDish[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingEvent, setApprovingEvent] = useState(false)
  const [confirmApproveEvent, setConfirmApproveEvent] = useState(false)

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)

    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (eventError || !eventData) {
      setLoading(false)
      return
    }
    setEvent(eventData)

    const { data: dishData } = await supabase
      .from('mep_dishes')
      .select('*')
      .eq('event_id', id)
      .order('sort_order')

    if (!dishData || dishData.length === 0) {
      setDishes([])
      setLoading(false)
      return
    }

    const dishIds = dishData.map((d: any) => d.id)

    const { data: componentData } = await supabase
      .from('mep_components')
      .select('*')
      .in('dish_id', dishIds)
      .order('sort_order')

    const componentsByDish: Record<string, MepComponent[]> = {}
    for (const c of componentData || []) {
      if (!componentsByDish[c.dish_id]) componentsByDish[c.dish_id] = []
      componentsByDish[c.dish_id].push(c)
    }

    setDishes(
      dishData.map((d: any) => ({
        ...d,
        components: componentsByDish[d.id] || [],
      }))
    )
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Handlers ──

  const handleApproveComponent = async (componentId: string) => {
    const { error } = await supabase
      .from('mep_components')
      .update({ is_ai_suggestion: false })
      .eq('id', componentId)
    if (error) { toast.error('Goedkeuren mislukt'); return }
    setDishes((prev) =>
      prev.map((d) => ({
        ...d,
        components: d.components.map((c) =>
          c.id === componentId ? { ...c, is_ai_suggestion: false } : c
        ),
      }))
    )
    toast.success('Component goedgekeurd ✓')
  }

  const handleUpdateComponent = async (componentId: string, updates: Partial<MepComponent>) => {
    const { error } = await supabase
      .from('mep_components')
      .update(updates)
      .eq('id', componentId)
    if (error) { toast.error('Opslaan mislukt'); return }
    setDishes((prev) =>
      prev.map((d) => ({
        ...d,
        components: d.components.map((c) =>
          c.id === componentId ? { ...c, ...updates } : c
        ),
      }))
    )
    toast.success('Component bijgewerkt ✓')
  }

  const handleDeleteComponent = async (componentId: string) => {
    const { error } = await supabase
      .from('mep_components')
      .delete()
      .eq('id', componentId)
    if (error) { toast.error('Verwijderen mislukt'); return }
    setDishes((prev) =>
      prev.map((d) => ({
        ...d,
        components: d.components.filter((c) => c.id !== componentId),
      }))
    )
    toast.success('Component verwijderd')
  }

  const handleApproveDish = async (dishId: string) => {
    const { error: dishErr } = await supabase
      .from('mep_dishes')
      .update({ is_ai_suggestion: false })
      .eq('id', dishId)
    const { error: compErr } = await supabase
      .from('mep_components')
      .update({ is_ai_suggestion: false })
      .eq('dish_id', dishId)
    if (dishErr || compErr) { toast.error('Goedkeuren mislukt'); return }
    setDishes((prev) =>
      prev.map((d) =>
        d.id === dishId
          ? {
              ...d,
              is_ai_suggestion: false,
              components: d.components.map((c) => ({ ...c, is_ai_suggestion: false })),
            }
          : d
      )
    )
    toast.success('Gerecht goedgekeurd ✓')
  }

  const handleAddComponent = async (
    dishId: string,
    data: { name: string; qty: number | null; unit: string | null; prep: string | null; supplier: string | null }
  ) => {
    const dish = dishes.find((d) => d.id === dishId)
    const maxOrder = dish
      ? Math.max(0, ...dish.components.map((c) => c.sort_order)) + 1
      : 1

    const { data: newComp, error } = await supabase
      .from('mep_components')
      .insert({
        dish_id: dishId,
        component_name: data.name,
        quantity: data.qty,
        unit: data.unit,
        preparation: data.prep,
        supplier: data.supplier,
        sort_order: maxOrder,
        is_ai_suggestion: false,
        component_group: null,
      })
      .select()
      .single()

    if (error || !newComp) { toast.error('Toevoegen mislukt'); return }

    setDishes((prev) =>
      prev.map((d) =>
        d.id === dishId
          ? { ...d, components: [...d.components, newComp as MepComponent] }
          : d
      )
    )
    toast.success(`${data.name} toegevoegd ✓`)
  }

  const handleEditDishTitle = async (dishId: string, newTitle: string) => {
    const { error } = await supabase
      .from('mep_dishes')
      .update({ title: newTitle })
      .eq('id', dishId)
    if (error) { toast.error('Opslaan mislukt'); return }
    setDishes((prev) =>
      prev.map((d) => (d.id === dishId ? { ...d, title: newTitle } : d))
    )
    toast.success('Titel bijgewerkt ✓')
  }

  const handleApproveEvent = async () => {
    if (!event) return
    setApprovingEvent(true)

    // Approve all dishes and components
    const dishIds = dishes.map((d) => d.id)
    const { error: eventErr } = await supabase
      .from('events')
      .update({ status: 'approved' })
      .eq('id', event.id)

    if (dishIds.length > 0) {
      await supabase
        .from('mep_dishes')
        .update({ is_ai_suggestion: false })
        .in('id', dishIds)
      await supabase
        .from('mep_components')
        .update({ is_ai_suggestion: false })
        .in('dish_id', dishIds)
    }

    if (eventErr) {
      toast.error('Goedkeuren mislukt')
      setApprovingEvent(false)
      return
    }

    setEvent((prev) => prev ? { ...prev, status: 'approved' } : prev)
    setDishes((prev) =>
      prev.map((d) => ({
        ...d,
        is_ai_suggestion: false,
        components: d.components.map((c) => ({ ...c, is_ai_suggestion: false })),
      }))
    )
    setConfirmApproveEvent(false)
    setApprovingEvent(false)
    toast.success('Event goedgekeurd ✓ — staat nu in planning')
  }

  // ── Group by category ──

  const categorized = dishes.reduce(
    (acc, dish) => {
      const cat = dish.category || 'OVERIG'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(dish)
      return acc
    },
    {} as Record<string, MepDish[]>
  )

  const sortedCategories = Object.entries(categorized).sort(
    ([a], [b]) => getCategoryOrder(a) - getCategoryOrder(b)
  )

  const totalAI =
    dishes.filter((d) => d.is_ai_suggestion).length +
    dishes.flatMap((d) => d.components).filter((c) => c.is_ai_suggestion).length

  // ── Render ──

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#E8A040] animate-spin" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="text-center py-16">
        <p className="text-[#9E7E60] mb-2">Event niet gevonden</p>
        <Link href="/mep" className="text-[#E8A040] text-sm hover:underline">
          ← Terug naar planning
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <Link
          href="/mep"
          className="p-2 rounded-xl bg-white border border-[#E8D5B5] text-[#9E7E60] hover:text-[#2C1810] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-display font-extrabold text-[#2C1810] truncate">{event.name}</h1>
          <p className="text-[#B8997A] text-sm">{formatDate(event.event_date)}</p>
        </div>

        {/* Status badge + approve button */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full border ${
              event.status === 'approved'
                ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
                : event.status === 'draft'
                ? 'bg-[#FDF8F2] text-[#5C4730] border-[#E8D5B5]'
                : 'bg-[#E8A040]/20 text-[#E8A040] border-[#E8A040]/30'
            }`}
          >
            {event.status === 'approved' ? 'Goedgekeurd' : event.status === 'draft' ? 'Concept' : event.status}
          </span>

          {event.status === 'draft' && (
            confirmApproveEvent ? (
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5">
                <span className="text-xs text-emerald-700 font-medium">Zeker goedkeuren?</span>
                <button
                  onClick={handleApproveEvent}
                  disabled={approvingEvent}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  {approvingEvent ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Ja'}
                </button>
                <button
                  onClick={() => setConfirmApproveEvent(false)}
                  className="p-1 text-[#9E7E60] hover:text-[#3D2810] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmApproveEvent(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Event goedkeuren
              </button>
            )
          )}
        </div>
      </div>

      {/* Event info card */}
      <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {event.num_persons && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#E8A040] shrink-0" />
              <div>
                <div className="text-xs text-[#B8997A]">Personen</div>
                <div className="text-sm font-semibold text-[#2C1810]">{event.num_persons}</div>
              </div>
            </div>
          )}
          {event.price_per_person && (
            <div className="flex items-center gap-2">
              <Euro className="w-4 h-4 text-[#E8A040] shrink-0" />
              <div>
                <div className="text-xs text-[#B8997A]">Prijs p.p.</div>
                <div className="text-sm font-semibold text-[#2C1810]">
                  €{Number(event.price_per_person).toFixed(2)}
                </div>
              </div>
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#E8A040] shrink-0" />
              <div>
                <div className="text-xs text-[#B8997A]">Locatie</div>
                <div className="text-sm font-semibold text-[#2C1810] truncate">{event.location}</div>
              </div>
            </div>
          )}
          {event.event_type && (
            <div className="flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-[#E8A040] shrink-0" />
              <div>
                <div className="text-xs text-[#B8997A]">Type</div>
                <div className="text-sm font-semibold text-[#2C1810]">
                  {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                </div>
              </div>
            </div>
          )}
          {event.departure_time && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#E8A040] shrink-0" />
              <div>
                <div className="text-xs text-[#B8997A]">Vertrek Mariakerke</div>
                <div className="text-sm font-semibold text-[#2C1810]">
                  {String(event.departure_time).slice(0, 5)}
                </div>
              </div>
            </div>
          )}
          {event.arrival_time && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#E8A040] shrink-0" />
              <div>
                <div className="text-xs text-[#B8997A]">Aankomst keuken</div>
                <div className="text-sm font-semibold text-[#2C1810]">
                  {String(event.arrival_time).slice(0, 5)}
                </div>
              </div>
            </div>
          )}
          {event.contact_person && (
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#E8A040] shrink-0" />
              <div>
                <div className="text-xs text-[#B8997A]">Contact</div>
                <div className="text-sm font-semibold text-[#2C1810]">{event.contact_person}</div>
              </div>
            </div>
          )}
        </div>
        {event.notes && (
          <p className="mt-3 text-sm text-[#9E7E60] italic border-t border-[#E8D5B5]/60 pt-3">
            {event.notes}
          </p>
        )}
      </div>

      {/* AI suggestions banner */}
      {totalAI > 0 && (
        <div className="flex items-center gap-3 bg-orange-50/80 border border-orange-200/80 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
          <p className="text-sm text-orange-700 flex-1">
            <strong>{totalAI} AI-suggestie{totalAI !== 1 ? 's' : ''}</strong> wachten op goedkeuring.
            Oranje items zijn nog niet geverifieerd.
          </p>
          {event.status === 'draft' && (
            <button
              onClick={() => setConfirmApproveEvent(true)}
              className="text-xs text-emerald-700 font-semibold hover:underline shrink-0"
            >
              Alles goedkeuren →
            </button>
          )}
        </div>
      )}

      {/* MEP content */}
      {dishes.length === 0 ? (
        <div className="text-center py-16 bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl">
          <ChefHat className="w-10 h-10 text-[#5C4730] mx-auto mb-3 opacity-40" />
          <h3 className="font-display font-semibold text-[#5C4730] mb-2">Nog geen MEP beschikbaar</h3>
          <p className="text-[#B8997A] text-sm">Upload een menu PDF om de MEP automatisch te genereren.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {sortedCategories.map(([category, categoryDishes]) => (
            <section key={category}>
              {/* Category header */}
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#5C4730] shrink-0">
                  {getCategoryLabel(category)}
                </h2>
                <div className="flex-1 h-px bg-[#E8D5B5]" />
                <span className="text-xs text-[#B8997A] shrink-0">
                  {categoryDishes.length} gerecht{categoryDishes.length !== 1 ? 'en' : ''}
                </span>
              </div>

              {/* Dishes */}
              <div className="space-y-2">
                {[...categoryDishes]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((dish) => (
                    <DishCard
                      key={dish.id}
                      dish={dish}
                      onApproveComponent={handleApproveComponent}
                      onUpdateComponent={handleUpdateComponent}
                      onDeleteComponent={handleDeleteComponent}
                      onApproveDish={handleApproveDish}
                      onAddComponent={handleAddComponent}
                      onEditTitle={handleEditDishTitle}
                    />
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
