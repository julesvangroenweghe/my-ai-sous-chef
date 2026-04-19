'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Suggestion {
 id: string
 chef_id: string
 suggestion_type: string
 title: string
 body: string
 data: Record<string, unknown>
 priority: string
 status: string
 created_at: string
}

interface Memory {
 id: string
 chef_id: string
 memory_type: string
 key: string
 value: Record<string, unknown>
 confidence: number
 source: string | null
 created_at: string
}

export function useJules() {
 const [suggestions, setSuggestions] = useState<Suggestion[]>([])
 const [memories, setMemories] = useState<Memory[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)

 const supabase = createClient()

 const fetchData = useCallback(async () => {
 try {
 setLoading(true)
 setError(null)

 const { data: { user } } = await supabase.auth.getUser()
 if (!user) { setError('Not authenticated'); return }

 const { data: profile } = await supabase
 .from('chef_profiles')
 .select('id')
 .eq('auth_user_id', user.id)
 .single()

 if (!profile) { setLoading(false); return }

 const [sugRes, memRes] = await Promise.all([
 supabase
 .from('jules_suggestions')
 .select('*')
 .eq('chef_id', profile.id)
 .order('created_at', { ascending: false })
 .limit(20),
 supabase
 .from('chef_memory')
 .select('*')
 .eq('chef_id', profile.id)
 .order('created_at', { ascending: false })
 .limit(20),
 ])

 if (sugRes.data) setSuggestions(sugRes.data as Suggestion[])
 if (memRes.data) setMemories(memRes.data as Memory[])
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Unknown error')
 } finally {
 setLoading(false)
 }
 }, [])

 const dismissSuggestion = useCallback(async (id: string) => {
 await supabase.from('jules_suggestions').update({ status: 'dismissed' }).eq('id', id)
 setSuggestions((prev) => prev.filter((s) => s.id !== id))
 }, [])

 const acceptSuggestion = useCallback(async (id: string) => {
 await supabase.from('jules_suggestions').update({ status: 'accepted' }).eq('id', id)
 setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, status: 'accepted' } : s))
 }, [])

 useEffect(() => { fetchData() }, [fetchData])

 return { suggestions, memories, loading, error, dismissSuggestion, acceptSuggestion, refresh: fetchData }
}
