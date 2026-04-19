'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, FlaskConical, Search, ChevronLeft, ChevronRight, Euro, 
  Package, ChevronDown, ChevronRight as ChevronRightIcon, Leaf, Star,
  Edit2, Save, X, Trash2
} from 'lucide-react'

interface Ingredient {
  id: string
  name: string
  category: string | null
  unit: string | null
  current_price: number | null
  supplier: string | null
  standard_portion_g: number | null
  edible_part_percentage: number | null
  shrinkage_factor_percentage: number | null
  updated_at: string
}

interface IngredientVariant {
  id: string
  parent_ingredient_id: string
  variant_name: string
  quality_grade: string | null
  origin: string | null
  price_multiplier: number
  notes: string | null
}

interface SeasonalInfo {
  ingredient_name: string
  jan: number; feb: number; mar: number; apr: number; may: number; jun: number
  jul: number; aug: number; sep: number; oct: number; nov: number; dec: number
}

const ITEMS_PER_PAGE = 25

const categoryEmojis: Record<string, string> = {
  'vlees': '🥩', 'vis': '🐟', 'groenten': '🥦', 'zetmeel': '🥔',
  'zuivel': '🧀', 'kruiden': '🌿', 'noten': '🥜', 'fond': '🍷',
  'bakkerij': '🍞', 'fruit': '🍎', 'olie': '🫒', 'gevogelte': '🍗',
  'schaaldieren': '🦐', 'wild': '🦌', 'charcuterie': '🥓',
}

const qualityGradeColors: Record<string, string> = {
  'premium': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'standard': 'bg-stone-700/50 text-stone-300 border-stone-600',
  'heritage': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'bio': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'wild': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'AOC': 'bg-red-500/20 text-red-400 border-red-500/30',
}

const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const

