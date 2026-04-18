'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react'
import type { Recipe, RecipeComponent } from '@/types/database'

interface CostBreakdownProps {
  recipe: Recipe
  className?: string
}

function getFoodCostColor(pct: number) {
  if (pct < 30) return { bg: 'bg-green-500', text: 'text-green-700', label: 'Excellent' }
  if (pct <= 35) return { bg: 'bg-yellow-500', text: 'text-yellow-700', label: 'Acceptable' }
  return { bg: 'bg-red-500', text: 'text-red-700', label: 'High' }
}

function getComponentCost(component: RecipeComponent): number {
  return (component.ingredients || []).reduce((sum, ci) => {
    return sum + (ci.cost_per_unit || ci.ingredient?.current_price || 0) * ci.quantity
  }, 0)
}

export function CostBreakdown({ recipe, className }: CostBreakdownProps) {
  const components = recipe.components || []
  const totalCost = components.reduce((sum, comp) => sum + getComponentCost(comp), 0)
  const servings = recipe.servings || 1
  const costPerServing = totalCost / servings
  const sellingPrice = recipe.selling_price || 0
  const foodCostPct = sellingPrice > 0 ? (costPerServing / sellingPrice) * 100 : 0
  const margin = sellingPrice - costPerServing
  const costColor = getFoodCostColor(foodCostPct)

  // Build component cost data for the breakdown bar
  const componentCosts = components
    .map((c) => ({ name: c.name, cost: getComponentCost(c) }))
    .filter((c) => c.cost > 0)

  const barColors = [
    'bg-orange-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500',
    'bg-pink-500', 'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500',
  ]

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Cost Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Cost</p>
            <p className="text-lg font-bold">{formatCurrency(totalCost)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Per Serving</p>
            <p className="text-lg font-bold">{formatCurrency(costPerServing)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Food Cost %</p>
            <div className="flex items-center gap-2">
              <p className={cn('text-lg font-bold', costColor.text)}>
                {foodCostPct.toFixed(1)}%
              </p>
              {foodCostPct > 0 && (
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full font-medium',
                  foodCostPct < 30 ? 'bg-green-100 text-green-700' :
                  foodCostPct <= 35 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                )}>
                  {costColor.label}
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Margin</p>
            <div className="flex items-center gap-1">
              {margin >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <p className={cn('text-lg font-bold', margin >= 0 ? 'text-green-700' : 'text-red-700')}>
                {formatCurrency(margin)}
              </p>
            </div>
          </div>
        </div>

        {/* Food cost percentage bar */}
        {sellingPrice > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Food cost vs. selling price</span>
              <span>{formatCurrency(sellingPrice)}</span>
            </div>
            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', costColor.bg)}
                style={{ width: `${Math.min(foodCostPct, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">0%</span>
              <div className="flex gap-4">
                <span className="text-green-600">30%</span>
                <span className="text-yellow-600">35%</span>
              </div>
              <span className="text-muted-foreground">100%</span>
            </div>
          </div>
        )}

        {/* Component cost breakdown bar */}
        {componentCosts.length > 0 && totalCost > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">By Component</p>
            <div className="h-6 w-full bg-gray-100 rounded-full overflow-hidden flex">
              {componentCosts.map((cc, i) => (
                <div
                  key={cc.name}
                  className={cn('h-full transition-all', barColors[i % barColors.length])}
                  style={{ width: `${(cc.cost / totalCost) * 100}%` }}
                  title={`${cc.name}: ${formatCurrency(cc.cost)}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {componentCosts.map((cc, i) => (
                <div key={cc.name} className="flex items-center gap-1.5 text-xs">
                  <div className={cn('h-2.5 w-2.5 rounded-full', barColors[i % barColors.length])} />
                  <span className="text-muted-foreground">{cc.name}</span>
                  <span className="font-medium">{formatCurrency(cc.cost)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
