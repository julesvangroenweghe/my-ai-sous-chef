'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, BookOpen, Trophy, Search, Loader2, RefreshCw, ArrowRight } from 'lucide-react'

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
type PushLevel = 'comfort' | 'balanced' | 'challenge'

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

const PUSH_LEVEL_CONFIG: Record<PushLevel, { label: string; description: string; color: string; activeColor: string }> = {
  comfort: {
    label: 'Comfort',
    description: 'Vertrouwde smaken, klassieke combinaties',
    color: 'border-[#E8D5B5] text-[#9E7E60] hover:border-amber-300',
    activeColor: 'bg-amber-50 border-amber-400 text-amber-800',
  },
  balanced: {
    label: 'Gebalanceerd',
    description: 'Mix van vertrouwd en verrassend',
    color: 'border-[#E8D5B5] text-[#9E7E60] hover:border-amber-300',
    activeColor: 'bg-amber-50 border-amber-400 text-amber-800',
  },
  challenge: {
    label: 'Uitdagend',
    description: 'Onverwachte combinaties, nieuwe technieken',
    color: 'border-[#E8D5B5] text-[#9E7E60] hover:border-purple-300',
    activeColor: 'bg-purple-50 border-purple-400 text-purple-800',
  },
}

export function SwapDishModal({
  course, menuType, exclusions, existingDishes, concept, numPersons, onSelect, onClose
}: SwapDishModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('ai')
  const [loading, setLoading] = useState(false)
  const [pushLevel, setPushLevel] = useState<PushLevel>('balanced')

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

  const loadAI = async (level?: PushLevel) => {
    setLoading(true)
    setAiSuggestions([])
    try {
      const res = await fetch('/api/proposals/swap-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'ai',
          course, menuType, exclusions, existingDishes, concept, numPersons,
          push_level: level ?? pushLevel,
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

  const handlePushLevelChange = (level: PushLevel) => {
    setPushLevel(level)
    if (activeTab === 'ai' && aiLoaded) {
      // Reload suggestions with new level
      loadAI(level)
    }
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
          course, menuType, exclusions, push_level: pushLevel,
        }),
      })
      const data = await res.json()
      if (data.variants) setHertaalResult(data)
    } catch (e) {
      console.error(e)
    }
    setHertaalLoading(null)
  }

  useEffect(() => {
    if (activeTab === 'ai' && !aiLoaded) loadAI()
    if (activeTab === 'legende') loadLegende()
    if (activeTab === 'kennisbank' && recipes.length === 0) searchKennisbank('')
  }, [activeTab])

  const filteredLegende = legendeDishes.filter(d =>
    d.name.toLowerCase().includes(legendeSearch.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#FDF8F2] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-[#E8D5B5]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8D5B5]">
          <div>
            <h2 className="text-lg font-semibold text-[#2C1810]">Gerecht kiezen</h2>
            <p className="text-sm text-[#9E7E60]">Gang: {course}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-amber-50 text-[#9E7E60] hover:text-[#2C1810] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E8D5B5] px-6">
          {[
            { id: 'ai' as Tab, icon: Sparkles, label: 'AI Genereer' },
            { id: 'kennisbank' as Tab, icon: BookOpen, label: 'Kennisbank' },
            { id: 'legende' as Tab, icon: Trophy, label: 'LEGENDE' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === id
                  ? 'border-amber-500 text-amber-700'
                  : 'border-transparent text-[#9E7E60] hover:text-[#2C1810]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Push Level Selector — only on AI tab */}
        {activeTab === 'ai' && (
          <div className="px-6 py-3 border-b border-[#E8D5B5] bg-[#FDF8F2]">
            <p className="text-xs font-medium text-[#9E7E60] mb-2 uppercase tracking-wide">AI niveau</p>
            <div className="flex gap-2">
              {(Object.keys(PUSH_LEVEL_CONFIG) as PushLevel[]).map((level) => {
                const config = PUSH_LEVEL_CONFIG[level]
                const isActive = pushLevel === level
                return (
                  <button
                    key={level}
                    onClick={() => handlePushLevelChange(level)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      isActive ? config.activeColor : config.color
                    }`}
                  >
                    {config.label}
                  </button>
                )
              })}
            </div>
            {exclusions.length > 0 && (
              <p className="text-xs text-[#9E7E60] mt-2">
                <span className="font-medium text-amber-700">Exclusies:</span> {exclusions.join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* AI TAB */}
          {activeTab === 'ai' && (
            <div className="space-y-3">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  <span className="ml-3 text-[#9E7E60]">AI denkt na...</span>
                </div>
              )}

              {!loading && aiSuggestions.map((s, i) => (
                <div key={i} className="bg-white border border-[#E8D5B5] rounded-xl p-4 hover:border-amber-300 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ANGLE_COLORS[s.angle] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                          {s.angle}
                        </span>
                        {s.cost_per_person && (
                          <span className="text-xs text-[#9E7E60]">€{s.cost_per_person.toFixed(2)}/p</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-[#2C1810] text-base">{s.name}</h3>
                      <p className="text-sm text-[#9E7E60] mt-0.5 italic">{s.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {s.key_ingredients?.map((ing, j) => (
                          <span key={j} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md">
                            {ing}
                          </span>
                        ))}
                      </div>
                      {s.technique && (
                        <p className="text-xs text-[#9E7E60] mt-1">Techniek: {s.technique}</p>
                      )}
                    </div>
                    <button
                      onClick={() => onSelect({ name: s.name, description: s.description, cost_per_person: s.cost_per_person })}
                      className="shrink-0 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                    >
                      Kies
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}

              {!loading && aiLoaded && aiSuggestions.length === 0 && (
                <p className="text-center text-[#9E7E60] py-8">Geen suggesties geladen.</p>
              )}

              {aiLoaded && !loading && (
                <button
                  onClick={() => loadAI()}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-[#E8D5B5] rounded-xl text-sm text-[#9E7E60] hover:border-amber-300 hover:text-amber-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Nieuwe opties genereren
                </button>
              )}
            </div>
          )}

          {/* KENNISBANK TAB */}
          {activeTab === 'kennisbank' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E7E60]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchKennisbank()}
                    placeholder="Zoek in 9.492 klassieke recepten..."
                    className="w-full pl-9 pr-4 py-2.5 border border-[#E8D5B5] rounded-lg text-sm bg-white text-[#2C1810] focus:outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  onClick={() => searchKennisbank()}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Zoek
                </button>
              </div>

              {/* Push level reminder */}
              <div className="flex gap-2 text-xs">
                {(Object.keys(PUSH_LEVEL_CONFIG) as PushLevel[]).map((level) => {
                  const config = PUSH_LEVEL_CONFIG[level]
                  const isActive = pushLevel === level
                  return (
                    <button
                      key={level}
                      onClick={() => setPushLevel(level)}
                      className={`px-3 py-1 rounded-full border transition-all ${
                        isActive ? config.activeColor : config.color
                      }`}
                    >
                      {config.label}
                    </button>
                  )
                })}
                <span className="text-[#9E7E60] self-center ml-1">— hertaling niveau</span>
              </div>

              {loading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                </div>
              )}

              {/* Hertaal result */}
              {hertaalResult && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                    Hertaling van: {hertaalResult.original_name}
                  </p>
                  {hertaalResult.variants.map((v, i) => (
                    <div key={i} className="bg-white border border-amber-200 rounded-lg p-3 flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-[#2C1810]">{v.name}</h4>
                        <p className="text-sm text-[#9E7E60] italic">{v.description}</p>
                        <p className="text-xs text-amber-600 mt-1">{v.key_changes}</p>
                      </div>
                      <button
                        onClick={() => onSelect({ name: v.name, description: v.description, cost_per_person: v.cost_per_person })}
                        className="shrink-0 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                      >
                        Kies <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Recipe list */}
              {!loading && recipes.map((r) => (
                <div key={r.id} className="bg-white border border-[#E8D5B5] rounded-xl p-4 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-[#F2E8D5] text-[#9E7E60] px-2 py-0.5 rounded-full">{r.category}</span>
                      {r.source && <span className="text-xs text-[#9E7E60]">{r.source}</span>}
                    </div>
                    <h3 className="font-medium text-[#2C1810]">{r.name_original}</h3>
                    {r.description && <p className="text-sm text-[#9E7E60] mt-0.5 line-clamp-2">{r.description}</p>}
                  </div>
                  <button
                    onClick={() => hertaalRecipe(r.id)}
                    disabled={hertaalLoading === r.id}
                    className="shrink-0 px-3 py-2 border border-amber-300 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    {hertaalLoading === r.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>Hertaal</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* LEGENDE TAB */}
          {activeTab === 'legende' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E7E60]" />
                <input
                  type="text"
                  value={legendeSearch}
                  onChange={e => setLegendeSearch(e.target.value)}
                  placeholder="Zoek in jouw LEGENDE gerechten..."
                  className="w-full pl-9 pr-4 py-2.5 border border-[#E8D5B5] rounded-lg text-sm bg-white text-[#2C1810] focus:outline-none focus:border-amber-400"
                />
              </div>

              {loading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                </div>
              )}

              {!loading && filteredLegende.map((d) => (
                <div key={d.id} className="bg-white border border-[#E8D5B5] rounded-xl p-4 hover:border-amber-300 transition-colors group flex items-start justify-between gap-3">
                  <div className="flex-1">
                    {d.category && (
                      <span className="text-xs bg-[#F2E8D5] text-[#9E7E60] px-2 py-0.5 rounded-full">{d.category.name}</span>
                    )}
                    <h3 className="font-semibold text-[#2C1810] mt-1">{d.name}</h3>
                    {d.description && <p className="text-sm text-[#9E7E60] italic">{d.description}</p>}
                    {d.price_per_person > 0 && (
                      <p className="text-xs text-[#9E7E60] mt-1">€{d.price_per_person.toFixed(2)}/p</p>
                    )}
                    {d.elements?.length > 0 && (
                      <p className="text-xs text-[#9E7E60] mt-1">
                        {d.elements.slice(0, 4).map(e => e.name).join(' · ')}
                        {d.elements.length > 4 ? ` +${d.elements.length - 4}` : ''}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onSelect({ name: d.name, description: d.description, cost_per_person: d.price_per_person })}
                    className="shrink-0 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                  >
                    Kies <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {!loading && legendeLoaded && filteredLegende.length === 0 && (
                <p className="text-center text-[#9E7E60] py-8">Geen gerechten gevonden.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
