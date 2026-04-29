'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Search, X, GripVertical, Plus, Sparkles } from 'lucide-react'

// ─────────────── Types ───────────────
interface LibraryDish {
  id: string
  name: string
  source: 'own_recipe' | 'legende'
  description?: string
  cost_pp?: number
  food_cost_pct?: number
  category?: string
  key_ingredients?: string[]
}

interface PlacedDish {
  uid: string // unique placement id (not recipe id)
  dish_id: string
  name: string
  source: 'own_recipe' | 'legende' | 'manual' | 'ai'
  description?: string
  cost_pp?: number
  key_ingredients?: string[]
}

const COURSE_OPTIONS = [
  { key: 'AMUSE', label: 'Amuse-bouche' },
  { key: 'FINGERFOOD', label: 'Fingerfood / Fingerbites' },
  { key: 'VOORGERECHT', label: 'Voorgerecht' },
  { key: 'TUSSENGERECHT', label: 'Tussengerecht' },
  { key: 'HOOFDGERECHT', label: 'Hoofdgerecht' },
  { key: 'KAAS', label: 'Kaas' },
  { key: 'DESSERT', label: 'Dessert' },
  { key: 'MIGNARDISES', label: 'Mignardises' },
]

const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  own_recipe: { label: 'Eigen', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  legende: { label: 'LEGENDE', cls: 'bg-violet-50 text-violet-800 border-violet-200' },
  ai: { label: 'AI voorstel', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  manual: { label: 'Handmatig', cls: 'bg-[#FDFAF6] text-[#9E7E60] border-[#E8D5B5]' },
}

// ─────────────── Main Component ───────────────
export default function MenuBoard({ onSave }: { onSave?: (menuId: string) => void }) {
  // Library
  const [libraryTab, setLibraryTab] = useState<'own' | 'legende'>('own')
  const [librarySearch, setLibrarySearch] = useState('')
  const [ownRecipes, setOwnRecipes] = useState<LibraryDish[]>([])
  const [legendeDishes, setLegendeDishes] = useState<LibraryDish[]>([])
  const [loadingLib, setLoadingLib] = useState(false)

  // Canvas
  const [selectedCourses, setSelectedCourses] = useState<string[]>([
    'AMUSE', 'VOORGERECHT', 'HOOFDGERECHT', 'DESSERT',
  ])
  const [placed, setPlaced] = useState<Record<string, PlacedDish[]>>({})
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  // Event context
  const [numPersons, setNumPersons] = useState(50)
  const [pricePerPerson, setPricePerPerson] = useState(65)
  const [foodCostTarget, setFoodCostTarget] = useState(30)
  const [eventType, setEventType] = useState('walking_dinner')

  // Brief
  const [showBrief, setShowBrief] = useState(false)
  const [briefText, setBriefText] = useState('')
  const [parsingBrief, setParsingBrief] = useState(false)

  // Manual add
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [manualName, setManualName] = useState('')
  const manualRef = useRef<HTMLInputElement>(null)

  // AI suggest
  const [suggesting, setSuggesting] = useState<string | null>(null)

  // Save
  const [showSave, setShowSave] = useState(false)
  const [menuName, setMenuName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Load library ──
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoadingLib(true)
      try {
        if (libraryTab === 'own') {
          const res = await fetch(`/api/recipes?search=${encodeURIComponent(librarySearch)}`)
          if (res.ok) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data: any[] = await res.json()
            setOwnRecipes(
              (Array.isArray(data) ? data : []).map(r => ({
                id: r.id,
                name: r.name,
                source: 'own_recipe' as const,
                description: r.description || undefined,
                cost_pp: r.total_cost_per_serving ?? undefined,
                food_cost_pct: r.food_cost_percentage ?? undefined,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                category: (r.category as any)?.name || undefined,
              }))
            )
          }
        } else {
          const res = await fetch(`/api/legende?search=${encodeURIComponent(librarySearch)}`)
          if (res.ok) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data: any[] = await res.json()
            setLegendeDishes(
              (Array.isArray(data) ? data : []).map(d => ({
                id: d.id,
                name: d.name,
                source: 'legende' as const,
                description: d.notes || undefined,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                key_ingredients: (d.elements as any[] || []).slice(0, 3).map((e: any) => e.name).filter(Boolean),
              }))
            )
          }
        }
      } catch { /* silent */ }
      setLoadingLib(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [libraryTab, librarySearch])

  const library = libraryTab === 'own' ? ownRecipes : legendeDishes

  // ── Drag handlers ──
  const onDragStart = useCallback((e: React.DragEvent, dish: LibraryDish) => {
    e.dataTransfer.setData('application/json', JSON.stringify(dish))
    e.dataTransfer.effectAllowed = 'copy'
  }, [])

  const onDragOver = useCallback((e: React.DragEvent, key: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDropTarget(key)
  }, [])

  const onDragLeave = useCallback(() => setDropTarget(null), [])

  const onDrop = useCallback((e: React.DragEvent, courseKey: string) => {
    e.preventDefault()
    setDropTarget(null)
    try {
      const dish: LibraryDish = JSON.parse(e.dataTransfer.getData('application/json'))
      const p: PlacedDish = {
        uid: `${dish.id}-${Date.now()}`,
        dish_id: dish.id,
        name: dish.name,
        source: dish.source,
        description: dish.description,
        cost_pp: dish.cost_pp,
        key_ingredients: dish.key_ingredients,
      }
      setPlaced(prev => ({ ...prev, [courseKey]: [...(prev[courseKey] || []), p] }))
    } catch { /* ignore bad drag */ }
  }, [])

  const removeDish = useCallback((courseKey: string, uid: string) => {
    setPlaced(prev => ({ ...prev, [courseKey]: (prev[courseKey] || []).filter(d => d.uid !== uid) }))
  }, [])

  // ── AI suggest for one course ──
  const suggestCourse = async (courseKey: string) => {
    setSuggesting(courseKey)
    try {
      const currentMenu = Object.fromEntries(
        Object.entries(placed)
          .filter(([, dishes]) => dishes.length > 0)
          .map(([k, dishes]) => [k, dishes.map(d => ({ name: d.name, source: d.source }))])
      )
      const res = await fetch('/api/menu-board/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course: courseKey,
          current_menu: currentMenu,
          event_type: eventType,
          num_persons: numPersons,
          price_per_person: pricePerPerson,
          food_cost_target: foodCostTarget,
        }),
      })
      if (res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: { suggestions?: any[] } = await res.json()
        if (data.suggestions?.[0]) {
          const s = data.suggestions[0]
          const p: PlacedDish = {
            uid: `ai-${courseKey}-${Date.now()}`,
            dish_id: s.id || '',
            name: s.name,
            source: s.source === 'own_recipe' ? 'own_recipe' : s.source === 'legende' ? 'legende' : 'ai',
            description: s.description,
            cost_pp: s.estimated_cost_pp,
            key_ingredients: s.key_ingredients,
          }
          setPlaced(prev => ({ ...prev, [courseKey]: [...(prev[courseKey] || []), p] }))
        }
      }
    } catch { /* silent */ }
    setSuggesting(null)
  }

  const suggestAll = async () => {
    const empty = selectedCourses.filter(k => !(placed[k]?.length))
    for (const k of empty) await suggestCourse(k)
  }

  // ── Parse brief ──
  const parseBrief = async () => {
    if (!briefText.trim()) return
    setParsingBrief(true)
    try {
      const res = await fetch('/api/menu-engineering/parse-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: briefText }),
      })
      if (res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { parsed } = await res.json() as { parsed?: any }
        if (parsed) {
          if (parsed.num_persons) setNumPersons(parsed.num_persons)
          if (parsed.budget_pp) setPricePerPerson(parsed.budget_pp)
          if (parsed.menu_type) setEventType(parsed.menu_type)
          if (parsed.courses?.length) setSelectedCourses(parsed.courses)
        }
        setShowBrief(false)
        setBriefText('')
      }
    } catch { /* silent */ }
    setParsingBrief(false)
  }

  // ── Manual add ──
  const addManual = (courseKey: string) => {
    if (!manualName.trim()) { setAddingTo(null); return }
    const p: PlacedDish = {
      uid: `manual-${Date.now()}`,
      dish_id: '',
      name: manualName.trim(),
      source: 'manual',
    }
    setPlaced(prev => ({ ...prev, [courseKey]: [...(prev[courseKey] || []), p] }))
    setManualName('')
    setAddingTo(null)
  }

  // ── Save ──
  const saveMenu = async () => {
    if (!menuName.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      const items = selectedCourses.flatMap((courseKey, courseIdx) =>
        (placed[courseKey] || []).map((d, i) => ({
          course: courseKey,
          sort_order: courseIdx * 100 + i,
          custom_name: d.name,
          recipe_id: d.source === 'own_recipe' && d.dish_id ? d.dish_id : null,
          legende_dish_id: d.source === 'legende' && d.dish_id ? d.dish_id : null,
          source: d.source,
          estimated_cost_pp: d.cost_pp ?? null,
          description: d.description ?? null,
        }))
      )
      const res = await fetch('/api/menu-engineering/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: menuName,
          menu_type: eventType,
          num_persons: numPersons,
          price_per_person: pricePerPerson,
          target_food_cost_pct: foodCostTarget,
          status: 'draft',
          items,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Opslaan mislukt')
      const data = await res.json()
      setShowSave(false)
      onSave?.(data.menu_id || data.id || '')
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Onbekende fout')
    }
    setSaving(false)
  }

  // ── Computed totals ──
  const totalCostPp = Object.values(placed).flat().reduce((s, d) => s + (d.cost_pp ?? 0), 0)
  const foodCostPct = pricePerPerson > 0 ? (totalCostPp / pricePerPerson) * 100 : 0

  // ─────────────── Render ───────────────
  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[600px] border border-[#E8D5B5] rounded-2xl overflow-hidden bg-[#FDFAF6]">

      {/* ═══ LEFT: Library ═══ */}
      <div className="w-72 shrink-0 flex flex-col border-r border-[#E8D5B5] bg-white">
        {/* Library header */}
        <div className="p-4 border-b border-[#E8D5B5] space-y-3">
          <h3 className="text-sm font-semibold text-[#2C1810]">Bibliotheek</h3>

          {/* Tabs */}
          <div className="flex gap-0.5 p-0.5 bg-[#F5EDD8] rounded-lg">
            {([['own', 'Eigen recepten'], ['legende', 'LEGENDE']] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setLibraryTab(id)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  libraryTab === id ? 'bg-white text-[#2C1810] shadow-sm' : 'text-[#9E7E60] hover:text-[#5C4730]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B8997A]" />
            <input
              value={librarySearch}
              onChange={e => setLibrarySearch(e.target.value)}
              placeholder="Zoeken..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#FDFAF6] border border-[#E8D5B5] rounded-lg text-xs text-[#2C1810] focus:outline-none focus:ring-1 focus:ring-amber-400/50 placeholder-[#C8A880]"
            />
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {loadingLib ? (
            <div className="flex justify-center py-10"><Loader2 className="w-4 h-4 animate-spin text-[#B8997A]" /></div>
          ) : library.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#B8997A]">
              {librarySearch ? 'Geen resultaten' : libraryTab === 'own' ? 'Nog geen eigen recepten' : 'LEGENDE gerechten laden...'}
            </div>
          ) : library.map(dish => (
            <div
              key={dish.id}
              draggable
              onDragStart={e => onDragStart(e, dish)}
              className="group flex items-start gap-2 p-2.5 rounded-lg border border-[#E8D5B5] bg-white hover:border-amber-300 hover:bg-[#FEF9F2] cursor-grab active:cursor-grabbing transition-all select-none"
            >
              <GripVertical className="w-3.5 h-3.5 text-[#C8A880] mt-0.5 shrink-0 group-hover:text-amber-500 transition-colors" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-[#2C1810] truncate">{dish.name}</div>
                {dish.key_ingredients?.length ? (
                  <div className="text-[10px] text-[#B8997A] truncate mt-0.5">{dish.key_ingredients.join(' · ')}</div>
                ) : dish.description ? (
                  <div className="text-[10px] text-[#B8997A] truncate mt-0.5">{dish.description}</div>
                ) : null}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`px-1.5 py-0.5 text-[10px] rounded border ${SOURCE_BADGE[dish.source]?.cls}`}>
                    {SOURCE_BADGE[dish.source]?.label}
                  </span>
                  {dish.cost_pp != null && dish.cost_pp > 0 && (
                    <span className="text-[10px] font-mono text-[#9E7E60]">€{Number(dish.cost_pp).toFixed(2)}/p</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Drag hint */}
        <div className="p-3 border-t border-[#E8D5B5] text-center text-[10px] text-[#C8A880]">
          Sleep naar een gang rechts
        </div>
      </div>

      {/* ═══ RIGHT: Canvas ═══ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Canvas header */}
        <div className="px-4 py-3 border-b border-[#E8D5B5] bg-white/90 space-y-2.5">

          {/* Top row: event config + actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#9E7E60]">Personen</span>
              <input type="number" min={1} value={numPersons} onChange={e => setNumPersons(Number(e.target.value))}
                className="w-16 px-2 py-1 text-xs bg-white border border-[#E8D5B5] rounded-lg text-[#2C1810] focus:outline-none" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#9E7E60]">€/p</span>
              <input type="number" min={0} step={0.5} value={pricePerPerson} onChange={e => setPricePerPerson(Number(e.target.value))}
                className="w-16 px-2 py-1 text-xs bg-white border border-[#E8D5B5] rounded-lg text-[#2C1810] focus:outline-none" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#9E7E60]">FC%</span>
              <input type="number" min={15} max={45} value={foodCostTarget} onChange={e => setFoodCostTarget(Number(e.target.value))}
                className="w-14 px-2 py-1 text-xs bg-white border border-[#E8D5B5] rounded-lg text-[#2C1810] focus:outline-none" />
            </div>

            <div className="flex-1" />

            {/* Cost summary */}
            <div className="text-xs font-mono text-[#5C4730]">
              FC: <span className={`font-bold ${foodCostPct <= foodCostTarget ? 'text-emerald-700' : 'text-amber-700'}`}>
                €{totalCostPp.toFixed(2)}/p ({foodCostPct.toFixed(1)}%)
              </span>
            </div>

            {/* Brief button */}
            <button onClick={() => setShowBrief(s => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#E8D5B5] hover:border-amber-300 text-[#5C4730] rounded-lg transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              Brief plakken
            </button>

            {/* AI aanvullen */}
            <button onClick={suggestAll} disabled={!!suggesting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#FEF3E2] border border-amber-300 text-amber-800 hover:bg-amber-100 rounded-lg transition-all disabled:opacity-50"
            >
              {suggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              AI aanvullen
            </button>

            {/* Opslaan */}
            <button onClick={() => setShowSave(s => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2C1810] rounded-lg"
              style={{ backgroundColor: '#E8A040' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              Opslaan
            </button>
          </div>

          {/* Brief paste panel */}
          <AnimatePresence>
            {showBrief && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                  <div className="text-xs font-medium text-amber-800">Klantbrief plakken — AI parseert automatisch</div>
                  <textarea value={briefText} onChange={e => setBriefText(e.target.value)} rows={4}
                    placeholder="Plak hier de klantvraag, offerte-aanvraag of event omschrijving..."
                    className="w-full px-3 py-2 text-xs bg-white border border-amber-200 rounded-lg text-[#2C1810] focus:outline-none resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowBrief(false)} className="px-3 py-1.5 text-xs text-[#9E7E60] hover:text-[#5C4730]">Annuleren</button>
                    <button onClick={parseBrief} disabled={parsingBrief || !briefText.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-50"
                    >
                      {parsingBrief && <Loader2 className="w-3 h-3 animate-spin" />}
                      Verwerken
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Save panel */}
          <AnimatePresence>
            {showSave && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-white border border-[#E8D5B5] rounded-xl p-3 space-y-2">
                  <div className="text-xs font-medium text-[#2C1810]">Menu opslaan als concept</div>
                  <input value={menuName} onChange={e => setMenuName(e.target.value)} placeholder="Naam van dit menu..."
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E8D5B5] rounded-lg text-[#2C1810] focus:outline-none"
                  />
                  {saveError && <p className="text-xs text-red-600">{saveError}</p>}
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowSave(false)} className="px-3 py-1.5 text-xs text-[#9E7E60]">Annuleren</button>
                    <button onClick={saveMenu} disabled={saving || !menuName.trim()}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-[#2C1810] rounded-lg disabled:opacity-50"
                      style={{ backgroundColor: '#E8A040' }}
                    >
                      {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                      Opslaan
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Course selector */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-[#9E7E60]">Gangen:</span>
            {COURSE_OPTIONS.map(c => (
              <button key={c.key}
                onClick={() => setSelectedCourses(prev => prev.includes(c.key) ? prev.filter(k => k !== c.key) : [...prev, c.key])}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                  selectedCourses.includes(c.key)
                    ? 'border-amber-400/60 text-amber-800'
                    : 'bg-white text-[#B8997A] border-[#E8D5B5] hover:border-[#D4B896]'
                }`}
                style={selectedCourses.includes(c.key) ? { backgroundColor: 'rgba(232,160,64,0.13)' } : {}}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Course drop zones */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedCourses.length === 0 && (
            <div className="flex items-center justify-center h-40 text-sm text-[#B8997A]">
              Selecteer minstens één gang hierboven
            </div>
          )}

          {selectedCourses.map(courseKey => {
            const cfg = COURSE_OPTIONS.find(c => c.key === courseKey)!
            const dishes = placed[courseKey] || []
            const isTarget = dropTarget === courseKey

            return (
              <div key={courseKey}
                onDragOver={e => onDragOver(e, courseKey)}
                onDragLeave={onDragLeave}
                onDrop={e => onDrop(e, courseKey)}
                className={`rounded-xl border-2 transition-all ${
                  isTarget ? 'border-amber-400 bg-amber-50 shadow-md shadow-amber-100' : 'border-[#E8D5B5] bg-white hover:border-[#D4B896]'
                }`}
              >
                {/* Course header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E8D5B5]/60">
                  <span className="text-xs font-semibold text-[#5C4730] uppercase tracking-widest">{cfg.label}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setAddingTo(courseKey); setTimeout(() => manualRef.current?.focus(), 60) }}
                      title="Handmatig toevoegen"
                      className="p-1 rounded hover:bg-[#F5EDD8] text-[#B8997A] hover:text-amber-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => suggestCourse(courseKey)}
                      disabled={suggesting === courseKey}
                      title="AI suggestie"
                      className="p-1 rounded hover:bg-amber-50 text-[#B8997A] hover:text-amber-700 transition-colors disabled:opacity-50"
                    >
                      {suggesting === courseKey
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Sparkles className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Dishes */}
                <div className="p-3 space-y-2 min-h-[56px]">
                  {dishes.length === 0 && !isTarget && (
                    <div className="flex items-center justify-center h-10 text-xs text-[#C8A880] border border-dashed border-[#E8D5B5] rounded-lg">
                      Sleep hier een gerecht · of klik + · of klik AI
                    </div>
                  )}
                  {isTarget && dishes.length === 0 && (
                    <div className="flex items-center justify-center h-10 text-xs text-amber-700 font-medium border-2 border-dashed border-amber-400 rounded-lg bg-amber-50/80">
                      Loslaten om toe te voegen
                    </div>
                  )}

                  {dishes.map(dish => (
                    <div key={dish.uid}
                      className="group flex items-start gap-2.5 p-2.5 bg-[#FDFAF6] border border-[#E8D5B5] rounded-lg hover:border-[#D4B896] transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-[#2C1810]">{dish.name}</span>
                          {SOURCE_BADGE[dish.source] && (
                            <span className={`px-1.5 py-0.5 text-[10px] rounded border ${SOURCE_BADGE[dish.source].cls}`}>
                              {SOURCE_BADGE[dish.source].label}
                            </span>
                          )}
                        </div>
                        {dish.description && (
                          <p className="text-[10px] text-[#9E7E60] mt-0.5 line-clamp-1">{dish.description}</p>
                        )}
                        {dish.key_ingredients?.length ? (
                          <p className="text-[10px] text-[#B8997A] mt-0.5">{dish.key_ingredients.slice(0, 4).join(' · ')}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 mt-0.5">
                        {dish.cost_pp != null && dish.cost_pp > 0 && (
                          <span className="text-[10px] font-mono text-[#9E7E60]">€{Number(dish.cost_pp).toFixed(2)}/p</span>
                        )}
                        <button onClick={() => removeDish(courseKey, dish.uid)}
                          className="p-0.5 text-[#C8A880] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Manual input */}
                  {addingTo === courseKey && (
                    <div className="flex items-center gap-2">
                      <input
                        ref={manualRef}
                        value={manualName}
                        onChange={e => setManualName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') addManual(courseKey)
                          if (e.key === 'Escape') { setAddingTo(null); setManualName('') }
                        }}
                        onBlur={() => { if (!manualName.trim()) { setAddingTo(null) } }}
                        placeholder="Gerechtnaam..."
                        className="flex-1 px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg text-[#2C1810] focus:outline-none"
                        autoFocus
                      />
                      <button onClick={() => addManual(courseKey)}
                        className="px-2.5 py-2 text-xs font-medium text-[#2C1810] rounded-lg"
                        style={{ backgroundColor: '#E8A040' }}
                      >
                        Toevoegen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
