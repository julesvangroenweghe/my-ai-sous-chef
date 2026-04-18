'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { MepPlanGenerated, ShoppingListGroup } from '@/types/mep'

interface MepShoppingListProps {
  mepPlan: MepPlanGenerated
  guestCount: number
}

const CATEGORY_ORDER: Record<string, number> = {
  'Meat': 0,
  'Fish': 1,
  'Dairy': 2,
  'Produce': 3,
  'Vegetables': 4,
  'Fruit': 5,
  'Herbs': 6,
  'Dry Goods': 7,
  'Oils & Vinegars': 8,
  'Spices': 9,
  'Bakery': 10,
  'Frozen': 11,
  'Other': 99,
}

export function MepShoppingList({ mepPlan, guestCount }: MepShoppingListProps) {
  const groups = useMemo(() => {
    // Aggregate all ingredients across all sections/items/components
    const aggregated = new Map<
      string,
      {
        name: string
        category: string
        totalQty: number
        unit: string
        totalCost: number
        usedIn: Set<string>
      }
    >()

    for (const section of mepPlan.sections) {
      for (const item of section.items) {
        for (const comp of item.components) {
          for (const ing of comp.ingredients) {
            const key = `${ing.name}__${ing.unit}`.toLowerCase()
            const existing = aggregated.get(key)
            if (existing) {
              existing.totalQty += ing.quantity_total
              existing.totalCost += ing.total_cost
              existing.usedIn.add(item.recipe_name)
            } else {
              aggregated.set(key, {
                name: ing.name,
                category: ing.category || 'Other',
                totalQty: ing.quantity_total,
                unit: ing.unit,
                totalCost: ing.total_cost,
                usedIn: new Set([item.recipe_name]),
              })
            }
          }
        }
      }
    }

    // Group by category
    const groupMap = new Map<string, ShoppingListGroup>()

    for (const [, val] of aggregated) {
      const cat = val.category
      if (!groupMap.has(cat)) {
        groupMap.set(cat, { category: cat, items: [], subtotal: 0 })
      }
      const group = groupMap.get(cat)!
      group.items.push({
        ingredient_name: val.name,
        category: val.category,
        total_quantity: Number(val.totalQty.toFixed(2)),
        unit: val.unit,
        estimated_cost: Number(val.totalCost.toFixed(2)),
        used_in: Array.from(val.usedIn),
      })
      group.subtotal += val.totalCost
    }

    // Sort groups and items
    const sorted = Array.from(groupMap.values()).sort(
      (a, b) => (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99)
    )
    for (const group of sorted) {
      group.items.sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name))
      group.subtotal = Number(group.subtotal.toFixed(2))
    }

    return sorted
  }, [mepPlan])

  const grandTotal = groups.reduce((sum, g) => sum + g.subtotal, 0)
  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0)

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No ingredients to show. Generate a MEP first.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 print:space-y-2">
      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-semibold">Shopping List</h3>
                <p className="text-xs text-muted-foreground">
                  {totalItems} ingredients across {groups.length} categories — {guestCount} persons
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Estimated Total</div>
              <div className="text-lg font-bold">{formatCurrency(grandTotal)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category groups */}
      {groups.map((group) => (
        <Card key={group.category} className="print:break-inside-avoid print:shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{group.category}</CardTitle>
              <Badge variant="outline" className="text-xs">
                {formatCurrency(group.subtotal)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground text-xs">
                  <th className="pb-1 font-medium">Ingredient</th>
                  <th className="pb-1 font-medium text-right">Quantity</th>
                  <th className="pb-1 font-medium text-right">Unit</th>
                  <th className="pb-1 font-medium text-right">Est. Cost</th>
                  <th className="pb-1 font-medium print:hidden">Used In</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-1.5 font-medium">{item.ingredient_name}</td>
                    <td className="py-1.5 text-right tabular-nums">{item.total_quantity}</td>
                    <td className="py-1.5 text-right text-muted-foreground">{item.unit}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {item.estimated_cost > 0 ? formatCurrency(item.estimated_cost) : '—'}
                    </td>
                    <td className="py-1.5 print:hidden">
                      <div className="flex flex-wrap gap-1">
                        {item.used_in.map((recipe) => (
                          <span
                            key={recipe}
                            className="inline-block bg-muted rounded px-1.5 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {recipe}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
