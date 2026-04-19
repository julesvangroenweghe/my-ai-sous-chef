'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, BookOpen, Clock, Euro, Filter, ArrowUpDown, ChefHat } from 'lucide-react'
import { useRecipes } from '@/hooks/use-recipes'
import { formatCurrency } from '@/lib/utils'
import type { Recipe } from '@/types/database'

function RecipeSkeleton() {
  return (
    <div className="card p-6 space-y-4">
      <div className="skeleton w-full h-32 rounded-xl" />
      <div className="skeleton w-3/4 h-5 rounded" />
      <div className="skeleton w-1/2 h-4 rounded" />
      <div className="flex gap-2">
        <div className="skeleton w-16 h-6 rounded-full" />
        <div className="skeleton w-20 h-6 rounded-full" />
      </div>
    </div>
  )
}

function EmptyRecipes() {
  return (
    <div className="card p-12 text-center animate-scale-in">
      <div className="w-16 h-16 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <BookOpen className="w-8 h-8 text-brand-400" />
      </div>
      <h3 className="font-display text-xl font-semibold text-stone-900 mb-2">
        Your recipe book is empty
      </h3>
      <p className="text-stone-500 text-sm max-w-[40ch] mx-auto mb-8 leading-relaxed">
        Start building your collection. Add your first recipe and we will calculate costs, scale portions, and organize everything for you.
      </p>
      <Link href="/recipes/new" className="btn-primary">
        <Plus className="w-4 h-4" />
        Create Your First Recipe
      </Link>
    </div>
  )
}

function RecipeCard({ recipe, index }: { recipe: Recipe; index: number }) {
  const categoryColors: Record<string, string> = {
    'appetizer': 'bg-emerald-50 text-emerald-700',
    'main': 'bg-brand-50 text-brand-700',
    'dessert': 'bg-rose-50 text-rose-700',
    'amuse': 'bg-violet-50 text-violet-700',
    'side': 'bg-sky-50 text-sky-700',
  }

  const servings = (recipe as any).serving_size_grams || (recipe as any).servings

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="card-hover p-6 group animate-slide-up opacity-0"
      style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'forwards' }}
    >
      {/* Color bar top */}
      <div className="w-full h-1 bg-gradient-to-r from-brand-400 to-brand-600 rounded-full mb-5 opacity-60 group-hover:opacity-100 transition-opacity" />
      
      <h3 className="font-display font-semibold text-stone-900 group-hover:text-brand-700 transition-colors mb-2 line-clamp-1">
        {recipe.name}
      </h3>
      
      {recipe.description && (
        <p className="text-sm text-stone-500 mb-4 line-clamp-2 leading-relaxed">
          {recipe.description}
        </p>
      )}

      <div className="flex items-center flex-wrap gap-2 mb-4">
        {recipe.category && (
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${categoryColors[(recipe.category as any).name?.toLowerCase()] || 'bg-stone-100 text-stone-600'}`}>
            {(recipe.category as any).name || recipe.category}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-stone-400">
        {recipe.prep_time_minutes && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{recipe.prep_time_minutes} min</span>
          </div>
        )}
        {servings && (
          <div className="flex items-center gap-1.5">
            <ChefHat className="w-3.5 h-3.5" />
            <span>{servings} servings</span>
          </div>
        )}
        {recipe.total_cost_per_serving && (
          <div className="flex items-center gap-1.5">
            <Euro className="w-3.5 h-3.5" />
            <span className="font-mono tabular-nums">{formatCurrency(Number(recipe.total_cost_per_serving))}</span>
          </div>
        )}
        {recipe.food_cost_percentage && Number(recipe.food_cost_percentage) > 0 && (
          <div className="flex items-center gap-1.5">
            <span className={`font-mono tabular-nums font-medium ${
              Number(recipe.food_cost_percentage) < 30 ? 'text-green-600' :
              Number(recipe.food_cost_percentage) <= 35 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {Number(recipe.food_cost_percentage).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}

export default function RecipesPage() {
  const { recipes, loading } = useRecipes()
  const [search, setSearch] = useState('')

  const activeRecipes = recipes.filter(r => r.status !== 'archived')
  const filtered = activeRecipes.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">Recipes</h1>
          <p className="text-stone-500 mt-1">
            {activeRecipes.length > 0 
              ? `${activeRecipes.length} recipe${activeRecipes.length !== 1 ? 's' : ''} in your kitchen`
              : 'Manage your recipe collection'
            }
          </p>
        </div>
        <Link href="/recipes/new" className="btn-primary shrink-0">
          <Plus className="w-4 h-4" />
          Add Recipe
        </Link>
      </div>

      {/* Search & Filters */}
      {activeRecipes.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-premium pl-11"
            />
          </div>
          <button className="btn-secondary">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="btn-secondary">
            <ArrowUpDown className="w-4 h-4" />
            Sort
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <RecipeSkeleton key={i} />)}
        </div>
      ) : activeRecipes.length === 0 ? (
        <EmptyRecipes />
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <Search className="w-8 h-8 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500">No recipes match &quot;{search}&quot;</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((recipe, i) => (
            <RecipeCard key={recipe.id} recipe={recipe} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
