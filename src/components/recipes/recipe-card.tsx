import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Utensils, Clock, Users } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { Recipe } from '@/types/database'

interface RecipeCardProps {
  recipe: Recipe
}

function getFoodCostColor(pct: number | null) {
  if (!pct) return { bar: 'bg-gray-300', text: 'text-gray-500' }
  if (pct < 30) return { bar: 'bg-green-500', text: 'text-green-700' }
  if (pct <= 35) return { bar: 'bg-yellow-500', text: 'text-yellow-700' }
  return { bar: 'bg-red-500', text: 'text-red-700' }
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const foodCost = recipe.food_cost_percentage || 0
  const costPerServing = recipe.total_cost_per_serving || 0
  const colors = getFoodCostColor(foodCost)
  const componentCount = recipe.components?.length || 0

  return (
    <Link href={`/recipes/${recipe.id}`}>
      <Card className="hover:shadow-md transition-all hover:border-primary/20 h-full group">
        <CardContent className="p-5 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Utensils className="h-5 w-5 text-primary" />
            </div>
            {recipe.category && (
              <Badge variant="secondary" className="text-xs shrink-0">{recipe.category.name}</Badge>
            )}
          </div>

          {/* Name + description */}
          <div>
            <h3 className="font-semibold group-hover:text-primary transition-colors">{recipe.name}</h3>
            {recipe.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{recipe.description}</p>
            )}
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {recipe.servings && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" /> {recipe.servings} srv
              </span>
            )}
            {recipe.prep_time_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {recipe.prep_time_minutes}m
              </span>
            )}
            {componentCount > 0 && (
              <span>{componentCount} component{componentCount !== 1 ? 's' : ''}</span>
            )}
          </div>

          {/* Food cost bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Food cost</span>
              <div className="flex items-center gap-2">
                <span className={cn('text-xs font-bold', colors.text)}>
                  {foodCost > 0 ? `${foodCost.toFixed(1)}%` : '—'}
                </span>
                <span className="text-xs font-medium">
                  {costPerServing > 0 ? `${formatCurrency(costPerServing)}/srv` : ''}
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', colors.bar)}
                style={{ width: `${Math.min(foodCost, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
