'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, Search, ChevronDown, ChevronRight, 
  Clock, Euro, Edit2, Save, X, Trash2, Package,
  Beaker, Thermometer, Scale, BookOpen, Sparkles,
  Timer, ShieldCheck, Droplets, Flame
} from 'lucide-react'
import { ClassicalSuggestions } from '@/components/ai/classical-suggestions'
import { ChefTip } from '@/components/ai/chef-tip'

interface Preparation {
  id: string
  kitchen_id: string | null
  name: string
  category: string | null
  description: string | null
  method: string | null
  yield_amount: number | null
  yield_unit: string | null
  shelf_life_hours: number | null
  storage_temp: string | null
  is_template: boolean
  created_at: string
}

interface PrepIngredient {
  id: string
  preparation_id: string
  ingredient_id: string | null
  name_override: string | null
  quantity: number
  unit: string
  sort_order: number
  ingredient?: { id: string; name: string; current_price: number | null; unit: string | null }
}

const categoryConfig: Record<string, { emoji: string; color: string; bgColor: string; label: string }> = {
  sauce: { emoji: '🫗', color: 'text-red-700', bgColor: 'bg-red-50 border-red-100', label: 'Sauzen' },
  marinade: { emoji: '🥫', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-100', label: 'Marinades' },
  dressing: { emoji: '🥗', color: 'text-lime-700', bgColor: 'bg-lime-50 border-lime-100', label: 'Dressings' },
  stock: { emoji: '🍲', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-100', label: 'Fonds' },
  cream: { emoji: '🫕', color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-100', label: 'Crèmes' },
  crunch: { emoji: '✨', color: 'text-stone-700', bgColor: 'bg-stone-50 border-stone-200', label: 'Crunch' },
  spice_mix: { emoji: '🌿', color: 'text-green-700', bgColor: 'bg-green-50 border-green-100', label: 'Kruidenmix' },
  compound_butter: { emoji: '🧈', color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-100', label: 'Boter' },
  pickle: { emoji: '🥒', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-100', label: 'Pickles' },
  garnish: { emoji: '🌱', color: 'text-green-700', bgColor: 'bg-green-50 border-green-100', label: 'Garnituur' },
  gel: { emoji: '💧', color: 'text-cyan-700', bgColor: 'bg-cyan-50 border-cyan-100', label: 'Gels' },
  oil: { emoji: '🫒', color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-100', label: 'Oliën' },
  paste: { emoji: '🧄', color: 'text-red-700', bgColor: 'bg-red-50 border-red-100', label: 'Pasta\'s' },
  bread: { emoji: '🍞', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-100', label: 'Brood' },
  base: { emoji: '🫕', color: 'text-stone-700', bgColor: 'bg-stone-50 border-stone-200', label: 'Basis' },
  dessert_base: { emoji: '🍮', color: 'text-pink-700', bgColor: 'bg-pink-50 border-pink-100', label: 'Dessert' },
  emulsion: { emoji: '🥄', color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-100', label: 'Emulsies' },
  espuma: { emoji: '🫧', color: 'text-sky-700', bgColor: 'bg-sky-50 border-sky-100', label: 'Espuma' },
}

const storageTempLabels: Record<string, { label: string; icon: typeof Thermometer; color: string }> = {
  fridge: { label: 'Koelkast (2-4°C)', icon: Thermometer, color: 'text-blue-500' },
  room_temp: { label: 'Kamertemp.', icon: Thermometer, color: 'text-amber-500' },
  freezer: { label: 'Vriezer (-18°C)', icon: Thermometer, color: 'text-cyan-500' },
}

function formatShelfLife(hours: number | null): string {
  if (!hours) return '—'
  if (hours < 24) return `${hours}u`
  if (hours < 168) return `${Math.round(hours / 24)}d`
  if (hours < 720) return `${Math.round(hours / 168)}w`
  return `${Math.round(hours / 720)}m`
}

function formatShelfLifeLong(hours: number | null): string {
  if (!hours) return 'Onbekend'
  if (hours < 24) return `${hours} uur`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} ${days === 1 ? 'dag' : 'dagen'}`
  const weeks = Math.round(days / 7)
  if (weeks < 4) return `${weeks} ${weeks === 1 ? 'week' : 'weken'}`
  const months = Math.round(days / 30)
  return `${months} ${months === 1 ? 'maand' : 'maanden'}`
}

export default function PreparationsPage() {
  const [preparations, setPreparations] = useState<Preparation[]>([])
  const [prepIngredients, setPrepIngredients] = useState<Record<string, PrepIngredient[]>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showClassical, setShowClassical] = useState<string | null>(null)
  const supabase = createClient()

  const fetchPreparations = useCallback(async () => {
    const { data } = await supabase
      .from('preparations')
      .select('*')
      .order('category')
      .order('name')
    setPreparations(data || [])
    setLoading(false)
  }, [])

  const fetchIngredients = useCallback(async (prepId: string) => {
    if (prepIngredients[prepId]) return
    const { data } = await supabase
      .from('preparation_ingredients')
      .select('*, ingredient:ingredients(id, name, current_price, unit)')
      .eq('preparation_id', prepId)
      .order('sort_order')
    setPrepIngredients(prev => ({ ...prev, [prepId]: data || [] }))
  }, [prepIngredients])

  useEffect(() => { fetchPreparations() }, [fetchPreparations])

  const categories = useMemo(() => {
    const cats = [...new Set(preparations.map(p => p.category).filter(Boolean))] as string[]
    return cats.sort()
  }, [preparations])

  const filtered = useMemo(() => {
    return preparations.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.description || '').toLowerCase().includes(search.toLowerCase())
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory
      return matchSearch && matchCat
    })
  }, [preparations, search, selectedCategory])

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, Preparation[]> = {}
    for (const p of filtered) {
      const cat = p.category || 'overig'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(p)
    }
    return groups
  }, [filtered])

  const handleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      setShowClassical(null)
    } else {
      setExpandedId(id)
      fetchIngredients(id)
      setShowClassical(null)
    }
  }

  const totalWithMethod = preparations.filter(p => p.method).length
  const totalWithIngredients = Object.keys(prepIngredients).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center">
                <Beaker className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">Halffabricaten</h1>
                <p className="text-stone-400 text-sm mt-0.5">
                  {preparations.length} templates · {categories.length} categorieën
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Tip */}
      <ChefTip
        tip="Halffabricaten worden automatisch meegenomen in je MEP-berekeningen. Hoe completer je receptuur, hoe nauwkeuriger je productieplan."
        variant="technique"
        source="Professionele keukenplanning"
      />

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Zoek halffabricaat..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-premium pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            Alles ({filtered.length})
          </button>
          {categories.map(cat => {
            const config = categoryConfig[cat] || { emoji: '📦', label: cat, bgColor: '', color: '' }
            const count = preparations.filter(p => p.category === cat).length
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                <span>{config.emoji}</span> {config.label} <span className="text-xs opacity-60">({count})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Preparations Grid */}
      {loading ? (
        <div className="grid gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card p-5 flex gap-4">
              <div className="skeleton w-10 h-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton w-48 h-5 rounded" />
                <div className="skeleton w-full h-3 rounded" />
              </div>
              <div className="skeleton w-16 h-6 rounded-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-violet-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Beaker className="w-8 h-8 text-violet-300" />
          </div>
          <h3 className="font-display text-lg font-semibold text-stone-900 mb-2">Geen halffabricaten gevonden</h3>
          <p className="text-sm text-stone-400">Probeer een andere zoekterm of categorie</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, preps]) => {
            const config = categoryConfig[category] || { emoji: '📦', label: category, bgColor: 'bg-stone-50 border-stone-200', color: 'text-stone-700' }
            return (
              <div key={category} className="animate-slide-up opacity-0" style={{ animationFillMode: 'forwards' }}>
                {/* Category Header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{config.emoji}</span>
                  <h2 className="font-display font-semibold text-stone-800 text-sm uppercase tracking-wider">{config.label}</h2>
                  <span className="text-xs text-stone-400 font-mono">{preps.length}</span>
                  <div className="flex-1 h-px bg-stone-200/60" />
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {preps.map((prep, i) => (
                    <div key={prep.id} className="card overflow-hidden">
                      {/* Main Row */}
                      <button
                        onClick={() => handleExpand(prep.id)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-stone-50/50 transition-all text-left"
                      >
                        <div className={`w-10 h-10 rounded-xl ${config.bgColor} border flex items-center justify-center shrink-0`}>
                          <span className="text-base">{config.emoji}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-stone-900">{prep.name}</span>
                            {prep.is_template && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100">
                                template
                              </span>
                            )}
                          </div>
                          {prep.description && (
                            <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{prep.description}</p>
                          )}
                        </div>
                        {/* Quick info pills */}
                        <div className="flex items-center gap-2 shrink-0">
                          {prep.yield_amount && (
                            <span className="text-xs font-mono text-stone-500 bg-stone-50 px-2 py-1 rounded-lg">
                              {prep.yield_amount}{prep.yield_unit || 'g'}
                            </span>
                          )}
                          {prep.shelf_life_hours && (
                            <span className="text-xs font-mono text-stone-500 bg-stone-50 px-2 py-1 rounded-lg flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatShelfLife(prep.shelf_life_hours)}
                            </span>
                          )}
                          {prep.storage_temp && (
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${prep.storage_temp === 'fridge' ? 'bg-blue-50 text-blue-500' : prep.storage_temp === 'freezer' ? 'bg-cyan-50 text-cyan-500' : 'bg-amber-50 text-amber-500'}`}>
                              <Thermometer className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <ChevronDown className={`w-4 h-4 text-stone-300 transition-transform duration-200 ${expandedId === prep.id ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Expanded Detail */}
                      {expandedId === prep.id && (
                        <div className="border-t border-stone-100 bg-stone-50/30 p-5 space-y-5 animate-fade-in">
                          {/* Info Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-white rounded-xl p-3 border border-stone-100">
                              <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1">
                                <Scale className="w-3 h-3" /> Opbrengst
                              </div>
                              <div className="font-mono text-sm font-semibold text-stone-900">
                                {prep.yield_amount ? `${prep.yield_amount}${prep.yield_unit || 'g'}` : '—'}
                              </div>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-stone-100">
                              <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1">
                                <Timer className="w-3 h-3" /> Houdbaarheid
                              </div>
                              <div className="font-mono text-sm font-semibold text-stone-900">
                                {formatShelfLifeLong(prep.shelf_life_hours)}
                              </div>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-stone-100">
                              <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1">
                                <Thermometer className="w-3 h-3" /> Bewaring
                              </div>
                              <div className="text-sm font-semibold text-stone-900">
                                {storageTempLabels[prep.storage_temp || '']?.label || '—'}
                              </div>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-stone-100">
                              <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1">
                                <Package className="w-3 h-3" /> Categorie
                              </div>
                              <div className="text-sm font-semibold text-stone-900 capitalize">
                                {config.label}
                              </div>
                            </div>
                          </div>

                          {/* Method */}
                          {prep.method && (
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2 flex items-center gap-1.5">
                                <Flame className="w-3 h-3" /> Werkwijze
                              </h4>
                              <div className="bg-white rounded-xl p-4 border border-stone-100">
                                <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">{prep.method}</p>
                              </div>
                            </div>
                          )}

                          {/* Ingredients */}
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2 flex items-center gap-1.5">
                              <Beaker className="w-3 h-3" /> Ingrediënten
                            </h4>
                            {prepIngredients[prep.id] && prepIngredients[prep.id].length > 0 ? (
                              <div className="bg-white rounded-xl border border-stone-100 divide-y divide-stone-50">
                                {prepIngredients[prep.id].map((ing, idx) => (
                                  <div key={ing.id} className="flex items-center gap-3 px-4 py-2.5">
                                    <span className="text-xs text-stone-300 font-mono w-5">{idx + 1}.</span>
                                    <span className="text-sm text-stone-700 flex-1">
                                      {ing.ingredient?.name || ing.name_override || 'Onbekend'}
                                    </span>
                                    <span className="font-mono text-sm text-stone-500">
                                      {ing.quantity} {ing.unit}
                                    </span>
                                    {ing.ingredient?.current_price && (
                                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                        €{ing.ingredient.current_price.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="bg-white rounded-xl border border-stone-100 p-4 text-center">
                                <p className="text-sm text-stone-400">Ingrediënten laden...</p>
                              </div>
                            )}
                          </div>

                          {/* Classical Inspiration */}
                          <div>
                            <button
                              onClick={() => setShowClassical(showClassical === prep.id ? null : prep.id)}
                              className="flex items-center gap-2 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              {showClassical === prep.id ? 'Verberg' : 'Toon'} klassieke inspiratie voor "{prep.name}"
                            </button>
                            {showClassical === prep.id && (
                              <div className="mt-3">
                                <ClassicalSuggestions query={prep.name} maxResults={4} />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
