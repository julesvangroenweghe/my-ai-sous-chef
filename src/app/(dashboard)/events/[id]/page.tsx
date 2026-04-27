'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
 ArrowLeft, CalendarDays, MapPin, Users, Euro, Clock,
 Plus, Trash2, ClipboardList, ChefHat, Loader2,
 X, AlertTriangle, ShoppingCart, Package, Edit2, Save, FileUp, ChevronDown, ChevronUp
} from 'lucide-react'
import { MepInlineEditor } from '@/components/mep/mep-inline-editor'
import { MepShoppingAggregate } from '@/components/mep/mep-shopping-aggregate'
import { MepOcrImporter } from '@/components/mep/mep-ocr-importer'
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
 0: ' Amuse',
 1: ' Voorgerecht',
 2: ' Tussengerecht',
 3: ' Hoofdgerecht',
 4: ' Kaas',
 5: ' Dessert',
 6: ' Mignardises',
}

const statusColors: Record<string, string> = {
 draft: 'bg-stone-700 text-stone-300',
 confirmed: 'bg-emerald-500/20 text-emerald-400',
 in_prep: 'bg-amber-500/20 text-amber-700',
 completed: 'bg-sky-500/20 text-sky-400',
 cancelled: 'bg-red-500/20 text-red-400',
}

const eventTypeLabels: Record<string, string> = {
 walking_dinner: ' Walking Dinner',
 buffet: ' Buffet',
 sit_down: ' Sit-down',
 cocktail: ' Cocktail',
 brunch: ' Brunch',
 tasting: ' Tasting',
 daily_service: ' Dagdienst',
}

