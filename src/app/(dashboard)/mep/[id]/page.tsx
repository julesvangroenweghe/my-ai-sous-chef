'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ProductMatcher } from '@/components/mep/product-matcher'
import { SupplierInput } from '@/components/mep/supplier-input'
import {
  ArrowLeft, CalendarDays, Users, MapPin, Clock, Euro,
  ChefHat, Loader2, Check, X, Pencil, Trash2,
  AlertTriangle, ShieldCheck, Plus, FileDown,
  ChevronUp, ChevronDown, GripVertical, Search,
  StickyNote, Edit2, Save, AlertCircle, Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { Reorder, useDragControls } from 'framer-motion'
import type { DragControls } from 'framer-motion'

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
  mep_status: string
  notes: string | null
  venue_address: string | null
  travel_time_minutes: number | null
  event_start_time: string | null
  event_end_time: string | null
  allergens: string | null
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
  allergens: string | null
  sort_order: number
  is_ai_suggestion: boolean
  component_group: string | null
  supplier: string | null
  matched_product_id: string | null
}

// ─── Category ordering ────────────────────────────────────────────────────────

const CAT_ORDER: Record<string, number> = {
  'dranken': 1, 'mocktails': 2, 'lunch': 3,
  'fingerfood middag': 4, 'fingerfood apero': 4.5, 'fingerfood': 5,
  'fingerbites': 10, 'hapjes': 15, 'hapje_warm': 15,
  'kids': 16,
  'amuse': 20, 'appetizers middag': 24, 'appetizers apero': 24.5, 'appetizers': 25, 'appetizer': 25,
  'walking voorgerecht': 28, 'walking dinner': 30, 'walking': 30,
  'foodstand': 33, 'bbq': 34, 'voorgerecht': 35, 'sharing voorgerecht': 36, 'buffet': 37,
  'tussengerecht': 40, 'hoofdgerecht': 45, 'hoofdgerecht premium': 44,
  'brood & boter': 47, 'on the side': 50, 'sauzen': 52, 'kaas': 60,
  'dessert middag': 63, 'dessert': 65, 'dessert avond': 66, 'dessert lunch': 64,
  'walking dessert': 68, 'after snacks': 72, 'petits fours': 70,
  'barista mignardises': 200, 'mignardises': 200,
  'late night snack': 215, 'halfabricaat': 250,
}

function getCategoryOrder(cat: string): number {
  const lower = cat.toLowerCase().trim()
  if (CAT_ORDER[lower] !== undefined) return CAT_ORDER[lower]
  if (lower.includes('hoofdgerecht') && lower.includes('premium')) return 44
  if (lower.includes('middag')) {
    if (lower.includes('fingerfood')) return 4
    if (lower.includes('appetizers')) return 24
    if (lower.includes('dessert')) return 63
    return 3
  }
  if (lower.includes('apero')) {
    if (lower.includes('fingerfood')) return 4.5
    if (lower.includes('appetizers')) return 24.5
    return 22.5
  }
  if (lower.includes('foodstand')) return 33
  if (lower.includes('barista')) return 200
  if (lower.includes('walking') && lower.includes('dessert')) return 68
  if (lower.includes('walking') && lower.includes('voorgerecht')) return 28
  if (lower.includes('walking')) return 30
  if (lower.includes('sharing') && lower.includes('voorgerecht')) return 36
  const sortedKeys = Object.keys(CAT_ORDER).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    if (lower.includes(key)) return CAT_ORDER[key]
  }
  return 99
}

const CAT_LABELS: Record<string, string> = {
  'DRANKEN': 'Dranken', 'MOCKTAILS': 'Mocktails', 'LUNCH': 'Lunch',
  'FINGERFOOD': 'Fingerfood',
  'FINGERFOOD MIDDAG': 'Fingerfood — Middag receptie',
  'FINGERFOOD APERO': 'Fingerfood — Avond receptie',
  'FINGERBITES': 'Fingerbites', 'HAPJES': 'Hapjes', 'HAPJE_WARM': 'Hapjes (warm)',
  'AMUSE': 'Amuse', 'APPETIZERS': 'Appetizers',
  'APPETIZERS MIDDAG': 'Appetizers — Middag', 'APPETIZERS APERO': 'Appetizers — Avond',
  'WALKING DINNER': 'Walking Dinner', 'WALKING VOORGERECHT': 'Walking Voorgerecht',
  'SHARING VOORGERECHT': 'Sharing Voorgerecht',
  'VOORGERECHT': 'Voorgerecht', 'TUSSENGERECHT': 'Tussengerecht',
  'HOOFDGERECHT': 'Hoofdgerecht', 'HOOFDGERECHT PREMIUM': 'Hoofdgerecht Premium',
  'BROOD & BOTER': 'Brood & Boter', 'ON THE SIDE': 'On the Side',
  'SAUZEN': 'Sauzen', 'KAAS': 'Kaasgang',
  'DESSERT': 'Dessert', 'DESSERT MIDDAG': 'Dessert — Middag receptie',
  'DESSERT AVOND': 'Dessert — Avond receptie', 'DESSERT LUNCH': 'Dessert — Lunch',
  'WALKING DESSERT': 'Walking Dessert',
  'PETITS FOURS': 'Petits Fours', 'MIGNARDISES': 'Mignardises',
  'BARISTA MIGNARDISES': 'Mignardises (Barista)', 'HALFABRICAAT': 'Halfabricaten',
  'BBQ': 'BBQ', 'BUFFET': 'Buffet', 'AFTER SNACKS': 'After Snacks',
  'LATE NIGHT SNACK': 'Late Night Snack', 'KIDS': 'Kids',
}

function getCategoryLabel(cat: string): string {
  return CAT_LABELS[cat.toUpperCase()] || cat
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  walking_dinner: 'Walking Dinner', buffet: 'Buffet',
  sit_down: 'Diner aan tafel', seated_dinner: 'Diner aan tafel',
  cocktail: 'Cocktailreceptie', brunch: 'Brunch',
  tasting: 'Proeverijtje', daily_service: 'Dagdienst',
}

// ─── Allergen detection ───────────────────────────────────────────────────────

const EU_ALLERGENS = [
  'Gluten', 'Schaaldieren', 'Eieren', 'Vis', "Pinda's",
  'Soja', 'Melk', 'Noten', 'Selderij', 'Mosterd',
  'Sesam', 'Sulfiet', 'Lupine', 'Weekdieren',
]

