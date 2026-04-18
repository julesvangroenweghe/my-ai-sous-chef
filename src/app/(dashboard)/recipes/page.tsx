'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { RecipeCard } from '@/components/recipes/recipe-card'
import { CategoryFilter } from '@/components/recipes/category-filter'
import { cn } from '@/lib/utils'
import type { Recipe, RecipeCategory } from '@/types/database'

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [categories, setCategories] = useState<RecipeCategory[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSub, setSelectedSub] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'cost' | 'date'>('date')
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [recipesRes, categoriesRes] = await Promise.all([
        supabase
          .from('recipes')
          .select(`
            *,
            category:recipe_categories(id, name),
            subcategory:recipe_subcategories(id, name),
            components:recipe_components(
              id, name, sort_order,
              ingredients:recipe_component_ingredients(
                id, quantity, unit, cost_per_unit,
                ingredient:ingredients(id, name, unit, current_price)
              )
            )
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('recipe_categories')
          .select('*, subcategories:recipe_subcategories(*)')
          .order('sort_order'),
      ])
      if (recipesRes.data) setRecipes(recipesRes.data as unknown as Recipe[])
      if (categoriesRes.data) setCategories(categoriesRes.data as unknown as RecipeCategory[])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    let result = recipes.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.description || '').toLowerCase().includes(search.toLowerCase())
      const matchesCategory = !selectedCategory || r.category_id === selectedCategory
      const matchesSub = !selectedSub || r.subcategory_id === selectedSub
      return matchesSearch && matchesCategory && matchesSub
    })

    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'cost') return (b.food_cost_percentage || 0) - (a.food_cost_percentage || 0)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return result
  }, [recipes, search, selectedCategory, selectedSub, sortBy])

  // Count recipes per category
  const recipeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: recipes.length }
    for (const r of recipes) {
      if (r.category_id) {
        counts[r.category_id] = (counts[r.category_id] || 0) + 1
      }
    }
    return counts
  }, [recipes])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recipes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} in your kitchen
          </p>
        </div>
        <Link href="/recipes/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Add Recipe
          </Button>
        </Link>
      </div>

      {/* Search + Sort + Filter toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'cost' | 'date')}
          className="w-40"
        >
          <option value="date">Newest first</option>
          <option value="name">Name A-Z</option>
          <option value="cost">Highest cost %</option>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn('gap-1.5 md:hidden', showFilters && 'bg-primary/10 text-primary')}
        >
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar filter — desktop */}
        <div className={cn(
          'w-56 shrink-0 hidden md:block',
          showFilters && '!block'
        )}>
          <div className="sticky top-20">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Categories</h3>
            <CategoryFilter
              categories={categories}
              selected={selectedCategory}
              selectedSub={selectedSub}
              onSelect={(catId, subId) => {
                setSelectedCategory(catId)
                setSelectedSub(subId || null)
              }}
              recipeCounts={recipeCounts}
            />
          </div>
        </div>

        {/* Recipe grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-52 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">
                {search || selectedCategory
                  ? 'No recipes match your filters.'
                  : 'No recipes yet. Create your first recipe!'}
              </p>
              {!search && !selectedCategory && (
                <Link href="/recipes/new">
                  <Button className="mt-4 gap-2">
                    <Plus className="h-4 w-4" /> Create Recipe
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
