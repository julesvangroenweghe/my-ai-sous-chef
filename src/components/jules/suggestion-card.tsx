'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Check,
  X,
  Lightbulb,
  TrendingDown,
  Leaf,
  RefreshCcw,
  Truck,
  Timer,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react'
import type { JulesSuggestion } from '@/types/database'
import { formatDate } from '@/lib/utils'

const typeConfig: Record<string, { icon: React.ReactNode; label: string; color: string; emoji: string }> = {
  recipe_idea: {
    icon: <Lightbulb className="h-5 w-5" />,
    label: 'Recipe Idea',
    color: 'bg-purple-100 text-purple-600',
    emoji: '💡',
  },
  cost_alert: {
    icon: <TrendingDown className="h-5 w-5" />,
    label: 'Price Alert',
    color: 'bg-red-100 text-red-600',
    emoji: '💰',
  },
  seasonal_ingredient: {
    icon: <Leaf className="h-5 w-5" />,
    label: 'Seasonal',
    color: 'bg-green-100 text-green-600',
    emoji: '🌿',
  },
  menu_rotation: {
    icon: <RefreshCcw className="h-5 w-5" />,
    label: 'Menu Rotation',
    color: 'bg-blue-100 text-blue-600',
    emoji: '👨‍🍳',
  },
  supplier_alternative: {
    icon: <Truck className="h-5 w-5" />,
    label: 'Supplier',
    color: 'bg-orange-100 text-orange-600',
    emoji: '📊',
  },
  prep_optimization: {
    icon: <Timer className="h-5 w-5" />,
    label: 'Optimization',
    color: 'bg-cyan-100 text-cyan-600',
    emoji: '⚡',
  },
}

const priorityConfig: Record<string, { variant: 'secondary' | 'outline' | 'warning' | 'destructive'; label: string }> = {
  low: { variant: 'secondary', label: 'Info' },
  medium: { variant: 'outline', label: 'Medium' },
  high: { variant: 'warning', label: 'Warning' },
  urgent: { variant: 'destructive', label: 'Action Needed' },
}

interface SuggestionCardProps {
  suggestion: JulesSuggestion
  onAction: (id: string, action: 'accepted' | 'dismissed') => void
}

export function SuggestionCard({ suggestion, onAction }: SuggestionCardProps) {
  const [expanded, setExpanded] = useState(false)

  const config = typeConfig[suggestion.suggestion_type] || typeConfig.recipe_idea
  const priority = priorityConfig[suggestion.priority] || priorityConfig.low
  const affectedRecipes = (suggestion.data as any)?.affected_recipes as string[] | undefined
  const suggestedAction = (suggestion.data as any)?.suggested_action as string | undefined

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-xl shrink-0 ${config.color}`}>
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold">{suggestion.title}</h3>
              <Badge variant={priority.variant}>{priority.label}</Badge>
              <Badge variant="secondary" className="text-xs">
                {config.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{suggestion.body}</p>

            {/* Expandable details */}
            {(affectedRecipes?.length || suggestedAction) && (
              <div className="mt-2">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {expanded ? 'Less details' : 'More details'}
                </button>
                {expanded && (
                  <div className="mt-2 space-y-2 text-sm">
                    {suggestedAction && (
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">
                          Suggested Action
                        </p>
                        <p>{suggestedAction}</p>
                      </div>
                    )}
                    {affectedRecipes && affectedRecipes.length > 0 && (
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">
                          Affected Recipes
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {affectedRecipes.map((r, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Timestamp + Actions */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => onAction(suggestion.id, 'accepted')} className="gap-1">
                  <Check className="h-3 w-3" /> Apply
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onAction(suggestion.id, 'dismissed')}
                  className="gap-1 text-muted-foreground"
                >
                  <X className="h-3 w-3" /> Dismiss
                </Button>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(suggestion.created_at)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
