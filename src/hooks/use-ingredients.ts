'use client'

import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Ingredient, IngredientPrice } from '@/types/database'

export function useIngredients() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getIngredients = useCallback(async (search?: string) => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase.from('ingredients').select('*').order('name')
      if (search) {
        query = query.ilike('name', `%${search}%`)
      }
      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError
      return (data || []) as Ingredient[]
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch ingredients'
      setError(msg)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const createIngredient = useCallback(async (ingredient: {
    name: string
    category?: string
    unit?: string
    current_price?: number
    supplier?: string
  }) => {
    setLoading(true)
    setError(null)
    try {
      // Get kitchen_id
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

      const { data, error: insertError } = await supabase
        .from('ingredients')
        .insert({
          name: ingredient.name,
          category: ingredient.category || null,
          unit: ingredient.unit || null,
          current_price: ingredient.current_price || null,
          supplier: ingredient.supplier || null,
          kitchen_id: membership?.kitchen_id || null,
          last_updated: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Also record price history if price given
      if (ingredient.current_price && data) {
        await supabase.from('ingredient_prices').insert({
          ingredient_id: data.id,
          price: ingredient.current_price,
          source: 'manual',
          recorded_at: new Date().toISOString(),
        })
      }

      return { success: true, data: data as Ingredient }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create ingredient'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [])

  const updateIngredient = useCallback(async (id: string, updates: Partial<Ingredient>) => {
    try {
      const { error: updateError } = await supabase
        .from('ingredients')
        .update({ ...updates, last_updated: new Date().toISOString() })
        .eq('id', id)
      if (updateError) throw updateError

      // Record price history if price changed
      if (updates.current_price) {
        await supabase.from('ingredient_prices').insert({
          ingredient_id: id,
          price: updates.current_price,
          source: 'manual',
          recorded_at: new Date().toISOString(),
        })
      }

      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update ingredient'
      return { success: false, error: msg }
    }
  }, [])

  const getPriceHistory = useCallback(async (ingredientId: string, limit = 5) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('ingredient_prices')
        .select('*')
        .eq('ingredient_id', ingredientId)
        .order('recorded_at', { ascending: false })
        .limit(limit)
      if (fetchError) throw fetchError
      return (data || []) as IngredientPrice[]
    } catch {
      return []
    }
  }, [])

  return {
    loading,
    error,
    getIngredients,
    createIngredient,
    updateIngredient,
    getPriceHistory,
  }
}
