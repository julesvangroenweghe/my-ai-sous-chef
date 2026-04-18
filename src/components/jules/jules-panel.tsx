'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Brain,
  RefreshCcw,
  TrendingDown,
  Leaf,
  Zap,
  Bell,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { SuggestionCard } from './suggestion-card'
import { MemoryDisplay } from './memory-display'
import { useJules } from '@/hooks/use-jules'
import type { JulesSuggestion, ChefMemory } from '@/types/database'

export function JulesPanel() {
  const {
    loading,
    error,
    getSuggestions,
    dismissSuggestion,
    applySuggestion,
    getMemory,
    generateSuggestions,
  } = useJules()

  const [suggestions, setSuggestions] = useState<JulesSuggestion[]>([])
  const [memories, setMemories] = useState<ChefMemory[]>([])
  const [generating, setGenerating] = useState(false)

  const loadData = useCallback(async () => {
    const [sugs, mems] = await Promise.all([getSuggestions(), getMemory()])
    setSuggestions(sugs)
    setMemories(mems)
  }, [getSuggestions, getMemory])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAction = async (id: string, action: 'accepted' | 'dismissed') => {
    if (action === 'accepted') {
      await applySuggestion(id)
    } else {
      await dismissSuggestion(id)
    }
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await generateSuggestions()
      const sugs = await getSuggestions()
      setSuggestions(sugs)
    } finally {
      setGenerating(false)
    }
  }

  const activeAlerts = suggestions.filter(
    (s) => s.suggestion_type === 'cost_alert' || s.priority === 'urgent' || s.priority === 'high'
  )
  const otherSuggestions = suggestions.filter(
    (s) => s.suggestion_type !== 'cost_alert' && s.priority !== 'urgent' && s.priority !== 'high'
  )

  return (
    <div className="space-y-6">
      {/* Active Alerts */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold">Active Alerts</h2>
            {activeAlerts.length > 0 && (
              <Badge variant="destructive">{activeAlerts.length}</Badge>
            )}
          </div>
        </div>
        {activeAlerts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No active alerts. Everything looks good!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeAlerts.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} onAction={handleAction} />
            ))}
          </div>
        )}
      </section>

      {/* Suggestions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-semibold">Suggestions</h2>
          </div>
        </div>
        {otherSuggestions.length === 0 && !loading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No new suggestions right now.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {otherSuggestions.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} onAction={handleAction} />
            ))}
          </div>
        )}
      </section>

      {/* Memory */}
      <section>
        <MemoryDisplay memories={memories} />
      </section>

      {/* Quick Actions */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                {generating ? 'Analyzing...' : 'Check Price Changes'}
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleGenerate} disabled={generating}>
                <TrendingDown className="h-4 w-4" />
                Recalculate All Costs
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleGenerate} disabled={generating}>
                <Leaf className="h-4 w-4" />
                Seasonal Alternatives
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
