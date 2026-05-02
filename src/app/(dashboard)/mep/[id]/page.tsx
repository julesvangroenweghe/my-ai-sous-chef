'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  Download,
  Printer,
  ChefHat,
  Loader2,
  CheckSquare,
  Square,
  ClipboardList,
  AlertTriangle,
  Pencil,
  X,
  Euro,
  ShieldCheck,
  GripVertical,
  Trash2,
  Plus,
  Check,
  Link2,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface IngredientRow {
  rci_id: string
  component_id: string
  ingredient_id: string | null
  ingredient_name: string
  quantity_per_person: number
  total_quantity: number
  unit: string
  prep_instruction: string | null
  cost_per_unit: number
  grammage_warning?: boolean
}

interface ComponentRow {
  component_id: string
  component_name: string
  ingredients: IngredientRow[]
}

interface CourseRow {
  menu_item_id: string
  course: string
  course_label: string
  course_order: number
  category_sort_order: number
  recipe_id: string | null
  recipe_name: string
  serving_size_grams: number
  cost_per_person: number
  total_cost: number
  component_group: string | null
  components: ComponentRow[]
}

interface MepData {
  event: {
    name: string
    event_date: string
    num_persons: number
    event_type: string
    location: string | null
    price_per_person: number | null
    status: string
  }
  courses: CourseRow[]
  categories: Array<{ code: string; label: string; sort_order: number }>
  totals: {
    food_cost_per_person: number
    total_food_cost: number
    food_cost_percentage: number
  }
}

interface Financials {
  cost_food: number
  cost_drinks: number
  cost_drinks_nonalc: number
  cost_personnel: number
  cost_logistics: number
  cost_variables: number
  total_revenue: number
}

interface SearchResult {
  id: string
  name: string
  price_per_kg?: number | null
  unit_price?: number | null
  supplier_name?: string
  supplier_id?: string
  type: 'ingredient' | 'supplier_product'
  group?: string
}