const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  'Gluten': ['brood', 'bloem', 'tarwe', 'pasta', 'brioche', 'bun', 'rogge', 'gerst', 'spelt', 'crackers', 'crouton', 'croutons', 'panko', 'paneermeel', 'sojasaus', 'taco', 'tortilla', 'baguette', 'ciabatta', 'focaccia', 'seitan', 'tempura', 'wafels', 'koek', 'cake', 'blini', 'toast', 'crostini', 'pitabrood', 'krokant', 'croûton'],
  'Schaaldieren': ['garnaal', 'kreeft', 'krab', 'langoustine', 'scampi', 'rivierkreeft', 'shrimp', 'gamba'],
  'Eieren': ['ei', 'eigeel', 'eiwit', 'mayo', 'mayonaise', 'hollandaise', 'aioli', 'béarnaise', 'bearnaise', 'meringue', 'crème brûlée', 'custard', 'soufflé', 'souffle', 'omelet', 'frittata', 'lemon curd', 'eiersalade'],
  'Vis': ['zalm', 'kabeljauw', 'tonijn', 'makreel', 'forel', 'ansjovis', 'sgombro', 'tarbot', 'zeebaars', 'dorade', 'rog', 'heilbot', 'haring', 'sardine', 'snoekbaars', 'tuna', 'salmon', 'kaviaar', 'bottarga', 'brandade', 'gravlax', 'boquerones'],
  "Pinda's": ['pinda', 'satay', 'arachide', 'peanut'],
  'Soja': ['tofu', 'edamame', 'tempeh', 'miso', 'sojasaus', 'ponzu', 'soja'],
  'Melk': ['melk', 'boter', 'room', 'kaas', 'brie', 'camembert', 'ricotta', 'parmezaan', 'parmesan', 'mozzarella', 'grana', 'pecorino', 'gruyère', 'gruyere', 'cheddar', 'burrata', 'mascarpone', 'crème fraîche', 'creme fraiche', 'yoghurt', 'ghee', 'kwark', 'fromage', 'comté', 'comte', 'emmental', 'raclette', 'roomboter', 'roomkaas', 'beurre blanc', 'velouté', 'bechamel', 'béchamel', 'beurre', 'crème', 'dulce de leche', 'dulce', 'stilton', 'gorgonzola', 'roquefort', 'fourme', 'munster', 'taleggio', 'époisses', 'beaufort', 'vacherin', 'fleur de sel boter'],
  'Noten': ['amandel', 'hazelnoot', 'walnoot', 'pistache', 'cashew', 'pecan', 'macadamia', 'praline', 'praliné', 'marsepein', 'pesto', 'pijnboom', 'pine nut', 'paranoot', 'kokos'],
  'Selderij': ['selderij', 'selderie', 'knolselderij', 'celeriac'],
  'Mosterd': ['mosterd', 'moutarde', 'dijon', 'mustard', 'ravigote'],
  'Sesam': ['sesam', 'tahini', 'hummus', 'sesamzaad', 'sesamolie'],
  'Sulfiet': ['gedroogde abrikoos', 'rozijnen', 'balsamico', 'gedroogd fruit'],
  'Lupine': ['lupine'],
  'Weekdieren': ['inktvis', 'oester', 'mossel', 'sint-jakobsschelp', 'jacobsschelp', 'pijlinktvis', 'octopus', 'coquille', 'venusschelp', 'palourde'],
}

function detectAllergens(name: string): string[] {
  const lower = name.toLowerCase()
  const detected: string[] = []
  for (const [allergen, keywords] of Object.entries(ALLERGEN_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      detected.push(allergen)
    }
  }
  return detected
}

// ─── AllergenPicker ───────────────────────────────────────────────────────────

