'use client'

import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { JulesSuggestion, ChefMemory } from '@/types/database'

interface SuggestionFilters {
  type?: string
  priority?: string
  status?: string
}

export function useJules() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getChefId = useCallback(async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: chef } = await supabase
      .from('chef_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
    return chef?.id || null
  }, [])

  const getSuggestions = useCallback(async (filters?: SuggestionFilters): Promise<JulesSuggestion[]> => {
    setLoading(true)
    setError(null)
    try {
      const chefId = await getChefId()
      if (!chefId) return []

      let query = supabase
        .from('jules_suggestions')
        .select('*')
        .eq('chef_id', chefId)
        .in('status', ['pending', 'seen'])
        .order('created_at', { ascending: false })

      if (filters?.type) query = query.eq('suggestion_type', filters.type)
      if (filters?.priority) query = query.eq('priority', filters.priority)

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError
      return (data || []) as JulesSuggestion[]
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch suggestions'
      setError(msg)
      return []
    } finally {
      setLoading(false)
    }
  }, [getChefId])

  const dismissSuggestion = useCallback(async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('jules_suggestions')
        .update({ status: 'dismissed', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (updateError) throw updateError
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to dismiss suggestion'
      setError(msg)
      return { success: false, error: msg }
    }
  }, [])

  const applySuggestion = useCallback(async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('jules_suggestions')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (updateError) throw updateError
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to apply suggestion'
      setError(msg)
      return { success: false, error: msg }
    }
  }, [])

  const getMemory = useCallback(async (): Promise<ChefMemory[]> => {
    setLoading(true)
    setError(null)
    try {
      const chefId = await getChefId()
      if (!chefId) return []

      const { data, error: fetchError } = await supabase
        .from('chef_memory')
        .select('*')
        .eq('chef_id', chefId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      return (data || []) as ChefMemory[]
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch memory'
      setError(msg)
      return []
    } finally {
      setLoading(false)
    }
  }, [getChefId])

  const addMemory = useCallback(async (entry: {
    memory_type: ChefMemory['memory_type']
    content: string
    context?: Record<string, unknown>
    importance?: number
  }) => {
    try {
      const chefId = await getChefId()
      if (!chefId) throw new Error('Not authenticated')

      const { data, error: insertError } = await supabase
        .from('chef_memory')
        .insert({
          chef_id: chefId,
          memory_type: entry.memory_type,
          content: entry.content,
          context: entry.context || null,
          importance: entry.importance || 5,
        })
        .select()
        .single()

      if (insertError) throw insertError
      return { success: true, data }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add memory'
      setError(msg)
      return { success: false, error: msg }
    }
  }, [getChefId])

  const generateSuggestions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/jules/suggestions', { method: 'POST' })
      if (!response.ok) throw new Error('Failed to generate suggestions')
      const data = await response.json()
      return data
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate suggestions'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getSuggestions,
    dismissSuggestion,
    applySuggestion,
    getMemory,
    addMemory,
    generateSuggestions,
  }
}
