'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
 Save, Loader2, ClipboardList, Package, ChefHat,
 Pencil, Check, X, Plus, Trash2, Clock, Printer, ExternalLink
} from 'lucide-react'

interface MepItemRow {
 id: string
 item_name: string
 item_type: string
 quantity_per_person: number
 total_quantity: number
 unit: string
 persons: number
 prep_day: string | null
 status: string
 notes: string | null
 sort_order: number
 component_name: string | null
 recipe_name: string | null
 course_label: string | null
 ingredient_price: number | null
 // Edit state
 isEditing?: boolean
 isNew?: boolean
}

interface Props {
 eventId: string
 eventName: string
 numPersons: number
 onMepGenerated?: () => void
}

const prepDayOptions = [
 { value: 'D-3', label: 'D-3' },
 { value: 'D-2', label: 'D-2' },
 { value: 'D-1', label: 'D-1 (dag ervoor)' },
 { value: 'D-0', label: 'D-0 (dag zelf)' },
 { value: 'service', label: 'Service' },
]

const statusOptions = [
 { value: 'pending', label: '⏳ Te doen', color: 'text-[#9E7E60]' },
 { value: 'in_progress', label: ' Bezig', color: 'text-amber-700' },
 { value: 'done', label: ' Klaar', color: 'text-emerald-400' },
]

const courseLabels: Record<number, string> = {
 0: ' Amuse',
 1: ' Voorgerecht',
 2: ' Tussengerecht',
 3: ' Hoofdgerecht',
 4: ' Kaas',
 5: ' Dessert',
 6: ' Mignardises',
}

