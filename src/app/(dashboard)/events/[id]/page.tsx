'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ArrowLeft, CalendarDays, MapPin, Users, Euro, Clock,
  Plus, Trash2, ClipboardList, ChefHat, FileDown, Loader2,
  Edit2, Save, X, GripVertical, AlertTriangle
} from 'lucide-react'

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

interface MepLine {
  ingredient_name: string
  category: string
  total_quantity: number
  unit: string
  per_person: number
  cost_total: number
  component_name: string
  recipe_name: string
  course_order: number
}

const courseLabels: Record<number, string> = {
  0: '\u{1F944} Amuse',
  1: '\u{1F957} Voorgerecht',
  2: '\u{1F372} Tussengerecht',
  3: '\u{1F969} Hoofdgerecht',
  4: '\u{1F9C0} Kaas',
  5: '\u{1F370} Dessert',
  6: '\u2615 Mignardises',
}

const statusColors: Record<string, string> = {
  draft: 'bg-stone-700 text-stone-300',
  confirmed: 'bg-emerald-500/20 text-emerald-400',
  in_prep: 'bg-amber-500/20 text-amber-400',
  completed: 'bg-sky-500/20 text-sky-400',
  cancelled: 'bg-red-500/20 text-red-400',
}

const eventTypeLabels: Record<string, string> = {
  walking_dinner: '\u{1F37D}\uFE0F Walking Dinner',
  buffet: '\u{1F371} Buffet',
  sit_down: '\u{1FA91} Sit-down',
  cocktail: '\u{1F378} Cocktail',
  brunch: '\u{1F950} Brunch',
  tasting: '\u{1F944} Tasting',
  daily_service: '\u{1F4C5} Dagdienst',
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
  const [mepLines, setMepLines] = useState<MepLine[]>([])
  const [showMep, setShowMep] = useState(false)
  const [generatingMep, setGeneratingMep] = useState(false)

  const fetchEvent = useCallback(async () => {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        menu_items:event_menu_items(
          id,
          recipe_id,
          course_order,
          recipe:recipes(
            id,
            name,
            description,
            total_cost_per_serving,
            components:recipe_components(
              id,
              name,
              ingredients:recipe_component_ingredients(
                id,
                quantity,
                quantity_per_person,
                unit,
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
      // Sort menu items by course order
      data.menu_items = (data.menu_items || []).sort((a: any, b: any) => a.course_order - b.course_order)
      setEvent(data as unknown as EventDetail)
    }
    setLoading(false)
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
  }, [fetchEvent, fetchRecipes])

  const addRecipeToEvent = async () => {
    if (!selectedRecipeId || !event) return
    setAddingRecipe(true)

    const { error } = await supabase
      .from('event_menu_items')
      .insert({
        event_id: event.id,
        recipe_id: selectedRecipeId,
        course_order: selectedCourse,
      })

    if (!error) {
      await fetchEvent()
      setShowAddRecipe(false)
      setSelectedRecipeId('')
    }
    setAddingRecipe(false)
  }

  const removeRecipeFromEvent = async (menuItemId: string) => {
    await supabase.from('event_menu_items').delete().eq('id', menuItemId)
    await fetchEvent()
  }

  const generateMep = async () => {
    if (!event || !event.num_persons) return
    setGeneratingMep(true)

    const lines: MepLine[] = []
    const numPersons = event.num_persons

    for (const menuItem of event.menu_items) {
      if (!menuItem.recipe) continue
      for (const component of menuItem.recipe.components || []) {
        for (const ing of component.ingredients || []) {
          if (!ing.ingredient) continue
          const perPerson = ing.quantity_per_person || ing.quantity || 0
          const total = perPerson * numPersons
          const costPerUnit = ing.ingredient.current_price || 0
          const costTotal = costPerUnit * total
          
          lines.push({
            ingredient_name: ing.ingredient.name,
            category: ing.ingredient.category || 'Overig',
            total_quantity: Math.ceil(total * 100) / 100,
            unit: ing.unit || ing.ingredient.unit || 'g',
            per_person: perPerson,
            cost_total: Math.round(costTotal * 100) / 100,
            component_name: component.name,
            recipe_name: menuItem.recipe.name,
            course_order: menuItem.course_order,
          })
        }
      }
    }

    // Sort by course, then recipe, then component
    lines.sort((a, b) => {
      if (a.course_order !== b.course_order) return a.course_order - b.course_order
      if (a.recipe_name !== b.recipe_name) return a.recipe_name.localeCompare(b.recipe_name)
      return a.component_name.localeCompare(b.component_name)
    })

    setMepLines(lines)
    setShowMep(true)
    setGeneratingMep(false)
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
        <p className="text-stone-400">Event niet gevonden</p>
        <Link href="/events" className="text-brand-400 hover:text-brand-300 text-sm mt-2 inline-block">
          Terug naar events
        </Link>
      </div>
    )
  }

  // Group menu items by course
  const menuByCourse: Record<number, typeof event.menu_items> = {}
  for (const item of event.menu_items) {
    const course = item.course_order
    if (!menuByCourse[course]) menuByCourse[course] = []
    menuByCourse[course].push(item)
  }

  // Group MEP lines by course for display
  const mepByCourse: Record<number, MepLine[]> = {}
  for (const line of mepLines) {
    if (!mepByCourse[line.course_order]) mepByCourse[line.course_order] = []
    mepByCourse[line.course_order].push(line)
  }

  const totalMenuCost = event.menu_items.reduce((sum, item) => {
    return sum + (Number(item.recipe?.total_cost_per_serving) || 0)
  }, 0)

  const totalEventCost = totalMenuCost * (event.num_persons || 0)
  const revenue = (event.price_per_person || 0) * (event.num_persons || 0)
  const foodCostPct = revenue > 0 ? (totalEventCost / revenue) * 100 : 0

  // Calculate total MEP cost
  const totalMepCost = mepLines.reduce((sum, line) => sum + line.cost_total, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/events" className="p-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-400 hover:text-white transition-all mt-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-display font-bold text-stone-100">{event.name}</h1>
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[event.status] || statusColors.draft}`}>
              {event.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-stone-400">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              {event.event_date ? new Date(event.event_date).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Geen datum'}
            </span>
            <span>{eventTypeLabels[event.event_type] || event.event_type}</span>
            {event.num_persons && (
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{event.num_persons} personen</span>
            )}
            {event.location && (
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{event.location}</span>
            )}
          </div>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
          <div className="text-xs text-stone-500 mb-1">Kost/persoon</div>
          <div className="text-lg font-mono font-bold text-stone-200">\u20AC{totalMenuCost.toFixed(2)}</div>
        </div>
        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
          <div className="text-xs text-stone-500 mb-1">Totale kost</div>
          <div className="text-lg font-mono font-bold text-stone-200">\u20AC{totalEventCost.toFixed(2)}</div>
        </div>
        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
          <div className="text-xs text-stone-500 mb-1">Omzet</div>
          <div className="text-lg font-mono font-bold text-stone-200">\u20AC{revenue.toFixed(2)}</div>
        </div>
        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
          <div className="text-xs text-stone-500 mb-1">Food Cost</div>
          <div className={`text-lg font-mono font-bold ${
            foodCostPct === 0 ? 'text-stone-500' :
            foodCostPct < 30 ? 'text-green-400' :
            foodCostPct <= 35 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {foodCostPct > 0 ? `${foodCostPct.toFixed(1)}%` : '\u2014'}
          </div>
        </div>
      </div>

      {/* Menu Builder */}
      <div className="bg-stone-900/50 border border-stone-800 rounded-2xl">
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between">
          <h2 className="text-lg font-display font-semibold text-stone-100 flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-brand-400" /> Menu
          </h2>
          <button
            onClick={() => setShowAddRecipe(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Gerecht Toevoegen
          </button>
        </div>

        {/* Add Recipe Dialog */}
        {showAddRecipe && (
          <div className="px-6 py-4 border-b border-stone-800 bg-stone-800/30">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs text-stone-400">Recept</label>
                <select
                  value={selectedRecipeId}
                  onChange={(e) => setSelectedRecipeId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Kies een recept...</option>
                  {recipes.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-44 space-y-1.5">
                <label className="text-xs text-stone-400">Gang</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {Object.entries(courseLabels).map(([num, label]) => (
                    <option key={num} value={num}>{label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={addRecipeToEvent}
                disabled={!selectedRecipeId || addingRecipe}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-lg transition-all disabled:opacity-50"
              >
                {addingRecipe ? '...' : 'Toevoegen'}
              </button>
              <button
                onClick={() => setShowAddRecipe(false)}
                className="p-2 text-stone-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Menu Items by Course */}
        {event.menu_items.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <ChefHat className="w-10 h-10 text-stone-600 mx-auto mb-3" />
            <p className="text-stone-500 text-sm">Nog geen gerechten toegevoegd</p>
            <p className="text-stone-600 text-xs mt-1">Voeg recepten toe om je menu samen te stellen</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-800/50">
            {Object.entries(menuByCourse).sort(([a], [b]) => Number(a) - Number(b)).map(([course, items]) => (
              <div key={course}>
                <div className="px-6 py-2.5 bg-stone-800/20">
                  <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                    {courseLabels[Number(course)] || `Gang ${course}`}
                  </span>
                </div>
                {items.map((item) => (
                  <div key={item.id} className="px-6 py-3 flex items-center gap-4 hover:bg-stone-800/20 transition-colors">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-stone-200">{item.recipe?.name || 'Onbekend recept'}</span>
                      {item.recipe?.total_cost_per_serving && (
                        <span className="ml-3 text-xs font-mono text-stone-500">
                          \u20AC{Number(item.recipe.total_cost_per_serving).toFixed(2)}/p
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeRecipeFromEvent(item.id)}
                      className="p-1.5 text-stone-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate MEP Button */}
      {event.menu_items.length > 0 && event.num_persons && (
        <div className="flex items-center gap-3">
          <button
            onClick={generateMep}
            disabled={generatingMep}
            className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 text-sm"
          >
            {generatingMep ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ClipboardList className="w-4 h-4" />
            )}
            {generatingMep ? 'Genereren...' : 'Genereer MEP Plan'}
          </button>
          {!event.num_persons && (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Vul eerst het aantal personen in
            </span>
          )}
        </div>
      )}

      {/* MEP Plan Display */}
      {showMep && mepLines.length > 0 && (
        <div className="bg-stone-900/50 border border-stone-800 rounded-2xl" id="mep-plan">
          <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold text-stone-100 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-brand-400" /> MEP Plan \u2014 {event.name}
            </h2>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span>{event.num_persons} personen</span>
              <span>\u00B7</span>
              <span>{mepLines.length} lijnen</span>
              <span>\u00B7</span>
              <span className="font-mono font-bold text-brand-400">\u20AC{totalMepCost.toFixed(2)} totaal</span>
            </div>
          </div>

          {/* MEP by Course */}
          {Object.entries(mepByCourse).sort(([a], [b]) => Number(a) - Number(b)).map(([course, lines]) => {
            // Group lines by recipe within each course
            const byRecipe: Record<string, MepLine[]> = {}
            for (const line of lines) {
              if (!byRecipe[line.recipe_name]) byRecipe[line.recipe_name] = []
              byRecipe[line.recipe_name].push(line)
            }

            return (
              <div key={course}>
                <div className="px-6 py-2.5 bg-brand-600/10 border-b border-stone-800">
                  <span className="text-sm font-semibold text-brand-400">
                    {courseLabels[Number(course)] || `Gang ${course}`}
                  </span>
                </div>
                {Object.entries(byRecipe).map(([recipeName, recipeLines]) => (
                  <div key={recipeName}>
                    <div className="px-6 py-2 bg-stone-800/20">
                      <span className="text-xs font-medium text-stone-300">{recipeName}</span>
                    </div>
                    {recipeLines.map((line, i) => (
                      <div key={i} className="px-6 py-2 flex items-center gap-4 border-b border-stone-800/30 last:border-0 hover:bg-stone-800/10">
                        <span className="text-xs text-stone-500 w-28 truncate">{line.component_name}</span>
                        <span className="flex-1 text-sm text-stone-200">{line.ingredient_name}</span>
                        <span className="text-xs text-stone-500 font-mono w-24 text-right">
                          {line.per_person} {line.unit}/p
                        </span>
                        <span className="text-sm font-mono font-semibold text-stone-100 w-28 text-right">
                          {line.total_quantity} {line.unit}
                        </span>
                        <span className="text-xs font-mono text-stone-500 w-20 text-right">
                          \u20AC{line.cost_total.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )
          })}

          {/* Aggregated Shopping List */}
          <div className="px-6 py-4 border-t border-stone-800">
            <h3 className="text-sm font-semibold text-stone-300 mb-3">\u{1F4CB} Boodschappenlijst (geaggregeerd)</h3>
            <div className="space-y-1">
              {(() => {
                // Aggregate same ingredients
                const agg: Record<string, { total: number; unit: string; category: string; cost: number }> = {}
                for (const line of mepLines) {
                  const key = `${line.ingredient_name}_${line.unit}`
                  if (!agg[key]) {
                    agg[key] = { total: 0, unit: line.unit, category: line.category, cost: 0 }
                  }
                  agg[key].total += line.total_quantity
                  agg[key].cost += line.cost_total
                }
                // Group by category
                const byCategory: Record<string, { name: string; total: number; unit: string; cost: number }[]> = {}
                for (const [key, val] of Object.entries(agg)) {
                  const name = key.split('_')[0]
                  if (!byCategory[val.category]) byCategory[val.category] = []
                  byCategory[val.category].push({ name, total: val.total, unit: val.unit, cost: val.cost })
                }

                return Object.entries(byCategory)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([category, items]) => (
                    <div key={category} className="mb-4">
                      <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">{category}</div>
                      {items.sort((a, b) => a.name.localeCompare(b.name)).map((item) => (
                        <div key={item.name} className="flex items-center gap-3 py-1.5 text-sm">
                          <span className="text-stone-300 flex-1">{item.name}</span>
                          <span className="font-mono text-stone-100 font-medium w-28 text-right">
                            {Math.ceil(item.total * 100) / 100} {item.unit}
                          </span>
                          <span className="font-mono text-stone-500 text-xs w-20 text-right">
                            \u20AC{item.cost.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))
              })()}
            </div>
            {/* Total */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-stone-700">
              <span className="text-sm font-semibold text-stone-200">Totale ingredi\u00EBntkost</span>
              <span className="text-lg font-mono font-bold text-brand-400">\u20AC{totalMepCost.toFixed(2)}</span>
            </div>
            {event.num_persons && totalMepCost > 0 && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-stone-500">Per persoon</span>
                <span className="text-sm font-mono text-stone-400">\u20AC{(totalMepCost / event.num_persons).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {event.notes && (
        <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-6">
          <h3 className="text-sm font-medium text-stone-400 mb-2">Notities</h3>
          <p className="text-stone-300 text-sm whitespace-pre-wrap">{event.notes}</p>
        </div>
      )}
    </div>
  )
}
