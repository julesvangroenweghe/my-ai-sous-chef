'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShoppingCart, Loader2, Printer, Check, Package } from 'lucide-react'

interface ShoppingItem {
  ingredient_name: string
  category: string
  total_quantity: number
  unit: string
  recipes: string[]
  price_per_unit: number | null
  estimated_cost: number | null
  checked: boolean
}

interface Props {
  eventId: string
  numPersons: number
}

const CATEGORY_ORDER: Record<string, number> = {
  'Vlees': 0, 'Meat': 0,
  'Vis': 1, 'Fish': 1,
  'Zuivel': 2, 'Dairy': 2,
  'Groenten': 3, 'Vegetables': 3, 'Produce': 3,
  'Fruit': 4,
  'Kruiden': 5, 'Herbs': 5,
  'Droge waren': 6, 'Dry Goods': 6,
  'Oliën': 7, 'Oils & Vinegars': 7,
  'Specerijen': 8, 'Spices': 8,
  'Bakkerij': 9, 'Bakery': 9,
  'Diepvries': 10, 'Frozen': 10,
  'Overig': 99, 'Other': 99,
}

export function MepShoppingAggregate({ eventId, numPersons }: Props) {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchShoppingList = useCallback(async () => {
    setLoading(true)

    // Fetch MEP items with ingredient data
    const { data: mepItems } = await supabase
      .from('mep_items')
      .select('item_name, total_quantity, unit, notes, recipe_id')
      .eq('event_id', eventId)
      .eq('item_type', 'ingredient')

    if (!mepItems || mepItems.length === 0) {
      setItems([])
      setLoading(false)
      return
    }

    // Aggregate same ingredients
    const aggregated = new Map<string, {
      name: string
      totalQty: number
      unit: string
      recipes: Set<string>
    }>()

    for (const item of mepItems) {
      const key = `${item.item_name}__${item.unit}`.toLowerCase()
      const existing = aggregated.get(key)
      if (existing) {
        existing.totalQty += Number(item.total_quantity)
        if (item.notes) existing.recipes.add(item.notes)
      } else {
        aggregated.set(key, {
          name: item.item_name,
          totalQty: Number(item.total_quantity),
          unit: item.unit,
          recipes: new Set(item.notes ? [item.notes] : []),
        })
      }
    }

    // Get ingredient prices
    const ingredientNames = [...new Set(mepItems.map(i => i.item_name))]
    const { data: ingredients } = await supabase
      .from('ingredients')
      .select('name, category, current_price, unit')
      .in('name', ingredientNames)

    const priceMap = new Map<string, { price: number | null; category: string }>()
    for (const ing of (ingredients || [])) {
      priceMap.set(ing.name.toLowerCase(), { 
        price: ing.current_price ? Number(ing.current_price) : null,
        category: ing.category || 'Overig'
      })
    }

    const result: ShoppingItem[] = []
    for (const [, val] of aggregated) {
      const priceInfo = priceMap.get(val.name.toLowerCase())
      const totalQty = Math.ceil(val.totalQty * 100) / 100

      // Estimate cost (if unit is g and price is per kg)
      let estimatedCost: number | null = null
      if (priceInfo?.price) {
        if (val.unit === 'g') {
          estimatedCost = (totalQty / 1000) * priceInfo.price
        } else if (val.unit === 'kg') {
          estimatedCost = totalQty * priceInfo.price
        } else if (val.unit === 'l') {
          estimatedCost = totalQty * priceInfo.price
        }
      }

      result.push({
        ingredient_name: val.name,
        category: priceInfo?.category || 'Overig',
        total_quantity: totalQty,
        unit: val.unit,
        recipes: Array.from(val.recipes),
        price_per_unit: priceInfo?.price || null,
        estimated_cost: estimatedCost ? Math.round(estimatedCost * 100) / 100 : null,
        checked: false,
      })
    }

    // Sort by category then name
    result.sort((a, b) => {
      const catA = CATEGORY_ORDER[a.category] ?? 99
      const catB = CATEGORY_ORDER[b.category] ?? 99
      if (catA !== catB) return catA - catB
      return a.ingredient_name.localeCompare(b.ingredient_name)
    })

    setItems(result)
    setLoading(false)
  }, [eventId])

  useEffect(() => { fetchShoppingList() }, [fetchShoppingList])

  const toggleCheck = (idx: number) => {
    setItems(prev => prev.map((item, i) => 
      i === idx ? { ...item, checked: !item.checked } : item
    ))
  }

  const grandTotal = useMemo(() => 
    items.reduce((sum, i) => sum + (i.estimated_cost || 0), 0),
    [items]
  )

  const checkedCount = items.filter(i => i.checked).length

  // Group by category
  const categories = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {}
    for (const item of items) {
      if (!groups[item.category]) groups[item.category] = []
      groups[item.category].push(item)
    }
    return groups
  }, [items])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500">
        <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Genereer eerst een MEP plan</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-5 h-5 text-brand-400" />
          <h3 className="text-lg font-display font-semibold text-stone-100">
            Boodschappenlijst
          </h3>
          <span className="text-xs text-stone-500">
            {items.length} producten · {checkedCount} afgevinkt
          </span>
        </div>
        <div className="flex items-center gap-3">
          {grandTotal > 0 && (
            <div className="text-right">
              <div className="text-xs text-stone-500">Geschatte kost</div>
              <div className="text-lg font-mono font-bold text-brand-400">
                €{grandTotal.toFixed(2)}
              </div>
            </div>
          )}
          <button
            onClick={() => window.print()}
            className="p-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 hover:text-white transition-all print:hidden"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category groups */}
      {Object.entries(categories).map(([category, categoryItems]) => {
        const catTotal = categoryItems.reduce((s, i) => s + (i.estimated_cost || 0), 0)
        return (
          <div key={category} className="bg-stone-900/50 border border-stone-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-stone-800/30 border-b border-stone-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">{category}</span>
              {catTotal > 0 && (
                <span className="text-xs font-mono text-stone-400">€{catTotal.toFixed(2)}</span>
              )}
            </div>
            <div className="divide-y divide-stone-800/30">
              {categoryItems.map((item, idx) => {
                const globalIdx = items.indexOf(item)
                return (
                  <div
                    key={idx}
                    className={`px-4 py-2 flex items-center gap-3 transition-all cursor-pointer hover:bg-stone-800/20 ${
                      item.checked ? 'opacity-50' : ''
                    }`}
                    onClick={() => toggleCheck(globalIdx)}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all ${
                      item.checked
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'border-stone-600'
                    }`}>
                      {item.checked && <Check className="w-3 h-3" />}
                    </div>
                    <span className={`flex-1 text-sm ${item.checked ? 'line-through text-stone-500' : 'text-stone-200'}`}>
                      {item.ingredient_name}
                    </span>
                    <span className="text-sm font-mono font-semibold text-stone-100 w-28 text-right">
                      {item.total_quantity} {item.unit}
                    </span>
                    {item.estimated_cost !== null && (
                      <span className="text-xs font-mono text-stone-400 w-16 text-right">
                        €{item.estimated_cost.toFixed(2)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Cost per person */}
      {grandTotal > 0 && numPersons > 0 && (
        <div className="bg-brand-600/10 border border-brand-500/20 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm text-stone-300">Geschatte food cost per persoon</span>
          <span className="text-lg font-mono font-bold text-brand-400">
            €{(grandTotal / numPersons).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  )
}
