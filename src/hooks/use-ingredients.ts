'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Ingredient {
  id: string
  name: string
  category: string | null
  unit_of_purchase: string | null
  default_unit_price: number | null
  supplier_name: string | null
  last_price_update: string | null
  created_at: string
  updated_at: string
}

export function useIngredients() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const supabase = createClient()

  const fetchIngredients = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase.from('ingredients').select('*').order('name')

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`)
      }
      if (selectedCategory) {
        query = query.eq('category', selectedCategory)
      }

      const { data, error: fetchError } = await query
      if (fetchError) { setError(fetchError.message); return }
      setIngredients((data || []) as Ingredient[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedCategory])

  const deleteIngredient = useCallback(async (id: string) => {
    const { error: delError } = await supabase.from('ingredients').delete().eq('id', id)
    if (delError) return { success: false, error: delError.message }
    setIngredients((prev) => prev.filter((i) => i.id !== id))
    return { success: true }
  }, [])

  useEffect(() => { fetchIngredients() }, [fetchIngredients])

  return {
    ingredients, loading, error,
    searchQuery, setSearchQuery,
    selectedCategory, setSelectedCategory,
    refresh: fetchIngredients,
    deleteIngredient,
  }
}
