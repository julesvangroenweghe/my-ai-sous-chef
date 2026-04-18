'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Brain } from 'lucide-react'
import { SuggestionCard } from '@/components/jules/suggestion-card'
import { MemoryDisplay } from '@/components/jules/memory-display'
import type { JulesSuggestion, ChefMemory } from '@/types/database'

export default function JulesPage() {
  const [suggestions, setSuggestions] = useState<JulesSuggestion[]>([])
  const [memories, setMemories] = useState<ChefMemory[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: chef } = await supabase
        .from('chef_profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!chef) return

      const [sugRes, memRes] = await Promise.all([
        supabase
          .from('jules_suggestions')
          .select('*')
          .eq('chef_id', chef.id)
          .in('status', ['pending', 'seen'])
          .order('created_at', { ascending: false }),
        supabase
          .from('chef_memory')
          .select('*')
          .eq('chef_id', chef.id)
          .order('updated_at', { ascending: false }),
      ])

      if (sugRes.data) setSuggestions(sugRes.data as JulesSuggestion[])
      if (memRes.data) setMemories(memRes.data as ChefMemory[])
      setLoading(false)
    }
    load()
  }, [])

  const handleAction = async (id: string, action: 'accepted' | 'dismissed') => {
    await supabase.from('jules_suggestions').update({ status: action }).eq('id', id)
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-xl">
          <Brain className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Jules AI</h1>
          <p className="text-muted-foreground text-sm">Your intelligent kitchen assistant</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Active Suggestions</h2>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}</div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No new suggestions. Jules is learning your style!</p>
            </div>
          ) : (
            suggestions.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} onAction={handleAction} />
            ))
          )}
        </div>

        <div>
          <MemoryDisplay memories={memories} />
        </div>
      </div>
    </div>
  )
}
