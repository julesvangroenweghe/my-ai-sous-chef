'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, Search, LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RecipeCard } from '@/components/recipes/recipe-card'
import { CategoryFilter } from '@/components/recipes/category-filter'
import type { Recipe, RecipeCategory } from '@/types/database'

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [categories, setCategories] = useState<RecipeCategory[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [recipesRes, categoriesRes] = await Promise.all([
        supabase
          .from('recipes')
          .select('*, category:recipe_categories(*), subcategory:recipe_subcategories(*), components:recipe_components(count)')
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

  const filtered = recipes.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !selectedCategory || r.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recipes</h1>
          <p className="text-muted-foreground text-sm mt-1">{recipes.length} recipes in your kitchen</p>
        </div>
        <Link href="/recipes/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Add Recipe
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <CategoryFilter
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
        <div className="flex border rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-muted' : ''}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-muted' : ''}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No recipes found. Create your first recipe!</p>
          <Link href="/recipes/new">
            <Button className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> Create Recipe
            </Button>
          </Link>
        </div>
      ) : (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'space-y-3'
        }>
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} viewMode={viewMode} />
          ))}
        </div>
      )}
    </div>
  )
}
