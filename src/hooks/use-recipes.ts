'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Recipe } from '@/types/database'

interface CreateRecipeData {
 name: string
 description?: string
 category_id?: string
 subcategory_id?: string
 servings?: number
 prep_time_minutes?: number
 selling_price?: number
 notes?: string
 components?: {
   name: string
   notes?: string
   ingredients?: {
     ingredient_id: string
     quantity: number
     unit: string
     notes?: string
     cost_per_unit?: number
   }[]
 }[]
}

export function useRecipes() {
 const [recipes, setRecipes] = useState<Recipe[]>([])
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState<string | null>(null)

 const supabase = createClient()

 const getKitchenId = async (): Promise<string | null> => {
   const { data: { user } } = await supabase.auth.getUser()
   if (!user) return null
   const { data: profile } = await supabase
     .from('chef_profiles')
     .select('id')
     .eq('auth_user_id', user.id)
     .single()
   if (!profile) return null
   const { data: membership } = await supabase
     .from('kitchen_members')
     .select('kitchen_id')
     .eq('chef_id', profile.id)
     .limit(1)
     .single()
   return membership?.kitchen_id || null
 }

 const getChefId = async (): Promise<string | null> => {
   const { data: { user } } = await supabase.auth.getUser()
   if (!user) return null
   const { data: profile } = await supabase
     .from('chef_profiles')
     .select('id')
     .eq('auth_user_id', user.id)
     .single()
   return profile?.id || null
 }

 const fetchRecipes = useCallback(async () => {
   try {
     setLoading(true)
     setError(null)

     const { data, error: fetchError } = await supabase
       .from('recipes')
       .select(`
         *,
         category:recipe_categories(id, name),
         subcategory:recipe_subcategories(id, name)
       `)
       .order('created_at', { ascending: false })

     if (fetchError) { setError(fetchError.message); return }
     setRecipes((data || []) as unknown as Recipe[])
   } catch (err) {
     setError(err instanceof Error ? err.message : 'Unknown error')
   } finally {
     setLoading(false)
   }
 }, [])

 const getRecipe = useCallback(async (id: string): Promise<Recipe | null> => {
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

     if (fetchError) return null
     return data as unknown as Recipe
   } catch {
     return null
   }
 }, [])

 const createRecipe = useCallback(async (recipeData: CreateRecipeData) => {
   setLoading(true)
   setError(null)
   try {
     const kitchenId = await getKitchenId()
     const chefId = await getChefId()
     if (!kitchenId) throw new Error('No kitchen found. Please complete onboarding.')

     // 1. Insert recipe
     const { data: recipe, error: recipeError } = await supabase
       .from('recipes')
       .insert({
         kitchen_id: kitchenId,
         chef_id: chefId,
         name: recipeData.name,
         description: recipeData.description || null,
         category_id: recipeData.category_id || null,
         subcategory_id: recipeData.subcategory_id || null,
         number_of_servings: recipeData.servings || null,
         prep_time_minutes: recipeData.prep_time_minutes || null,
         selling_price: recipeData.selling_price || null,
         notes: recipeData.notes || null,
         status: 'active',
       })
       .select()
       .single()

     if (recipeError) throw recipeError

     // 2. Insert components with ingredients
     if (recipeData.components && recipeData.components.length > 0) {
       for (let i = 0; i < recipeData.components.length; i++) {
         const comp = recipeData.components[i]
         if (!comp.name.trim()) continue

         const { data: component, error: compError } = await supabase
           .from('recipe_components')
           .insert({
             recipe_id: recipe.id,
             name: comp.name,
             notes: comp.notes || null,
             sort_order: i,
           })
           .select()
           .single()

         if (compError) throw compError

         // 3. Insert ingredients for this component
         if (comp.ingredients && comp.ingredients.length > 0) {
           const ingRows = comp.ingredients
             .filter((ing) => ing.ingredient_id)
             .map((ing) => ({
               component_id: component.id,
               ingredient_id: ing.ingredient_id,
               quantity: ing.quantity,
               quantity_per_person: ing.quantity,
               unit: ing.unit,
               notes: ing.notes || null,
               cost_per_unit: ing.cost_per_unit || null,
             }))

           if (ingRows.length > 0) {
             const { error: ingError } = await supabase
               .from('recipe_component_ingredients')
               .insert(ingRows)
             if (ingError) throw ingError
           }
         }
       }
     }

     // 4. Calculate costs
     await recalculateCosts(recipe.id)

     return { success: true, id: recipe.id }
   } catch (err) {
     const msg = err instanceof Error ? err.message : 'Failed to create recipe'
     setError(msg)
     return { success: false, error: msg }
   } finally {
     setLoading(false)
   }
 }, [])

 const updateRecipe = useCallback(async (id: string, recipeData: CreateRecipeData) => {
   setLoading(true)
   setError(null)
   try {
     // 1. Update recipe fields
     const { error: updateError } = await supabase
       .from('recipes')
       .update({
         name: recipeData.name,
         description: recipeData.description || null,
         category_id: recipeData.category_id || null,
         subcategory_id: recipeData.subcategory_id || null,
         number_of_servings: recipeData.servings || null,
         prep_time_minutes: recipeData.prep_time_minutes || null,
         selling_price: recipeData.selling_price || null,
         notes: recipeData.notes || null,
         updated_at: new Date().toISOString(),
       })
       .eq('id', id)

     if (updateError) throw updateError

     // 2. Delete old components (cascades to component_ingredients)
     const { data: oldComps } = await supabase
       .from('recipe_components')
       .select('id')
       .eq('recipe_id', id)

     if (oldComps && oldComps.length > 0) {
       for (const comp of oldComps) {
         await supabase.from('recipe_component_ingredients').delete().eq('component_id', comp.id)
       }
       await supabase.from('recipe_components').delete().eq('recipe_id', id)
     }

     // 3. Insert new components
     if (recipeData.components && recipeData.components.length > 0) {
       for (let i = 0; i < recipeData.components.length; i++) {
         const comp = recipeData.components[i]
         if (!comp.name.trim()) continue

         const { data: component, error: compError } = await supabase
           .from('recipe_components')
           .insert({
             recipe_id: id,
             name: comp.name,
             notes: comp.notes || null,
             sort_order: i,
           })
           .select()
           .single()

         if (compError) throw compError

         if (comp.ingredients && comp.ingredients.length > 0) {
           const ingRows = comp.ingredients
             .filter((ing) => ing.ingredient_id)
             .map((ing) => ({
               component_id: component.id,
               ingredient_id: ing.ingredient_id,
               quantity: ing.quantity,
               quantity_per_person: ing.quantity,
               unit: ing.unit,
               notes: ing.notes || null,
               cost_per_unit: ing.cost_per_unit || null,
             }))

           if (ingRows.length > 0) {
             const { error: ingError } = await supabase
               .from('recipe_component_ingredients')
               .insert(ingRows)
             if (ingError) throw ingError
           }
         }
       }
     }

     // 4. Recalculate costs
     await recalculateCosts(id)

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
     // Soft delete by archiving
     const { error: delError } = await supabase
       .from('recipes')
       .update({ status: 'archived', updated_at: new Date().toISOString() })
       .eq('id', id)
     if (delError) return { success: false, error: delError.message }
     setRecipes((prev) => prev.filter((r) => r.id !== id))
     return { success: true }
   } catch (err) {
     return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
   }
 }, [])

 const recalculateCosts = useCallback(async (id: string) => {
   try {
     // Fetch all component ingredients with unit info for correct cost calculation
     const { data: recipe } = await supabase
       .from('recipes')
       .select(`
         serving_size_grams,
         number_of_servings,
         selling_price,
         components:recipe_components(
           ingredients:recipe_component_ingredients(
             quantity,
             unit,
             cost_per_unit,
             ingredient:ingredients(current_price, default_unit_price, unit, weight_per_piece_g)
           )
         )
       `)
       .eq('id', id)
       .single()

     if (!recipe) return { success: false, error: 'Recipe not found' }

     let totalCost = 0
     for (const comp of (recipe.components || [])) {
       for (const ing of (comp.ingredients || [])) {
         const price = (ing as any).cost_per_unit || (ing as any).ingredient?.current_price || (ing as any).ingredient?.default_unit_price || 0
         const recipeUnit = (ing as any).unit || 'g'
         const qty = (ing as any).quantity || 0
         const ingredientUnit = (ing as any).ingredient?.unit || undefined
         const weightPerPiece = (ing as any).ingredient?.weight_per_piece_g || undefined
         // Unit-aware cost: handles kg, l, AND stuks correctly
         totalCost += calculateIngredientCost(qty, recipeUnit, price, ingredientUnit, weightPerPiece)
       }
     }

     // quantity is per-person, so totalCost is already cost per serving
     const costPerServing = totalCost
     const sellingPrice = recipe.selling_price || 0
     const foodCostPct = sellingPrice > 0 ? (costPerServing / sellingPrice) * 100 : 0

     await supabase
       .from('recipes')
       .update({
         total_cost_per_serving: costPerServing,
         food_cost_percentage: foodCostPct,
         updated_at: new Date().toISOString(),
       })
       .eq('id', id)

     return { success: true, foodCostPct }
   } catch (err) {
     return { success: false, error: err instanceof Error ? err.message : 'Calculation error' }
   }
 }, [])

 useEffect(() => { fetchRecipes() }, [fetchRecipes])

 return {
   recipes,
   loading,
   error,
   refresh: fetchRecipes,
   getRecipe,
   createRecipe,
   updateRecipe,
   deleteRecipe,
   recalculateCosts,
 }
}

function calculateIngredientCost(
 qty: number,
 recipeUnit: string,
 pricePerUnit: number,
 ingredientUnit?: string,
 weightPerPiece?: number
): number {
 if (!qty || !pricePerUnit) return 0

 const ru = recipeUnit.toLowerCase()
 const iu = (ingredientUnit || '').toLowerCase()

 // If recipe uses grams but price is per kg
 if ((ru === 'g' || ru === 'gram') && (iu === 'kg' || iu === 'kilogram')) {
   return (qty / 1000) * pricePerUnit
 }
 // If recipe uses ml but price is per liter
 if ((ru === 'ml' || ru === 'milliliter') && (iu === 'l' || iu === 'liter')) {
   return (qty / 1000) * pricePerUnit
 }
 // If recipe uses stuks and we know weight per piece
 if ((ru === 'stuk' || ru === 'stuks' || ru === 'st') && weightPerPiece) {
   return qty * weightPerPiece * pricePerUnit / 1000
 }

 return qty * pricePerUnit
}
