'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen, Search, Filter, ChevronDown, ChevronUp,
  Beaker, Scale, Thermometer, BookMarked, RefreshCw,
  ChefHat, Flame, Clock,
} from 'lucide-react'

interface ClassicRecipe {
  id: string
  title: string
  source: string
  category: string | null
  cuisine: string | null
  base_ingredient: string | null
  cooking_method: string | null
  yield_text: string | null
  description: string | null
}

interface Technique {
  id: string
  name: string
  category: string | null
  description: string | null
  key_principles: string | null
  common_applications: string | null
}

interface Ratio {
  id: string
  name: string
  ratio_formula: string | null
  description: string | null
  category: string | null
  source: string | null
}

interface TechniqueParam {
  id: string
  technique_name: string
  item_name: string
  temperature_c: number | null
  time_range: string | null
  notes: string | null
}

const sourceColors: Record<string, string> = {
  'Escoffier': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Hirtzler': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Soyer': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Filippini': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'Artusi': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  'Belgian Cookbook': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
}

type Tab = 'recipes' | 'techniques' | 'ratios' | 'parameters'

export default function KnowledgePage() {
  const [tab, setTab] = useState<Tab>('recipes')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [recipes, setRecipes] = useState<ClassicRecipe[]>([])
  const [techniques, setTechniques] = useState<Technique[]>([])
  const [ratios, setRatios] = useState<Ratio[]>([])
  const [parameters, setParameters] = useState<TechniqueParam[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sourceFilter, setSourceFilter] = useState<string>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Fetch recipes
  useEffect(() => {
    if (tab !== 'recipes') return
    setLoading(true)
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (sourceFilter) params.set('source', sourceFilter)
    params.set('limit', '30')
    
    fetch(`/api/knowledge?${params}`)
      .then(r => r.json())
      .then(data => {
        setRecipes(data.recipes || [])
        setTotal(data.total || 0)
      })
      .finally(() => setLoading(false))
  }, [tab, debouncedSearch, sourceFilter])

  // Fetch techniques/ratios/params
  useEffect(() => {
    if (tab === 'recipes') return
    setLoading(true)
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('q', debouncedSearch)
    
    fetch(`/api/knowledge/techniques?${params}`)
      .then(r => r.json())
      .then(data => {
        setTechniques(data.techniques || [])
        setRatios(data.ratios || [])
        setParameters(data.parameters || [])
      })
      .finally(() => setLoading(false))
  }, [tab, debouncedSearch])

  const sources = ['Escoffier', 'Hirtzler', 'Soyer', 'Filippini', 'Artusi', 'Belgian Cookbook']

  const tabs: { key: Tab; label: string; icon: any; count?: number }[] = [
    { key: 'recipes', label: 'Recepten', icon: BookOpen, count: total },
    { key: 'techniques', label: 'Technieken', icon: Flame, count: techniques.length },
    { key: 'ratios', label: "Ratio's", icon: Scale, count: ratios.length },
    { key: 'parameters', label: 'Parameters', icon: Thermometer, count: parameters.length },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-outfit">Culinaire Kennisbank</h1>
        <p className="text-stone-400 text-sm mt-1">
          9.492 klassieke recepten, 67 ratio's, 32 technieken, 41 parameters
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setExpandedId(null) }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                : 'bg-stone-800 text-stone-400 border border-stone-700 hover:bg-stone-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className="text-[10px] font-mono opacity-60">{t.count.toLocaleString()}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search + Source filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tab === 'recipes' ? 'Zoek op naam, ingrediënt of beschrijving...' : 'Zoek op naam of beschrijving...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-white text-sm placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
        </div>
        {tab === 'recipes' && (
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          >
            <option value="">Alle bronnen</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-5 h-5 animate-spin text-stone-400" />
        </div>
      )}

      {/* Recipe results */}
      {tab === 'recipes' && !loading && (
        <div className="space-y-1.5">
          {recipes.map(recipe => {
            const isExpanded = expandedId === recipe.id
            const colorClass = sourceColors[recipe.source] || 'bg-stone-500/15 text-stone-400 border-stone-500/30'
            return (
              <button
                key={recipe.id}
                onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
                className="w-full text-left"
              >
                <div className={`px-4 py-3 rounded-xl border transition-all ${
                  isExpanded ? 'bg-stone-800/80 border-stone-600' : 'bg-stone-800/40 border-stone-800 hover:bg-stone-800/60'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{recipe.title}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${colorClass}`}>
                          {recipe.source}
                        </Badge>
                      </div>
                      {recipe.category && (
                        <p className="text-xs text-stone-500 mt-0.5">{recipe.category}</p>
                      )}
                    </div>
                    {recipe.base_ingredient && (
                      <span className="text-xs text-stone-500 hidden sm:block">{recipe.base_ingredient}</span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
                  </div>
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-stone-700/50 space-y-2">
                      {recipe.description && <p className="text-sm text-stone-300">{recipe.description}</p>}
                      <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                        {recipe.cooking_method && <span>Methode: {recipe.cooking_method}</span>}
                        {recipe.cuisine && <span>Keuken: {recipe.cuisine}</span>}
                        {recipe.yield_text && <span>Opbrengst: {recipe.yield_text}</span>}
                      </div>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
          {recipes.length === 0 && <p className="text-center text-stone-500 py-8">Geen recepten gevonden</p>}
        </div>
      )}

      {/* Techniques */}
      {tab === 'techniques' && !loading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {techniques.map(t => (
            <Card key={t.id} className="bg-stone-800/50 border-stone-700">
              <CardContent className="p-4">
                <h3 className="font-semibold text-white text-sm">{t.name}</h3>
                {t.category && <Badge variant="outline" className="mt-1 text-[10px]">{t.category}</Badge>}
                {t.description && <p className="text-xs text-stone-400 mt-2 line-clamp-3">{t.description}</p>}
              </CardContent>
            </Card>
          ))}
          {techniques.length === 0 && <p className="text-center text-stone-500 py-8 col-span-2">Geen technieken gevonden</p>}
        </div>
      )}

      {/* Ratios */}
      {tab === 'ratios' && !loading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {ratios.map(r => (
            <Card key={r.id} className="bg-stone-800/50 border-stone-700">
              <CardContent className="p-4">
                <h3 className="font-semibold text-white text-sm">{r.name}</h3>
                {r.ratio_formula && (
                  <p className="text-brand-400 font-mono text-sm mt-1">{r.ratio_formula}</p>
                )}
                {r.description && <p className="text-xs text-stone-400 mt-2 line-clamp-3">{r.description}</p>}
                {r.source && <span className="text-[10px] text-stone-600 mt-2 block">{r.source}</span>}
              </CardContent>
            </Card>
          ))}
          {ratios.length === 0 && <p className="text-center text-stone-500 py-8 col-span-2">Geen ratio's gevonden</p>}
        </div>
      )}

      {/* Parameters */}
      {tab === 'parameters' && !loading && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-stone-500 text-xs border-b border-stone-700">
                <th className="text-left py-2 px-3">Techniek</th>
                <th className="text-left py-2 px-3">Product</th>
                <th className="text-right py-2 px-3">Temperatuur</th>
                <th className="text-left py-2 px-3">Tijd</th>
                <th className="text-left py-2 px-3">Notities</th>
              </tr>
            </thead>
            <tbody>
              {parameters.map(p => (
                <tr key={p.id} className="border-b border-stone-800 hover:bg-stone-800/50">
                  <td className="py-2 px-3 text-stone-400">{p.technique_name}</td>
                  <td className="py-2 px-3 text-white font-medium">{p.item_name}</td>
                  <td className="py-2 px-3 text-right text-brand-400 font-mono">
                    {p.temperature_c ? `${p.temperature_c}°C` : '—'}
                  </td>
                  <td className="py-2 px-3 text-stone-300">{p.time_range || '—'}</td>
                  <td className="py-2 px-3 text-stone-500 text-xs max-w-[200px] truncate">{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {parameters.length === 0 && <p className="text-center text-stone-500 py-8">Geen parameters gevonden</p>}
        </div>
      )}
    </div>
  )
}
