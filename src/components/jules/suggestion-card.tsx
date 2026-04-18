'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, Lightbulb, TrendingDown, Leaf, RefreshCcw, Truck, Timer } from 'lucide-react'
import type { JulesSuggestion } from '@/types/database'

const typeIcons: Record<string, React.ReactNode> = {
  recipe_idea: <Lightbulb className="h-5 w-5" />,
  cost_alert: <TrendingDown className="h-5 w-5" />,
  seasonal_ingredient: <Leaf className="h-5 w-5" />,
  menu_rotation: <RefreshCcw className="h-5 w-5" />,
  supplier_alternative: <Truck className="h-5 w-5" />,
  prep_optimization: <Timer className="h-5 w-5" />,
}

const typeColors: Record<string, string> = {
  recipe_idea: 'bg-purple-100 text-purple-600',
  cost_alert: 'bg-red-100 text-red-600',
  seasonal_ingredient: 'bg-green-100 text-green-600',
  menu_rotation: 'bg-blue-100 text-blue-600',
  supplier_alternative: 'bg-orange-100 text-orange-600',
  prep_optimization: 'bg-cyan-100 text-cyan-600',
}

const priorityColor = {
  low: 'secondary' as const,
  medium: 'outline' as const,
  high: 'warning' as const,
  urgent: 'destructive' as const,
}

interface SuggestionCardProps {
  suggestion: JulesSuggestion
  onAction: (id: string, action: 'accepted' | 'dismissed') => void
}

export function SuggestionCard({ suggestion, onAction }: SuggestionCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-xl shrink-0 ${typeColors[suggestion.suggestion_type] || 'bg-gray-100 text-gray-600'}`}>
            {typeIcons[suggestion.suggestion_type] || <Lightbulb className="h-5 w-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{suggestion.title}</h3>
              <Badge variant={priorityColor[suggestion.priority]}>{suggestion.priority}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{suggestion.body}</p>
            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" onClick={() => onAction(suggestion.id, 'accepted')} className="gap-1">
                <Check className="h-3 w-3" /> Accept
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onAction(suggestion.id, 'dismissed')} className="gap-1 text-muted-foreground">
                <X className="h-3 w-3" /> Dismiss
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
