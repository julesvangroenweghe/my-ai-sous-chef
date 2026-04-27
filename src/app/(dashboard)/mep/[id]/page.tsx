'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  Euro,
  Download,
  Printer,
  ChefHat,
  Loader2,
  CheckSquare,
  Square,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ingredient {
  ingredient_name: string
  quantity_per_person: number
  total_quantity: number
  unit: string
  cost_per_unit: number
}

interface Component {
  component_name: string
  ingredients: Ingredient[]
}

interface Course {
  course: string
  course_order: number
  recipe_id: string
  recipe_name: string
  cost_per_person: number
  total_cost: number
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
  }
  courses: Course[]
  totals: {
    food_cost_per_person: number
    total_food_cost: number
    food_cost_percentage: number
  }
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function MepDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const [data, setData] = useState<MepData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [downloading, setDownloading] = useState(false)

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
    } catch (e) {
      console.error('PDF download error:', e)
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = () => window.print()

  // ── Loading & error states ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <p className="text-stone-400 mb-4">{error || 'MEP niet gevonden'}</p>
        <Link href="/mep" className="text-brand-400 hover:text-brand-300 text-sm">
          ← Terug naar planning
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
            className="p-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-2xl font-bold text-stone-100">MEP — {data.event.name}</h1>
        </div>
        <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-12 text-center">
          <ChefHat className="w-12 h-12 text-stone-600 mx-auto mb-4" />
          <h3 className="text-lg font-display font-semibold text-stone-300 mb-2">
            Geen menu items gevonden
          </h3>
          <p className="text-stone-500 text-sm mb-6 max-w-md mx-auto">
            Dit event heeft nog geen gerechten in het menu. Voeg eerst gerechten toe via de event
            pagina.
          </p>
          <Link
            href={`/events/${eventId}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-all"
          >
            <ChefHat className="w-4 h-4" /> Ga naar Menu Builder
          </Link>
        </div>
      </div>
    )
  }

  const { event, courses, totals } = data
  const totalChecked = Object.values(checked).filter(Boolean).length
  const totalIngredients = courses.reduce(
    (sum, c) => sum + c.components.reduce((s, comp) => s + comp.ingredients.length, 0),
    0
  )

  return (
    <>
      {/* ── Print CSS ── */}
      <style jsx global>{`
        @media print {
          /* Hide navigation, sidebar, header, buttons */
          nav,
          aside,
          header,
          [data-sidebar],
          [data-no-print],
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .mep-print-content {
            display: block !important;
          }
          .mep-course-block {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          * {
            color: black !important;
            background: white !important;
            border-color: #e5e7eb !important;
          }
          .mep-amber {
            color: #92400e !important;
          }
        }
      `}</style>

      <div className="space-y-6 mep-print-content">
        {/* ── Top Bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print" data-no-print>
          <div className="flex items-center gap-3">
            <Link
              href={`/events/${eventId}`}
              className="p-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-400 hover:text-white transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-brand-400" />
                <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                  MEP Plan
                </span>
              </div>
              <h1 className="font-display text-xl font-bold text-stone-100">{event.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-sm font-medium rounded-xl transition-all"
            >
              <Printer className="w-4 h-4" />
              Afdrukken
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {downloading ? 'Genereren...' : 'Download PDF'}
            </button>
          </div>
        </div>

        {/* ── Event Header ── */}
        <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-5">
          <div className="flex flex-wrap gap-4 items-start justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-stone-100 mb-2">{event.name}</h2>
              <div className="flex flex-wrap items-center gap-4 text-sm text-stone-400">
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
                <span className="text-xs px-2 py-1 rounded-full bg-stone-800 text-stone-300">
                  {eventTypeLabels[event.event_type] || event.event_type}
                </span>
              </div>
            </div>

            {/* Cost summary */}
            {totals.food_cost_per_person > 0 && (
              <div className="flex gap-3">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-center">
                  <div className="text-xs text-amber-400 mb-0.5">Food Cost/p</div>
                  <div className="text-lg font-mono font-bold text-amber-300">
                    {formatEur(totals.food_cost_per_person)}
                  </div>
                </div>
                {totals.food_cost_percentage > 0 && (
                  <div className="bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-center">
                    <div className="text-xs text-stone-400 mb-0.5">FC%</div>
                    <div
                      className={`text-lg font-mono font-bold ${
                        totals.food_cost_percentage < 30
                          ? 'text-emerald-400'
                          : totals.food_cost_percentage <= 35
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {totals.food_cost_percentage.toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Progress bar */}
          {totalIngredients > 0 && (
            <div className="mt-4 no-print" data-no-print>
              <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
                <span>Voorbereiding</span>
                <span>
                  {totalChecked}/{totalIngredients} klaar
                </span>
              </div>
              <div className="w-full bg-stone-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-brand-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${totalIngredients > 0 ? (totalChecked / totalIngredients) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Courses ── */}
        <div className="space-y-4">
          {courses.map((course, courseIdx) => {
            return (
              <div
                key={courseIdx}
                className="mep-course-block bg-stone-900/50 border border-stone-800 rounded-2xl overflow-hidden"
              >
                {/* Course header */}
                <div className="px-6 py-4 bg-stone-900 border-b border-stone-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-0.5 mep-amber">
                      {course.course}
                    </div>
                    <h3 className="font-display text-lg font-bold text-stone-100">
                      {course.recipe_name}
                    </h3>
                  </div>
                  {course.cost_per_person > 0 && (
                    <div className="text-right">
                      <div className="text-xs text-stone-500">Kostprijs</div>
                      <div className="font-mono text-sm font-bold text-stone-200">
                        {formatEur(course.cost_per_person)}/p
                      </div>
                      <div className="font-mono text-xs text-stone-400">
                        {formatEur(course.total_cost)} totaal
                      </div>
                    </div>
                  )}
                </div>

                {/* Components & ingredients */}
                <div className="divide-y divide-stone-800/50">
                  {course.components.length === 0 ? (
                    <div className="px-6 py-4 text-stone-500 text-sm">
                      Geen componenten — voeg ingrediënten toe via het recept
                    </div>
                  ) : (
                    course.components.map((comp, compIdx) => (
                      <div key={compIdx}>
                        {/* Component label */}
                        <div className="px-6 py-2 bg-stone-800/20">
                          <span className="text-xs font-semibold text-amber-400/80 uppercase tracking-wide mep-amber">
                            {comp.component_name}
                          </span>
                        </div>

                        {/* Ingredient table header */}
                        <div className="px-6 py-1.5 flex items-center gap-3 text-xs text-stone-500 font-medium bg-stone-800/10">
                          <span className="w-6 shrink-0 no-print" data-no-print></span>
                          <span className="flex-1">Ingrediënt</span>
                          <span className="w-24 text-right">Per persoon</span>
                          <span className="w-28 text-right font-semibold">
                            Totaal ({event.num_persons}p)
                          </span>
                        </div>

                        {/* Ingredients */}
                        {comp.ingredients.map((ing, ingIdx) => {
                          const checkKey = `${courseIdx}-${compIdx}-${ingIdx}`
                          const isChecked = !!checked[checkKey]

                          return (
                            <div
                              key={ingIdx}
                              className={`px-6 py-2.5 flex items-center gap-3 border-b border-stone-800/30 transition-colors hover:bg-stone-800/20 ${
                                isChecked ? 'opacity-50' : ''
                              }`}
                            >
                              {/* Checkbox */}
                              <button
                                onClick={() => toggleChecked(checkKey)}
                                className="w-5 h-5 shrink-0 text-stone-600 hover:text-brand-400 transition-colors no-print"
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
                                  isChecked
                                    ? 'line-through text-stone-500'
                                    : 'text-stone-200'
                                }`}
                              >
                                {ing.ingredient_name}
                              </span>

                              {/* Per person */}
                              <span className="w-24 text-right text-xs text-stone-400 font-mono">
                                {ing.quantity_per_person}
                                {ing.unit}/p
                              </span>

                              {/* Total */}
                              <span className="w-28 text-right text-sm font-mono font-bold text-stone-100">
                                {formatQty(ing.total_quantity, ing.unit)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Footer totals ── */}
        {totals.total_food_cost > 0 && (
          <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                Totale voedselkost
              </div>
              <div className="font-mono text-2xl font-bold text-stone-100">
                {formatEur(totals.total_food_cost)}
              </div>
              <div className="text-sm text-stone-400 mt-1">
                {formatEur(totals.food_cost_per_person)} per persoon
              </div>
            </div>
            {totals.food_cost_percentage > 0 && (
              <div className="text-right">
                <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                  Food Cost %
                </div>
                <div
                  className={`font-mono text-3xl font-bold ${
                    totals.food_cost_percentage < 30
                      ? 'text-emerald-400'
                      : totals.food_cost_percentage <= 35
                      ? 'text-amber-400'
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
        <div className="flex gap-3 no-print" data-no-print>
          <Link
            href={`/events/${eventId}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-sm font-medium rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug naar event
          </Link>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-sm font-medium rounded-xl transition-all"
          >
            <Printer className="w-4 h-4" />
            Afdrukken
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {downloading ? 'PDF genereren...' : 'Download PDF'}
          </button>
        </div>
      </div>
    </>
  )
}