interface SaveIngredientPayload {
  ingredient_id: string | null
  ingredient_name: string
  quantity_per_person: number
  unit: string
  prep_instruction: string | null
  component_id: string
  supplier_product_id?: string | null
  cost_per_unit?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('nl-BE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatQty(qty: number, unit: string): string {
  if (qty >= 1000 && (unit === 'g' || unit === 'ml')) {
    const converted = qty / 1000
    const u = unit === 'g' ? 'kg' : 'L'
    return `${converted % 1 === 0 ? converted : converted.toFixed(2)} ${u}`
  }
  if (qty % 1 === 0) return `${qty} ${unit}`
  return `${qty.toFixed(1)} ${unit}`
}

function formatEur(val: number) {
  return `€${val.toFixed(2).replace('.', ',')}`
}

const eventTypeLabels: Record<string, string> = {
  walking_dinner: 'Walking Dinner',
  buffet: 'Buffet',
  sit_down: 'Sit-down Diner',
  cocktail: 'Cocktail',
  brunch: 'Brunch',
  tasting: 'Tasting Menu',
  daily_service: 'Dagdienst',
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Concept', className: 'bg-[#FDF8F2] text-[#5C4730]' },
  confirmed: { label: 'Bevestigd', className: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  in_prep: { label: 'In voorbereiding', className: 'bg-amber-500/20 text-[#E8A040] border border-[#E8A040]/30' },
  approved: { label: 'Goedgekeurd', className: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
  generated: { label: 'Gegenereerd', className: 'bg-sky-500/20 text-sky-400 border border-sky-500/30' },
  completed: { label: 'Afgerond', className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  cancelled: { label: 'Geannuleerd', className: 'bg-red-500/20 text-red-400 border border-red-500/30' },
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function getCheckedState(eventId: string): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(`mep-checked-${eventId}`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveCheckedState(eventId: string, state: Record<string, boolean>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`mep-checked-${eventId}`, JSON.stringify(state))
  } catch {}
}

// ─── Edit Scope Modal ─────────────────────────────────────────────────────────

function EditScopeModal({
  recipeName,
  onClose,
}: {
  recipeName: string
  onClose: () => void
}) {
  const options = [
    {
      id: 'event_only',
      title: 'Eenmalige correctie',
      description: 'Pas hoeveelheden alleen aan voor dit event. Het masterrecept blijft ongewijzigd.',
      icon: CalendarDays,
    },
    {
      id: 'database',
      title: 'Database update',
      description: 'Pas het masterrecept aan. Alle toekomstige events gebruiken de nieuwe hoeveelheden.',
      icon: ChefHat,
    },
    {
      id: 'variant',
      title: 'Nieuw portievariant',
      description: 'Sla op als aparte variant (bijv. "voor 100 pax") zonder het masterrecept te wijzigen.',
      icon: ClipboardList,
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white border border-[#E8D5B5] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-[#2C1810]">Aanpassing scope</h3>
            <p className="text-xs text-[#9E7E60] mt-0.5 truncate">{recipeName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9E7E60] hover:text-[#2C1810] hover:bg-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {options.map((opt) => {
            const Icon = opt.icon
            return (
              <button
                key={opt.id}
                onClick={() => {
                  toast.info(`Scope: ${opt.title}`, {
                    description: 'Functionaliteit binnenkort beschikbaar',
                  })
                  onClose()
                }}
                className="w-full text-left p-4 rounded-xl border border-[#E8D5B5] hover:border-[#E8A040]/50 hover:bg-[#FDF8F2]/80 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 group-hover:bg-[#E8A040]/10 transition-colors">
                    <Icon className="w-4 h-4 text-[#9E7E60] group-hover:text-[#E8A040] transition-colors" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#3D2810] group-hover:text-[#2C1810] transition-colors">
                      {opt.title}
                    </div>
                    <div className="text-xs text-[#B8997A] mt-0.5 leading-relaxed">
                      {opt.description}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Financials Modal ─────────────────────────────────────────────────────────

function FinancialsModal({
  eventId,
  numPersons,
  foodCost,
  onClose,
}: {
  eventId: string
  numPersons: number
  foodCost: number
  onClose: () => void
}) {
  const [financials, setFinancials] = useState<Financials>({
    cost_food: foodCost,
    cost_drinks: 0,
    cost_drinks_nonalc: 0,
    cost_personnel: 0,
    cost_logistics: 0,
    cost_variables: 0,
    total_revenue: 0,
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('event_financials')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFinancials({
            cost_food: Number(data.cost_food) || foodCost,
            cost_drinks: Number(data.cost_drinks) || 0,
            cost_drinks_nonalc: Number(data.cost_drinks_nonalc) || 0,
            cost_personnel: Number(data.cost_personnel) || 0,
            cost_logistics: Number(data.cost_logistics) || 0,
            cost_variables: Number(data.cost_variables) || 0,
            total_revenue: Number(data.total_revenue) || 0,
          })
        }
      })
  }, [eventId])

  const totalCosts =
    financials.cost_food +
    financials.cost_drinks +
    financials.cost_drinks_nonalc +
    financials.cost_personnel +
    financials.cost_logistics +
    financials.cost_variables

  const vatFood = (financials.cost_food + financials.cost_drinks_nonalc) * 0.12
  const vatRest =
    (financials.cost_drinks + financials.cost_personnel + financials.cost_logistics + financials.cost_variables) * 0.21
  const totalInclVat = totalCosts + vatFood + vatRest

  const margin = financials.total_revenue > 0 ? financials.total_revenue - totalCosts : 0
  const marginPct = financials.total_revenue > 0 ? (margin / financials.total_revenue) * 100 : 0

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: existing } = await supabase
        .from('event_financials')
        .select('id')
        .eq('event_id', eventId)
        .maybeSingle()

      const payload = {
        event_id: eventId,
        ...financials,
        total_incl_vat: Math.round(totalInclVat * 100) / 100,
        updated_at: new Date().toISOString(),
      }

      if (existing) {
        await supabase.from('event_financials').update(payload).eq('id', existing.id)
      } else {
        await supabase.from('event_financials').insert(payload)
      }
      toast.success('Financiën opgeslagen')
      onClose()
    } catch {
      toast.error('Opslaan mislukt')
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    { key: 'cost_food' as const, label: 'Food cost', vat: '12%' },
    { key: 'cost_drinks' as const, label: 'Drank (alc.)', vat: '21%' },
    { key: 'cost_drinks_nonalc' as const, label: 'Drank (non-alc.)', vat: '12%' },
    { key: 'cost_personnel' as const, label: 'Personeel', vat: '21%' },
    { key: 'cost_logistics' as const, label: 'Logistiek', vat: '21%' },
    { key: 'cost_variables' as const, label: 'Diversen', vat: '21%' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white border border-[#E8D5B5] rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[#2C1810] flex items-center gap-2">
            <Euro className="w-5 h-5 text-[#E8A040]" />
            Financiën beheren
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9E7E60] hover:text-[#2C1810] hover:bg-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          {fields.map((f) => (
            <div key={f.key} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-xs text-[#9E7E60] mb-1">{f.label}</div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E7E60] text-sm">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={financials[f.key] || ''}
                    onChange={(e) =>
                      setFinancials((prev) => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full pl-7 pr-3 py-2 bg-white border border-[#E8D5B5] rounded-lg text-sm text-[#3D2810] focus:border-[#E8A040]/50 focus:outline-none"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="text-xs text-[#B8997A] w-12 text-center mt-5">BTW {f.vat}</div>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <div className="text-xs text-[#9E7E60] mb-1">Totale omzet (excl. BTW)</div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E7E60] text-sm">€</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={financials.total_revenue || ''}
              onChange={(e) =>
                setFinancials((prev) => ({ ...prev, total_revenue: parseFloat(e.target.value) || 0 }))
              }
              className="w-full pl-7 pr-3 py-2 bg-white border border-[#E8D5B5] rounded-lg text-sm text-[#3D2810] focus:border-[#E8A040]/50 focus:outline-none"
              placeholder="0,00"
            />
          </div>
        </div>

        <div className="bg-[#FDF8F2]/80 rounded-xl p-4 space-y-2 mb-5 border border-[#E8D5B5]">
          <div className="flex justify-between text-sm">
            <span className="text-[#9E7E60]">Totale kosten (excl. BTW)</span>
            <span className="font-mono text-[#3D2810]">{formatEur(totalCosts)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#9E7E60]">BTW totaal</span>
            <span className="font-mono text-[#9E7E60]">{formatEur(vatFood + vatRest)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-[#E8D5B5] pt-2">
            <span className="text-[#5C4730] font-medium">Totaal incl. BTW</span>
            <span className="font-mono font-bold text-[#2C1810]">{formatEur(totalInclVat)}</span>
          </div>
          {financials.total_revenue > 0 && (
            <div className="flex justify-between text-sm border-t border-[#E8D5B5] pt-2">
              <span className="text-[#9E7E60]">Marge</span>
              <span className={`font-mono font-bold ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatEur(margin)} ({marginPct.toFixed(1)}%)
              </span>
            </div>
          )}
        </div>

        <div className="bg-white/30 rounded-xl p-3 mb-5 border border-[#E8D5B5]/60">
          <div className="text-xs font-medium text-[#9E7E60] mb-2 uppercase tracking-wider">Personeelstarieven</div>
          <div className="grid grid-cols-2 gap-1 text-xs text-[#9E7E60]">
            <span>Bediening: €45/u</span>
            <span>Maître: €60/u</span>
            <span>Chefs: €45/u</span>
            <span>Opbouw: €45/u</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 bg-white hover:bg-[#FDF8F2] border border-[#E8D5B5] text-[#5C4730] text-sm font-medium rounded-xl transition-all">
            Annuleren
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-[#E8A040] hover:bg-[#d4922e] text-stone-900 text-sm font-bold rounded-xl transition-all disabled:opacity-50"
          >
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── InlineEditForm ───────────────────────────────────────────────────────────

function PriceEstimate({ qty, unit, pricePerKg }: { qty: number; unit: string; pricePerKg: number }) {
  let costPerPerson = 0
  if (unit === 'gr') costPerPerson = (qty / 1000) * pricePerKg
  else if (unit === 'kg') costPerPerson = qty * pricePerKg
  else if (unit === 'ml') costPerPerson = (qty / 1000) * pricePerKg
  else if (unit === 'l') costPerPerson = qty * pricePerKg
  else costPerPerson = (qty / 1000) * pricePerKg // fallback

  if (costPerPerson <= 0) return null
  return (
    <span className="text-[#E8A040] font-mono text-xs ml-auto shrink-0">
      ~€{costPerPerson.toFixed(3)}/p
    </span>
  )
}

function InlineEditForm({
  ingredient,
  componentId,
  subGroups,
  onSave,
  onCancel,
  isNew = false,
}: {
  ingredient?: IngredientRow
  componentId: string
  subGroups: Array<{ id: string; name: string }>
  onSave: (payload: SaveIngredientPayload & { supplier_product_id?: string | null }) => Promise<void>
  onCancel: () => void
  isNew?: boolean
}) {
  const [qty, setQty] = useState(isNew ? 0 : ingredient?.quantity_per_person || 0)
  const [unit, setUnit] = useState(isNew ? 'gr' : ingredient?.unit || 'gr')
  const [prep, setPrep] = useState(isNew ? '' : ingredient?.prep_instruction || '')
  const [selectedComponentId, setSelectedComponentId] = useState(componentId)

  // Linked ingredient (from ingredients table)
  const [linkedIngredient, setLinkedIngredient] = useState<SearchResult | null>(
    !isNew && ingredient?.ingredient_id
      ? { id: ingredient.ingredient_id, name: ingredient.ingredient_name, type: 'ingredient' }
      : null
  )
  // Linked supplier product (separate from ingredient)
  const [linkedSupplier, setLinkedSupplier] = useState<SearchResult | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ results: SearchResult[]; groups: Array<{ name: string; items: SearchResult[] }> }>({ results: [], groups: [] })
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [saving, setSaving] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()
  const searchRef = useRef<HTMLDivElement>(null)

  // Auto-suggest on open: search by ingredient name
  useEffect(() => {
    const name = ingredient?.ingredient_name || ''
    if (name.length >= 2 && !linkedIngredient) {
      doSearch(name)
      setSearchQuery(name)
      setShowSearch(true)
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const doSearch = async (q: string) => {
    if (q.length < 1) {
      setSearchResults({ results: [], groups: [] })
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/mep/ingredient-search?q=${encodeURIComponent(q)}&mode=suggest`)
      const json = await res.json()
      setSearchResults({ results: json.results || [], groups: json.groups || [] })
    } catch {
      setSearchResults({ results: [], groups: [] })
    } finally {
      setSearching(false)
    }
  }

  const handleSearchChange = (q: string) => {
    setSearchQuery(q)
    setShowSearch(true)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => doSearch(q), 250)
  }

  const selectResult = (r: SearchResult) => {
    if (r.type === 'ingredient') {
      setLinkedIngredient(r)
    } else {
      // supplier_product: set as supplier link
      setLinkedSupplier(r)
    }
    setSearchQuery('')
    setShowSearch(false)
    setSearchResults({ results: [], groups: [] })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const costPerUnit = linkedSupplier?.price_per_kg
        ? unit === 'gr'
          ? linkedSupplier.price_per_kg / 1000
          : unit === 'kg'
          ? linkedSupplier.price_per_kg
          : linkedSupplier.price_per_kg / 1000
        : undefined

      await onSave({
        ingredient_id: linkedIngredient?.id || null,
        ingredient_name: linkedIngredient?.name || ingredient?.ingredient_name || '',
        quantity_per_person: qty,
        unit,
        prep_instruction: prep || null,
        component_id: selectedComponentId,
        supplier_product_id: linkedSupplier?.id || null,
        ...(costPerUnit !== undefined ? { cost_per_unit: costPerUnit } : {}),
      })
    } finally {
      setSaving(false)
    }
  }

  const displayName = linkedIngredient?.name || ingredient?.ingredient_name || ''

  return (
    <div className="mx-4 mb-3 bg-[#FDF8F2] border border-[#E8D5B5] rounded-xl p-4 space-y-3">
      {/* Ingredient name display */}
      {displayName && (
        <div className="px-3 py-2 bg-white border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] font-medium flex items-center gap-2">
          {linkedIngredient && <Link2 className="w-3.5 h-3.5 text-[#E8A040] shrink-0" />}
          <span className="flex-1">{displayName}</span>
          {linkedIngredient && (
            <button onClick={() => setLinkedIngredient(null)} className="text-[#B8997A] hover:text-[#E8A040] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Qty / Unit / Prep */}
      <div className="flex gap-2">
        <input
          type="number"
          value={qty || ''}
          onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
          placeholder="0"
          className="w-20 px-3 py-2 bg-white border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:border-[#E8A040]/50 focus:outline-none"
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="w-20 px-2 py-2 bg-white border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:border-[#E8A040]/50 focus:outline-none"
        >
          <option value="gr">gr</option>
          <option value="ml">ml</option>
          <option value="stuk">stuk</option>
          <option value="cl">cl</option>
          <option value="kg">kg</option>
          <option value="l">l</option>
          <option value="tl">tl</option>
          <option value="el">el</option>
        </select>
        <input
          value={prep}
          onChange={(e) => setPrep(e.target.value)}
          placeholder="Bereiding"
          className="flex-1 px-3 py-2 bg-white border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:border-[#E8A040]/50 focus:outline-none"
        />
      </div>

      {/* Supplier link badge */}
      {linkedSupplier ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E8A040]/40 rounded-lg">
          <div className="w-5 h-5 rounded-md bg-[#E8A040]/10 flex items-center justify-center shrink-0">
            <Link2 className="w-3 h-3 text-[#E8A040]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-[#3D2810] truncate">{linkedSupplier.name}</div>
            <div className="text-xs text-[#9E7E60]">
              {linkedSupplier.supplier_name && <span>{linkedSupplier.supplier_name} · </span>}
              {linkedSupplier.price_per_kg && (
                <span className="text-[#E8A040]">€{linkedSupplier.price_per_kg.toFixed(2)}/kg</span>
              )}
              {linkedSupplier.unit_price && !linkedSupplier.price_per_kg && (
                <span className="text-[#E8A040]">€{linkedSupplier.unit_price.toFixed(2)}/stuk</span>
              )}
            </div>
          </div>
          {linkedSupplier.price_per_kg && qty > 0 && (
            <PriceEstimate qty={qty} unit={unit} pricePerKg={linkedSupplier.price_per_kg} />
          )}
          <button onClick={() => setLinkedSupplier(null)} className="text-[#B8997A] hover:text-red-400 transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null}

      {/* Search box */}
      <div className="relative" ref={searchRef}>
        <div className="relative">
          <input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => {
              if (searchQuery.length >= 1) setShowSearch(true)
              else if (!linkedIngredient) {
                const name = ingredient?.ingredient_name || ''
                if (name.length >= 2) { handleSearchChange(name) }
              }
            }}
            placeholder={linkedIngredient ? 'Leverancier koppelen...' : 'Zoek ingrediënt of leverancier...'}
            className="w-full pl-8 pr-3 py-2 bg-white border border-[#E8D5B5] rounded-lg text-xs text-[#2C1810] focus:border-[#E8A040]/50 focus:outline-none placeholder:text-[#B8997A]"
          />
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
            {searching
              ? <Loader2 className="w-3.5 h-3.5 text-[#9E7E60] animate-spin" />
              : <Link2 className="w-3.5 h-3.5 text-[#B8997A]" />}
          </div>
        </div>

        {/* Dropdown: grouped results */}
        {showSearch && searchResults.groups.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E8D5B5] rounded-xl z-30 max-h-56 overflow-y-auto shadow-xl">
            {searchResults.groups.map((group) => (
              <div key={group.name}>
                <div className="px-3 py-1.5 text-[10px] font-bold text-[#B8997A] uppercase tracking-wider bg-[#FDF8F2] border-b border-[#E8D5B5]/60 sticky top-0">
                  {group.name}
                </div>
                {group.items.map((r) => (
                  <button
                    key={r.id}
                    onMouseDown={(e) => { e.preventDefault(); selectResult(r) }}
                    className="w-full text-left px-3 py-2.5 text-xs hover:bg-[#FEF3E2] text-[#2C1810] border-b border-[#E8D5B5]/30 last:border-0 transition-colors flex items-center gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block truncate">{r.name}</span>
                      {r.supplier_name && (
                        <span className="text-[#9E7E60] text-[10px]">{r.supplier_name}</span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {r.price_per_kg && (
                        <span className="text-[#E8A040] font-mono">€{r.price_per_kg.toFixed(2)}/kg</span>
                      )}
                      {r.unit_price && !r.price_per_kg && (
                        <span className="text-[#9E7E60] font-mono">€{r.unit_price.toFixed(2)}</span>
                      )}
                      <span className="text-[#B8997A] text-[10px] block">
                        {r.type === 'ingredient' ? 'Ingrediënt' : 'Leverancier'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sub-group selector */}
      {subGroups.length > 1 && (
        <select
          value={selectedComponentId}
          onChange={(e) => setSelectedComponentId(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-[#E8D5B5] rounded-lg text-sm text-[#9E7E60] focus:border-[#E8A040]/50 focus:outline-none"
        >
          {subGroups.map((sg) => (
            <option key={sg.id} value={sg.id}>{sg.name}</option>
          ))}
        </select>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="p-2 rounded-lg text-[#9E7E60] hover:text-[#2C1810] hover:bg-white border border-transparent hover:border-[#E8D5B5] transition-all"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#E8A040] hover:bg-[#d4922e] text-stone-900 text-xs font-bold rounded-lg transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {isNew ? 'Toevoegen' : 'Opslaan'}
        </button>
      </div>
    </div>
  )
}

// ─── IngredientRowItem ────────────────────────────────────────────────────────

function IngredientRowItem({
  ingredient,
  subGroups,
  checked,
  onToggleChecked,
  onSave,
  onDelete,
}: {
  ingredient: IngredientRow
  subGroups: Array<{ id: string; name: string }>
  checked: boolean
  onToggleChecked: () => void
  onSave: (rciId: string, payload: SaveIngredientPayload) => Promise<void>
  onDelete: (rciId: string) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async (payload: SaveIngredientPayload) => {
    await onSave(ingredient.rci_id, payload)
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!confirm(`"${ingredient.ingredient_name}" verwijderen?`)) return
    setDeleting(true)
    try {
      await onDelete(ingredient.rci_id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={`transition-opacity ${checked ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-[#FDF8F2]/60 group transition-colors">
        <span className="text-[#D4C5A9] cursor-grab shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4" />
        </span>

        <button
          onClick={onToggleChecked}
          className="w-5 h-5 shrink-0 text-[#5C4730] hover:text-[#E8A040] transition-colors"
          aria-label={checked ? 'Markeer als niet gedaan' : 'Markeer als gedaan'}
        >
          {checked ? (
            <CheckSquare className="w-5 h-5 text-emerald-500" />
          ) : (
            <Square className="w-5 h-5" />
          )}
        </button>

        <span className={`flex-1 text-sm min-w-0 ${checked ? 'line-through text-[#B8997A]' : 'text-[#3D2810]'}`}>
          {ingredient.ingredient_name}
          {ingredient.quantity_per_person > 0 && (
            <span className="text-[#9E7E60] ml-2 font-mono">
              — {ingredient.quantity_per_person} {ingredient.unit}
            </span>
          )}
          {ingredient.prep_instruction && (
            <span className="text-[#B8997A] ml-1 text-xs italic">
              ({ingredient.prep_instruction})
            </span>
          )}
          {ingredient.ingredient_id && (
            <Link2 className="inline w-3 h-3 text-[#E8A040] ml-1.5 shrink-0" />
          )}
        </span>

        {ingredient.grammage_warning && (
          <span title="Buiten verwachte portiegrootte" className="text-[#E8A040] shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </span>
        )}

        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          <button
            title="Naar recept"
            className="p-1.5 rounded-lg text-[#9E7E60] hover:text-[#2C1810] hover:bg-white transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsEditing((v) => !v)}
            title="Bewerken"
            className={`p-1.5 rounded-lg transition-all ${
              isEditing
                ? 'bg-[#E8A040]/10 text-[#E8A040]'
                : 'text-[#9E7E60] hover:text-[#E8A040] hover:bg-white'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Verwijderen"
            className="p-1.5 rounded-lg text-[#9E7E60] hover:text-red-500 hover:bg-white transition-all disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isEditing && (
        <InlineEditForm
          ingredient={ingredient}
          componentId={ingredient.component_id}
          subGroups={subGroups}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      )}
    </div>
  )
}

// ─── ComponentSection ─────────────────────────────────────────────────────────

function ComponentSection({
  component,
  allComponents,
  numPersons,
  checked,
  onToggleChecked,
  onSaveIngredient,
  onDeleteIngredient,
  onAddIngredient,
  checkKeyPrefix,
}: {
  component: ComponentRow
  allComponents: ComponentRow[]
  numPersons: number
  checked: Record<string, boolean>
  onToggleChecked: (key: string) => void
  onSaveIngredient: (rciId: string, payload: SaveIngredientPayload) => Promise<void>
  onDeleteIngredient: (rciId: string) => Promise<void>
  onAddIngredient: (componentId: string, payload: SaveIngredientPayload) => Promise<void>
  checkKeyPrefix: string
}) {
  const [addingNew, setAddingNew] = useState(false)
  const subGroups = allComponents.map((c) => ({ id: c.component_id, name: c.component_name }))

  const handleAddSave = async (payload: SaveIngredientPayload) => {
    await onAddIngredient(payload.component_id || component.component_id, payload)
    setAddingNew(false)
  }

  return (
    <div>
      <div className="px-4 py-1.5 bg-white/30 border-b border-[#E8D5B5]/30">
        <span className="text-xs font-semibold text-[#E8A040]/90 uppercase tracking-wide">
          {component.component_name}
        </span>
      </div>

      {component.ingredients.length === 0 ? (
        <div className="px-4 py-2 text-xs text-[#B8997A] italic">Geen ingrediënten</div>
      ) : (
        component.ingredients.map((ing, ingIdx) => {
          const checkKey = `${checkKeyPrefix}-${ingIdx}`
          return (
            <IngredientRowItem
              key={ing.rci_id}
              ingredient={ing}
              subGroups={subGroups}
              checked={!!checked[checkKey]}
              onToggleChecked={() => onToggleChecked(checkKey)}
              onSave={onSaveIngredient}
              onDelete={onDeleteIngredient}
            />
          )
        })
      )}

      {addingNew && (
        <InlineEditForm
          componentId={component.component_id}
          subGroups={subGroups}
          onSave={handleAddSave}
          onCancel={() => setAddingNew(false)}
          isNew
        />
      )}

      {!addingNew && (
        <button
          onClick={() => setAddingNew(true)}
          className="flex items-center gap-1.5 mx-4 my-2 px-3 py-1.5 text-xs text-[#9E7E60] hover:text-[#E8A040] hover:bg-[#FDF8F2] rounded-lg border border-dashed border-[#D4C5A9] hover:border-[#E8A040]/50 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          component
        </button>
      )}
    </div>
  )
}

// ─── DishCard ─────────────────────────────────────────────────────────────────

function DishCard({
  course,
  numPersons,
  checked,
  onToggleChecked,
  onSaveIngredient,
  onDeleteIngredient,
  onAddIngredient,
  onEditScope,
  courseGlobalIdx,
}: {
  course: CourseRow
  numPersons: number
  checked: Record<string, boolean>
  onToggleChecked: (key: string) => void
  onSaveIngredient: (rciId: string, payload: SaveIngredientPayload) => Promise<void>
  onDeleteIngredient: (rciId: string) => Promise<void>
  onAddIngredient: (componentId: string, payload: SaveIngredientPayload) => Promise<void>
  onEditScope: (recipeName: string) => void
  courseGlobalIdx: number
}) {
  return (
    <div className="mep-course-block bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 bg-white border-b border-[#E8D5B5] flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[#D4C5A9] shrink-0 cursor-grab">
            <GripVertical className="w-4 h-4" />
          </span>
          <h3 className="font-display text-base font-bold text-[#2C1810] truncate">
            {course.recipe_name}
          </h3>
          {course.serving_size_grams > 0 && (
            <span className="text-xs text-[#B8997A] font-mono shrink-0">
              {course.serving_size_grams}g/p
            </span>
          )}
          <button
            onClick={() => onEditScope(course.recipe_name)}
            className="p-1 rounded text-[#5C4730] hover:text-[#E8A040] transition-colors no-print shrink-0"
            data-no-print
            title="Aanpassing scope"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
        {course.cost_per_person > 0 && (
          <div className="text-right shrink-0 ml-3">
            <div className="font-mono text-sm font-bold text-[#3D2810]">
              {formatEur(course.cost_per_person)}/p
            </div>
            <div className="font-mono text-xs text-[#B8997A]">
              {formatEur(course.total_cost)} totaal
            </div>
          </div>
        )}
      </div>

      <div className="divide-y divide-[#E8D5B5]/40">
        {course.components.length === 0 ? (
          <div className="px-5 py-3 text-[#B8997A] text-sm">
            Geen componenten — voeg ingrediënten toe via het recept
          </div>
        ) : (
          course.components.map((comp, compIdx) => (
            <ComponentSection
              key={comp.component_id}
              component={comp}
              allComponents={course.components}
              numPersons={numPersons}
              checked={checked}
              onToggleChecked={onToggleChecked}
              onSaveIngredient={onSaveIngredient}
              onDeleteIngredient={onDeleteIngredient}
              onAddIngredient={onAddIngredient}
              checkKeyPrefix={`${courseGlobalIdx}-${compIdx}`}
            />
          ))
        )}
      </div>

      <div className="px-4 py-3 border-t border-[#E8D5B5]/40 bg-white/10">
        <button
          onClick={() => {
            toast.info('Sub-groep toevoegen', {
              description: 'Functionaliteit binnenkort beschikbaar',
            })
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#9E7E60] hover:text-[#5C4730] hover:bg-white rounded-lg border border-dashed border-[#D4C5A9] hover:border-[#9E7E60] transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          sub-groep
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MepDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const [data, setData] = useState<MepData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [downloading, setDownloading] = useState(false)
  const [approving, setApproving] = useState(false)
  const [editScopeRecipe, setEditScopeRecipe] = useState<string | null>(null)
  const [showFinancials, setShowFinancials] = useState(false)
  const supabase = createClient()

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/mep/${eventId}`)
      if (res.status === 401) {
        router.push('/login')
        return
      }
      const json = await res.json()
      if (json?.error) {
        setError(json.error)
      } else if (json) {
        setData(json)
      }
    } catch {
      setError('Kon MEP niet laden')
    }
  }, [eventId, router])

  useEffect(() => {
    setLoading(true)
    loadData().finally(() => setLoading(false))
  }, [loadData])

  useEffect(() => {
    setChecked(getCheckedState(eventId))
  }, [eventId])

  const toggleChecked = useCallback(
    (key: string) => {
      setChecked((prev) => {
        const next = { ...prev, [key]: !prev[key] }
        saveCheckedState(eventId, next)
        return next
      })
    },
    [eventId]
  )

  const handleSaveIngredient = useCallback(
    async (rciId: string, payload: SaveIngredientPayload) => {
      try {
        const res = await fetch(`/api/mep/ingredients/${rciId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quantity_per_person: payload.quantity_per_person,
            unit: payload.unit,
            prep_instruction: payload.prep_instruction,
            ingredient_id: payload.ingredient_id,
            component_id: payload.component_id,
            supplier_product_id: payload.supplier_product_id ?? null,
            ...(payload.cost_per_unit !== undefined ? { cost_per_unit: payload.cost_per_unit } : {}),
          }),
        })
        if (!res.ok) {
          const json = await res.json()
          throw new Error(json.error || 'Update mislukt')
        }
        toast.success('Ingredient bijgewerkt')
        await loadData()
      } catch (err: any) {
        toast.error(err.message || 'Update mislukt')
        throw err
      }
    },
    [loadData]
  )

  const handleDeleteIngredient = useCallback(
    async (rciId: string) => {
      try {
        const res = await fetch(`/api/mep/ingredients/${rciId}`, { method: 'DELETE' })
        if (!res.ok) {
          const json = await res.json()
          throw new Error(json.error || 'Verwijderen mislukt')
        }
        toast.success('Ingredient verwijderd')
        await loadData()
      } catch (err: any) {
        toast.error(err.message || 'Verwijderen mislukt')
        throw err
      }
    },
    [loadData]
  )

  const handleAddIngredient = useCallback(
    async (componentId: string, payload: SaveIngredientPayload) => {
      try {
        const res = await fetch('/api/mep/ingredients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            component_id: componentId,
            ingredient_id: payload.ingredient_id,
            ingredient_name: payload.ingredient_name,
            quantity_per_person: payload.quantity_per_person,
            unit: payload.unit,
            prep_instruction: payload.prep_instruction,
          }),
        })
        if (!res.ok) {
          const json = await res.json()
          throw new Error(json.error || 'Toevoegen mislukt')
        }
        toast.success('Ingredient toegevoegd')
        await loadData()
      } catch (err: any) {
        toast.error(err.message || 'Toevoegen mislukt')
        throw err
      }
    },
    [loadData]
  )

  const handleApprove = async () => {
    if (!data) return
    setApproving(true)
    try {
      const res = await fetch(`/api/mep/${eventId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })
      if (!res.ok) throw new Error('Update mislukt')
      setData((prev) =>
        prev ? { ...prev, event: { ...prev.event, status: 'approved' } } : prev
      )
      toast.success('MEP goedgekeurd', {
        description: 'Status bijgewerkt naar Goedgekeurd',
      })
    } catch {
      toast.error('Goedkeuring mislukt')
    } finally {
      setApproving(false)
    }
  }

  const handleDownloadPdf = async () => {
    setDownloading(true)
    try {
      const res = await fetch(`/api/mep/pdf/${eventId}`)
      if (!res.ok) throw new Error('PDF mislukt')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mep-${eventId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('PDF gedownload')
    } catch {
      toast.error('PDF download mislukt')
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = () => window.print()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#E8A040] animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-10 h-10 text-[#E8A040] mx-auto mb-3" />
        <p className="text-[#9E7E60] mb-4">{error || 'MEP niet gevonden'}</p>
        <Link href="/mep" className="text-[#E8A040] hover:text-[#d4922e] text-sm">
          Terug naar planning
        </Link>
      </div>
    )
  }

  if (data.courses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/events/${eventId}`}
            className="p-2 rounded-xl bg-white border border-[#E8D5B5] text-[#9E7E60] hover:text-[#2C1810] transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-2xl font-extrabold text-[#2C1810]">MEP — {data.event.name}</h1>
        </div>
        <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-12 text-center">
          <ChefHat className="w-12 h-12 text-[#5C4730] mx-auto mb-4" />
          <h3 className="text-lg font-display font-semibold text-[#5C4730] mb-2">
            Geen menu items gevonden
          </h3>
          <p className="text-[#B8997A] text-sm mb-6 max-w-md mx-auto">
            Dit event heeft nog geen gerechten in het menu. Voeg eerst gerechten toe via de event pagina.
          </p>
          <Link
            href={`/events/${eventId}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E8A040] hover:bg-[#d4922e] text-stone-900 text-sm font-bold rounded-xl transition-all"
          >
            <ChefHat className="w-4 h-4" /> Ga naar Menu Builder
          </Link>
        </div>
      </div>
    )
  }

  const { event, courses, totals } = data
  const statusInfo = statusConfig[event.status] || statusConfig.draft

  const totalIngredients = courses.reduce(
    (sum, c) => sum + c.components.reduce((s, comp) => s + comp.ingredients.length, 0),
    0
  )
  const totalChecked = Object.values(checked).filter(Boolean).length
  const progressPct = totalIngredients > 0 ? (totalChecked / totalIngredients) * 100 : 0

  const categoryGroups: Array<{
    categoryCode: string
    categoryLabel: string
    categorySortOrder: number
    courses: typeof courses
  }> = []

  for (const course of courses) {
    const existing = categoryGroups.find((g) => g.categoryCode === course.course.toUpperCase())
    if (existing) {
      existing.courses.push(course)
    } else {
      categoryGroups.push({
        categoryCode: course.course.toUpperCase(),
        categoryLabel: course.course_label || course.course,
        categorySortOrder: course.category_sort_order,
        courses: [course],
      })
    }
  }
  categoryGroups.sort((a, b) => a.categorySortOrder - b.categorySortOrder)

  return (
    <>
      <style jsx global>{`
        @media print {
          nav, aside, header, [data-sidebar], [data-no-print], .no-print {
            display: none !important;
          }
          body { background: white !important; }
          .mep-print-content { display: block !important; }
          .mep-course-block { break-inside: avoid; page-break-inside: avoid; }
          * { color: black !important; background: white !important; border-color: #e5e7eb !important; }
          .mep-amber { color: #92400e !important; }
        }
      `}</style>

      {editScopeRecipe && (
        <EditScopeModal
          recipeName={editScopeRecipe}
          onClose={() => setEditScopeRecipe(null)}
        />
      )}

      {showFinancials && (
        <FinancialsModal
          eventId={eventId}
          numPersons={event.num_persons}
          foodCost={totals.total_food_cost}
          onClose={() => setShowFinancials(false)}
        />
      )}

      <div className="space-y-6 mep-print-content">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print" data-no-print>
          <div className="flex items-center gap-3">
            <Link
              href={`/events/${eventId}`}
              className="p-2 rounded-xl bg-white border border-[#E8D5B5] text-[#9E7E60] hover:text-[#2C1810] transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#E8A040]" />
                <span className="text-xs font-medium text-[#9E7E60] uppercase tracking-wider">MEP Plan</span>
              </div>
              <h1 className="font-display text-xl font-bold text-[#2C1810]">{event.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${statusInfo.className}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {statusInfo.label}
            </span>

            {event.status !== 'approved' && event.status !== 'completed' && (
              <button
                onClick={handleApprove}
                disabled={approving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-sm font-medium rounded-xl transition-all disabled:opacity-50"
              >
                {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Goedkeuren
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-[#FDF8F2] border border-[#E8D5B5] text-[#5C4730] text-sm font-medium rounded-xl transition-all"
            >
              <Printer className="w-4 h-4" />
              Afdrukken
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#E8A040] hover:bg-[#d4922e] text-stone-900 text-sm font-bold rounded-xl transition-all disabled:opacity-50"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? 'Genereren...' : 'PDF downloaden'}
            </button>
          </div>
        </div>

        <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-5">
          <div className="flex flex-wrap gap-4 items-start justify-between">
            <div>
              <h2 className="font-display text-2xl font-extrabold text-[#2C1810] mb-2">{event.name}</h2>
              <div className="flex flex-wrap items-center gap-4 text-sm text-[#9E7E60]">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4" />
                  {formatDate(event.event_date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {event.num_persons} personen
                </span>
                {event.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {event.location}
                  </span>
                )}
                <span className="text-xs px-2 py-1 rounded-full bg-white text-[#5C4730]">
                  {eventTypeLabels[event.event_type] || event.event_type}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {totals.food_cost_per_person > 0 && (
                <div className="flex gap-2">
                  <div className="bg-[#E8A040]/10 border border-[#E8A040]/30 rounded-xl px-4 py-2.5 text-center">
                    <div className="text-xs text-[#E8A040] mb-0.5">Food Cost/p</div>
                    <div className="text-base font-mono font-bold text-[#E8A040]">
                      {formatEur(totals.food_cost_per_person)}
                    </div>
                  </div>
                  {totals.food_cost_percentage > 0 && (
                    <div className="bg-white border border-[#E8D5B5] rounded-xl px-4 py-2.5 text-center">
                      <div className="text-xs text-[#9E7E60] mb-0.5">FC%</div>
                      <div
                        className={`text-base font-mono font-bold ${
                          totals.food_cost_percentage < 30
                            ? 'text-emerald-400'
                            : totals.food_cost_percentage <= 35
                            ? 'text-[#E8A040]'
                            : 'text-red-400'
                        }`}
                      >
                        {totals.food_cost_percentage.toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => setShowFinancials(true)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-[#FDF8F2]/80 hover:bg-white border border-[#E8D5B5] text-[#9E7E60] hover:text-[#3D2810] text-xs font-medium rounded-xl transition-all"
              >
                <Euro className="w-3.5 h-3.5" />
                Financiën beheren
              </button>
            </div>
          </div>

          {totalIngredients > 0 && (
            <div className="mt-4 no-print" data-no-print>
              <div className="flex items-center justify-between text-xs text-[#B8997A] mb-1.5">
                <span>Voorbereiding</span>
                <span>
                  {totalChecked}/{totalIngredients} klaar ({progressPct.toFixed(0)}%)
                </span>
              </div>
              <div className="w-full bg-white rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${progressPct}%`,
                    background: 'linear-gradient(to right, #E8A040, #10b981)',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {categoryGroups.map((group) => (
            <div key={group.categoryCode}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-white" />
                <h2 className="text-xs font-bold text-[#E8A040] uppercase tracking-widest mep-amber whitespace-nowrap">
                  {group.categoryLabel}
                </h2>
                <div className="h-px flex-1 bg-white" />
              </div>

              <div className="space-y-3">
                {group.courses.map((course) => {
                  const courseGlobalIdx = courses.indexOf(course)
                  return (
                    <DishCard
                      key={course.menu_item_id}
                      course={course}
                      numPersons={event.num_persons}
                      checked={checked}
                      onToggleChecked={toggleChecked}
                      onSaveIngredient={handleSaveIngredient}
                      onDeleteIngredient={handleDeleteIngredient}
                      onAddIngredient={handleAddIngredient}
                      onEditScope={setEditScopeRecipe}
                      courseGlobalIdx={courseGlobalIdx}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {totals.total_food_cost > 0 && (
          <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-[#B8997A] uppercase tracking-wider mb-1">Totale voedselkost</div>
              <div className="font-mono text-2xl font-extrabold text-[#2C1810]">
                {formatEur(totals.total_food_cost)}
              </div>
              <div className="text-sm text-[#9E7E60] mt-1">
                {formatEur(totals.food_cost_per_person)} per persoon
              </div>
            </div>
            {totals.food_cost_percentage > 0 && (
              <div className="text-right">
                <div className="text-xs text-[#B8997A] uppercase tracking-wider mb-1">Food Cost %</div>
                <div
                  className={`font-mono text-3xl font-extrabold ${
                    totals.food_cost_percentage < 30
                      ? 'text-emerald-400'
                      : totals.food_cost_percentage <= 35
                      ? 'text-[#E8A040]'
                      : 'text-red-400'
                  }`}
                >
                  {totals.food_cost_percentage.toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 no-print flex-wrap" data-no-print>
          <Link
            href={`/events/${eventId}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-[#FDF8F2] border border-[#E8D5B5] text-[#5C4730] text-sm font-medium rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug naar event
          </Link>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-[#FDF8F2] border border-[#E8D5B5] text-[#5C4730] text-sm font-medium rounded-xl transition-all"
          >
            <Printer className="w-4 h-4" />
            Afdrukken
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#E8A040] hover:bg-[#d4922e] text-stone-900 text-sm font-bold rounded-xl transition-all disabled:opacity-50"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {downloading ? 'PDF genereren...' : 'PDF downloaden'}
          </button>
        </div>
      </div>
    </>
  )
}
