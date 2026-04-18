'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, GripVertical, Search, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { COURSE_CATEGORIES } from '@/types/mep'
import type { MenuItemFormData } from '@/types/mep'
import type { Recipe } from '@/types/database'

interface MenuBuilderProps {
  menuItems: MenuItemFormData[]
  onChange: (items: MenuItemFormData[]) => void
}

export function MenuBuilder({ menuItems, onChange }: MenuBuilderProps) {
  const supabase = createClient()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [search, setSearch] = useState('')
  const [loadingRecipes, setLoadingRecipes] = useState(true)

  useEffect(() => {
    async function loadRecipes() {
      const { data } = await supabase
        .from('recipes')
        .select(`
          *,
          category:recipe_categories(id, name),
          components:recipe_components(
            id, name, sort_order,
            ingredients:recipe_component_ingredients(
              id, quantity, unit, cost_per_unit,
              ingredient:ingredients(id, name, unit, current_price, category)
            )
          )
        `)
        .eq('is_active', true)
        .order('name')
      if (data) setRecipes(data as unknown as Recipe[])
      setLoadingRecipes(false)
    }
    loadRecipes()
  }, [])

  const filteredRecipes = search
    ? recipes.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.category?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : recipes

  const addRecipe = (recipe: Recipe) => {
    const newItem: MenuItemFormData = {
      recipe_id: recipe.id,
      course_category: recipe.category?.name || 'Main Course',
      sort_order: menuItems.length + 1,
    }
    onChange([...menuItems, newItem])
  }

  const removeItem = (index: number) => {
    const updated = menuItems.filter((_, i) => i !== index)
    // Reorder
    onChange(updated.map((item, i) => ({ ...item, sort_order: i + 1 })))
  }

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= menuItems.length) return
    const updated = [...menuItems]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    onChange(updated.map((item, i) => ({ ...item, sort_order: i + 1 })))
  }

  const updateCategory = (index: number, category: string) => {
    const updated = [...menuItems]
    updated[index] = { ...updated[index], course_category: category }
    onChange(updated)
  }

  const getRecipeName = (recipeId: string) => {
    return recipes.find((r) => r.id === recipeId)?.name || 'Unknown recipe'
  }

  const getRecipeCost = (recipeId: string) => {
    return recipes.find((r) => r.id === recipeId)?.total_cost_per_serving || 0
  }

  const totalCostPerPerson = menuItems.reduce(
    (sum, item) => sum + getRecipeCost(item.recipe_id),
    0
  )

  // Group items by course category for display
  const groupedItems = menuItems.reduce<Record<string, { item: MenuItemFormData; globalIndex: number }[]>>(
    (groups, item, index) => {
      const cat = item.course_category
      if (!groups[cat]) groups[cat] = []
      groups[cat].push({ item, globalIndex: index })
      return groups
    },
    {}
  )

  const isAlreadyAdded = (recipeId: string) => menuItems.some((m) => m.recipe_id === recipeId)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Recipe search panel */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add Recipes</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipes..."
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="max-h-[500px] overflow-y-auto space-y-1">
          {loadingRecipes ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredRecipes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {search ? 'No recipes found' : 'No recipes available'}
            </p>
          ) : (
            filteredRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${
                  isAlreadyAdded(recipe.id)
                    ? 'bg-primary/5 border-primary/20 opacity-60'
                    : 'hover:bg-muted/50 border-transparent'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{recipe.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    {recipe.category?.name && <span>{recipe.category.name}</span>}
                    {recipe.total_cost_per_serving != null && (
                      <span>{formatCurrency(recipe.total_cost_per_serving)}/pp</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isAlreadyAdded(recipe.id)}
                  onClick={() => addRecipe(recipe)}
                  className="shrink-0 h-7 w-7 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Menu items panel */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Menu
              {menuItems.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({menuItems.length} dishes)
                </span>
              )}
            </CardTitle>
            {totalCostPerPerson > 0 && (
              <Badge variant="outline" className="text-sm gap-1">
                Est. cost: {formatCurrency(totalCostPerPerson)}/pp
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {menuItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No dishes added yet.</p>
              <p className="text-xs mt-1">Search and add recipes from the left panel.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {items.map(({ item, globalIndex }) => (
                      <div
                        key={globalIndex}
                        className="flex items-center gap-2 p-2.5 rounded-lg border bg-card"
                      >
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            onClick={() => moveItem(globalIndex, 'up')}
                            disabled={globalIndex === 0}
                            className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => moveItem(globalIndex, 'down')}
                            disabled={globalIndex === menuItems.length - 1}
                            className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>

                        <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />

                        <div className="bg-muted rounded px-2 py-1 text-xs font-medium shrink-0">
                          #{item.sort_order}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {getRecipeName(item.recipe_id)}
                          </div>
                          {getRecipeCost(item.recipe_id) > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(getRecipeCost(item.recipe_id))}/pp
                            </div>
                          )}
                        </div>

                        <Select
                          value={item.course_category}
                          onChange={(e) => updateCategory(globalIndex, e.target.value)}
                          className="w-36 text-xs"
                        >
                          {COURSE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => removeItem(globalIndex)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
