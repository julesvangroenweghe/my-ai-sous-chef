'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, ChefHat, Clock, Euro, ArrowRight, Search, TrendingDown, TrendingUp, UtensilsCrossed, Users } from 'lucide-react'
import { ChefTip } from '@/components/ai/chef-tip'
import { FadeIn, StaggerList, StaggerItem } from '@/components/ui/page-transition'

interface RecipeRow {
  id: string
  name: string
  description: string | null
  category_id: string | null
  serving_size_grams: number | null
  number_of_servings: number | null
  prep_time_minutes: number | null
  total_cost_per_serving: number | null
  food_cost_percentage: number | null
  selling_price: number | null
  status: string
  created_at: string
  updated_at: string
  category: { id: string; name: string } | null
}

const categoryColors: Record<string, string> = {
  'Voorgerecht': 'bg-emerald-50 text-emerald-700',
  'Tussengerecht': 'bg-teal-50 text-teal-700',
  'Hoofdgerecht': 'bg-amber-50 text-amber-700',
  'Dessert': 'bg-rose-50 text-rose-700',
  'On the Side': 'bg-lime-50 text-lime-700',
  'Appetizers': 'bg-violet-50 text-violet-700',
  'Fingerfood': 'bg-orange-50 text-orange-700',
  'Fingerbites': 'bg-orange-50 text-orange-700',
  'Walking Dinner': 'bg-indigo-50 text-indigo-700',
  'Brunch': 'bg-yellow-50 text-yellow-700',
  'Dranken': 'bg-sky-50 text-sky-700',
}

