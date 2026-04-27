'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ClipboardCheck, Search, ChevronDown, ChevronRight, Check,
  ArrowUpDown, Filter, Loader2, Save, ArrowLeft
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface IngredientRow {
  id: string
  component_id: string
  ingredient_id: string
  ingredient_name: string
  quantity: number
  unit: string
  cost_per_unit: number | null
  current_price: number | null
  cost_per_serving: number
  checked: boolean
}

interface ComponentRow {
  id: string
  name: string
  sort_order: number
  ingredients: IngredientRow[]
  subtotal: number
}

interface RecipeRow {
  id: string
  name: string
  category_name: string | null
  selling_price: number | null
  food_cost_percentage: number | null
  total_cost_per_serving: number | null
  components: ComponentRow[]
  expanded: boolean
}

type SortKey = 'name' | 'food_cost' | 'category'

export default function ChecklistPage() {
  const [recipes, setRecipes] = useState<RecipeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('name')
  const [saving, setSaving] = useState<string | null>(null)
  const editRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data } = await supabase
      .from('recipes')
      .select(`
        id, name, selling_price, total_cost_per_serving, food_cost_percentage, status,
        category:recipe_categories(id, name),
        components:recipe_components(
          id, name, sort_order,
          ingredients:recipe_component_ingredients(
            id, component_id, ingredient_id, quantity, unit, cost_per_unit,
            ingredient:ingredients(id, name, current_price, unit)
          )
        )
      `)
      .eq('status', 'active')
      .order('name')

    if (data) {
      const mapped: RecipeRow[] = data.map((r: Record<string, unknown>) => {
        const cat = r.category as { name: string } | null
        const comps = ((r.components || []) as Array<Record<string, unknown>>)
          .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
          .map((c) => {
            const ings = ((c.ingredients || []) as Array<Record<string, unknown>>).map((ci) => {
              const ing = ci.ingredient as { id: string; name: string; current_price: number | null; unit: string | null } | null
              const qty = ci.quantity as number || 0
              const price = (ci.cost_per_unit as number) || ing?.current_price || 0
              return {
                id: ci.id as string,
                component_id: ci.component_id as string,
                ingredient_id: ci.ingredient_id as string,
                ingredient_name: ing?.name || 'Onbekend',
                quantity: qty,
                unit: (ci.unit as string) || ing?.unit || 'g',
                cost_per_unit: ci.cost_per_unit as number | null,
                current_price: ing?.current_price || null,
                cost_per_serving: qty * price / 1000,
                checked: false,
              }
            })
            return {
              id: c.id as string,
              name: c.name as string,
              sort_order: c.sort_order as number,
              ingredients: ings,
              subtotal: ings.reduce((sum, i) => sum + i.cost_per_serving, 0),
            }
          })

        return {
          id: r.id as string,
          name: r.name as string,
          category_name: cat?.name || null,
          selling_price: r.selling_price as number | null,
          food_cost_percentage: r.food_cost_percentage as number | null,
          total_cost_per_serving: r.total_cost_per_serving as number | null,
          components: comps,
          expanded: true,
        }
      })
      setRecipes(mapped)
    }
    setLoading(false)
  }

  const toggleRecipe = (id: string) => {
    setRecipes(prev => prev.map(r =>
      r.id === id ? { ...r, expanded: !r.expanded } : r
    ))
  }

  const toggleCheck = (recipeId: string, ingredientId: string) => {
    setRecipes(prev => prev.map(r =>
      r.id === recipeId ? {
        ...r,
        components: r.components.map(c => ({
          ...c,
          ingredients: c.ingredients.map(i =>
            i.id === ingredientId ? { ...i, checked: !i.checked } : i
          )
        }))
      } : r
    ))
  }

  const updateHoeveelheid = useCallback(async (rciId: string, value: number) => {
    setSaving(rciId)
    await supabase
      .from('recipe_component_ingredients')
      .update({ quantity: value, updated_at: new Date().toISOString() })
      .eq('id', rciId)
    setSaving(null)
    loadData()
  }, [])

  const updatePrice = useCallback(async (ingredientId: string, value: number) => {
    setSaving(ingredientId)
    await supabase
      .from('ingredients')
      .update({ current_price: value, last_updated: new Date().toISOString() })
      .eq('id', ingredientId)
    setSaving(null)
    loadData()
  }, [])

  const filtered = recipes
    .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'food_cost') return (b.food_cost_percentage || 0) - (a.food_cost_percentage || 0)
      if (sortBy === 'category') return (a.category_name || '').localeCompare(b.category_name || '')
      return a.name.localeCompare(b.name)
    })

  const totalFoodCost = recipes.reduce((sum, r) => sum + (r.total_cost_per_serving || 0), 0)

  const foodCostColor = (pct: number | null) => {
    if (!pct) return 'text-[#5C4730]'
    if (pct <= 30) return 'bg-emerald-50 text-emerald-700'
    if (pct <= 35) return 'bg-amber-50 text-amber-700'
    return 'bg-red-50 text-red-700'
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-stone-100 animate-pulse" />
          <div className="space-y-2">
            <div className="w-48 h-6 bg-stone-100 rounded animate-pulse" />
            <div className="w-32 h-4 bg-stone-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="card overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-stone-50">
              <div className="w-4 h-4 bg-stone-100 rounded animate-pulse" />
              <div className="flex-1 h-4 bg-stone-100 rounded animate-pulse" />
              <div className="w-16 h-4 bg-stone-100 rounded animate-pulse" />
              <div className="w-16 h-4 bg-stone-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-extrabold text-stone-900 tracking-tight">Checklist</h1>
              <p className="text-[#9E7E60] text-sm mt-0.5">{recipes.length} recepten - spreadsheet overzicht</p>
            </div>
          </div>
          <Link href="/recipes" className="text-sm text-[#B8997A] hover:text-stone-700 flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Terug naar recepten
          </Link>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E7E60]" />
          <input
            type="text"
            placeholder="Zoek recept..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <div className="flex gap-2">
          {(['name', 'food_cost', 'category'] as SortKey[]).map(key => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${
                sortBy === key ? 'bg-white text-[#2C1810] border-[#D4B896]' : 'bg-white text-[#5C4730] border-stone-200 hover:border-stone-300'
              }`}
            >
              <ArrowUpDown className="w-3 h-3" />
              {key === 'name' ? 'Naam' : key === 'food_cost' ? 'Food Cost' : 'Categorie'}
            </button>
          ))}
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="card overflow-hidden animate-slide-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="w-8 py-3 px-3" />
                <th className="text-left py-3 px-3 text-[11px] text-[#B8997A] uppercase tracking-wider font-semibold">Gerecht</th>
                <th className="text-left py-3 px-3 text-[11px] text-[#B8997A] uppercase tracking-wider font-semibold">Component</th>
                <th className="text-left py-3 px-3 text-[11px] text-[#B8997A] uppercase tracking-wider font-semibold">Ingrediënt</th>
                <th className="text-right py-3 px-3 text-[11px] text-[#B8997A] uppercase tracking-wider font-semibold">Qty/pp</th>
                <th className="text-left py-3 px-3 text-[11px] text-[#B8997A] uppercase tracking-wider font-semibold">Eenheid</th>
                <th className="text-right py-3 px-3 text-[11px] text-[#B8997A] uppercase tracking-wider font-semibold">Prijs/kg</th>
                <th className="text-right py-3 px-3 text-[11px] text-[#B8997A] uppercase tracking-wider font-semibold">Kost/pp</th>
                <th className="text-center py-3 px-3 text-[11px] text-[#B8997A] uppercase tracking-wider font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(recipe => (
                <>
                  {/* Recipe header row */}
                  <tr
                    key={recipe.id}
                    className="bg-stone-50/50 border-b border-stone-100 cursor-pointer hover:bg-stone-100/50 transition-colors"
                    onClick={() => toggleRecipe(recipe.id)}
                  >
                    <td className="py-2.5 px-3">
                      {recipe.expanded ? <ChevronDown className="w-4 h-4 text-[#9E7E60]" /> : <ChevronRight className="w-4 h-4 text-[#9E7E60]" />}
                    </td>
                    <td className="py-2.5 px-3" colSpan={5}>
                      <div className="flex items-center gap-3">
                        <span className="font-display font-semibold text-stone-900">{recipe.name}</span>
                        {recipe.category_name && (
                          <span className="text-[10px] font-medium text-[#9E7E60] bg-stone-100 px-2 py-0.5 rounded-full">
                            {recipe.category_name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-stone-900">
                      {recipe.total_cost_per_serving != null ? formatCurrency(recipe.total_cost_per_serving) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {recipe.food_cost_percentage != null && recipe.food_cost_percentage > 0 ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${foodCostColor(recipe.food_cost_percentage)}`}>
                          {recipe.food_cost_percentage.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-[#5C4730] text-xs">-</span>
                      )}
                    </td>
                    <td />
                  </tr>

                  {/* Expanded rows */}
                  {recipe.expanded && recipe.components.map(comp => (
                    <>
                      {/* Component header */}
                      <tr key={`comp-${comp.id}`} className="border-b border-stone-50">
                        <td className="py-2 px-3" />
                        <td className="py-2 px-3" />
                        <td className="py-2 px-3 text-xs font-semibold text-[#B8997A] uppercase tracking-wider" colSpan={5}>
                          {comp.name}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-xs text-[#9E7E60]">
                          {formatCurrency(comp.subtotal)}
                        </td>
                        <td />
                      </tr>

                      {/* Ingredient rows */}
                      {comp.ingredients.map(ing => (
                        <tr key={`ing-${ing.id}`} className="border-b border-stone-50 hover:bg-amber-50/30 transition-colors group">
                          <td className="py-1.5 px-3" />
                          <td className="py-1.5 px-3" />
                          <td className="py-1.5 px-3" />
                          <td className="py-1.5 px-3 text-stone-700">{ing.ingredient_name}</td>
                          <td className="py-1.5 px-3 text-right">
                            <InlineEdit
                              value={ing.quantity}
                              onSave={(v) => updateHoeveelheid(ing.id, v)}
                              isSaving={saving === ing.id}
                            />
                          </td>
                          <td className="py-1.5 px-3 text-[#B8997A]">{ing.unit}</td>
                          <td className="py-1.5 px-3 text-right">
                            <InlineEdit
                              value={ing.current_price || 0}
                              onSave={(v) => updatePrice(ing.ingredient_id, v)}
                              isSaving={saving === ing.ingredient_id}
                              prefix="€"
                            />
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono text-xs text-[#B8997A]">
                            {formatCurrency(ing.cost_per_serving)}
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            <button
                              onClick={() => toggleCheck(recipe.id, ing.id)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                ing.checked
                                  ? 'bg-emerald-500 border-emerald-500 text-[#2C1810]'
                                  : 'border-stone-200 hover:border-stone-400'
                              }`}
                            >
                              {ing.checked && <Check className="w-3 h-3" />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer totals */}
        <div className="flex items-center justify-between px-4 py-3 bg-stone-50 border-t border-stone-200">
          <span className="text-sm font-medium text-[#5C4730]">Totaal food cost alle recepten</span>
          <span className="font-mono font-bold text-stone-900">{formatCurrency(totalFoodCost)}</span>
        </div>
      </div>
    </div>
  )
}

// Inline edit component
function InlineEdit({
  value,
  onSave,
  isSaving,
  prefix = '',
}: {
  value: number
  onSave: (v: number) => void
  isSaving: boolean
  prefix?: string
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value.toString())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleSave = () => {
    const num = parseFloat(editValue)
    if (!isNaN(num) && num !== value) {
      onSave(num)
    }
    setEditing(false)
  }

  if (isSaving) {
    return <Loader2 className="w-3 h-3 animate-spin text-amber-500 ml-auto" />
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') setEditing(false)
          if (e.key === 'Tab') {
            handleSave()
          }
        }}
        className="w-20 text-right text-xs font-mono bg-white border border-amber-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
      />
    )
  }

  return (
    <button
      onClick={() => { setEditValue(value.toString()); setEditing(true) }}
      className="font-mono text-xs text-[#5C4730] hover:text-amber-700 hover:bg-amber-50 px-1.5 py-0.5 rounded transition-colors cursor-text"
    >
      {prefix}{value > 0 ? value.toFixed(2) : '-'}
    </button>
  )
}
