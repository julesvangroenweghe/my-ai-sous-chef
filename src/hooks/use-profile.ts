'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ChefProfile {
 id: string
 auth_user_id: string
 name: string
 display_name: string | null
 bio: string | null
 photo_url: string | null
 avatar_url: string | null
 style_tags: string[]
 preferred_techniques: string[]
 preferred_cuisines: string[]
 preferred_ingredients: string[]
 avoided_ingredients: string[]
 cuisine_styles: string[]
 signature_dishes: string[]
 dietary_expertise: string[]
 experience_years: number | null
 current_role: string | null
 cooking_philosophy: string | null
 is_public: boolean
 created_at: string
 updated_at: string
}

interface ChefMemory {
 id: string
 chef_id: string
 memory_type: 'preference' | 'technique' | 'ingredient_affinity' | 'flavor_profile' | 'habit' | 'feedback'
 key: string
 value: Record<string, unknown>
 confidence: number
 source: string | null
 created_at: string
 updated_at: string
}

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
 key: string
 value: Record<string, unknown>
 confidence?: number
 source?: string
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
 await fetchMemories(data.id, 0)
 } else {
 // Profile should be auto-created by trigger, but create if missing
 const { data: newProfile, error: createError } = await supabase
 .from('chef_profiles')
 .insert({
 auth_user_id: user.id,
 name: user.email?.split('@')[0] || 'Chef',
 display_name: user.email?.split('@')[0] || 'Chef',
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
 key: string
 value: Record<string, unknown>
 confidence?: number
 source?: string
 }) => {
 if (!profile) return { success: false, error: 'No profile loaded' }

 const { data, error: insertError } = await supabase
 .from('chef_memory')
 .insert({
 chef_id: profile.id,
 memory_type: memory.memory_type,
 key: memory.key,
 value: memory.value,
 confidence: memory.confidence || 1.0,
 source: memory.source || null,
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
