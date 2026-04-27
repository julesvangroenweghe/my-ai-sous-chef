'use client'

import { useEffect, useState, useCallback } from 'react'
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
  CheckCircle,
  Pencil,
  X,
  Euro,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ingredient {
  ingredient_name: string
  quantity_per_person: number
  total_quantity: number
  unit: string
  cost_per_unit: number
  grammage_warning?: boolean
}

interface Component {
  component_name: string
  ingredients: Ingredient[]
}

interface Course {
  course: string
  course_label: string
  course_order: number
  category_sort_order: number
  recipe_id: string | null
  recipe_name: string
  cost_per_person: number
  total_cost: number
  component_group: string | null
  components: Component[]
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
  courses: Course[]
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
            className="p-1.5 rounded-lg text-[#9E7E60] hover:text-white hover:bg-white transition-all"
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
                    <div className="text-sm font-medium text-[#3D2810] group-hover:text-white transition-colors">
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

  // VAT: food & non-alc = 12%, rest = 21%
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
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9E7E60] hover:text-white hover:bg-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cost fields */}
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

        {/* Revenue */}
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

        {/* Summary */}
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

        {/* Staffing reference */}
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

  // Load MEP data
  useEffect(() => {
    setLoading(true)
    fetch(`/api/mep/${eventId}`)
      .then((res) => {
        if (res.status === 401) {
          router.push('/login')
          return null
        }
        return res.json()
      })
      .then((json) => {
        if (json?.error) {
          setError(json.error)
        } else if (json) {
          setData(json)
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Kon MEP niet laden')
        setLoading(false)
      })
  }, [eventId, router])

  // Load checkboxes from localStorage
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

  // ── Loading & error states ──────────────────────────────────────────────────

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
            className="p-2 rounded-xl bg-white border border-[#E8D5B5] text-[#9E7E60] hover:text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-2xl font-bold text-[#2C1810]">MEP — {data.event.name}</h1>
        </div>
        <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-12 text-center">
          <ChefHat className="w-12 h-12 text-[#5C4730] mx-auto mb-4" />
          <h3 className="text-lg font-display font-semibold text-[#5C4730] mb-2">
            Geen menu items gevonden
          </h3>
          <p className="text-[#B8997A] text-sm mb-6 max-w-md mx-auto">
            Dit event heeft nog geen gerechten in het menu. Voeg eerst gerechten toe via de event
            pagina.
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

  // Calculate progress
  const totalIngredients = courses.reduce(
    (sum, c) => sum + c.components.reduce((s, comp) => s + comp.ingredients.length, 0),
    0
  )
  const totalChecked = Object.values(checked).filter(Boolean).length
  const progressPct = totalIngredients > 0 ? (totalChecked / totalIngredients) * 100 : 0

  // Group courses by category
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

  // Track ingredient index for checkbox keys
  let globalIngIdx = 0

  return (
    <>
      {/* ── Print CSS ── */}
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

      {/* Edit Scope Modal */}
      {editScopeRecipe && (
        <EditScopeModal
          recipeName={editScopeRecipe}
          onClose={() => setEditScopeRecipe(null)}
        />
      )}

      {/* Financials Modal */}
      {showFinancials && (
        <FinancialsModal
          eventId={eventId}
          numPersons={event.num_persons}
          foodCost={totals.total_food_cost}
          onClose={() => setShowFinancials(false)}
        />
      )}

      <div className="space-y-6 mep-print-content">
        {/* ── Top Bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print" data-no-print>
          <div className="flex items-center gap-3">
            <Link
              href={`/events/${eventId}`}
              className="p-2 rounded-xl bg-white border border-[#E8D5B5] text-[#9E7E60] hover:text-white transition-all"
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
            {/* Status badge */}
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${statusInfo.className}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {statusInfo.label}
            </span>

            {/* Approve button (only when not yet approved) */}
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

        {/* ── Event Header ── */}
        <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-5">
          <div className="flex flex-wrap gap-4 items-start justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#2C1810] mb-2">{event.name}</h2>
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

            {/* Cost summary + Financials */}
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

          {/* Progress bar */}
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

        {/* ── Category Groups ── */}
        <div className="space-y-6">
          {categoryGroups.map((group) => (
            <div key={group.categoryCode}>
              {/* Category header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-white" />
                <h2 className="text-xs font-bold text-[#E8A040] uppercase tracking-widest mep-amber whitespace-nowrap">
                  {group.categoryLabel}
                </h2>
                <div className="h-px flex-1 bg-white" />
              </div>

              {/* Courses in this category */}
              <div className="space-y-3">
                {group.courses.map((course, courseIdx) => {
                  const courseGlobalIdx = courses.indexOf(course)

                  return (
                    <div
                      key={courseIdx}
                      className="mep-course-block bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl overflow-hidden"
                    >
                      {/* Course header */}
                      <div className="px-5 py-3.5 bg-white border-b border-[#E8D5B5] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-base font-bold text-[#2C1810]">
                            {course.recipe_name}
                          </h3>
                          {/* Portiegrootte */}
                          {course.serving_size_grams > 0 && (
                            <span className="text-xs text-[#B8997A] font-mono">
                              {course.serving_size_grams}g/p
                            </span>
                          )}
                          {/* Edit scope trigger */}
                          <button
                            onClick={() => setEditScopeRecipe(course.recipe_name)}
                            className="p-1 rounded text-[#5C4730] hover:text-[#E8A040] transition-colors no-print"
                            data-no-print
                            title="Aanpassing scope"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {course.cost_per_person > 0 && (
                          <div className="text-right">
                            <div className="font-mono text-sm font-bold text-[#3D2810]">
                              {formatEur(course.cost_per_person)}/p
                            </div>
                            <div className="font-mono text-xs text-[#B8997A]">
                              {formatEur(course.total_cost)} totaal
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Components & ingredients */}
                      <div className="divide-y divide-[#E8D5B5]/50">
                        {course.components.length === 0 ? (
                          <div className="px-5 py-3 text-[#B8997A] text-sm">
                            Geen componenten — voeg ingrediënten toe via het recept
                          </div>
                        ) : (
                          course.components.map((comp, compIdx) => {
                            return (
                              <div key={compIdx}>
                                {/* Component subheader */}
                                <div className="px-5 py-1.5 bg-white/20">
                                  <span className="text-xs font-semibold text-[#E8A040]/80 uppercase tracking-wide mep-amber">
                                    {comp.component_name}
                                  </span>
                                </div>

                                {/* Ingredient table header */}
                                <div className="px-5 py-1.5 flex items-center gap-3 text-xs text-[#B8997A] font-medium bg-white/10">
                                  <span className="w-6 shrink-0 no-print" data-no-print />
                                  <span className="flex-1">Ingrediënt</span>
                                  <span className="w-24 text-right">Per persoon</span>
                                  <span className="w-28 text-right font-semibold">
                                    Totaal ({event.num_persons}p)
                                  </span>
                                </div>

                                {/* Ingredients */}
                                {comp.ingredients.map((ing, ingIdx) => {
                                  const checkKey = `${courseGlobalIdx}-${compIdx}-${ingIdx}`
                                  const isChecked = !!checked[checkKey]

                                  return (
                                    <div
                                      key={ingIdx}
                                      className={`px-5 py-2.5 flex items-center gap-3 border-b border-[#E8D5B5]/30 transition-colors hover:bg-white/20 ${
                                        isChecked ? 'opacity-50' : ''
                                      }`}
                                    >
                                      {/* Checkbox */}
                                      <button
                                        onClick={() => toggleChecked(checkKey)}
                                        className="w-5 h-5 shrink-0 text-[#5C4730] hover:text-[#E8A040] transition-colors no-print"
                                        data-no-print
                                        aria-label={isChecked ? 'Markeer als niet gedaan' : 'Markeer als gedaan'}
                                      >
                                        {isChecked ? (
                                          <CheckSquare className="w-5 h-5 text-emerald-500" />
                                        ) : (
                                          <Square className="w-5 h-5" />
                                        )}
                                      </button>

                                      {/* Name */}
                                      <span
                                        className={`flex-1 text-sm ${
                                          isChecked ? 'line-through text-[#B8997A]' : 'text-[#3D2810]'
                                        }`}
                                      >
                                        {ing.ingredient_name}
                                      </span>

                                      {/* Grammage warning */}
                                      {ing.grammage_warning && (
                                        <span
                                          title="Buiten verwachte portiegrootte"
                                          className="text-[#E8A040] no-print"
                                          data-no-print
                                        >
                                          <AlertTriangle className="w-4 h-4" />
                                        </span>
                                      )}

                                      {/* Per person */}
                                      <span className="w-24 text-right text-xs text-[#9E7E60] font-mono">
                                        {ing.quantity_per_person}
                                        {ing.unit}/p
                                      </span>

                                      {/* Total */}
                                      <span className="w-28 text-right text-sm font-mono font-bold text-[#2C1810]">
                                        {formatQty(ing.total_quantity, ing.unit)}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer totals ── */}
        {totals.total_food_cost > 0 && (
          <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-[#B8997A] uppercase tracking-wider mb-1">Totale voedselkost</div>
              <div className="font-mono text-2xl font-bold text-[#2C1810]">
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
                  className={`font-mono text-3xl font-bold ${
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

        {/* ── Actions (bottom) ── */}
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
