'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Recipe {
  id: string
  name: string
  description: string | null
  category_id: string | null
  subcategory_id: string | null
  status: string
  serving_size_grams: number | null
  prep_time_minutes: number | null
  dietary_flags: string[]
  season_tags: string[]
  is_signature: boolean
  created_at: string
  updated_at: string
  kitchen_id: string
  chef_id: string | null
}

interface UseRecipesReturn {
  recipes: Recipe[]
  loading: boolean
  error: string | null
  searchQuery: string
  setSearchQuery: (q: string) => void
  selectedCategory: string | null
  setSelectedCategory: (c: string | null) => void
  sortBy: string
  setSortBy: (s: string) => void
  refresh: () => Promise<void>
  deleteRecipe: (id: string) => Promise<{ success: boolean; error?: string }>
}

export function useRecipes(): UseRecipesReturn {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('newest')

  const supabase = createClient()

  const fetchRecipes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not authenticated'); return }

      // Get chef profile
      const { data: profile } = await supabase
        .from('chef_profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      let query = supabase.from('recipes').select('*')

      if (profile) {
        query = query.eq('chef_id', profile.id)
      }

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`)
      }
      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory)
      }

      switch (sortBy) {
        case 'oldest':
          query = query.order('created_at', { ascending: true })
          break
        case 'name':
          query = query.order('name', { ascending: true })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      const { data, error: fetchError } = await query
      if (fetchError) { setError(fetchError.message); return }
      setRecipes((data || []) as Recipe[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedCategory, sortBy])

  const deleteRecipe = useCallback(async (id: string) => {
    const { error: delError } = await supabase.from('recipes').delete().eq('id', id)
    if (delError) return { success: false, error: delError.message }
    setRecipes((prev) => prev.filter((r) => r.id !== id))
    return { success: true }
  }, [])

  useEffect(() => { fetchRecipes() }, [fetchRecipes])

  return {
    recipes, loading, error,
    searchQuery, setSearchQuery,
    selectedCategory, setSelectedCategory,
    sortBy, setSortBy,
    refresh: fetchRecipes,
    deleteRecipe,
  }
}
