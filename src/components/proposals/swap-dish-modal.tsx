'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, BookOpen, Trophy, Search, Loader2, ChevronRight, RefreshCw, ArrowRight } from 'lucide-react'

interface SwapDishModalProps {
  course: string
  menuType: string
  exclusions: string[]
  existingDishes: string[]
  concept: string
  numPersons: number
  onSelect: (dish: { name: string; description: string; cost_per_person?: number | null }) => void
  onClose: () => void
}

type Tab = 'ai' | 'kennisbank' | 'legende'

interface AISuggestion {
  name: string
  description: string
  angle: string
  key_ingredients: string[]
  technique: string
  cost_per_person?: number
}

interface ClassicalRecipe {
  id: string
  name_original: string
  category: string
  description: string
  source: string
}

interface LegendeDish {
  id: string
  name: string
  description: string
  price_per_person: number
  category: { name: string } | null
  elements: { name: string; quantity_text: string }[]
}

interface HertaalVariant {
  name: string
  description: string
  key_changes: string
  cost_per_person?: number
}

const ANGLE_COLORS: Record<string, string> = {
  'Jules DNA': 'bg-amber-50 border-amber-200 text-amber-700',
  'Seizoens': 'bg-green-50 border-green-200 text-green-700',
  'Verrassend': 'bg-purple-50 border-purple-200 text-purple-700',
}

