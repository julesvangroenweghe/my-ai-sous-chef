'use client'

import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Recipe } from '@/types/database'

interface RecipeFilters {
  search?: string
  category_id?: string | null
  subcategory_id?: string | null
  sort?: 'name' | 'cost' | 'date'
  sort_dir?: 'asc' | 'desc'
}

export function useRecipes() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getRecipes = useCallback(async (filters?: RecipeFilters) => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('recipes')
        .select(`
          *,
          category:recipe_categories(id, name),
          subcategory:recipe_subcategories(id, name),
          components:recipe_components(
            id,
            name,
            sort_order,
            ingredients:recipe_component_ingredients(
              id,
              quantity,
              unit,
              cost_per_unit,
              ingredient:ingredients(id, name, unit, current_price)
            )
          )
        `)
        .eq('is_active', true)

      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id)
      }
      if (filters?.subcategory_id) {
        query = query.eq('subcategory_id', filters.subcategory_id)
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`)
      }

      const sortCol = filters?.sort === 'name' ? 'name'
        : filters?.sort === 'cost' ? 'total_cost_per_serving'
        : 'created_at'
      const ascending = filters?.sort === 'name' ? true : (filters?.sort_dir === 'asc')
      query = query.order(sortCol, { ascending })

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError
      return (data || []) as unknown as Recipe[]
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch recipes'
      setError(msg)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const getRecipe = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('recipes')
        .select(`
          *,
          category:recipe_categories(id, name),
          subcategory:recipe_subcategories(id, name),
          components:recipe_components(
            *,
            ingredients:recipe_component_ingredients(
              *,
              ingredient:ingredients(*)
            )
          )
        `)
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      return data as unknown as Recipe
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch recipe'
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createRecipe = useCallback(async (recipeData: {
    name: string
    description?: string
    category_id?: string
    subcategory_id?: string
    servings?: number
    prep_time_minutes?: number
    selling_price?: number
    notes?: string
    components: Array<{
      name: string
      notes?: string
      ingredients: Array<{
        ingredient_id: string
        quantity: number
        unit: string
        notes?: string
        cost_per_unit?: number
      }>
    }>
  }) => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: chef } = await supabase
        .from('chef_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      const { data: membership } = await supabase
        .from('kitchen_members')
        .select('kitchen_id')
        .eq('chef_id', chef?.id)
        .limit(1)
        .single()

      // Calculate costs
      let totalCost = 0
      for (const comp of recipeData.components) {
        for (const ing of comp.ingredients) {
          totalCost += (ing.cost_per_unit || 0) * ing.quantity
        }
      }
      const servings = recipeData.servings || 1
      const costPerServing = totalCost / servings
      const sellingPrice = recipeData.selling_price || 0
      const foodCostPct = sellingPrice > 0 ? (costPerServing / sellingPrice) * 100 : 0

      const { data: recipe, error: insertError } = await supabase
        .from('recipes')
        .insert({
          name: recipeData.name,
          description: recipeData.description || null,
          category_id: recipeData.category_id || null,
          subcategory_id: recipeData.subcategory_id || null,
          servings: recipeData.servings || null,
          prep_time_minutes: recipeData.prep_time_minutes || null,
          selling_price: recipeData.selling_price || null,
          notes: recipeData.notes || null,
          total_cost_per_serving: Number(costPerServing.toFixed(4)),
          food_cost_percentage: Number(foodCostPct.toFixed(2)),
          is_active: true,
          kitchen_id: membership?.kitchen_id,
          chef_id: chef?.id,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Insert components + ingredients
      for (let i = 0; i < recipeData.components.length; i++) {
        const comp = recipeData.components[i]
        if (!comp.name) continue

        const { data: component } = await supabase
          .from('recipe_components')
          .insert({
            recipe_id: recipe.id,
            name: comp.name,
            sort_order: i,
            notes: comp.notes || null,
          })
          .select()
          .single()

        if (component && comp.ingredients.length > 0) {
          await supabase.from('recipe_component_ingredients').insert(
            comp.ingredients.map((ing) => ({
              component_id: component.id,
              ingredient_id: ing.ingredient_id,
              quantity: ing.quantity,
              unit: ing.unit,
              notes: ing.notes || null,
              cost_per_unit: ing.cost_per_unit || null,
            }))
          )
        }
      }

      return { success: true, id: recipe.id }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create recipe'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [])

  const updateRecipe = useCallback(async (id: string, recipeData: {
    name: string
    description?: string
    category_id?: string
    subcategory_id?: string
    servings?: number
    prep_time_minutes?: number
    selling_price?: number
    notes?: string
    components: Array<{
      id?: string
      name: string
      notes?: string
      ingredients: Array<{
        id?: string
        ingredient_id: string
        quantity: number
        unit: string
        notes?: string
        cost_per_unit?: number
      }>
    }>
  }) => {
    setLoading(true)
    setError(null)
    try {
      // Calculate costs
      let totalCost = 0
      for (const comp of recipeData.components) {
        for (const ing of comp.ingredients) {
          totalCost += (ing.cost_per_unit || 0) * ing.quantity
        }
      }
      const servings = recipeData.servings || 1
      const costPerServing = totalCost / servings
      const sellingPrice = recipeData.selling_price || 0
      const foodCostPct = sellingPrice > 0 ? (costPerServing / sellingPrice) * 100 : 0

      const { error: updateError } = await supabase
        .from('recipes')
        .update({
          name: recipeData.name,
          description: recipeData.description || null,
          category_id: recipeData.category_id || null,
          subcategory_id: recipeData.subcategory_id || null,
          servings: recipeData.servings || null,
          prep_time_minutes: recipeData.prep_time_minutes || null,
          selling_price: recipeData.selling_price || null,
          notes: recipeData.notes || null,
          total_cost_per_serving: Number(costPerServing.toFixed(4)),
          food_cost_percentage: Number(foodCostPct.toFixed(2)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateError) throw updateError

      // Delete old components (cascade deletes ingredients)
      await supabase.from('recipe_components').delete().eq('recipe_id', id)

      // Re-insert components + ingredients
      for (let i = 0; i < recipeData.components.length; i++) {
        const comp = recipeData.components[i]
        if (!comp.name) continue

        const { data: component } = await supabase
          .from('recipe_components')
          .insert({
            recipe_id: id,
            name: comp.name,
            sort_order: i,
            notes: comp.notes || null,
          })
          .select()
          .single()

        if (component && comp.ingredients.length > 0) {
          await supabase.from('recipe_component_ingredients').insert(
            comp.ingredients.map((ing) => ({
              component_id: component.id,
              ingredient_id: ing.ingredient_id,
              quantity: ing.quantity,
              unit: ing.unit,
              notes: ing.notes || null,
              cost_per_unit: ing.cost_per_unit || null,
            }))
          )
        }
      }

      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update recipe'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteRecipe = useCallback(async (id: string) => {
    try {
      const { error: delError } = await supabase
        .from('recipes')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (delError) throw delError
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete recipe'
      return { success: false, error: msg }
    }
  }, [])

  const recalculateCosts = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      // Fetch recipe with latest ingredient prices
      const { data: recipe, error: fetchError } = await supabase
        .from('recipes')
        .select(`
          *,
          components:recipe_components(
            *,
            ingredients:recipe_component_ingredients(
              *,
              ingredient:ingredients(id, current_price)
            )
          )
        `)
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      let totalCost = 0
      const components = (recipe as any).components || []

      for (const comp of components) {
        for (const ci of comp.ingredients || []) {
          const latestPrice = ci.ingredient?.current_price || 0
          totalCost += latestPrice * ci.quantity

          // Update cost snapshot
          await supabase
            .from('recipe_component_ingredients')
            .update({ cost_per_unit: latestPrice })
            .eq('id', ci.id)
        }
      }

      const servings = recipe.servings || 1
      const costPerServing = totalCost / servings
      const sellingPrice = recipe.selling_price || 0
      const foodCostPct = sellingPrice > 0 ? (costPerServing / sellingPrice) * 100 : 0

      await supabase
        .from('recipes')
        .update({
          total_cost_per_serving: Number(costPerServing.toFixed(4)),
          food_cost_percentage: Number(foodCostPct.toFixed(2)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      return { success: true, costPerServing, foodCostPct }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to recalculate'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getRecipes,
    getRecipe,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    recalculateCosts,
  }
}