function FoodCostBadge({ pct }: { pct: number | null }) {
  if (pct == null || pct === 0) return <span className="text-[10px] text-stone-300 font-mono">&mdash;</span>
  const isGood = pct <= 32
  const isWarn = pct > 32 && pct <= 38
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${
      isGood ? 'bg-emerald-50 text-emerald-600' : isWarn ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
    }`}>
      {isGood ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
      {pct.toFixed(1)}%
    </span>
  )
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<RecipeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('recipes')
        .select(`
          id, name, description, category_id, serving_size_grams, number_of_servings, 
          prep_time_minutes, total_cost_per_serving, food_cost_percentage, 
          selling_price, status, created_at, updated_at,
          category:recipe_categories(id, name)
        `)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
      setRecipes((data || []) as unknown as RecipeRow[])
      setLoading(false)
    }
    load()
  }, [])

  const categories = Array.from(
    new Set(recipes.map(r => r.category?.name).filter(Boolean))
  ) as string[]
  
  const filtered = recipes.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false
    if (catFilter && r.category?.name !== catFilter) return false
    return true
  })

  const recipesWithCost = recipes.filter(r => r.food_cost_percentage && r.food_cost_percentage > 0)
  const avgFoodCost = recipesWithCost.length > 0
    ? recipesWithCost.reduce((sum, r) => sum + (r.food_cost_percentage || 0), 0) / recipesWithCost.length
    : 0
  const highCostRecipes = recipes.filter(r => r.food_cost_percentage && r.food_cost_percentage > 35)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">Recepten</h1>
                <p className="text-stone-400 text-sm mt-0.5">{recipes.length} {recipes.length === 1 ? 'recept' : 'recepten'} · Componentniveau kostenberekening</p>
              </div>
            </div>
          </div>
          <Link href="/recipes/new" className="btn-primary shrink-0">
            <Plus className="w-4 h-4" /> Nieuw Recept
          </Link>
        </div>
      </div>

      {/* Stats */}
      {recipes.length > 0 && (
        <StaggerList className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StaggerItem><div className="card p-4">
            <div className="font-mono text-2xl font-bold text-stone-900">{recipes.length}</div>
            <div className="text-xs text-stone-400">Recepten</div>
          </div></StaggerItem>
          <StaggerItem><div className="card p-4">
            <div className="font-mono text-2xl font-bold text-stone-900">{categories.length}</div>
            <div className="text-xs text-stone-400">Categorieën</div>
          </div></StaggerItem>
          <StaggerItem><div className="card p-4">
            <div className={`font-mono text-2xl font-bold ${avgFoodCost <= 30 ? 'text-emerald-600' : avgFoodCost <= 35 ? 'text-amber-600' : 'text-red-600'}`}>
              {avgFoodCost > 0 ? `${avgFoodCost.toFixed(1)}%` : '\u2014'}
            </div>
            <div className="text-xs text-stone-400">Gem. food cost</div>
          </div></StaggerItem>
          <StaggerItem><div className="card p-4">
            <div className={`font-mono text-2xl font-bold ${highCostRecipes.length === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {highCostRecipes.length}
            </div>
            <div className="text-xs text-stone-400">Boven target</div>
          </div></StaggerItem>
        </StaggerList>
      )}

      {/* Smart tip */}
      {highCostRecipes.length > 0 && (
        <ChefTip
          tip={`${highCostRecipes.length} recept(en) boven 35% food cost: ${highCostRecipes.map(r => r.name).join(', ')}. Overweeg seizoensalternatieven of portieaanpassingen.`}
          variant="cost"
        />
      )}

      {/* Search & Filter */}
      {recipes.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Zoek recept..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setCatFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                !catFilter ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
              }`}
            >
              Alles
            </button>
            {categories.map(cat => {
              const color = categoryColors[cat] || 'bg-stone-50 text-stone-600'
              return (
                <button
                  key={cat}
                  onClick={() => setCatFilter(catFilter === cat ? null : cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    catFilter === cat ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Recipe Grid */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 space-y-3 animate-pulse">
              <div className="skeleton w-3/4 h-5 rounded" />
              <div className="skeleton w-full h-3 rounded" />
              <div className="skeleton w-1/2 h-3 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center animate-scale-in">
          <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ChefHat className="w-10 h-10 text-amber-300" />
          </div>
          <h3 className="font-display text-xl font-semibold text-stone-900 mb-2">
            {recipes.length > 0 ? 'Geen recepten gevonden' : 'Begin je receptenboek'}
          </h3>
          <p className="text-stone-400 text-sm max-w-[45ch] mx-auto mb-8 leading-relaxed">
            {recipes.length > 0
              ? 'Pas je zoekterm of filter aan.'
              : 'Voeg recepten toe met componentniveau kostenberekening. Prijzen worden automatisch bijgewerkt via factuurscans.'
            }
          </p>
          {recipes.length === 0 && (
            <Link href="/recipes/new" className="btn-primary">
              <Plus className="w-4 h-4" /> Eerste recept toevoegen
            </Link>
          )}
        </div>
      ) : (
        <StaggerList className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((recipe) => {
            const catName = recipe.category?.name || ''
            const catColor = categoryColors[catName] || 'bg-stone-50 text-stone-700'
            return (
              <StaggerItem key={recipe.id}>
              <Link
                href={`/recipes/${recipe.id}`}
                className="card-hover p-5 group flex flex-col h-full"
              >
                {/* Top */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {catName && (
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${catColor}`}>
                        {catName}
                      </span>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>

                {/* Name */}
                <h3 className="font-display font-semibold text-stone-900 group-hover:text-brand-700 transition-colors mb-1">
                  {recipe.name}
                </h3>

                {/* Description */}
                {recipe.description && (
                  <p className="text-sm text-stone-400 line-clamp-2 mb-3 leading-relaxed">{recipe.description}</p>
                )}

                {/* Meta */}
                <div className="mt-auto pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs text-stone-400">
                    {recipe.number_of_servings && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {recipe.number_of_servings}p
                      </span>
                    )}
                    {recipe.prep_time_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {recipe.prep_time_minutes}min
                      </span>
                    )}
                    {recipe.selling_price != null && Number(recipe.selling_price) > 0 && (
                      <span className="flex items-center gap-1">
                        <Euro className="w-3 h-3" /> &euro;{Number(recipe.selling_price).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <FoodCostBadge pct={recipe.food_cost_percentage ? Number(recipe.food_cost_percentage) : null} />
                </div>
              </Link>
              </StaggerItem>
            )
          })}
        </StaggerList>
      )}
    </div>
  )
}