type TabId = 'menu' | 'mep' | 'shopping'

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
 const [showMepImport, setShowMepImport] = useState(false)

 const fetchEvent = useCallback(async () => {
 const { data, error } = await supabase
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
 .insert({ event_id: event.id, recipe_id: selectedRecipeId, course_order: selectedCourse, course: courseLabels[selectedCourse]?.trim() || `Gang ${selectedCourse}` })
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
 <Link href="/events" className="text-brand-400 hover:text-brand-300 text-sm mt-2 inline-block">Terug naar events</Link>
 </div>
 )
 }

 // Group menu items by course text label, sorted by course_order
 const menuByCourse: Record<string, { order: number; items: typeof event.menu_items }> = {}
 for (const item of event.menu_items) {
 const label = (item.course || courseLabels[item.course_order]?.trim() || `Gang ${item.course_order}`).toUpperCase()
 if (!menuByCourse[label]) menuByCourse[label] = { order: item.course_order, items: [] }
 menuByCourse[label].items.push(item)
 if (item.course_order < menuByCourse[label].order) menuByCourse[label].order = item.course_order
 }

 const totalMenuCost = event.menu_items.reduce((sum, item) => sum + (Number(item.recipe?.total_cost_per_serving) || 0), 0)
 const totalEventCost = totalMenuCost * (event.num_persons || 0)
 const revenue = (event.price_per_person || 0) * (event.num_persons || 0)
 const foodCostPct = revenue > 0 ? (totalEventCost / revenue) * 100 : 0

 const tabs = [
 { id: 'menu' as TabId, label: 'Menu', icon: ChefHat, count: event.menu_items.length },
 { id: 'mep' as TabId, label: 'MEP Plan', icon: ClipboardList },
 { id: 'shopping' as TabId, label: 'Boodschappen', icon: ShoppingCart },
 ]

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-start gap-4">
 <Link href="/events" className="p-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-400 hover:text-[#2C1810] transition-all mt-1">
 <ArrowLeft className="w-5 h-5" />
 </Link>
 <div className="flex-1">
 <div className="flex items-center gap-3 mb-1">
 <h1 className="text-2xl font-display font-extrabold text-stone-100">{event.name}</h1>
 <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[event.status] || statusColors.draft}`}>
 {event.status}
 </span>
 </div>
 <div className="flex flex-wrap items-center gap-4 text-sm text-stone-400">
 <span className="flex items-center gap-1.5">
 <CalendarDays className="w-4 h-4" />
 {event.event_date ? new Date(event.event_date + 'T12:00:00').toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Geen datum'}
 </span>
 <span>{eventTypeLabels[event.event_type] || event.event_type}</span>
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
 </div>

 {/* Cost Summary Cards */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
 <div className="text-xs text-stone-500 mb-1">Kost/persoon</div>
 <div className="text-lg font-mono font-bold text-stone-200">€{totalMenuCost.toFixed(2)}</div>
 </div>
 <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
 <div className="text-xs text-stone-500 mb-1">Totale kost</div>
 <div className="text-lg font-mono font-bold text-stone-200">€{totalEventCost.toFixed(2)}</div>
 </div>
 <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
 <div className="text-xs text-stone-500 mb-1">Omzet</div>
 <div className="text-lg font-mono font-bold text-stone-200">€{revenue.toFixed(2)}</div>
 </div>
 <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
 <div className="text-xs text-stone-500 mb-1">Food Cost</div>
 <div className={`text-lg font-mono font-bold ${
 foodCostPct === 0 ? 'text-stone-500' :
 foodCostPct < 30 ? 'text-green-400' :
 foodCostPct <= 35 ? 'text-amber-700' : 'text-red-400'
 }`}>
 {foodCostPct > 0 ? `${foodCostPct.toFixed(1)}%` : '—'}
 </div>
 </div>
 </div>

 {/* Tab Navigation */}
 <div className="flex items-center gap-1 bg-stone-900/50 border border-stone-800 rounded-xl p-1">
 {tabs.map(tab => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
 activeTab === tab.id
 ? 'bg-brand-600 text-[#2C1810] shadow-lg shadow-brand-500/20'
 : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
 }`}
 >
 <tab.icon className="w-4 h-4" />
 {tab.label}
 {tab.count !== undefined && (
 <span className={`text-xs px-1.5 py-0.5 rounded-full ${
 activeTab === tab.id ? 'bg-white/20' : 'bg-stone-700'
 }`}>
 {tab.count}
 </span>
 )}
 </button>
 ))}
 </div>

 {/* Tab Content */}
 {activeTab === 'menu' && (
 <div className="bg-stone-900/50 border border-stone-800 rounded-2xl">
 <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between">
 <h2 className="text-lg font-display font-semibold text-stone-100 flex items-center gap-2">
 <ChefHat className="w-5 h-5 text-brand-400" /> Menu
 </h2>
 <button
 onClick={() => setShowAddRecipe(true)}
 className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-[#2C1810] text-xs font-medium rounded-lg transition-all"
 >
 <Plus className="w-3.5 h-3.5" /> Gerecht Toevoegen
 </button>
 </div>

 {showAddRecipe && (
 <div className="px-6 py-4 border-b border-stone-800 bg-stone-800/30">
 <div className="flex items-end gap-3">
 <div className="flex-1 space-y-1.5">
 <label className="text-xs text-stone-400">Recept</label>
 <select value={selectedRecipeId} onChange={(e) => setSelectedRecipeId(e.target.value)}
 className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
 <option value="">Kies een recept...</option>
 {recipes.map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
 </select>
 </div>
 <div className="w-44 space-y-1.5">
 <label className="text-xs text-stone-400">Gang</label>
 <select value={selectedCourse} onChange={(e) => setSelectedCourse(Number(e.target.value))}
 className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
 {Object.entries(courseLabels).map(([num, label]) => (<option key={num} value={num}>{label}</option>))}
 </select>
 </div>
 <button onClick={addRecipeToEvent} disabled={!selectedRecipeId || addingRecipe}
 className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-[#2C1810] text-sm rounded-lg transition-all disabled:opacity-50">
 {addingRecipe ? '...' : 'Toevoegen'}
 </button>
 <button onClick={() => setShowAddRecipe(false)} className="p-2 text-stone-500 hover:text-[#2C1810] transition-colors">
 <X className="w-4 h-4" />
 </button>
 </div>
 </div>
 )}

 {event.menu_items.length === 0 ? (
 <div className="px-6 py-12 text-center">
 <ChefHat className="w-10 h-10 text-stone-600 mx-auto mb-3" />
 <p className="text-stone-500 text-sm">Nog geen gerechten toegevoegd</p>
 </div>
 ) : (
 <div className="divide-y divide-stone-800/50">
 {Object.entries(menuByCourse).sort(([, a], [, b]) => a.order - b.order).map(([courseLabel, { items }]) => (
 <div key={courseLabel}>
 <div className="px-6 py-2.5 bg-stone-800/20">
 <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">
 {courseLabel}
 </span>
 </div>
 {items.map((item) => (
 <div key={item.id} className="px-6 py-3 flex items-center gap-4 hover:bg-stone-800/20 transition-colors">
 <div className="flex-1">
 <Link href={`/recipes/${item.recipe?.id}`} className="text-sm font-medium text-stone-200 hover:text-brand-400 transition-colors">
 {item.recipe?.name || 'Onbekend recept'}
 </Link>
 {item.recipe?.components && (
 <div className="flex items-center gap-2 mt-1">
 <span className="text-xs text-stone-500">
 {item.recipe.components.length} componenten · {item.recipe.components.reduce((s, c) => s + (c.ingredients?.length || 0), 0)} ingrediënten
 </span>
 </div>
 )}
 {item.recipe?.total_cost_per_serving && (
 <span className="text-xs font-mono text-stone-500">
 €{Number(item.recipe.total_cost_per_serving).toFixed(2)}/p
 </span>
 )}
 </div>
 <button onClick={() => removeRecipeFromEvent(item.id)}
 className="p-1.5 text-stone-600 hover:text-red-400 transition-colors">
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
 <MepInlineEditor
 key={mepRefreshKey}
 eventId={eventId}
 eventName={event.name}
 numPersons={event.num_persons}
 onMepGenerated={() => setMepRefreshKey(k => k + 1)}
 />
 )}

 {activeTab === 'mep' && !event.num_persons && (
 <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center">
 <AlertTriangle className="w-8 h-8 text-amber-700 mx-auto mb-3" />
 <p className="text-amber-300 font-medium">Vul eerst het aantal personen in</p>
 <p className="text-stone-500 text-sm mt-1">Het MEP plan heeft het aantal gasten nodig om hoeveelheden te berekenen.</p>
 </div>
 )}

 {activeTab === 'shopping' && event.num_persons && (
 <MepShoppingAggregate
 eventId={eventId}
 numPersons={event.num_persons}
 />
 )}

 {/* MEP OCR Import */}
 {activeTab === 'menu' && (
   <div className="space-y-3">
     <button
       onClick={() => setShowMepImport(!showMepImport)}
       className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-sm font-medium rounded-xl transition-all w-full"
     >
       <FileUp className="w-4 h-4 text-brand-400" />
       MEP importeren uit document
       {showMepImport ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
     </button>
     {showMepImport && (
       <MepOcrImporter
         eventId={eventId}
         onImportComplete={async () => {
           setShowMepImport(false)
           await fetchEvent()
         }}
       />
     )}
   </div>
 )}

 {/* Allergen Overview */}
 <EventAllergenSection eventId={eventId} />

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