export function MepInlineEditor({ eventId, eventName, numPersons, onMepGenerated }: Props) {
 const [items, setItems] = useState<MepItemRow[]>([])
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [generating, setGenerating] = useState(false)
 const [editingId, setEditingId] = useState<string | null>(null)
 const [hasChanges, setHasChanges] = useState(false)
 const supabase = createClient()

 const fetchMepItems = useCallback(async () => {
 setLoading(true)
 const { data, error } = await supabase
 .from('mep_items')
 .select('*')
 .eq('event_id', eventId)
 .order('sort_order')

 if (data && data.length > 0) {
 setItems(data.map(d => ({ ...d, isEditing: false })))
 } else {
 setItems([])
 }
 setLoading(false)
 }, [eventId])

 useEffect(() => { fetchMepItems() }, [fetchMepItems])

 // Generate MEP from event menu items
 const generateMep = async () => {
 setGenerating(true)

 // Fetch menu items with recipe components
 const { data: menuItems } = await supabase
 .from('event_menu_items')
 .select(`
 id, course_order,
 recipe:recipes(
 id, name,
 components:recipe_components(
 id, name,
 ingredients:recipe_component_ingredients(
 id, quantity, quantity_per_person, unit,
 ingredient:ingredients(id, name, category, current_price, unit)
 )
 )
 )
 `)
 .eq('event_id', eventId)
 .order('course_order')

 if (!menuItems || menuItems.length === 0) {
 setGenerating(false)
 return
 }

 // Delete existing MEP items for this event
 await supabase.from('mep_items').delete().eq('event_id', eventId)

 // Build new MEP items
 const newItems: any[] = []
 let sortOrder = 0

 for (const mi of menuItems) {
 const recipe = mi.recipe as any
 if (!recipe) continue

 for (const comp of (recipe.components || [])) {
 for (const ing of (comp.ingredients || [])) {
 if (!ing.ingredient) continue

 const qtyPp = ing.quantity_per_person || ing.quantity || 0
 const totalQty = Math.ceil(qtyPp * numPersons * 100) / 100

 // Guess prep day based on component type
 let prepDay = 'D-0'
 const compName = (comp.name || '').toLowerCase()
 if (compName.includes('marinade') || compName.includes('base') || compName.includes('fond') ||
 compName.includes('pickle') || compName.includes('confit') || compName.includes('cure') ||
 compName.includes('terrine') || compName.includes('gel')) {
 prepDay = 'D-2'
 } else if (compName.includes('creme') || compName.includes('saus') || compName.includes('puree') ||
 compName.includes('vinaigrette') || compName.includes('dressing')) {
 prepDay = 'D-1'
 } else if (compName.includes('finish') || compName.includes('garnish') || compName.includes('service') ||
 compName.includes('afwerk')) {
 prepDay = 'service'
 }

 newItems.push({
 event_id: eventId,
 recipe_id: recipe.id,
 component_id: comp.id,
 item_name: ing.ingredient.name,
 item_type: 'ingredient',
 persons: numPersons,
 quantity_per_person: qtyPp,
 total_quantity: totalQty,
 unit: ing.unit || ing.ingredient.unit || 'g',
 prep_day: prepDay,
 status: 'pending',
 notes: comp.name || null,
 sort_order: sortOrder++,
 })
 }
 }
 }

 if (newItems.length > 0) {
 // Insert in batches
 for (let i = 0; i < newItems.length; i += 50) {
 const batch = newItems.slice(i, i + 50)
 await supabase.from('mep_items').insert(batch)
 }
 }

 await fetchMepItems()
 setGenerating(false)
 onMepGenerated?.()
 }

 // Inline edit handlers
 const startEdit = (id: string) => setEditingId(id)
 
 const cancelEdit = () => {
 setEditingId(null)
 fetchMepItems() // Reset changes
 }

 const updateItem = (id: string, field: string, value: any) => {
 setItems(prev => prev.map(item => {
 if (item.id !== id) return item
 const updated = { ...item, [field]: value }
 // Auto-recalculate total when qty_pp changes
 if (field === 'quantity_per_person') {
 updated.total_quantity = Math.ceil(Number(value) * numPersons * 100) / 100
 }
 return updated
 }))
 setHasChanges(true)
 }

 const saveItem = async (id: string) => {
 const item = items.find(i => i.id === id)
 if (!item) return
 setSaving(true)

 await supabase
 .from('mep_items')
 .update({
 quantity_per_person: item.quantity_per_person,
 total_quantity: item.total_quantity,
 unit: item.unit,
 prep_day: item.prep_day,
 status: item.status,
 notes: item.notes,
 })
 .eq('id', id)

 setEditingId(null)
 setHasChanges(false)
 setSaving(false)
 }

 const deleteItem = async (id: string) => {
 await supabase.from('mep_items').delete().eq('id', id)
 setItems(prev => prev.filter(i => i.id !== id))
 }

 const updateStatus = async (id: string, status: string) => {
 await supabase.from('mep_items').update({ status }).eq('id', id)
 setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i))
 }

 // Group items by prep_day
 const groupedByDay: Record<string, MepItemRow[]> = {}
 for (const item of items) {
 const day = item.prep_day || 'D-0'
 if (!groupedByDay[day]) groupedByDay[day] = []
 groupedByDay[day].push(item)
 }

 // Sort days chronologically
 const dayOrder = ['D-3', 'D-2', 'D-1', 'D-0', 'service']
 const sortedDays = Object.keys(groupedByDay).sort(
 (a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b)
 )

 // Cost calculation
 const totalCost = items.reduce((sum, item) => {
 if (!item.ingredient_price) return sum
 const qty = item.total_quantity || 0
 const unit = item.unit
 // Convert to kg for price comparison (prices are per kg)
 const kgQty = unit === 'g' ? qty / 1000 : unit === 'kg' ? qty : 0
 return sum + kgQty * (item.ingredient_price || 0)
 }, 0)

 const completedCount = items.filter(i => i.status === 'done').length
 const totalCount = items.length
 const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

 if (loading) {
 return (
 <div className="flex items-center justify-center py-12">
 <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
 </div>
 )
 }

 return (
 <div className="space-y-4">
 {/* MEP Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <ClipboardList className="w-5 h-5 text-brand-400" />
 <h3 className="text-lg font-display font-semibold text-[#2C1810]">
 MEP Plan
 </h3>
 {items.length > 0 && (
 <span className="text-xs text-[#B8997A]">
 {items.length} items · {completedCount}/{totalCount} klaar ({progress}%)
 </span>
 )}
 </div>
 <div className="flex items-center gap-2">
 {items.length > 0 && (
 <button
 onClick={generateMep}
 disabled={generating}
 className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#FDF8F2] border border-[#E8D5B5] text-[#5C4730] text-xs rounded-lg transition-all"
 >
 Herbereken
 </button>
 )}
 <button
 onClick={generateMep}
 disabled={generating}
 className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-[#2C1810] text-sm font-medium rounded-xl transition-all disabled:opacity-50"
 >
 {generating ? (
 <Loader2 className="w-4 h-4 animate-spin" />
 ) : (
 <Package className="w-4 h-4" />
 )}
 {generating ? 'Genereren...' : items.length > 0 ? 'Regenereer MEP' : 'Genereer MEP'}
 </button>
 </div>
 </div>

 {/* Progress bar */}
 {items.length > 0 && (
 <div className="w-full bg-white rounded-full h-2">
 <div
 className="bg-gradient-to-r from-brand-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
 style={{ width: `${progress}%` }}
 />
 </div>
 )}

 {items.length === 0 ? (
 <div className="text-center py-8 text-[#B8997A]">
 <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
 <p className="text-sm">Genereer een MEP plan vanuit je menu</p>
 </div>
 ) : (
 /* MEP Items grouped by prep day */
 <div className="space-y-4">
 {sortedDays.map(day => {
 const dayItems = groupedByDay[day]
 const dayLabel = prepDayOptions.find(o => o.value === day)?.label || day
 const dayDoneCount = dayItems.filter(i => i.status === 'done').length

 // Group within day by recipe
 const byRecipe: Record<string, MepItemRow[]> = {}
 for (const item of dayItems) {
 const key = item.notes || 'Overig'
 if (!byRecipe[key]) byRecipe[key] = []
 byRecipe[key].push(item)
 }

 return (
 <div key={day} className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl overflow-hidden">
 <div className="px-5 py-3 bg-white/30 border-b border-[#E8D5B5] flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Clock className="w-4 h-4 text-brand-400" />
 <span className="text-sm font-semibold text-[#3D2810]">{dayLabel}</span>
 <span className="text-xs text-[#B8997A]">
 {dayItems.length} items · {dayDoneCount} klaar
 </span>
 </div>
 </div>

 <div className="divide-y divide-[#E8D5B5]/50">
 {/* Table header */}
 <div className="px-5 py-2 flex items-center gap-3 text-xs text-[#B8997A] font-medium bg-white/10">
 <span className="w-6"></span>
 <span className="flex-1">Ingrediënt</span>
 <span className="w-16 text-right">Component</span>
 <span className="w-20 text-right">Per pers.</span>
 <span className="w-24 text-right font-semibold">Totaal ({numPersons}p)</span>
 <span className="w-12 text-right">Eenheid</span>
 <span className="w-16 text-right">Acties</span>
 </div>

 {dayItems.map(item => {
 const isEditing = editingId === item.id
 const statusOpt = statusOptions.find(s => s.value === item.status)

 return (
 <div
 key={item.id}
 className={`px-5 py-2.5 flex items-center gap-3 transition-all ${
 item.status === 'done' ? 'opacity-60' : ''
 } ${isEditing ? 'bg-brand-500/5 border-l-2 border-brand-500' : 'hover:bg-white/20'}`}
 >
 {/* Status toggle */}
 <button
 onClick={() => updateStatus(item.id, item.status === 'done' ? 'pending' : 'done')}
 className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
 item.status === 'done'
 ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
 : 'border-[#D4B896] hover:border-brand-500'
 }`}
 >
 {item.status === 'done' && <Check className="w-3 h-3" />}
 </button>

 {/* Item name */}
 <span className={`flex-1 text-sm ${item.status === 'done' ? 'line-through text-[#B8997A]' : 'text-[#3D2810]'}`}>
 {item.item_name}
 </span>

 {/* Component */}
 <span className="w-16 text-xs text-[#B8997A] text-right truncate">
 {item.notes || ''}
 </span>

 {/* Qty per person - editable */}
 {isEditing ? (
 <input
 type="number"
 value={item.quantity_per_person}
 onChange={(e) => updateItem(item.id, 'quantity_per_person', Number(e.target.value))}
 className="w-20 px-2 py-1 bg-white border border-brand-500/50 rounded text-sm text-right text-[#3D2810] font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
 step="0.1"
 />
 ) : (
 <span className="w-20 text-sm text-[#9E7E60] text-right font-mono">
 {item.quantity_per_person}
 </span>
 )}

 {/* Total quantity */}
 <span className="w-24 text-sm font-semibold text-[#2C1810] text-right font-mono">
 {isEditing ? item.total_quantity : item.total_quantity}
 </span>

 {/* Unit */}
 {isEditing ? (
 <input
 type="text"
 value={item.unit}
 onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
 className="w-12 px-1 py-1 bg-white border border-brand-500/50 rounded text-xs text-right text-[#3D2810] focus:outline-none focus:ring-1 focus:ring-brand-500"
 />
 ) : (
 <span className="w-12 text-xs text-[#B8997A] text-right">{item.unit}</span>
 )}

 {/* Actions */}
 <div className="w-16 flex items-center justify-end gap-1">
 {isEditing ? (
 <>
 <button
 onClick={() => saveItem(item.id)}
 disabled={saving}
 className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
 >
 {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
 </button>
 <button
 onClick={cancelEdit}
 className="p-1 text-[#B8997A] hover:text-[#5C4730] transition-colors"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 </>
 ) : (
 <>
 <button
 onClick={() => startEdit(item.id)}
 className="p-1 text-[#5C4730] hover:text-brand-400 transition-colors"
 >
 <Pencil className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => deleteItem(item.id)}
 className="p-1 text-[#5C4730] hover:text-red-400 transition-colors"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </>
 )}
 </div>
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