export function SwapDishModal({
  course, menuType, exclusions, existingDishes, concept, numPersons, onSelect, onClose
}: SwapDishModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('ai')
  const [loading, setLoading] = useState(false)

  // AI state
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([])
  const [aiLoaded, setAiLoaded] = useState(false)

  // Kennisbank state
  const [searchQuery, setSearchQuery] = useState('')
  const [recipes, setRecipes] = useState<ClassicalRecipe[]>([])
  const [hertaalLoading, setHertaalLoading] = useState<string | null>(null)
  const [hertaalResult, setHertaalResult] = useState<{ original_name: string; variants: HertaalVariant[] } | null>(null)

  // LEGENDE state
  const [legendeDishes, setLegendeDishes] = useState<LegendeDish[]>([])
  const [legendeSearch, setLegendeSearch] = useState('')
  const [legendeLoaded, setLegendeLoaded] = useState(false)

  const loadAI = async () => {
    setLoading(true)
    setAiSuggestions([])
    try {
      const res = await fetch('/api/proposals/swap-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'ai',
          course, menuType, exclusions, existingDishes, concept, numPersons,
        }),
      })
      const data = await res.json()
      if (data.suggestions) setAiSuggestions(data.suggestions)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
    setAiLoaded(true)
  }

  const loadLegende = async () => {
    if (legendeLoaded) return
    setLoading(true)
    try {
      const res = await fetch('/api/proposals/swap-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'legende' }),
      })
      const data = await res.json()
      if (data.legende) setLegendeDishes(data.legende)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
    setLegendeLoaded(true)
  }

  const searchKennisbank = async (q?: string) => {
    setLoading(true)
    setHertaalResult(null)
    try {
      const res = await fetch('/api/proposals/swap-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'kennisbank', query: q ?? searchQuery }),
      })
      const data = await res.json()
      if (data.recipes) setRecipes(data.recipes)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const hertaalRecipe = async (id: string) => {
    setHertaalLoading(id)
    setHertaalResult(null)
    try {
      const res = await fetch('/api/proposals/swap-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'kennisbank',
          hertaalId: id,
          course, menuType, exclusions, numPersons,
        }),
      })
      const data = await res.json()
      if (data.variants) setHertaalResult(data)
    } catch (e) {
      console.error(e)
    }
    setHertaalLoading(null)
  }

  // Auto-load AI when modal opens
  useEffect(() => {
    loadAI()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    if (tab === 'legende') loadLegende()
    if (tab === 'kennisbank' && recipes.length === 0) searchKennisbank('')
  }

  const filteredLegende = legendeDishes.filter(d =>
    !legendeSearch || d.name.toLowerCase().includes(legendeSearch.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-[#E8D5B5] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0E8D8]">
          <div>
            <h3 className="text-lg font-display font-bold text-[#2C1810]">Gerecht kiezen</h3>
            <p className="text-xs text-[#9E7E60] mt-0.5">Gang: <span className="font-semibold">{course}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#FAF6EF] rounded-lg transition-all">
            <X className="w-5 h-5 text-[#9E7E60]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#F0E8D8] px-6">
          {[
            { id: 'ai' as Tab, label: 'AI Genereer', icon: Sparkles, desc: '3 opties op maat' },
            { id: 'kennisbank' as Tab, label: 'Kennisbank', icon: BookOpen, desc: '9.492 recepten' },
            { id: 'legende' as Tab, label: 'LEGENDE', icon: Trophy, desc: 'Jouw signatuur' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${
                activeTab === tab.id
                  ? 'border-amber-400 text-amber-700'
                  : 'border-transparent text-[#9E7E60] hover:text-[#2C1810]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-amber-100 text-amber-600' : 'bg-[#F5EDE0] text-[#B8997A]'
              }`}>{tab.desc}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* --- AI TAB --- */}
          {activeTab === 'ai' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-[#9E7E60]">
                  3 invalshoeken — Jules' DNA, seizoen en een verrassing
                </p>
                <button
                  onClick={loadAI}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF6EF] hover:bg-[#F2E8D5] border border-[#E8D5B5] text-[#9E7E60] text-xs rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Nieuwe opties
                </button>
              </div>

              {loading && !aiLoaded && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
                    <p className="text-sm text-[#9E7E60]">AI denkt mee — seizoen + DNA + LEGENDE...</p>
                  </div>
                </div>
              )}

              {aiSuggestions.map((s, i) => (
                <div
                  key={i}
                  className="group bg-white border border-[#E8D5B5] rounded-xl p-4 hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => onSelect({ name: s.name, description: s.description, cost_per_person: s.cost_per_person })}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${ANGLE_COLORS[s.angle] || 'bg-stone-50 border-stone-200 text-stone-600'}`}>
                          {s.angle}
                        </span>
                        {s.cost_per_person && (
                          <span className="text-[10px] text-[#9E7E60] font-mono">€{s.cost_per_person}/p</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-[#2C1810] mb-0.5">{s.name}</p>
                      {s.description && (
                        <p className="text-xs text-[#9E7E60] italic">{s.description}</p>
                      )}
                      {s.key_ingredients?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {s.key_ingredients.slice(0, 4).map((ing, j) => (
                            <span key={j} className="text-[10px] bg-[#FAF6EF] border border-[#E8D5B5] text-[#9E7E60] px-2 py-0.5 rounded-full">
                              {ing}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#D4B896] group-hover:text-amber-400 transition-colors shrink-0 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* --- KENNISBANK TAB --- */}
          {activeTab === 'kennisbank' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#B8997A] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchKennisbank()}
                    placeholder="bvb. tarbot, lam, asperge, morel..."
                    className="w-full pl-9 pr-3 py-2 bg-[#FDFAF6] border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
                <button
                  onClick={() => searchKennisbank()}
                  disabled={loading}
                  className="px-4 py-2 bg-[#FEF3E2] hover:bg-amber-100 border border-amber-200 text-amber-700 text-sm font-medium rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Zoek'}
                </button>
              </div>

              <p className="text-xs text-[#B8997A]">9.492 klassieke recepten — klik "Hertaal" om in Jules' stijl te zetten</p>

              {/* Hertaal Result */}
              {hertaalResult && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <p className="text-xs font-semibold text-amber-700">
                      "{hertaalResult.original_name}" hertaald in Jules' stijl
                    </p>
                    <button
                      onClick={() => setHertaalResult(null)}
                      className="ml-auto text-amber-500 hover:text-amber-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {hertaalResult.variants.map((v, i) => (
                    <div
                      key={i}
                      className="bg-white border border-amber-200 rounded-lg p-3 mb-2 cursor-pointer hover:border-amber-400 transition-all group"
                      onClick={() => onSelect({ name: v.name, description: v.description, cost_per_person: v.cost_per_person })}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[#2C1810]">{v.name}</p>
                          <p className="text-xs text-[#9E7E60] italic mt-0.5">{v.description}</p>
                          {v.key_changes && (
                            <p className="text-[10px] text-amber-600 mt-1">Hertaling: {v.key_changes}</p>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 text-amber-300 group-hover:text-amber-500 transition-colors shrink-0 mt-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recipe list */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  {recipes.map(recipe => (
                    <div
                      key={recipe.id}
                      className="flex items-center gap-3 px-4 py-3 bg-white border border-[#F0E8D8] rounded-xl hover:border-[#E8D5B5] transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#2C1810] truncate">{recipe.name_original}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {recipe.category && (
                            <span className="text-[10px] text-[#B8997A]">{recipe.category}</span>
                          )}
                          {recipe.source && (
                            <span className="text-[10px] text-[#D4B896]">— {recipe.source}</span>
                          )}
                        </div>
                        {recipe.description && (
                          <p className="text-[11px] text-[#B8997A] truncate mt-0.5">{recipe.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => hertaalRecipe(recipe.id)}
                        disabled={hertaalLoading === recipe.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#FEF3E2] hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-medium rounded-lg transition-all whitespace-nowrap disabled:opacity-50 shrink-0"
                      >
                        {hertaalLoading === recipe.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Sparkles className="w-3 h-3" />
                        }
                        Hertaal
                      </button>
                    </div>
                  ))}
                  {recipes.length === 0 && !loading && (
                    <div className="text-center py-8 text-[#B8997A] text-sm">
                      Geen recepten gevonden — probeer een andere zoekterm
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* --- LEGENDE TAB --- */}
          {activeTab === 'legende' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[#B8997A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={legendeSearch}
                  onChange={e => setLegendeSearch(e.target.value)}
                  placeholder="Filter jouw gerechten..."
                  className="w-full pl-9 pr-3 py-2 bg-[#FDFAF6] border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>

              <p className="text-xs text-[#B8997A]">
                {legendeDishes.length} LEGENDE gerechten — jouw signatuurcatalog
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredLegende.map(dish => (
                    <div
                      key={dish.id}
                      className="flex items-start gap-3 px-4 py-3 bg-white border border-[#F0E8D8] rounded-xl hover:border-amber-300 hover:bg-[#FFFBF5] transition-all cursor-pointer group"
                      onClick={() => onSelect({
                        name: dish.name,
                        description: dish.description || '',
                        cost_per_person: dish.price_per_person,
                      })}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-[#2C1810]">{dish.name}</p>
                          {dish.category && (
                            <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-600 px-1.5 py-0.5 rounded-full">
                              {(dish.category as any)?.name || dish.category}
                            </span>
                          )}
                        </div>
                        {dish.description && (
                          <p className="text-xs text-[#9E7E60] italic">{dish.description}</p>
                        )}
                        {dish.elements?.length > 0 && (
                          <p className="text-[10px] text-[#B8997A] mt-1">
                            {dish.elements.slice(0, 4).map(e => e.name).join(' · ')}
                            {dish.elements.length > 4 ? ` +${dish.elements.length - 4}` : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {dish.price_per_person && (
                          <span className="text-xs font-mono text-[#9E7E60]">€{dish.price_per_person}/p</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-[#D4B896] group-hover:text-amber-400 transition-colors" />
                      </div>
                    </div>
                  ))}
                  {filteredLegende.length === 0 && (
                    <div className="text-center py-8 text-[#B8997A] text-sm">
                      Geen LEGENDE gerechten gevonden
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#F0E8D8] bg-[#FDFAF6] rounded-b-2xl">
          <p className="text-xs text-[#B8997A] text-center">
            Klik op een gerecht om het direct toe te voegen aan de gang
          </p>
        </div>
      </div>
    </div>
  )
}
