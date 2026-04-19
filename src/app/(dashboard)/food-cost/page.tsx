'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, Target, ArrowRight,
  Search, AlertTriangle, CheckCircle, BarChart3
} from 'lucide-react'

interface RecipeWithCost {
  id: string
  name: string
  category: { id: string; name: string } | null
  total_cost_per_serving: number | null
  food_cost_percentage: number | null
  selling_price: number | null
  number_of_servings: number | null
  updated_at: string
}

const targets = {
  excellent: 28,
  good: 32,
  warning: 38,
}

export default function FoodCostPage() {
  const [recipes, setRecipes] = useState<RecipeWithCost[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'cost_asc' | 'cost_desc'>('cost_desc')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('recipes')
        .select('id, name, category:recipe_categories(id, name), total_cost_per_serving, food_cost_percentage, selling_price, number_of_servings, updated_at')
        .eq('status', 'active')
        .order('name')
      setRecipes((data || []) as any[])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    let result = recipes.filter(r =>
      !search || r.name.toLowerCase().includes(search.toLowerCase())
    )
    if (sortBy === 'cost_desc') result.sort((a, b) => (b.food_cost_percentage || 0) - (a.food_cost_percentage || 0))
    if (sortBy === 'cost_asc') result.sort((a, b) => (a.food_cost_percentage || 0) - (b.food_cost_percentage || 0))
    if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name))
    return result
  }, [recipes, search, sortBy])

  const stats = useMemo(() => {
    const withCost = recipes.filter(r => r.food_cost_percentage && r.food_cost_percentage > 0)
    const avgCost = withCost.length > 0
      ? withCost.reduce((sum, r) => sum + (r.food_cost_percentage || 0), 0) / withCost.length
      : 0
    const overTarget = withCost.filter(r => (r.food_cost_percentage || 0) > targets.good)
    const excellent = withCost.filter(r => (r.food_cost_percentage || 0) <= targets.excellent)
    return { total: recipes.length, withCost: withCost.length, avgCost, overTarget: overTarget.length, excellent: excellent.length }
  }, [recipes])

  function getCostColor(pct: number | null) {
    if (!pct || pct === 0) return 'text-stone-300'
    if (pct <= targets.excellent) return 'text-emerald-600'
    if (pct <= targets.good) return 'text-emerald-500'
    if (pct <= targets.warning) return 'text-amber-500'
    return 'text-red-500'
  }

  function getCostBg(pct: number | null) {
    if (!pct || pct === 0) return 'bg-stone-50'
    if (pct <= targets.excellent) return 'bg-emerald-50'
    if (pct <= targets.good) return 'bg-emerald-50/50'
    if (pct <= targets.warning) return 'bg-amber-50'
    return 'bg-red-50'
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">Food Cost</h1>
            <p className="text-stone-500 text-sm">Overzicht kostprijzen en marges per recept</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        <div className="card p-4">
          <div className="text-xs text-stone-400 mb-1">Gemiddelde food cost</div>
          <div className={`font-mono text-2xl font-bold ${getCostColor(stats.avgCost)}`}>
            {stats.avgCost > 0 ? `${stats.avgCost.toFixed(1)}%` : '\u2014'}
          </div>
          <div className="text-[10px] text-stone-400 mt-1">Target: {targets.excellent}-{targets.good}%</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-stone-400 mb-1">Recepten met prijs</div>
          <div className="font-mono text-2xl font-bold text-stone-900">{stats.withCost}/{stats.total}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-1 text-xs text-stone-400 mb-1">
            <CheckCircle className="w-3 h-3 text-emerald-500" /> Uitstekend
          </div>
          <div className="font-mono text-2xl font-bold text-emerald-600">{stats.excellent}</div>
          <div className="text-[10px] text-stone-400 mt-1">Onder {targets.excellent}%</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-1 text-xs text-stone-400 mb-1">
            <AlertTriangle className="w-3 h-3 text-amber-500" /> Boven target
          </div>
          <div className="font-mono text-2xl font-bold text-amber-600">{stats.overTarget}</div>
          <div className="text-[10px] text-stone-400 mt-1">Boven {targets.good}%</div>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3 animate-slide-up opacity-0" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Zoek recept..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-premium pl-10"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'cost_desc' as const, label: 'Hoogste eerst' },
            { key: 'cost_asc' as const, label: 'Laagste eerst' },
            { key: 'name' as const, label: 'A-Z' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={`px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                sortBy === s.key ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recipe list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="card overflow-hidden animate-slide-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="text-left text-xs font-semibold text-stone-500 py-3 px-4">Recept</th>
                <th className="text-right text-xs font-semibold text-stone-500 py-3 px-4">Kostprijs/portie</th>
                <th className="text-right text-xs font-semibold text-stone-500 py-3 px-4">Verkoopprijs</th>
                <th className="text-right text-xs font-semibold text-stone-500 py-3 px-4 min-w-[120px]">Food Cost %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((recipe) => {
                const pct = recipe.food_cost_percentage
                return (
                  <tr key={recipe.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/recipes/${recipe.id}`} className="group">
                        <div className="font-medium text-stone-900 group-hover:text-brand-600 transition-colors">
                          {recipe.name}
                        </div>
                        {recipe.category && (
                          <div className="text-xs text-stone-400 mt-0.5">{(recipe.category as any).name}</div>
                        )}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm text-stone-600">
                      {recipe.total_cost_per_serving ? formatCurrency(recipe.total_cost_per_serving) : '\u2014'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm text-stone-600">
                      {recipe.selling_price ? formatCurrency(Number(recipe.selling_price)) : '\u2014'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {pct && pct > 0 ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="flex-1 max-w-[60px] h-2 bg-stone-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pct <= targets.excellent ? 'bg-emerald-500' :
                                pct <= targets.good ? 'bg-emerald-400' :
                                pct <= targets.warning ? 'bg-amber-400' : 'bg-red-400'
                              }`}
                              style={{ width: `${Math.min(pct / 50 * 100, 100)}%` }}
                            />
                          </div>
                          <span className={`font-mono text-sm font-bold ${getCostColor(pct)}`}>
                            {pct.toFixed(1)}%
                          </span>
                          {pct <= targets.excellent ? (
                            <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                          ) : pct > targets.good ? (
                            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-stone-300 font-mono">&mdash;</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-stone-400">
              Geen recepten gevonden
            </div>
          )}
        </div>
      )}
    </div>
  )
}