function AllergenPicker({
  value, onChange, suggested = [], onApproveSuggestion, onDismissSuggestion,
}: {
  value: string
  onChange: (v: string) => void
  suggested?: string[]
  onApproveSuggestion?: (a: string) => void
  onDismissSuggestion?: (a: string) => void
}) {
  const selected = value ? value.split(',').map(s => s.trim()).filter(Boolean) : []
  const toggle = (a: string) => {
    const next = selected.includes(a) ? selected.filter(x => x !== a) : [...selected, a]
    onChange(next.join(', '))
  }
  const pendingSuggestions = suggested.filter(s => !selected.includes(s))

  return (
    <div className="space-y-2">
      <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />Allergenen
        {pendingSuggestions.length > 0 && (
          <span className="ml-1 text-orange-500 font-normal text-[11px]">— {pendingSuggestions.length} suggestie{pendingSuggestions.length > 1 ? 's' : ''} gedetecteerd</span>
        )}
      </span>

      {pendingSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 p-2 bg-orange-50 rounded-lg border border-orange-200">
          <div className="w-full flex items-center gap-1 mb-1">
            <Sparkles className="w-3 h-3 text-orange-500" />
            <span className="text-[10px] text-orange-600 font-semibold">AI detecteerde mogelijk:</span>
          </div>
          {pendingSuggestions.map(a => (
            <div key={a} className="flex items-center">
              <button type="button" onClick={() => onApproveSuggestion?.(a)} title="Bevestigen"
                className="px-2 py-0.5 rounded-l text-xs font-medium bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-500 hover:text-white transition-all">
                {a}
              </button>
              <button type="button" onClick={() => onDismissSuggestion?.(a)} title="Negeren"
                className="px-1.5 py-0.5 rounded-r text-[10px] font-bold bg-orange-100 text-orange-400 border border-l-0 border-orange-300 hover:bg-red-100 hover:text-red-500 transition-all">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {EU_ALLERGENS.map(a => (
          <button key={a} type="button" onClick={() => toggle(a)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-all border ${
              selected.includes(a)
                ? 'bg-red-500 text-white border-red-500'
                : 'bg-white text-[#9E7E60] border-[#E8D5B5] hover:border-red-300 hover:text-red-600'
            }`}>
            {a}
          </button>
        ))}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-red-600 font-medium">✓ {selected.join(' · ')}</p>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('nl-BE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
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

const COMMON_GROUPS = ['Garnituur', 'Saus', 'Afwerking', 'Bijgerecht', 'Dressing', 'Topping']

// ─── AddComponentForm ─────────────────────────────────────────────────────────

function AddComponentForm({
  onSave, onCancel, existingGroups,
}: {
  onSave: (data: { name: string; qty: number | null; unit: string | null; prep: string | null; supplier: string | null; component_group: string | null; allergens: string | null }) => Promise<void>
  onCancel: () => void
  existingGroups: string[]
}) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [unit, setUnit] = useState('')
  const [prep, setPrep] = useState('')
  const [supplier, setSupplier] = useState('')
  const [group, setGroup] = useState('')
  const [allergens, setAllergens] = useState('')
  const [dismissed, setDismissed] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const allGroups = [...new Set([...existingGroups, ...COMMON_GROUPS])]

  const autoDetected = detectAllergens(name).filter(a => !dismissed.includes(a))

  const handleApproveSuggestion = (a: string) => {
    const current = allergens ? allergens.split(',').map(s => s.trim()).filter(Boolean) : []
    if (!current.includes(a)) setAllergens([...current, a].join(', '))
  }
  const handleDismissSuggestion = (a: string) => setDismissed(prev => [...prev, a])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    const confirmed = allergens ? allergens.split(',').map(s => s.trim()).filter(Boolean) : []
    const finalAllergens = [...new Set([...confirmed, ...autoDetected])].join(', ') || null
    await onSave({
      name: name.trim(),
      qty: qty ? parseFloat(qty) : null,
      unit: unit.trim() || null,
      prep: prep.trim() || null,
      supplier: supplier.trim() || null,
      component_group: group.trim() || null,
      allergens: finalAllergens,
    })
    setSaving(false)
  }

  return (
    <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-3 space-y-2.5 mt-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Plus className="w-3 h-3 text-emerald-600" />
        <span className="text-xs font-semibold text-emerald-700">Nieuw component</span>
      </div>

      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
        className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-sm text-[#2C1810] focus:border-emerald-400 focus:outline-none" placeholder="Naam component *" />

      <div className="flex gap-2">
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-emerald-600 font-medium">Aantal</label>
          <input type="number" step="any" value={qty} onChange={(e) => setQty(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            className="w-20 px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-sm text-[#2C1810] focus:border-emerald-400 focus:outline-none" placeholder="bv. 25" />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-emerald-600 font-medium">Eenheid</label>
          <input value={unit} onChange={(e) => setUnit(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            className="w-16 px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-sm text-[#2C1810] focus:border-emerald-400 focus:outline-none" placeholder="g / st" />
        </div>
        <div className="flex flex-col gap-0.5 flex-1">
          <label className="text-[10px] text-emerald-600 font-medium">Bereiding</label>
          <input value={prep} onChange={(e) => setPrep(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-sm text-[#2C1810] focus:border-emerald-400 focus:outline-none" placeholder="bv. geschild, geblancheerd" />
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <span className="text-xs text-emerald-600 font-medium shrink-0">Sub-groep:</span>
        <div className="flex gap-1 flex-wrap flex-1">
          {allGroups.map((g) => (
            <button key={g} type="button" onClick={() => setGroup(group === g ? '' : g)}
              className={`px-2 py-0.5 rounded text-xs transition-all ${group === g ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>{g}</button>
          ))}
          <input value={allGroups.includes(group) ? '' : group} onChange={(e) => setGroup(e.target.value)}
            className="w-24 px-2 py-0.5 bg-white border border-emerald-200 rounded text-xs text-[#2C1810] focus:border-emerald-400 focus:outline-none" placeholder="Of typ..." />
        </div>
      </div>

      <AllergenPicker
        value={allergens}
        onChange={setAllergens}
        suggested={autoDetected}
        onApproveSuggestion={handleApproveSuggestion}
        onDismissSuggestion={handleDismissSuggestion}
      />

      <SupplierInput value={supplier} onChange={(val) => { setSupplier(val) }} placeholder="Leverancier (optioneel)" />

      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs text-[#9E7E60] hover:text-[#3D2810] transition-colors">Annuleren</button>
        <button onClick={handleSave} disabled={saving || !name.trim()}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50">
          {saving ? 'Toevoegen...' : '+ Toevoegen'}
        </button>
      </div>
    </div>
  )
}

// ─── InlineComponentEdit ──────────────────────────────────────────────────────

function InlineComponentEdit({
  component, onSave, onCancel, existingGroups,
}: {
  component: MepComponent; onSave: (updates: Partial<MepComponent>) => Promise<void>; onCancel: () => void; existingGroups: string[]
}) {
  const [name, setName] = useState(component.component_name)
  const [qty, setQty] = useState(component.quantity?.toString() || '')
  const [unit, setUnit] = useState(component.unit || '')
  const [prep, setPrep] = useState(component.preparation || '')
  const [allergens, setAllergens] = useState(component.allergens || '')
  const [dismissed, setDismissed] = useState<string[]>([])
  const [supplier, setSupplier] = useState(component.supplier || '')
  const [group, setGroup] = useState(component.component_group || '')
  const [matchedProductId, setMatchedProductId] = useState<string | null>(component.matched_product_id || null)
  const [saving, setSaving] = useState(false)
  const allGroups = [...new Set([...existingGroups, ...COMMON_GROUPS])]

  const autoDetected = detectAllergens(name).filter(a => !dismissed.includes(a))

  const handleApproveSuggestion = (a: string) => {
    const current = allergens ? allergens.split(',').map(s => s.trim()).filter(Boolean) : []
    if (!current.includes(a)) setAllergens([...current, a].join(', '))
  }
  const handleDismissSuggestion = (a: string) => setDismissed(prev => [...prev, a])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    const confirmed = allergens ? allergens.split(',').map(s => s.trim()).filter(Boolean) : []
    const finalAllergens = [...new Set([...confirmed, ...autoDetected])].join(', ') || null
    await onSave({
      component_name: name.trim(),
      quantity: qty ? parseFloat(qty) : null,
      unit: unit.trim() || null,
      preparation: prep.trim() || null,
      allergens: finalAllergens,
      supplier: supplier.trim() || null,
      matched_product_id: matchedProductId,
      component_group: group.trim() || null,
    })
    setSaving(false)
  }

  return (
    <div className="bg-[#FDF8F2]/80 border border-[#E8A040]/30 rounded-xl p-3 space-y-2.5 my-1">
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
        className="w-full px-2.5 py-1.5 bg-white border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:border-[#E8A040]/50 focus:outline-none" placeholder="Naam component" />

      <div className="flex gap-2">
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-[#9E7E60] font-medium">Aantal</label>
          <input type="number" step="any" value={qty} onChange={(e) => setQty(e.target.value)}
            className="w-20 px-2.5 py-1.5 bg-white border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:border-[#E8A040]/50 focus:outline-none" placeholder="bv. 25" />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-[#9E7E60] font-medium">Eenheid</label>
          <input value={unit} onChange={(e) => setUnit(e.target.value)}
            className="w-16 px-2.5 py-1.5 bg-white border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:border-[#E8A040]/50 focus:outline-none" placeholder="g / st" />
        </div>
        <div className="flex flex-col gap-0.5 flex-1">
          <label className="text-[10px] text-[#9E7E60] font-medium">Bereiding</label>
          <input value={prep} onChange={(e) => setPrep(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:border-[#E8A040]/50 focus:outline-none" placeholder="bv. geschild, geblancheerd" />
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <span className="text-xs text-[#9E7E60] font-medium shrink-0">Sub-groep:</span>
        <div className="flex gap-1 flex-wrap flex-1">
          {allGroups.map((g) => (
            <button key={g} type="button" onClick={() => setGroup(group === g ? '' : g)}
              className={`px-2 py-0.5 rounded text-xs transition-all ${group === g ? 'bg-[#E8A040] text-white' : 'bg-[#E8A040]/10 text-[#9E7E60] hover:bg-[#E8A040]/20'}`}>{g}</button>
          ))}
          <input value={allGroups.includes(group) ? '' : group} onChange={(e) => setGroup(e.target.value)}
            className="w-24 px-2 py-0.5 bg-white border border-[#E8D5B5] rounded text-xs text-[#2C1810] focus:border-[#E8A040]/50 focus:outline-none" placeholder="Of typ..." />
        </div>
      </div>

      <AllergenPicker
        value={allergens}
        onChange={setAllergens}
        suggested={autoDetected}
        onApproveSuggestion={handleApproveSuggestion}
        onDismissSuggestion={handleDismissSuggestion}
      />

      <SupplierInput value={supplier} onChange={(val) => { setSupplier(val); if (val !== supplier) setMatchedProductId(null) }} />
      <ProductMatcher supplier={supplier} componentName={name} matchedProductId={matchedProductId}
        onMatch={(id, suggestedUnit) => { setMatchedProductId(id); if (suggestedUnit && !unit) setUnit(suggestedUnit) }} />

      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs text-[#9E7E60] hover:text-[#3D2810] transition-colors">Annuleren</button>
        <button onClick={handleSave} disabled={saving || !name.trim()}
          className="px-3 py-1.5 bg-[#E8A040] hover:bg-[#d4922e] text-stone-900 text-xs font-bold rounded-lg transition-all disabled:opacity-50">
          {saving ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>
    </div>
  )
}

// ─── ComponentRow ─────────────────────────────────────────────────────────────

function ComponentRow({
  component, onApprove, onEdit, onDelete, dragControls,
}: {
  component: MepComponent; onApprove: () => void; onEdit: () => void; onDelete: () => void; dragControls?: DragControls
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isAI = component.is_ai_suggestion
  const allergenList = component.allergens ? component.allergens.split(',').map(s => s.trim()).filter(Boolean) : []

  return (
    <div className={`group flex items-start gap-1 py-0.5 px-1 rounded hover:bg-[#FDF8F2]/60 transition-all ${isAI ? 'border-l-2 border-orange-400/60 pl-2 ml-0' : ''}`}>
      <div onPointerDown={(e) => { if (dragControls) { e.preventDefault(); dragControls.start(e) } }}
        className="flex items-center opacity-30 group-hover:opacity-70 hover:!opacity-100 transition-opacity shrink-0 mt-1 cursor-grab active:cursor-grabbing touch-none select-none" title="Versleep om te herschikken">
        <GripVertical className="w-3.5 h-3.5 text-[#B8997A]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1 flex-wrap">
          <span className={`text-sm ${isAI ? 'text-orange-700' : 'text-[#2C1810]'}`}>{component.component_name}</span>
          {(component.quantity || component.unit) && (
            <span className={`text-xs shrink-0 ${isAI ? 'text-orange-400' : 'text-[#9E7E60]'}`}>({formatQty(component.quantity, component.unit)})</span>
          )}
          {component.preparation && (
            <span className={`text-xs shrink-0 italic ${isAI ? 'text-orange-400' : 'text-[#9E7E60]'}`}>({component.preparation})</span>
          )}
          {component.supplier && (
            <span className="text-xs text-[#B8997A] shrink-0">· {component.supplier}</span>
          )}
        </div>
        {allergenList.length > 0 && (
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            <AlertCircle className="w-2.5 h-2.5 text-red-400 shrink-0" />
            {allergenList.map(a => (
              <span key={a} className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0 rounded font-medium">{a}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
        {isAI && (
          <button onClick={onApprove} className="p-1 rounded bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 transition-all" title="Goedkeuren">
            <Check className="w-3 h-3" />
          </button>
        )}
        <button onClick={onEdit} className="p-1 rounded text-[#B8997A] hover:text-[#E8A040] hover:bg-[#E8A040]/10 transition-all" title="Aanpassen">
          <Pencil className="w-3 h-3" />
        </button>
        {confirmDelete ? (
          <>
            <button onClick={onDelete} className="px-2 py-0.5 rounded bg-red-500/20 text-red-500 hover:bg-red-500/30 text-xs font-medium transition-all">Ja</button>
            <button onClick={() => setConfirmDelete(false)} className="p-1 rounded text-[#9E7E60] hover:text-[#3D2810] transition-all"><X className="w-3 h-3" /></button>
          </>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="p-1 rounded text-[#B8997A] hover:text-red-500 hover:bg-red-500/10 transition-all" title="Verwijderen">
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── DishCard ─────────────────────────────────────────────────────────────────

function DraggableComponentItem({ compId, children }: { compId: string; children: (controls: DragControls) => React.ReactNode }) {
  const controls = useDragControls()
  return (
    <Reorder.Item value={compId} dragListener={false} dragControls={controls} className="list-none"
      whileDrag={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, background: 'rgba(253,248,242,0.95)', borderRadius: '8px' }}>
      {children(controls)}
    </Reorder.Item>
  )
}

function DishCard({
  dish, onApproveComponent, onUpdateComponent, onDeleteComponent, onApproveDish, onDeleteDish, onAddComponent, onEditTitle,
  onReorderComponents, onMoveDishUp, onMoveDishDown, isFirstDish, isLastDish, editingComponentId, setEditingComponentId, existingGroups,
}: {
  dish: MepDish
  onApproveComponent: (id: string) => void
  onUpdateComponent: (id: string, updates: Partial<MepComponent>) => Promise<void>
  onDeleteComponent: (id: string) => void
  onApproveDish: (id: string) => void
  onDeleteDish: (id: string) => void
  onAddComponent: (dishId: string, data: { name: string; qty: number | null; unit: string | null; prep: string | null; supplier: string | null; component_group: string | null; allergens: string | null }) => Promise<void>
  onEditTitle: (dishId: string, newTitle: string) => Promise<void>
  onReorderComponents: (dishId: string, newOrder: string[]) => void
  onMoveDishUp: () => void
  onMoveDishDown: () => void
  isFirstDish: boolean
  isLastDish: boolean
  editingComponentId: string | null
  setEditingComponentId: (id: string | null) => void
  existingGroups: string[]
}) {
  const isAI = dish.is_ai_suggestion
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(dish.title)
  const [savingTitle, setSavingTitle] = useState(false)
  const [confirmDeleteDish, setConfirmDeleteDish] = useState(false)

  const handleSaveTitle = async () => {
    if (!titleValue.trim() || titleValue === dish.title) { setEditingTitle(false); return }
    setSavingTitle(true)
    await onEditTitle(dish.id, titleValue.trim())
    setSavingTitle(false)
    setEditingTitle(false)
  }

  const sorted = [...dish.components].sort((a, b) => a.sort_order - b.sort_order)
  const sortedIds = sorted.map((c) => c.id)
  const compMap = Object.fromEntries(sorted.map((c) => [c.id, c]))

  return (
    <div className={`bg-white/70 border rounded-xl overflow-hidden transition-all ${isAI ? 'border-orange-300/60 shadow-orange-100/50 shadow-sm' : 'border-[#E8D5B5]'}`}>
      <div className={`px-3 py-1.5 flex items-center justify-between gap-2 ${isAI ? 'bg-orange-50/60' : 'bg-[#FDFAF6]/90'}`}>
        <div className="flex flex-col items-center shrink-0 opacity-40 hover:opacity-100 transition-opacity">
          <button onClick={onMoveDishUp} disabled={isFirstDish} className="p-0 text-[#B8997A] hover:text-[#2C1810] disabled:opacity-20 disabled:cursor-default transition-colors" title="Gerecht omhoog"><ChevronUp className="w-3.5 h-3.5" /></button>
          <button onClick={onMoveDishDown} disabled={isLastDish} className="p-0 text-[#B8997A] hover:text-[#2C1810] disabled:opacity-20 disabled:cursor-default transition-colors" title="Gerecht omlaag"><ChevronDown className="w-3.5 h-3.5" /></button>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isAI && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md font-semibold shrink-0 border border-orange-200">AI</span>}
          {editingTitle ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <input autoFocus value={titleValue} onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') { setTitleValue(dish.title); setEditingTitle(false) } }}
                className="flex-1 px-2 py-0.5 text-sm font-semibold bg-white border border-[#E8A040]/50 rounded focus:outline-none text-[#2C1810]" />
              <button onClick={handleSaveTitle} disabled={savingTitle} className="p-1 rounded bg-[#E8A040]/20 text-[#E8A040] hover:bg-[#E8A040]/30 transition-all">
                {savingTitle ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              </button>
              <button onClick={() => { setTitleValue(dish.title); setEditingTitle(false) }} className="p-1 rounded text-[#9E7E60] hover:text-[#3D2810] transition-all"><X className="w-3 h-3" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-1 min-w-0 group/title">
              <h4 className={`text-sm font-semibold truncate cursor-pointer hover:underline decoration-dotted ${isAI ? 'text-orange-700' : 'text-[#2C1810]'}`} onClick={() => setEditingTitle(true)} title="Klik om te bewerken">{dish.title}</h4>
              <button onClick={() => setEditingTitle(true)} className="opacity-0 group-hover/title:opacity-60 hover:!opacity-100 p-0.5 rounded text-[#B8997A] transition-all" title="Titel bewerken"><Pencil className="w-3 h-3" /></button>
            </div>
          )}
          {dish.timing_label && <span className="text-xs text-[#B8997A] shrink-0 flex items-center gap-1"><Clock className="w-3 h-3" />{dish.timing_label}</span>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isAI && (
            <>
              {confirmDeleteDish ? (
                <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                  <span className="text-xs text-red-700 font-medium">Verwijderen?</span>
                  <button
                    onClick={() => onDeleteDish(dish.id)}
                    className="px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded transition-all"
                  >Ja</button>
                  <button
                    onClick={() => setConfirmDeleteDish(false)}
                    className="p-0.5 text-[#9E7E60] hover:text-[#3D2810] transition-colors"
                  ><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteDish(true)}
                  className="p-1.5 rounded-lg text-orange-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                  title="Voorstel verwijderen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => onApproveDish(dish.id)} className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-emerald-500/20 text-emerald-700 hover:bg-emerald-500/30 rounded-lg transition-all font-semibold border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />Goedkeuren
              </button>
            </>
          )}
        </div>
      </div>
      {dish.notes && <div className="px-4 py-1.5 text-xs italic text-[#9E7E60] border-b border-[#E8D5B5]/50 bg-[#FDF8F2]/30">{dish.notes}</div>}
      <div className="px-2 py-1">
        <Reorder.Group axis="y" values={sortedIds} onReorder={(newOrder) => onReorderComponents(dish.id, newOrder)} className="space-y-0">
          {sortedIds.map((id, i) => {
            const c = compMap[id]
            if (!c) return null
            const prevComp = i > 0 ? compMap[sortedIds[i - 1]] : null
            const showGroupHeader = !!c.component_group && c.component_group !== prevComp?.component_group
            if (editingComponentId === c.id) {
              return (
                <Reorder.Item key={c.id} value={c.id} dragListener={false} className="list-none">
                  {showGroupHeader && <div className="flex items-center gap-2 px-2 mb-1 mt-2.5"><span className="h-px flex-1 bg-[#E8D5B5]/70" /><span className="text-[10px] font-semibold text-[#B8997A] uppercase tracking-wider">{c.component_group}</span><span className="h-px flex-1 bg-[#E8D5B5]/70" /></div>}
                  <InlineComponentEdit component={c} existingGroups={existingGroups}
                    onSave={async (updates) => { await onUpdateComponent(c.id, updates); setEditingComponentId(null) }}
                    onCancel={() => setEditingComponentId(null)} />
                </Reorder.Item>
              )
            }
            return (
              <DraggableComponentItem key={c.id} compId={c.id}>
                {(controls) => (
                  <>
                    {showGroupHeader && <div className="flex items-center gap-2 px-2 mb-1 mt-2.5"><span className="h-px flex-1 bg-[#E8D5B5]/70" /><span className="text-[10px] font-semibold text-[#B8997A] uppercase tracking-wider">{c.component_group}</span><span className="h-px flex-1 bg-[#E8D5B5]/70" /></div>}
                    <ComponentRow component={c} onApprove={() => onApproveComponent(c.id)} onEdit={() => setEditingComponentId(c.id)} onDelete={() => onDeleteComponent(c.id)} dragControls={controls} />
                  </>
                )}
              </DraggableComponentItem>
            )
          })}
        </Reorder.Group>
        {showAddForm ? (
          <AddComponentForm existingGroups={existingGroups} onSave={async (data) => { await onAddComponent(dish.id, data); setShowAddForm(false) }} onCancel={() => setShowAddForm(false)} />
        ) : (
          <button onClick={() => setShowAddForm(true)} className="w-full mt-1.5 py-1.5 flex items-center justify-center gap-1.5 text-xs text-[#B8997A] hover:text-[#E8A040] hover:bg-[#E8A040]/5 rounded-lg border border-dashed border-[#E8D5B5] hover:border-[#E8A040]/40 transition-all">
            <Plus className="w-3 h-3" />Component toevoegen
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
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null)

  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [savingField, setSavingField] = useState(false)

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const { data: eventData, error: eventError } = await supabase.from('events').select('*').eq('id', id).single()
    if (eventError || !eventData) { setLoading(false); return }
    setEvent(eventData)
    setNotesValue(eventData.notes || '')
    setFieldValues({
      num_persons: String(eventData.num_persons ?? ''),
      price_per_person: String(eventData.price_per_person ?? ''),
      location: eventData.location || '',
      event_start_time: eventData.event_start_time ? String(eventData.event_start_time).slice(0, 5) : '',
      event_end_time: eventData.event_end_time ? String(eventData.event_end_time).slice(0, 5) : '',
      contact_person: eventData.contact_person || '',
      allergens: (eventData as any).allergens || '',
    })

    const { data: dishData } = await supabase.from('mep_dishes').select('*').eq('event_id', id).order('sort_order')
    if (!dishData || dishData.length === 0) { setDishes([]); setLoading(false); return }

    const dishIds = dishData.map((d: any) => d.id)
    const { data: componentData } = await supabase.from('mep_components').select('*').in('dish_id', dishIds).order('sort_order')

    const componentsByDish: Record<string, MepComponent[]> = {}
    for (const c of componentData || []) {
      if (!componentsByDish[c.dish_id]) componentsByDish[c.dish_id] = []
      componentsByDish[c.dish_id].push(c)
    }
    setDishes(dishData.map((d: any) => ({ ...d, components: componentsByDish[d.id] || [] })))
    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    const handler = () => { loadData() }
    window.addEventListener('mep-data-updated', handler)
    return () => window.removeEventListener('mep-data-updated', handler)
  }, [loadData])

  const existingGroups = [...new Set(dishes.flatMap((d) => d.components.map((c) => c.component_group).filter(Boolean) as string[]))]

  const handleUpdateEventField = async (field: string, value: string) => {
    if (!event) return
    setSavingField(true)
    const updateData: Record<string, any> = {}
    if (field === 'num_persons') updateData[field] = value ? parseInt(value) : null
    else if (field === 'price_per_person') updateData[field] = value ? parseFloat(value) : null
    else updateData[field] = value.trim() || null
    const { error } = await supabase.from('events').update(updateData).eq('id', event.id)
    setSavingField(false)
    if (error) { toast.error('Opslaan mislukt'); return }
    setEvent(prev => prev ? { ...prev, ...updateData } as MepEvent : prev)
    setEditingField(null)
    toast.success('Opgeslagen ✓')
  }

  const handleSaveNotes = async () => {
    if (!event) return
    setSavingNotes(true)
    const { error } = await supabase.from('events').update({ notes: notesValue.trim() || null }).eq('id', event.id)
    setSavingNotes(false)
    if (error) { toast.error('Opslaan mislukt'); return }
    setEvent(prev => prev ? { ...prev, notes: notesValue.trim() || null } : prev)
    setEditingNotes(false)
    toast.success('Notitie opgeslagen ✓')
  }

  const handleApproveComponent = async (componentId: string) => {
    const { error } = await supabase.from('mep_components').update({ is_ai_suggestion: false }).eq('id', componentId)
    if (error) { toast.error('Goedkeuren mislukt'); return }
    setDishes((prev) => prev.map((d) => ({ ...d, components: d.components.map((c) => c.id === componentId ? { ...c, is_ai_suggestion: false } : c) })))
    toast.success('Component goedgekeurd ✓')
  }

  const handleUpdateComponent = async (componentId: string, updates: Partial<MepComponent>) => {
    const { error } = await supabase.from('mep_components').update(updates).eq('id', componentId)
    if (error) { toast.error('Opslaan mislukt'); return }
    setDishes((prev) => prev.map((d) => ({ ...d, components: d.components.map((c) => c.id === componentId ? { ...c, ...updates } : c) })))
    toast.success('Component bijgewerkt ✓')
  }

  const handleDeleteComponent = async (componentId: string) => {
    const { error } = await supabase.from('mep_components').delete().eq('id', componentId)
    if (error) { toast.error('Verwijderen mislukt'); return }
    setDishes((prev) => prev.map((d) => ({ ...d, components: d.components.filter((c) => c.id !== componentId) })))
    toast.success('Component verwijderd')
  }

  const handleApproveDish = async (dishId: string) => {
    const { error: dishErr } = await supabase.from('mep_dishes').update({ is_ai_suggestion: false }).eq('id', dishId)
    const { error: compErr } = await supabase.from('mep_components').update({ is_ai_suggestion: false }).eq('dish_id', dishId)
    if (dishErr || compErr) { toast.error('Goedkeuren mislukt'); return }
    setDishes((prev) => prev.map((d) => d.id === dishId ? { ...d, is_ai_suggestion: false, components: d.components.map((c) => ({ ...c, is_ai_suggestion: false })) } : d))
    toast.success('Gerecht goedgekeurd ✓')
  }

  const handleDeleteDish = async (dishId: string) => {
    // Delete components first, then the dish
    const { error: compErr } = await supabase.from('mep_components').delete().eq('dish_id', dishId)
    if (compErr) { toast.error('Verwijderen mislukt'); return }
    const { error: dishErr } = await supabase.from('mep_dishes').delete().eq('id', dishId)
    if (dishErr) { toast.error('Verwijderen mislukt'); return }
    setDishes((prev) => prev.filter((d) => d.id !== dishId))
    toast.success('Voorstel verwijderd')
  }

  const handleAddComponent = async (dishId: string, data: { name: string; qty: number | null; unit: string | null; prep: string | null; supplier: string | null; component_group: string | null; allergens: string | null }) => {
    const dish = dishes.find((d) => d.id === dishId)
    const maxOrder = dish ? Math.max(0, ...dish.components.map((c) => c.sort_order)) + 1 : 1
    const { data: newComp, error } = await supabase.from('mep_components').insert({
      dish_id: dishId,
      component_name: data.name,
      quantity: data.qty,
      unit: data.unit,
      preparation: data.prep,
      supplier: data.supplier,
      sort_order: maxOrder,
      is_ai_suggestion: false,
      component_group: data.component_group,
      allergens: data.allergens,
    }).select().single()
    if (error || !newComp) { toast.error('Toevoegen mislukt'); return }
    setDishes((prev) => prev.map((d) => d.id === dishId ? { ...d, components: [...d.components, newComp as MepComponent] } : d))
    toast.success(`${data.name} toegevoegd ✓`)
  }

  const handleEditDishTitle = async (dishId: string, newTitle: string) => {
    const { error } = await supabase.from('mep_dishes').update({ title: newTitle }).eq('id', dishId)
    if (error) { toast.error('Opslaan mislukt'); return }
    setDishes((prev) => prev.map((d) => (d.id === dishId ? { ...d, title: newTitle } : d)))
    toast.success('Titel bijgewerkt ✓')
  }

  const handleReorderComponents = async (dishId: string, newOrder: string[]) => {
    setDishes((prev) => prev.map((d) => {
      if (d.id !== dishId) return d
      const compMap = new Map(d.components.map((c) => [c.id, c]))
      return { ...d, components: newOrder.map((id, idx) => ({ ...compMap.get(id)!, sort_order: idx })) }
    }))
    await Promise.all(newOrder.map((id, idx) => supabase.from('mep_components').update({ sort_order: idx }).eq('id', id)))
  }

  const handleMoveDish = async (dishId: string, direction: 'up' | 'down') => {
    const dish = dishes.find((d) => d.id === dishId)
    if (!dish) return
    const sameCat = dishes.filter((d) => d.category === dish.category).sort((a, b) => a.sort_order - b.sort_order)
    const idx = sameCat.findIndex((d) => d.id === dishId)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sameCat.length) return
    const a = sameCat[idx]; const b = sameCat[swapIdx]
    setDishes((prev) => prev.map((d) => { if (d.id === a.id) return { ...d, sort_order: b.sort_order }; if (d.id === b.id) return { ...d, sort_order: a.sort_order }; return d }))
    await Promise.all([supabase.from('mep_dishes').update({ sort_order: b.sort_order }).eq('id', a.id), supabase.from('mep_dishes').update({ sort_order: a.sort_order }).eq('id', b.id)])
    toast.success('Volgorde aangepast ✓')
  }

  const handleApproveEvent = async () => {
    if (!event) return
    setApprovingEvent(true)
    try {
      const res = await fetch(`/api/mep/approve/${event.id}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok || json.error) { toast.error('Goedkeuren mislukt: ' + (json.error || res.statusText)); setApprovingEvent(false); return }
      setEvent((prev) => prev ? { ...prev, mep_status: 'approved' } : prev)
      setDishes((prev) => prev.map((d) => ({ ...d, is_ai_suggestion: false, components: d.components.map((c) => ({ ...c, is_ai_suggestion: false })) })))
      setConfirmApproveEvent(false)
      toast.success('Event goedgekeurd ✓ — staat nu in planning')
    } catch { toast.error('Netwerkfout bij goedkeuren') }
    finally { setApprovingEvent(false) }
  }

  const categorized = dishes.reduce((acc, dish) => {
    const cat = dish.category || 'OVERIG'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(dish)
    return acc
  }, {} as Record<string, MepDish[]>)

  const sortedCategories = Object.entries(categorized).sort(([a], [b]) => getCategoryOrder(a) - getCategoryOrder(b))
  const totalAI = dishes.filter((d) => d.is_ai_suggestion).length + dishes.flatMap((d) => d.components).filter((c) => c.is_ai_suggestion).length

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 text-[#E8A040] animate-spin" /></div>
  if (!event) return <div className="text-center py-16"><p className="text-[#9E7E60] mb-2">Event niet gevonden</p><Link href="/mep" className="text-[#E8A040] text-sm hover:underline">← Terug naar planning</Link></div>

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/mep" className="p-2 rounded-xl bg-white border border-[#E8D5B5] text-[#9E7E60] hover:text-[#2C1810] transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-display font-extrabold text-[#2C1810] truncate">{event.name}</h1>
          <p className="text-[#B8997A] text-sm">{formatDate(event.event_date)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
            event.mep_status === 'approved' ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
            : event.mep_status === 'draft' ? 'bg-[#FDF8F2] text-[#5C4730] border-[#E8D5B5]'
            : 'bg-[#E8A040]/20 text-[#E8A040] border-[#E8A040]/30'
          }`}>
            {event.mep_status === 'approved' ? 'Goedgekeurd' : event.mep_status === 'draft' ? 'Concept' : event.mep_status}
          </span>
          <a href={`/api/mep/pdf/${id}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E8D5B5] text-[#5C4730] hover:text-[#2C1810] hover:border-[#E8A040]/50 rounded-xl text-xs font-semibold transition-all" title="PDF downloaden">
            <FileDown className="w-3.5 h-3.5" />PDF
          </a>
          {event.mep_status !== 'approved' && (
            confirmApproveEvent ? (
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5">
                <span className="text-xs text-emerald-700 font-medium">Zeker goedkeuren?</span>
                <button onClick={handleApproveEvent} disabled={approvingEvent} className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50">
                  {approvingEvent ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Ja'}
                </button>
                <button onClick={() => setConfirmApproveEvent(false)} className="p-1 text-[#9E7E60] hover:text-[#3D2810] transition-colors"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <button onClick={() => setConfirmApproveEvent(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all">
                <ShieldCheck className="w-3.5 h-3.5" />Event goedkeuren
              </button>
            )
          )}
        </div>
      </div>

      {/* Notities banner */}
      {event.notes && !editingNotes && (
        <div className="flex items-start gap-3 bg-amber-50 border-2 border-amber-300 rounded-2xl px-5 py-4">
          <StickyNote className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">⚠ Aandachtspunten</p>
            <p className="text-sm text-amber-900 font-medium whitespace-pre-wrap">{event.notes}</p>
          </div>
          <button onClick={() => { setNotesValue(event.notes || ''); setEditingNotes(true) }}
            className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-all shrink-0" title="Notitie bewerken">
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {editingNotes && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Aandachtspunten bewerken</span>
          </div>
          <textarea autoFocus value={notesValue} onChange={(e) => setNotesValue(e.target.value)} rows={3}
            className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-sm text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            placeholder="bv. Kids eten vroeg · Vegetarische gasten tafel 3 · Allergeen check met zaalverantwoordelijke..." />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditingNotes(false)} className="px-3 py-1.5 text-xs text-[#9E7E60] hover:text-[#3D2810] transition-colors">Annuleren</button>
            <button onClick={handleSaveNotes} disabled={savingNotes}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50">
              {savingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}Opslaan
            </button>
          </div>
        </div>
      )}

      {!event.notes && !editingNotes && (
        <button onClick={() => setEditingNotes(true)}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-dashed border-amber-300 rounded-xl text-xs text-amber-600 hover:bg-amber-50 hover:border-amber-400 transition-all">
          <StickyNote className="w-3.5 h-3.5" />Aandachtspunt toevoegen
        </button>
      )}

      {/* Event info — bewerkbaar */}
      <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Personen */}
          <div className="flex items-start gap-2 min-w-0 group/field">
            <Users className="w-4 h-4 text-[#E8A040] shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-[#B8997A]">Personen</div>
              {editingField === 'num_persons' ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <input autoFocus type="number" value={fieldValues.num_persons} onChange={e => setFieldValues(p => ({...p, num_persons: e.target.value}))}
                    onKeyDown={e => { if (e.key === 'Enter') handleUpdateEventField('num_persons', fieldValues.num_persons); if (e.key === 'Escape') setEditingField(null) }}
                    className="w-20 px-2 py-0.5 bg-white border border-[#E8A040]/50 rounded text-sm text-[#2C1810] focus:outline-none" />
                  <button onClick={() => handleUpdateEventField('num_persons', fieldValues.num_persons)} disabled={savingField}
                    className="p-1 rounded bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 transition-all"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setEditingField(null)} className="p-1 rounded text-[#9E7E60] hover:text-red-500 transition-all"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="text-sm font-semibold text-[#2C1810]">{event.num_persons ?? '—'}</div>
                  <button onClick={() => { setFieldValues(p => ({...p, num_persons: String(event.num_persons ?? '')})); setEditingField('num_persons') }}
                    className="opacity-0 group-hover/field:opacity-60 hover:!opacity-100 p-0.5 rounded text-[#B8997A] hover:text-[#E8A040] transition-all"><Pencil className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          </div>

          {/* Prijs p.p. */}
          <div className="flex items-start gap-2 min-w-0 group/field">
            <Euro className="w-4 h-4 text-[#E8A040] shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-[#B8997A]">Prijs p.p.</div>
              {editingField === 'price_per_person' ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <input autoFocus type="number" step="0.01" value={fieldValues.price_per_person} onChange={e => setFieldValues(p => ({...p, price_per_person: e.target.value}))}
                    onKeyDown={e => { if (e.key === 'Enter') handleUpdateEventField('price_per_person', fieldValues.price_per_person); if (e.key === 'Escape') setEditingField(null) }}
                    className="w-24 px-2 py-0.5 bg-white border border-[#E8A040]/50 rounded text-sm text-[#2C1810] focus:outline-none" />
                  <button onClick={() => handleUpdateEventField('price_per_person', fieldValues.price_per_person)} disabled={savingField}
                    className="p-1 rounded bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 transition-all"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setEditingField(null)} className="p-1 rounded text-[#9E7E60] hover:text-red-500 transition-all"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="text-sm font-semibold text-[#2C1810]">{event.price_per_person ? `€${Number(event.price_per_person).toFixed(2)}` : '—'}</div>
                  <button onClick={() => { setFieldValues(p => ({...p, price_per_person: String(event.price_per_person ?? '')})); setEditingField('price_per_person') }}
                    className="opacity-0 group-hover/field:opacity-60 hover:!opacity-100 p-0.5 rounded text-[#B8997A] hover:text-[#E8A040] transition-all"><Pencil className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          </div>

          {/* Locatie */}
          <div className="flex items-start gap-2 min-w-0 group/field">
            <MapPin className="w-4 h-4 text-[#E8A040] shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-[#B8997A]">Locatie</div>
              {editingField === 'location' ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <input autoFocus value={fieldValues.location} onChange={e => setFieldValues(p => ({...p, location: e.target.value}))}
                    onKeyDown={e => { if (e.key === 'Enter') handleUpdateEventField('location', fieldValues.location); if (e.key === 'Escape') setEditingField(null) }}
                    className="w-full px-2 py-0.5 bg-white border border-[#E8A040]/50 rounded text-sm text-[#2C1810] focus:outline-none" placeholder="Adres..." />
                  <button onClick={() => handleUpdateEventField('location', fieldValues.location)} disabled={savingField}
                    className="p-1 rounded bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 transition-all shrink-0"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setEditingField(null)} className="p-1 rounded text-[#9E7E60] hover:text-red-500 transition-all shrink-0"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="text-sm font-semibold text-[#2C1810] truncate">{event.venue_address || event.location || '—'}</div>
                  <button onClick={() => { setFieldValues(p => ({...p, location: event.venue_address || event.location || ''})); setEditingField('location') }}
                    className="opacity-0 group-hover/field:opacity-60 hover:!opacity-100 p-0.5 rounded text-[#B8997A] hover:text-[#E8A040] transition-all shrink-0"><Pencil className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          </div>

          {/* Type */}
          <div className="flex items-start gap-2 min-w-0 group/field">
            <ChefHat className="w-4 h-4 text-[#E8A040] shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-[#B8997A]">Type</div>
              <div className="text-sm font-semibold text-[#2C1810] truncate">{event.event_type ? (EVENT_TYPE_LABELS[event.event_type] || event.event_type) : '—'}</div>
            </div>
          </div>

          {/* Start */}
          <div className="flex items-start gap-2 min-w-0 group/field">
            <Clock className="w-4 h-4 text-[#E8A040] shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-[#B8997A]">Start</div>
              {editingField === 'event_start_time' ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <input autoFocus type="time" value={fieldValues.event_start_time} onChange={e => setFieldValues(p => ({...p, event_start_time: e.target.value}))}
                    onKeyDown={e => { if (e.key === 'Enter') handleUpdateEventField('event_start_time', fieldValues.event_start_time); if (e.key === 'Escape') setEditingField(null) }}
                    className="w-28 px-2 py-0.5 bg-white border border-[#E8A040]/50 rounded text-sm text-[#2C1810] focus:outline-none" />
                  <button onClick={() => handleUpdateEventField('event_start_time', fieldValues.event_start_time)} disabled={savingField}
                    className="p-1 rounded bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 transition-all"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setEditingField(null)} className="p-1 rounded text-[#9E7E60] hover:text-red-500 transition-all"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="text-sm font-semibold text-[#2C1810]">{event.event_start_time ? String(event.event_start_time).slice(0, 5) : '—'}</div>
                  <button onClick={() => { setFieldValues(p => ({...p, event_start_time: event.event_start_time ? String(event.event_start_time).slice(0,5) : ''})); setEditingField('event_start_time') }}
                    className="opacity-0 group-hover/field:opacity-60 hover:!opacity-100 p-0.5 rounded text-[#B8997A] hover:text-[#E8A040] transition-all"><Pencil className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          </div>

          {/* Einde */}
          <div className="flex items-start gap-2 min-w-0 group/field">
            <Clock className="w-4 h-4 text-[#E8A040] shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-[#B8997A]">Einde</div>
              {editingField === 'event_end_time' ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <input autoFocus type="time" value={fieldValues.event_end_time} onChange={e => setFieldValues(p => ({...p, event_end_time: e.target.value}))}
                    onKeyDown={e => { if (e.key === 'Enter') handleUpdateEventField('event_end_time', fieldValues.event_end_time); if (e.key === 'Escape') setEditingField(null) }}
                    className="w-28 px-2 py-0.5 bg-white border border-[#E8A040]/50 rounded text-sm text-[#2C1810] focus:outline-none" />
                  <button onClick={() => handleUpdateEventField('event_end_time', fieldValues.event_end_time)} disabled={savingField}
                    className="p-1 rounded bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 transition-all"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setEditingField(null)} className="p-1 rounded text-[#9E7E60] hover:text-red-500 transition-all"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="text-sm font-semibold text-[#2C1810]">{event.event_end_time ? String(event.event_end_time).slice(0, 5) : '—'}</div>
                  <button onClick={() => { setFieldValues(p => ({...p, event_end_time: event.event_end_time ? String(event.event_end_time).slice(0,5) : ''})); setEditingField('event_end_time') }}
                    className="opacity-0 group-hover/field:opacity-60 hover:!opacity-100 p-0.5 rounded text-[#B8997A] hover:text-[#E8A040] transition-all"><Pencil className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="flex items-start gap-2 min-w-0 group/field">
            <CalendarDays className="w-4 h-4 text-[#E8A040] shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-[#B8997A]">Contact</div>
              {editingField === 'contact_person' ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <input autoFocus value={fieldValues.contact_person} onChange={e => setFieldValues(p => ({...p, contact_person: e.target.value}))}
                    onKeyDown={e => { if (e.key === 'Enter') handleUpdateEventField('contact_person', fieldValues.contact_person); if (e.key === 'Escape') setEditingField(null) }}
                    className="w-full px-2 py-0.5 bg-white border border-[#E8A040]/50 rounded text-sm text-[#2C1810] focus:outline-none" placeholder="Naam contactpersoon..." />
                  <button onClick={() => handleUpdateEventField('contact_person', fieldValues.contact_person)} disabled={savingField}
                    className="p-1 rounded bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 transition-all shrink-0"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setEditingField(null)} className="p-1 rounded text-[#9E7E60] hover:text-red-500 transition-all shrink-0"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="text-sm font-semibold text-[#2C1810] truncate">{event.contact_person || '—'}</div>
                  <button onClick={() => { setFieldValues(p => ({...p, contact_person: event.contact_person || ''})); setEditingField('contact_person') }}
                    className="opacity-0 group-hover/field:opacity-60 hover:!opacity-100 p-0.5 rounded text-[#B8997A] hover:text-[#E8A040] transition-all shrink-0"><Pencil className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          </div>

          {/* Allergenen */}
          <div className="flex items-start gap-2 min-w-0 group/field">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-[#B8997A]">Allergenen / dieet</div>
              {editingField === 'allergens' ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <input autoFocus value={fieldValues.allergens} onChange={e => setFieldValues(p => ({...p, allergens: e.target.value}))}
                    onKeyDown={e => { if (e.key === 'Enter') handleUpdateEventField('allergens', fieldValues.allergens); if (e.key === 'Escape') setEditingField(null) }}
                    className="w-full px-2 py-0.5 bg-white border border-red-300 rounded text-sm text-[#2C1810] focus:outline-none" placeholder="bv. 2x noten, 1x vegan..." />
                  <button onClick={() => handleUpdateEventField('allergens', fieldValues.allergens)} disabled={savingField}
                    className="p-1 rounded bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 transition-all shrink-0"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setEditingField(null)} className="p-1 rounded text-[#9E7E60] hover:text-red-500 transition-all shrink-0"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="text-sm font-semibold text-[#2C1810] truncate">{(event as any).allergens || '—'}</div>
                  <button onClick={() => { setFieldValues(p => ({...p, allergens: (event as any).allergens || ''})); setEditingField('allergens') }}
                    className="opacity-0 group-hover/field:opacity-60 hover:!opacity-100 p-0.5 rounded text-[#B8997A] hover:text-red-400 transition-all shrink-0"><Pencil className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          </div>

        </div>
        <p className="text-[10px] text-[#B8997A] mt-3 flex items-center gap-1 opacity-60">
          <Pencil className="w-2.5 h-2.5" />Hover over een veld en klik het potlood-icoon om aan te passen
        </p>
      </div>

      {/* AI banner */}
      {totalAI > 0 && (
        <div className="flex items-center gap-3 bg-orange-50/80 border border-orange-200/80 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
          <p className="text-sm text-orange-700 flex-1"><strong>{totalAI} AI-suggestie{totalAI !== 1 ? 's' : ''}</strong> wachten op goedkeuring. Oranje items zijn nog niet geverifieerd.</p>
          {event.mep_status !== 'approved' && (
            <button onClick={() => setConfirmApproveEvent(true)} className="text-xs text-emerald-700 font-semibold hover:underline shrink-0">Alles goedkeuren →</button>
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
          {sortedCategories.map(([category, categoryDishes]) => {
            const sortedCatDishes = [...categoryDishes].sort((a, b) => a.sort_order - b.sort_order)
            return (
              <section key={category}>
                <div className="flex items-center justify-between bg-[#2d6a4f] rounded-lg px-3 py-1.5 mb-3">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-white">{getCategoryLabel(category)}</h2>
                  <span className="text-xs text-white/60">{categoryDishes.length} gerecht{categoryDishes.length !== 1 ? 'en' : ''}</span>
                </div>
                <div className="space-y-2">
                  {sortedCatDishes.map((dish, di) => (
                    <DishCard key={dish.id} dish={dish}
                      onApproveComponent={handleApproveComponent}
                      onUpdateComponent={handleUpdateComponent}
                      onDeleteComponent={handleDeleteComponent}
                      onApproveDish={handleApproveDish}
                      onDeleteDish={handleDeleteDish}
                      onAddComponent={handleAddComponent}
                      onEditTitle={handleEditDishTitle}
                      onReorderComponents={handleReorderComponents}
                      onMoveDishUp={() => handleMoveDish(dish.id, 'up')}
                      onMoveDishDown={() => handleMoveDish(dish.id, 'down')}
                      isFirstDish={di === 0}
                      isLastDish={di === sortedCatDishes.length - 1}
                      editingComponentId={editingComponentId}
                      setEditingComponentId={setEditingComponentId}
                      existingGroups={existingGroups}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
