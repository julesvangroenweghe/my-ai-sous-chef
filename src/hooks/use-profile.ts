'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChefProfile, ChefMemory } from '@/types/database'

interface UseProfileReturn {
  profile: ChefProfile | null
  memories: ChefMemory[]
  loading: boolean
  memoriesLoading: boolean
  error: string | null
  getProfile: () => Promise<void>
  updateProfile: (updates: Partial<ChefProfile>) => Promise<{ success: boolean; error?: string }>
  addMemory: (memory: {
    memory_type: ChefMemory['memory_type']
    content: string
    context?: Record<string, unknown>
    importance?: number
  }) => Promise<{ success: boolean; error?: string }>
  loadMoreMemories: () => Promise<void>
  hasMoreMemories: boolean
}

const PAGE_SIZE = 20

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<ChefProfile | null>(null)
  const [memories, setMemories] = useState<ChefMemory[]>([])
  const [loading, setLoading] = useState(true)
  const [memoriesLoading, setMemoriesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [memoriesPage, setMemoriesPage] = useState(0)
  const [hasMoreMemories, setHasMoreMemories] = useState(true)

  const supabase = createClient()

  const getProfile = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not authenticated')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('chef_profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        setError(fetchError.message)
        return
      }

      if (data) {
        setProfile(data as ChefProfile)
        // Load initial memories
        await fetchMemories(data.id, 0)
      } else {
        // Create a default profile
        const { data: newProfile, error: createError } = await supabase
          .from('chef_profiles')
          .insert({
            auth_user_id: user.id,
            display_name: user.email?.split('@')[0] || 'Chef',
            cuisine_styles: [],
            signature_techniques: [],
            preferred_ingredients: [],
            avoided_ingredients: [],
            is_public: false,
          })
          .select()
          .single()

        if (createError) {
          setError(createError.message)
          return
        }
        setProfile(newProfile as ChefProfile)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMemories = async (chefId: string, page: number) => {
    setMemoriesLoading(true)
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, error: memError } = await supabase
      .from('chef_memory')
      .select('*')
      .eq('chef_id', chefId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (!memError && data) {
      if (page === 0) {
        setMemories(data as ChefMemory[])
      } else {
        setMemories((prev) => [...prev, ...(data as ChefMemory[])])
      }
      setHasMoreMemories(data.length === PAGE_SIZE)
    }
    setMemoriesLoading(false)
  }

  const updateProfile = useCallback(
    async (updates: Partial<ChefProfile>) => {
      if (!profile) return { success: false, error: 'No profile loaded' }

      const { error: updateError } = await supabase
        .from('chef_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', profile.id)

      if (updateError) return { success: false, error: updateError.message }

      setProfile((prev) => (prev ? { ...prev, ...updates } : prev))
      return { success: true }
    },
    [profile]
  )

  const addMemory = useCallback(
    async (memory: {
      memory_type: ChefMemory['memory_type']
      content: string
      context?: Record<string, unknown>
      importance?: number
    }) => {
      if (!profile) return { success: false, error: 'No profile loaded' }

      const { data, error: insertError } = await supabase
        .from('chef_memory')
        .insert({
          chef_id: profile.id,
          memory_type: memory.memory_type,
          content: memory.content,
          context: memory.context || {},
          importance: memory.importance || 3,
        })
        .select()
        .single()

      if (insertError) return { success: false, error: insertError.message }

      setMemories((prev) => [data as ChefMemory, ...prev])
      return { success: true }
    },
    [profile]
  )

  const loadMoreMemories = useCallback(async () => {
    if (!profile || memoriesLoading || !hasMoreMemories) return
    const nextPage = memoriesPage + 1
    setMemoriesPage(nextPage)
    await fetchMemories(profile.id, nextPage)
  }, [profile, memoriesPage, memoriesLoading, hasMoreMemories])

  useEffect(() => {
    getProfile()
  }, [getProfile])

  return {
    profile,
    memories,
    loading,
    memoriesLoading,
    error,
    getProfile,
    updateProfile,
    addMemory,
    loadMoreMemories,
    hasMoreMemories,
  }
}
