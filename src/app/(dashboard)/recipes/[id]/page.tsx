'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { RecipeForm } from '@/components/recipes/recipe-form'
import { useRecipes } from '@/hooks/use-recipes'
import { useUnitPreferences } from '@/hooks/use-unit-preferences'
import { formatHoeveelheid, calculateIngredientCost } from '@/lib/units'
import { UnitToggle } from '@/components/UnitToggle'
import { cn, formatCurrency } from '@/lib/utils'
import {
  ArrowLeft, Edit, Clock, Users, RefreshCw,
  ChevronDown, Trash2, Loader2, Scale, BookOpen
} from 'lucide-react'
import type { Recipe } from '@/types/database'

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { getRecipe, deleteRecipe, recalculateCosts, loading: actionLoading } = useRecipes()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [expandedComps, setExpandedComps] = useState<Set<string>>(new Set())
  const [expandedMethods, setExpandedMethods] = useState<Set<string>>(new Set())
  const [recalculating, setRecalculating] = useState(false)

  const loadRecipe = async () => {
    setLoading(true)
    const data = await getRecipe(id)
    if (data) {
      setRecipe(data)
      setExpandedComps(new Set((data.components || []).map((c) => c.id)))
      // Bereiding default open
      setExpandedMethods(new Set((data.components || []).filter((c: any) => c.method).map((c) => c.id)))
    }
    setLoading(false)
  }

  useEffect(() => {
    loadRecipe()
  }, [id])

  const handleRecalculate = async () => {
    setRecalculating(true)
    const result = await recalculateCosts(id)
    if (result.success) {
      await loadRecipe()
    }
    setRecalculating(false)
  }

  const handleDelete = async () => {
    if (!confirm('Weet je zeker dat je dit recept wilt archiveren?')) return
    const result = await deleteRecipe(id)
    if (result.success) {
      router.push('/recipes')
    }
  }

  const toggleComp = (compId: string) => {
    const next = new Set(expandedComps)
    if (next.has(compId)) next.delete(compId)
    else next.add(compId)
    setExpandedComps(next)
  }

  const toggleMethod = (compId: string) => {
    const next = new Set(expandedMethods)
    if (next.has(compId)) next.delete(compId)
    else next.add(compId)
    setExpandedMethods(next)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Recept niet gevonden</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/recipes')}>
          Terug naar Recepten
        </Button>
      </div>
    )
  }

  if (editMode) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setEditMode(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Bewerk: {recipe.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">Bewerk receptdetails en componenten</p>
          </div>
        </div>
        <RecipeForm recipe={recipe} />
      </div>
    )
  }

  const sortedComponents = (recipe.components || []).sort((a, b) => a.sort_order - b.sort_order)
  const numberOfServings = (recipe as any).number_of_servings || 4
  const servingSizeGrams = (recipe as any).serving_size_grams
  const sellingPrice = (recipe as any).selling_price
  const foodCostPct = (recipe as any).food_cost_percentage
  const totalCostPerServing = (recipe as any).total_cost_per_serving

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/recipes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-stone-900">{recipe.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {recipe.category && <Badge variant="secondary">{(recipe.category as any).name}</Badge>}
            {recipe.subcategory && <Badge variant="outline">{(recipe.subcategory as any).name}</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={recalculating} className="gap-1.5">
            {recalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Herbereken
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="gap-1.5">
            <Edit className="h-4 w-4" /> Bewerk
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Description */}
      {recipe.description && (
        <p className="text-stone-500 leading-relaxed">{recipe.description}</p>
      )}

      {/* Meta info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
            <Users className="h-3.5 w-3.5" /> Porties
          </div>
          <div className="font-mono text-xl font-bold text-stone-900">{numberOfServings}</div>
          {servingSizeGrams && (
            <div className="text-xs text-stone-400 mt-0.5">{servingSizeGrams}g per portie</div>
          )}
        </div>
        {recipe.prep_time_minutes && (
          <div className="card p-4">
            <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
              <Clock className="h-3.5 w-3.5" /> Bereidingstijd
            </div>
            <div className="font-mono text-xl font-bold text-stone-900">{recipe.prep_time_minutes} min</div>
          </div>
        )}
        {sellingPrice && (
          <div className="card p-4">
            <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
              <Scale className="h-3.5 w-3.5" /> Verkoopprijs
            </div>
            <div className="font-mono text-xl font-bold text-stone-900">{formatCurrency(Number(sellingPrice))}</div>
            {totalCostPerServing && (
              <div className="text-xs text-stone-400 mt-0.5">
                Kostprijs: {formatCurrency(Number(totalCostPerServing))}
              </div>
            )}
          </div>
        )}
        {foodCostPct != null && Number(foodCostPct) > 0 && (
          <div className="card p-4">
            <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
              Food cost
            </div>
            <div className={cn(
              'font-mono text-xl font-bold',
              Number(foodCostPct) < 30 ? 'text-emerald-600' : Number(foodCostPct) <= 35 ? 'text-amber-600' : 'text-red-600'
            )}>
              {Number(foodCostPct).toFixed(1)}%
            </div>
            <div className="text-xs text-stone-400 mt-0.5">
              {Number(foodCostPct) <= 30 ? 'Uitstekend' : Number(foodCostPct) <= 35 ? 'Binnen target' : 'Boven target'}
            </div>
          </div>
        )}
      </div>

      {/* Components */}
      <div className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-stone-900">
          Componenten ({sortedComponents.length})
        </h2>
        {sortedComponents.map((component) => {
          const isExpanded = expandedComps.has(component.id)
          const methodExpanded = expandedMethods.has(component.id)
          const method = (component as any).method
          const compCost = (component.ingredients || []).reduce((sum, ci) => {
            const price = (ci as any).cost_per_unit || (ci as any).ingredient?.current_price || (ci as any).ingredient?.default_unit_price || 0
            const qty = (ci as any).quantity_per_person || (ci as any).quantity || 0
            const recipeUnit = (ci as any).unit || 'g'
            const ingredientUnit = (ci as any).ingredient?.unit || undefined
            const weightPerPiece = (ci as any).ingredient?.weight_per_piece_g || undefined
            const costPerPerson = calculateIngredientCost(qty, recipeUnit, price, ingredientUnit, weightPerPiece)
            return sum + (costPerPerson * numberOfServings)
          }, 0)

          return (
            <Card key={component.id} className="overflow-hidden">
              <CardHeader className="pb-0 cursor-pointer hover:bg-stone-50/50 transition-colors" onClick={() => toggleComp(component.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ChevronDown className={cn(
                      'h-4 w-4 text-stone-400 transition-transform',
                      !isExpanded && '-rotate-90'
                    )} />
                    <CardTitle className="text-base font-semibold">{component.name}</CardTitle>
                    <Badge variant="outline" className="text-xs font-mono">
                      {component.ingredients?.length || 0} ingr.
                    </Badge>
                    {method && (
                      <Badge variant="secondary" className="text-xs">
                        Bereiding
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm font-mono font-bold text-stone-700">{formatCurrency(compCost)}</span>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="pt-4 space-y-4">
                  {/* Ingredients table */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-stone-400 text-xs">
                        <th className="pb-2 font-medium">Ingrediënt</th>
                        <th className="pb-2 font-medium text-right">Per persoon</th>
                        <th className="pb-2 font-medium text-right">Totaal ({numberOfServings}p)</th>
                        <th className="pb-2 font-medium text-right">Eenheid</th>
                        <th className="pb-2 font-medium text-right">Prijs/eenheid</th>
                        <th className="pb-2 font-medium text-right">Kost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {component.ingredients?.map((ci) => {
                        const price = (ci as any).cost_per_unit || (ci as any).ingredient?.current_price || (ci as any).ingredient?.default_unit_price || 0
                        const qtyPP = (ci as any).quantity_per_person || (ci as any).quantity || 0
                        const unit = (ci as any).unit || 'g'
                        const ingredientUnit = (ci as any).ingredient?.unit || undefined
                        const weightPerPiece = (ci as any).ingredient?.weight_per_piece_g || undefined
                        const qtyTotal = qtyPP * numberOfServings
                        const costPerPerson = calculateIngredientCost(qtyPP, unit, price, ingredientUnit, weightPerPiece)
                        const cost = costPerPerson * numberOfServings
                        return (
                          <tr key={ci.id} className="border-b last:border-0 hover:bg-stone-50/50 transition-colors">
                            <td className="py-2.5 font-medium text-stone-900">
                              {(ci as any).ingredient?.name || '\u2014'}
                            </td>
                            <td className="py-2.5 text-right font-mono text-stone-600">{formatHoeveelheid(qtyPP, unit)}</td>
                            <td className="py-2.5 text-right font-mono font-medium text-stone-900">{formatHoeveelheid(qtyTotal, unit)}</td>
                            <td className="py-2.5 text-right text-stone-400">{ci.unit}</td>
                            <td className="py-2.5 text-right text-stone-400 font-mono">{formatCurrency(price)}/{(ci as any).ingredient?.unit === 'stuks' || (ci as any).ingredient?.unit === 'stuk' ? 'stuk' : (ci as any).ingredient?.unit === 'l' ? 'l' : 'kg'}</td>
                            <td className="py-2.5 text-right font-mono font-medium text-stone-700">{formatCurrency(cost)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                  {/* Method / Bereiding */}
                  {method && (
                    <div className="border-t pt-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleMethod(component.id) }}
                        className="flex items-center gap-2 text-sm font-medium text-stone-700 hover:text-stone-900 transition-colors w-full text-left"
                      >
                        <BookOpen className="h-4 w-4 text-amber-500" />
                        <span>Bereiding</span>
                        <ChevronDown className={cn(
                          'h-3.5 w-3.5 text-stone-400 transition-transform ml-auto',
                          !methodExpanded && '-rotate-90'
                        )} />
                      </button>
                      {methodExpanded && (
                        <div className="mt-3 pl-6 text-sm text-stone-600 leading-relaxed whitespace-pre-line">
                          {method}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Component notes */}
                  {(component as any).notes && (
                    <div className="border-t pt-3">
                      <p className="text-sm text-stone-400 italic">{(component as any).notes}</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}
        {sortedComponents.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-stone-400">Nog geen componenten toegevoegd</p>
          </Card>
        )}
      </div>

      {/* Recipe notes */}
      {(recipe as any).notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-500 whitespace-pre-wrap">{(recipe as any).notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
