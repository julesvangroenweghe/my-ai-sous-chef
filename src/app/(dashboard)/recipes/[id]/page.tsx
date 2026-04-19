'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { RecipeForm } from '@/components/recipes/recipe-form'
import { useRecipes } from '@/hooks/use-recipes'
import { cn, formatCurrency } from '@/lib/utils'
import {
 ArrowLeft, Edit, Clock, Users, RefreshCw,
 ChevronDown, Trash2, Loader2
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
 const [recalculating, setRecalculating] = useState(false)

 const loadRecipe = async () => {
 setLoading(true)
 const data = await getRecipe(id)
 if (data) {
 setRecipe(data)
 setExpandedComps(new Set((data.components || []).map((c) => c.id)))
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
 if (!confirm('Are you sure you want to archive this recipe?')) return
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
 <p className="text-muted-foreground">Recipe not found</p>
 <Button variant="outline" className="mt-4" onClick={() => router.push('/recipes')}>
 Back to Recipes
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
 <h1 className="text-2xl font-bold">Edit: {recipe.name}</h1>
 <p className="text-muted-foreground text-sm mt-1">Update recipe details and components</p>
 </div>
 </div>
 <RecipeForm recipe={recipe} />
 </div>
 )
 }

 const sortedComponents = (recipe.components || []).sort((a, b) => a.sort_order - b.sort_order)
 const servings = (recipe as any).serving_size_grams || (recipe as any).servings || 1
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
 <h1 className="text-2xl font-bold">{recipe.name}</h1>
 <div className="flex items-center gap-2 mt-1 flex-wrap">
 {recipe.category && <Badge variant="secondary">{(recipe.category as any).name}</Badge>}
 {recipe.subcategory && <Badge variant="outline">{(recipe.subcategory as any).name}</Badge>}
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={recalculating} className="gap-1.5">
 {recalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
 Recalculate
 </Button>
 <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="gap-1.5">
 <Edit className="h-4 w-4" /> Edit
 </Button>
 <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:text-destructive">
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 </div>

 {/* Description */}
 {recipe.description && (
 <p className="text-muted-foreground">{recipe.description}</p>
 )}

 {/* Meta info */}
 <div className="flex gap-4 flex-wrap">
 {servings > 1 && (
 <div className="flex items-center gap-2 text-sm text-muted-foreground">
 <Users className="h-4 w-4" /> {servings} servings
 </div>
 )}
 {recipe.prep_time_minutes && (
 <div className="flex items-center gap-2 text-sm text-muted-foreground">
 <Clock className="h-4 w-4" /> {recipe.prep_time_minutes} min
 </div>
 )}
 {sellingPrice && (
 <div className="flex items-center gap-2 text-sm font-medium">
 Selling price: {formatCurrency(Number(sellingPrice))}
 </div>
 )}
 {totalCostPerServing && (
 <div className="flex items-center gap-2 text-sm font-medium">
 Cost/serving: {formatCurrency(Number(totalCostPerServing))}
 </div>
 )}
 {foodCostPct && Number(foodCostPct) > 0 && (
 <div className={cn(
 'flex items-center gap-2 text-sm font-bold',
 Number(foodCostPct) < 30 ? 'text-green-600' : Number(foodCostPct) <= 35 ? 'text-yellow-600' : 'text-red-600'
 )}>
 Food cost: {Number(foodCostPct).toFixed(1)}%
 </div>
 )}
 </div>

 {/* Components */}
 <div className="space-y-3">
 <h2 className="text-lg font-semibold">Components ({sortedComponents.length})</h2>
 {sortedComponents.map((component) => {
 const isExpanded = expandedComps.has(component.id)
 const compCost = (component.ingredients || []).reduce((sum, ci) => {
 return sum + ((ci as any).cost_per_unit || (ci as any).ingredient?.current_price || (ci as any).ingredient?.default_unit_price || 0) * ((ci as any).quantity || (ci as any).quantity_per_person || 0)
 }, 0)

 return (
 <Card key={component.id}>
 <CardHeader className="pb-0 cursor-pointer" onClick={() => toggleComp(component.id)}>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <ChevronDown className={cn(
 'h-4 w-4 text-muted-foreground transition-transform',
 !isExpanded && '-rotate-90'
 )} />
 <CardTitle className="text-base">{component.name}</CardTitle>
 <Badge variant="outline" className="text-xs">
 {component.ingredients?.length || 0} ingredient{(component.ingredients?.length || 0) !== 1 ? 's' : ''}
 </Badge>
 </div>
 <span className="text-sm font-bold">{formatCurrency(compCost)}</span>
 </div>
 </CardHeader>
 {isExpanded && (
 <CardContent className="pt-3">
 {(component as any).notes && (
 <p className="text-sm text-muted-foreground mb-3 italic">{(component as any).notes}</p>
 )}
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b text-left text-muted-foreground text-xs">
 <th className="pb-2 font-medium">Ingredient</th>
 <th className="pb-2 font-medium text-right">Qty</th>
 <th className="pb-2 font-medium text-right">Unit</th>
 <th className="pb-2 font-medium text-right">Price/unit</th>
 <th className="pb-2 font-medium text-right">Cost</th>
 </tr>
 </thead>
 <tbody>
 {component.ingredients?.map((ci) => {
 const price = (ci as any).cost_per_unit || (ci as any).ingredient?.current_price || (ci as any).ingredient?.default_unit_price || 0
 const qty = (ci as any).quantity || (ci as any).quantity_per_person || 0
 const cost = price * qty
 return (
 <tr key={ci.id} className="border-b last:border-0">
 <td className="py-2 font-medium">{(ci as any).ingredient?.name || '—'}</td>
 <td className="py-2 text-right">{qty}</td>
 <td className="py-2 text-right">{ci.unit}</td>
 <td className="py-2 text-right text-muted-foreground">{formatCurrency(price)}</td>
 <td className="py-2 text-right font-medium">{formatCurrency(cost)}</td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </CardContent>
 )}
 </Card>
 )
 })}
 {sortedComponents.length === 0 && (
 <Card className="p-8 text-center">
 <p className="text-muted-foreground">No components added yet</p>
 </Card>
 )}
 </div>

 {/* Notes */}
 {(recipe as any).notes && (
 <Card>
 <CardHeader>
 <CardTitle className="text-base">Notes</CardTitle>
 </CardHeader>
 <CardContent>
 <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(recipe as any).notes}</p>
 </CardContent>
 </Card>
 )}
 </div>
 )
}
