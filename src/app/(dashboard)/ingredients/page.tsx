'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, FlaskConical, Search, ChevronLeft, ChevronRight, Euro, Package } from 'lucide-react'

interface Ingredient {
  id: string
  name: string
  category: string | null
  unit: string | null
  current_price: number | null
  supplier: string | null
  standard_portion_grams: number | null
  edible_part_percentage: number | null
  shrinkage_factor_percentage: number | null
  updated_at: string
}

const ITEMS_PER_PAGE = 25

const categoryEmojis: Record<string, string> = {
  'vlees': '🥩',
  'vis': '🐟',
  'groenten': '🥦',
  'zetmeel': '🥔',
  'zuivel': '🧀',
  'kruiden': '🌿',
  'noten': '🥜',
  'fond': '🍷',
  'bakkerij': '🍞',
  'fruit': '🍎',
  'olie': '🫒',
}

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
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'price'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('ingredients')
        .select('*')
        .order('name')
      setIngredients(data || [])
      setLoading(false)
    }
    load()
  }, [])

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(ingredients.map(i => i.category).filter(Boolean))] as string[]
    return cats.sort()
  }, [ingredients])

  // Filter + search + sort
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

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginatedItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [search, selectedCategory])

  const handleSort = (col: 'name' | 'category' | 'price') => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

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
          <p className="text-stone-400 mt-1">{ingredients.length} ingrediënten · {filtered.length} getoond</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-all text-sm">
          <Plus className="w-4 h-4" />
          Toevoegen
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            type="text"
            placeholder="Zoek ingrediënt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
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
            <button onClick={() => handleSort('name')} className="flex-1 flex items-center gap-1 hover:text-stone-300 transition-colors text-left">
              Naam {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
            </button>
            <button onClick={() => handleSort('category')} className="w-28 flex items-center gap-1 hover:text-stone-300 transition-colors">
              Categorie {sortBy === 'category' && (sortDir === 'asc' ? '↑' : '↓')}
            </button>
            <span className="w-16 text-center">Eenheid</span>
            <span className="w-20 text-center">Portie</span>
            <button onClick={() => handleSort('price')} className="w-24 flex items-center gap-1 justify-end hover:text-stone-300 transition-colors">
              Prijs {sortBy === 'price' && (sortDir === 'asc' ? '↑' : '↓')}
            </button>
          </div>
          
          {/* Table body */}
          {paginatedItems.map((ing) => (
            <div
              key={ing.id}
              className="px-5 py-3.5 flex items-center hover:bg-stone-800/30 transition-colors cursor-pointer border-b border-stone-800/50 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-stone-200">{ing.name}</span>
              </div>
              <span className="w-28 text-xs text-stone-500">
                {ing.category ? `${getCategoryEmoji(ing.category)} ${ing.category}` : '—'}
              </span>
              <span className="w-16 text-center text-xs text-stone-500">{ing.unit || '—'}</span>
              <span className="w-20 text-center text-xs text-stone-500">
                {ing.standard_portion_grams ? `${ing.standard_portion_grams}g` : '—'}
              </span>
              <span className="w-24 text-right font-mono text-sm text-stone-300 tabular-nums">
                {ing.current_price ? `€${Number(ing.current_price).toFixed(2)}` : '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-stone-500">
            {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} van {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    p === page 
                      ? 'bg-brand-600 text-white' 
                      : 'bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