function getCategoryEmoji(category: string | null): string {
  if (!category) return '📦'
  const lower = category.toLowerCase()
  for (const [key, emoji] of Object.entries(categoryEmojis)) {
    if (lower.includes(key)) return emoji
  }
  return '📦'
}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [variants, setVariants] = useState<Record<string, IngredientVariant[]>>({})
  const [seasonalData, setSeasonalData] = useState<SeasonalInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'price'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newIng, setNewIng] = useState({ name: '', category: 'groenten', unit: 'kg', current_price: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const currentMonth = new Date().getMonth()

  useEffect(() => {
    async function load() {
      const [ingResult, seasonResult] = await Promise.all([
        supabase.from('ingredients').select('*').order('name'),
        supabase.from('seasonal_calendar').select('*').eq('country_code', 'BE'),
      ])
      setIngredients(ingResult.data || [])
      setSeasonalData(seasonResult.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const fetchVariants = useCallback(async (ingredientId: string) => {
    if (variants[ingredientId]) return
    const { data } = await supabase
      .from('ingredient_variants')
      .select('*')
      .eq('parent_ingredient_id', ingredientId)
      .order('variant_name')
    setVariants(prev => ({ ...prev, [ingredientId]: data || [] }))
  }, [variants])

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      fetchVariants(id)
    }
  }

  const getSeasonalStatus = (name: string): { inSeason: boolean; isPeak: boolean } | null => {
    const item = seasonalData.find(s => 
      s.ingredient_name.toLowerCase() === name.toLowerCase() ||
      name.toLowerCase().includes(s.ingredient_name.toLowerCase())
    )
    if (!item) return null
    const val = item[monthKeys[currentMonth]]
    return { inSeason: val >= 1, isPeak: val === 2 }
  }

  const categories = useMemo(() => {
    const cats = [...new Set(ingredients.map(i => i.category).filter(Boolean))] as string[]
    return cats.sort()
  }, [ingredients])

  const filtered = useMemo(() => {
    let result = ingredients.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || i.category === selectedCategory
      return matchesSearch && matchesCategory
    })
    result.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') cmp = (a.name || '').localeCompare(b.name || '')
      else if (sortBy === 'category') cmp = (a.category || '').localeCompare(b.category || '')
      else if (sortBy === 'price') cmp = (a.current_price || 0) - (b.current_price || 0)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [ingredients, search, selectedCategory, sortBy, sortDir])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginatedItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  useEffect(() => { setPage(1) }, [search, selectedCategory])

  const handleSort = (col: 'name' | 'category' | 'price') => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const handleAddIngredient = async () => {
    if (!newIng.name.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('ingredients')
      .insert({
        name: newIng.name.trim(),
        category: newIng.category || null,
        unit: newIng.unit || null,
        current_price: newIng.current_price ? parseFloat(newIng.current_price) : null,
      })
      .select()
      .single()
    if (!error && data) {
      setIngredients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setShowAddForm(false)
      setNewIng({ name: '', category: 'groenten', unit: 'kg', current_price: '' })
    }
    setSaving(false)
  }

  // Stats
  const withPrice = ingredients.filter(i => i.current_price && i.current_price > 0).length
  const inSeasonCount = ingredients.filter(i => {
    const s = getSeasonalStatus(i.name)
    return s?.inSeason
  }).length

  if (loading) {
    return (
      <div className="space-y-8">
        <div><h1 className="text-2xl font-display font-bold text-stone-100">Ingrediënten</h1></div>
        <div className="bg-stone-900/50 border border-stone-800 rounded-2xl divide-y divide-stone-800">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-4">
              <div className="w-8 h-8 bg-stone-800 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="w-32 h-4 bg-stone-800 rounded animate-pulse" />
                <div className="w-20 h-3 bg-stone-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-100">Ingrediënten</h1>
          <p className="text-stone-400 mt-1">
            {ingredients.length} ingrediënten · {withPrice} geprijsd · 
            <span className="text-emerald-400 ml-1"><Leaf className="w-3 h-3 inline" /> {inSeasonCount} in seizoen</span>
          </p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Toevoegen
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-stone-900/80 border border-brand-500/30 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-stone-200">Nieuw Ingrediënt</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input type="text" placeholder="Naam" value={newIng.name} onChange={e => setNewIng(p => ({ ...p, name: e.target.value }))}
              className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm focus:ring-2 focus:ring-brand-500" />
            <select value={newIng.category} onChange={e => setNewIng(p => ({ ...p, category: e.target.value }))}
              className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-300 text-sm">
              {Object.keys(categoryEmojis).map(cat => (
                <option key={cat} value={cat}>{getCategoryEmoji(cat)} {cat}</option>
              ))}
            </select>
            <select value={newIng.unit} onChange={e => setNewIng(p => ({ ...p, unit: e.target.value }))}
              className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-300 text-sm">
              <option value="kg">kg</option><option value="L">L</option><option value="stuks">stuks</option>
              <option value="g">g</option><option value="ml">ml</option><option value="bos">bos</option>
            </select>
            <input type="number" step="0.01" placeholder="Prijs/eenheid" value={newIng.current_price}
              onChange={e => setNewIng(p => ({ ...p, current_price: e.target.value }))}
              className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200">Annuleer</button>
            <button onClick={handleAddIngredient} disabled={saving || !newIng.name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm">
              <Save className="w-4 h-4" /> {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input type="text" placeholder="Zoek ingrediënt..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
        </div>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-300 text-sm focus:ring-2 focus:ring-brand-500">
          <option value="all">Alle categorieën</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{getCategoryEmoji(cat)} {cat}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-12 text-center">
          <FlaskConical className="w-12 h-12 text-stone-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-stone-300 mb-1">Geen ingrediënten gevonden</h3>
          <p className="text-stone-500 text-sm">Pas je zoek- of filtercriteria aan</p>
        </div>
      ) : (
        <div className="bg-stone-900/50 border border-stone-800 rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="px-5 py-3 bg-stone-800/50 flex items-center text-xs font-medium text-stone-500 uppercase tracking-wider border-b border-stone-800">
            <div className="w-6" />
            <button onClick={() => handleSort('name')} className="flex-1 flex items-center gap-1 hover:text-stone-300 transition-colors text-left">
              Naam {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
            </button>
            <button onClick={() => handleSort('category')} className="w-28 flex items-center gap-1 hover:text-stone-300 transition-colors">
              Categorie {sortBy === 'category' && (sortDir === 'asc' ? '↑' : '↓')}
            </button>
            <span className="w-16 text-center">Eenheid</span>
            <span className="w-16 text-center">Seizoen</span>
            <span className="w-20 text-center">Portie</span>
            <button onClick={() => handleSort('price')} className="w-24 flex items-center gap-1 justify-end hover:text-stone-300 transition-colors">
              Prijs {sortBy === 'price' && (sortDir === 'asc' ? '↑' : '↓')}
            </button>
          </div>
          
          {/* Table body */}
          {paginatedItems.map((ing) => {
            const seasonal = getSeasonalStatus(ing.name)
            const isExpanded = expandedId === ing.id
            const variantList = variants[ing.id] || []

            return (
              <div key={ing.id}>
                <div
                  onClick={() => toggleExpand(ing.id)}
                  className="px-5 py-3.5 flex items-center hover:bg-stone-800/30 transition-colors cursor-pointer border-b border-stone-800/50"
                >
                  <div className="w-6">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-stone-500" /> : <ChevronRightIcon className="w-3.5 h-3.5 text-stone-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-stone-200">{ing.name}</span>
                    {variantList.length > 0 && (
                      <span className="ml-2 text-[10px] text-brand-400">{variantList.length} varianten</span>
                    )}
                  </div>
                  <span className="w-28 text-xs text-stone-500">
                    {ing.category ? `${getCategoryEmoji(ing.category)} ${ing.category}` : '—'}
                  </span>
                  <span className="w-16 text-center text-xs text-stone-500">{ing.unit || '—'}</span>
                  <span className="w-16 text-center">
                    {seasonal ? (
                      seasonal.isPeak ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400">
                          <Leaf className="w-3 h-3" /> Piek
                        </span>
                      ) : seasonal.inSeason ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-500/70">
                          <Leaf className="w-3 h-3" /> ✓
                        </span>
                      ) : (
                        <span className="text-[10px] text-stone-600">—</span>
                      )
                    ) : (
                      <span className="text-[10px] text-stone-700">—</span>
                    )}
                  </span>
                  <span className="w-20 text-center text-xs text-stone-500">
                    {ing.standard_portion_g ? `${ing.standard_portion_g}g` : '—'}
                  </span>
                  <span className="w-24 text-right font-mono text-sm text-stone-300 tabular-nums">
                    {ing.current_price ? `€${Number(ing.current_price).toFixed(2)}` : '—'}
                  </span>
                </div>

                {/* Expanded: variants */}
                {isExpanded && (
                  <div className="px-5 py-3 bg-stone-800/20 border-b border-stone-800/50">
                    {variantList.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Star className="w-3 h-3" /> Chef-Level Varianten
                        </h4>
                        <div className="grid gap-2">
                          {variantList.map(v => (
                            <div key={v.id} className="flex items-center gap-3 py-1.5 px-3 bg-stone-900/50 rounded-lg">
                              <span className="text-sm text-stone-200 font-medium">{v.variant_name}</span>
                              {v.quality_grade && (
                                <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${qualityGradeColors[v.quality_grade] || 'bg-stone-700 text-stone-300 border-stone-600'}`}>
                                  {v.quality_grade}
                                </span>
                              )}
                              {v.origin && <span className="text-xs text-stone-500">{v.origin}</span>}
                              <span className="ml-auto text-xs text-stone-500 font-mono">
                                {v.price_multiplier > 1 ? `${v.price_multiplier}x prijs` : 'standaard'}
                              </span>
                              {ing.current_price && v.price_multiplier > 0 && (
                                <span className="text-xs font-mono text-brand-400">
                                  €{(ing.current_price * v.price_multiplier).toFixed(2)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-stone-600 italic">Geen varianten — klik om chef-level varianten toe te voegen</p>
                    )}
                    
                    {/* Seasonal detail */}
                    {seasonal && (
                      <div className="mt-3 pt-3 border-t border-stone-800">
                        <span className="text-xs text-stone-500">
                          <Leaf className="w-3 h-3 inline mr-1 text-emerald-400" />
                          {seasonal.isPeak ? 'Dit ingrediënt is nu op piekseizoen — ideaal voor kostprijs!' : 
                           seasonal.inSeason ? 'Beschikbaar in seizoen' : 'Momenteel niet in seizoen'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-stone-500">
            {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} van {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 hover:text-white disabled:opacity-30 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1 : 
                  page <= 4 ? i + 1 : 
                  page >= totalPages - 3 ? totalPages - 6 + i : 
                  page - 3 + i
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                      p === page ? 'bg-brand-600 text-white' : 'bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700'
                    }`}>
                    {p}
                  </button>
                )
              })}
            </div>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 hover:text-white disabled:opacity-30 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
