'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { BookOpen, Beaker, Scale, Thermometer, Search, ChevronLeft, ChevronRight } from 'lucide-react'

type Tab = 'recipes' | 'techniques' | 'ratios' | 'parameters'

interface Stats {
  recipes: number
  techniques: number
  ratios: number
  parameters: number
}


function cleanRecipeName(name: string): string {
  if (!name) return ''
  return name
    .replace(/^_Class \d+\.?_\s*/i, '')
    .replace(/^_Example_\s*:\s*/i, '')
    .replace(/^_+|_+$/g, '')
    .replace(/_/g, ' ')
    .trim()
}

export default function KnowledgePage() {
  const [tab, setTab] = useState<Tab>('recipes')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const debounceRef = useRef<NodeJS.Timeout>()
  const [source, setSource] = useState('')
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<Stats>({ recipes: 0, techniques: 0, ratios: 0, parameters: 0 })
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const limit = 25

  useEffect(() => {
    fetch('/api/knowledge?tab=stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ tab, limit: String(limit), offset: String(page * limit) })
      if (search) params.set('q', search)
      if (source && tab === 'recipes') params.set('source', source)
      const res = await fetch(`/api/knowledge?${params}`)
      const json = await res.json()
      setData(json.data || [])
      setTotal(json.total || 0)
    } catch {
      setData([])
      setTotal(0)
    }
    setLoading(false)
  }, [tab, search, source, page])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearch(searchInput), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchInput])

  useEffect(() => { setPage(0) }, [tab, search, source])

  const tabs: { key: Tab; label: string; icon: typeof BookOpen }[] = [
    { key: 'recipes', label: 'Recepten', icon: BookOpen },
    { key: 'techniques', label: 'Technieken', icon: Beaker },
    { key: 'ratios', label: "Ratio's", icon: Scale },
    { key: 'parameters', label: 'Parameters', icon: Thermometer },
  ]

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Culinaire Kennisbank</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {stats.recipes.toLocaleString('nl-BE')} klassieke recepten, {stats.techniques} technieken, {stats.ratios} ratio&apos;s, {stats.parameters} parameters
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Zoek op naam, ingrediënt of beschrijving..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-600/50"
          />
        </div>
        {tab === 'recipes' && (
          <select
            value={source}
            onChange={e => setSource(e.target.value)}
            className="px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none"
          >
            <option value="">Alle bronnen</option>
            <option value="Escoffier">Escoffier</option>
            <option value="Hirtzler">Hirtzler</option>
            <option value="Soyer">Soyer</option>
            <option value="Filippini">Filippini</option>
            <option value="Artusi">Artusi</option>
            <option value="Belgian Cookbook">Belgian Cookbook</option>
          </select>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <p className="text-center text-zinc-500 py-12">Geen resultaten gevonden</p>
      ) : (
        <>
          {tab === 'recipes' && <RecipeResults data={data} />}
          {tab === 'techniques' && <TechniqueResults data={data} />}
          {tab === 'ratios' && <RatioResults data={data} />}
          {tab === 'parameters' && <ParameterResults data={data} />}
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <p className="text-sm text-zinc-500">
            {total.toLocaleString('nl-BE')} resultaten — pagina {page + 1} van {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-700"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-700"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RecipeResults({ data }: { data: any[] }) {
  return (
    <div className="space-y-2">
      {data.map((r: any) => (
        <div key={r.id} className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg hover:border-zinc-600 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-white truncate">{cleanRecipeName(r.name_original)}</h3>
              {r.name_french && r.name_french !== r.name_original && (
                <p className="text-sm text-amber-400/80 mt-0.5">{r.name_french}</p>
              )}
              {r.description && (
                <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{r.description}</p>
              )}
              <div className="flex gap-2 mt-2 flex-wrap">
                {r.source && (
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">{r.source}</span>
                )}
                {r.category && (
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-900/30 text-amber-400">{r.category}</span>
                )}
                {r.chapter_title && (
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-700/50 text-zinc-400">{r.chapter_title}</span>
                )}
              </div>
            </div>
            {r.source_year && (
              <span className="text-xs text-zinc-500 shrink-0">{r.source_year}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function TechniqueResults({ data }: { data: any[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {data.map((t: any) => (
        <div key={t.id} className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
          <h3 className="font-medium text-white">{t.name}</h3>
          {t.name_fr && <p className="text-sm text-amber-400/80">{t.name_fr}</p>}
          {t.description && <p className="text-sm text-zinc-400 mt-1 line-clamp-3">{t.description}</p>}
          <div className="flex gap-2 mt-2">
            {t.category && <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">{t.category}</span>}
            {t.difficulty && <span className="text-xs px-2 py-0.5 rounded bg-amber-900/30 text-amber-400">{t.difficulty}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function RatioResults({ data }: { data: any[] }) {
  return (
    <div className="space-y-3">
      {data.map((r: any) => (
        <div key={r.id} className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-white">{r.name}</h3>
            <span className="text-lg font-mono text-amber-400">{r.ratio}</span>
          </div>
          {r.description && <p className="text-sm text-zinc-400 mt-1">{r.description}</p>}
          {r.components && (
            <p className="text-xs text-zinc-500 mt-2">Componenten: {typeof r.components === 'string' ? r.components : JSON.stringify(r.components)}</p>
          )}
          <div className="flex gap-2 mt-2">
            {r.category && <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">{r.category}</span>}
            {r.source && <span className="text-xs px-2 py-0.5 rounded bg-zinc-700/50 text-zinc-400">{r.source}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function ParameterResults({ data }: { data: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-700 text-left text-zinc-400">
            <th className="pb-2 pr-4">Categorie</th>
            <th className="pb-2 pr-4">Ingrediënt</th>
            <th className="pb-2 pr-4">Type</th>
            <th className="pb-2 pr-4">Waarde</th>
            <th className="pb-2 pr-4">Resultaat</th>
            <th className="pb-2">Notities</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p: any) => (
            <tr key={p.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
              <td className="py-2 pr-4 text-white capitalize">{p.ingredient_category}</td>
              <td className="py-2 pr-4 text-zinc-300">{p.ingredient_specific}</td>
              <td className="py-2 pr-4 text-zinc-400 capitalize">{p.parameter_type}</td>
              <td className="py-2 pr-4 text-amber-400 font-mono whitespace-nowrap">
                {p.value_min}{p.value_max && p.value_max !== p.value_min ? `–${p.value_max}` : ''} {p.value_unit}
              </td>
              <td className="py-2 pr-4 text-zinc-300 capitalize">{p.result_description}</td>
              <td className="py-2 text-zinc-500 text-xs max-w-[200px] truncate">{p.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
