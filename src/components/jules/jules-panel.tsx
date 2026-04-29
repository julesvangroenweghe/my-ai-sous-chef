'use client'

import { useEffect, useState } from 'react'
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
import { useJules } from '@/hooks/use-jules'

export function JulesPanel() {
  const {
    suggestions,
    memories,
    loading,
    error,
    dismissSuggestion,
    acceptSuggestion,
    refresh,
  } = useJules()

  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    await refresh()
    setGenerating(false)
  }

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'bg-red-100 text-red-700 border-red-200'
    if (priority === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200'
    return 'bg-stone-100 text-stone-600 border-stone-200'
  }

  const getTypeIcon = (type: string) => {
    if (type === 'cost') return <TrendingDown className="h-4 w-4" />
    if (type === 'seasonal') return <Leaf className="h-4 w-4" />
    if (type === 'efficiency') return <Zap className="h-4 w-4" />
    return <Sparkles className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[#E8A040]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-[#E8A040]" />
          <span className="text-sm font-semibold text-[#2C1810]">Jules AI</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          disabled={generating}
          className="h-7 text-xs text-[#9E7E60] hover:text-[#2C1810]"
        >
          {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
      )}

      {/* Suggesties */}
      {suggestions.length > 0 ? (
        <div className="space-y-2">
          {suggestions.slice(0, 5).map((s) => (
            <Card key={s.id} className="border-[#E8D5B5] bg-white shadow-none">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 text-[#E8A040]">{getTypeIcon(s.suggestion_type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#2C1810] truncate">{s.title}</p>
                    <p className="text-xs text-[#9E7E60] mt-0.5 line-clamp-2">{s.body}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`text-[10px] px-1.5 py-0 border ${getPriorityColor(s.priority)}`}>
                        {s.priority}
                      </Badge>
                      <div className="flex gap-1 ml-auto">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dismissSuggestion(s.id)}
                          className="h-5 text-[10px] px-2 text-[#9E7E60] hover:text-red-600"
                        >
                          Negeer
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => acceptSuggestion(s.id)}
                          className="h-5 text-[10px] px-2 bg-[#E8A040] text-white hover:bg-[#C4703A]"
                        >
                          Toepassen
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <Bell className="h-8 w-8 text-[#E8D5B5] mx-auto mb-2" />
          <p className="text-xs text-[#9E7E60]">Geen suggesties op dit moment</p>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleGenerate}
            className="mt-2 text-xs text-[#E8A040] hover:text-[#C4703A]"
          >
            Genereer suggesties
          </Button>
        </div>
      )}
    </div>
  )
}
