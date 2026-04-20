'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ComponentBuilder, type RecipeComponentData } from '@/components/recipes/component-builder'
import { useRecipes } from '@/hooks/use-recipes'
import { cn, formatCurrency } from '@/lib/utils'
import { Loader2, Save, ArrowLeft, ArrowRight, Check, ChevronRight } from 'lucide-react'
import type { RecipeCategory, Recipe } from '@/types/database'

interface RecipeFormProps {
 recipe?: Recipe // if editing
}

const STEPS = [
 { label: 'Basis', description: 'Naam, categorie & prijszetting' },
 { label: 'Componenten', description: 'Ingredienten & hoeveelheden' },
 { label: 'Overzicht', description: 'Controleer & bewaar' },
]

export function RecipeForm({ recipe }: RecipeFormProps) {
 const router = useRouter()
 const supabase = createClient()
 const { createRecipe, updateRecipe, loading } = useRecipes()

 const [step, setStep] = useState(0)
 const [categories, setCategories] = useState<RecipeCategory[]>([])

 // Step 1 fields
 const [name, setName] = useState(recipe?.name || '')
 const [description, setDescription] = useState(recipe?.description || '')
 const [categoryId, setCategoryId] = useState(recipe?.category_id || '')
 const [subcategoryId, setSubcategoryId] = useState(recipe?.subcategory_id || '')
 const [servings, setServings] = useState(recipe?.servings?.toString() || '')
 const [prepTime, setPrepTime] = useState(recipe?.prep_time_minutes?.toString() || '')
 const [sellingPrice, setSellingPrice] = useState(recipe?.selling_price?.toString() || '')
 const [notes, setNotes] = useState(recipe?.notes || '')

 // Step 2 fields
 const [components, setComponents] = useState<RecipeComponentData[]>(() => {
 if (recipe?.components) {
 return recipe.components
 .sort((a, b) => a.sort_order - b.sort_order)
 .map((c) => ({
 name: c.name,
 notes: c.notes || '',
 ingredients: (c.ingredients || []).map((ci) => ({
 ingredient_id: ci.ingredient_id,
 ingredient_name: ci.ingredient?.name || '',
 quantity: ci.quantity,
 unit: ci.unit,
 notes: ci.notes || '',
 cost_per_unit: ci.cost_per_unit || ci.ingredient?.current_price || 0,
 })),
 }))
 }
 return [{ name: '', notes: '', ingredients: [] }]
 })

 useEffect(() => {
 supabase
 .from('recipe_categories')
 .select('*, subcategories:recipe_subcategories(*)')
 .order('sort_order')
 .then(({ data }) => {
 if (data) setCategories(data as unknown as RecipeCategory[])
 })
 }, [])

 const selectedCategory = categories.find((c) => c.id === categoryId)

 // Cost calculations
 const totalCost = components.reduce((sum, comp) =>
 sum + comp.ingredients.reduce((s, ing) => s + (ing.cost_per_unit || 0) * ing.quantity, 0), 0
 )
 const numServings = Number(servings) || 1
 const costPerServing = totalCost / numServings
 const numSellingPrice = Number(sellingPrice) || 0
 const foodCostPct = numSellingPrice > 0 ? (costPerServing / numSellingPrice) * 100 : 0
 const margin = numSellingPrice - costPerServing

 const canProceed = () => {
 if (step === 0) return name.trim().length > 0
 if (step === 1) return components.some((c) => c.name.trim().length > 0)
 return true
 }

 const handleSubmit = async () => {
 const data = {
 name,
 description: description || undefined,
 category_id: categoryId || undefined,
 subcategory_id: subcategoryId || undefined,
 servings: servings ? Number(servings) : undefined,
 prep_time_minutes: prepTime ? Number(prepTime) : undefined,
 selling_price: sellingPrice ? Number(sellingPrice) : undefined,
 notes: notes || undefined,
 components: components.filter((c) => c.name.trim()).map((c) => ({
 name: c.name,
 notes: c.notes || undefined,
 ingredients: c.ingredients.filter((i) => i.ingredient_id).map((i) => ({
 ingredient_id: i.ingredient_id,
 quantity: i.quantity,
 unit: i.unit,
 notes: i.notes || undefined,
 cost_per_unit: i.cost_per_unit || undefined,
 })),
 })),
 }

 if (recipe) {
 const result = await updateRecipe(recipe.id, data)
 if (result.success) router.push(`/recipes/${recipe.id}`)
 } else {
 const result = await createRecipe(data)
 if (result.success) router.push(`/recipes/${result.id}`)
 }
 }

 const getFoodCostColor = () => {
 if (foodCostPct <= 0) return 'text-gray-400'
 if (foodCostPct < 30) return 'text-green-600'
 if (foodCostPct <= 35) return 'text-yellow-600'
 return 'text-red-600'
 }

 return (
 <div className="space-y-6">
 {/* Step indicator */}
 <div className="flex items-center gap-2">
 {STEPS.map((s, i) => (
 <div key={i} className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => { if (i <= step || canProceed()) setStep(i) }}
 className={cn(
 'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
 i === step
 ? 'bg-primary text-primary-foreground'
 : i < step
 ? 'bg-green-100 text-green-700'
 : 'bg-muted text-muted-foreground'
 )}
 >
 {i < step ? (
 <Check className="h-3.5 w-3.5" />
 ) : (
 <span className="h-5 w-5 rounded-full border-2 border-current flex items-center justify-center text-xs">
 {i + 1}
 </span>
 )}
 <span className="hidden sm:inline">{s.label}</span>
 </button>
 {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
 </div>
 ))}
 </div>

 {/* Step 1 — Basics */}
 {step === 0 && (
 <Card>
 <CardHeader>
 <CardTitle className="text-base">Basisinformatie</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="name">Receptnaam *</Label>
 <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="bv. Tartaar van Rundsvlees" required />
 </div>
 <div className="space-y-2">
 <Label htmlFor="description">Beschrijving</Label>
 <textarea
 id="description"
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 placeholder="Korte beschrijving van het gerecht..."
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>Categorie</Label>
 <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setSubcategoryId('') }}>
 <option value="">Kies categorie</option>
 {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
 </Select>
 </div>
 <div className="space-y-2">
 <Label>Subcategorie</Label>
 <Select value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} disabled={!categoryId}>
 <option value="">Kies subcategorie</option>
 {selectedCategory?.subcategories?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
 </Select>
 </div>
 </div>
 <div className="grid grid-cols-3 gap-4">
 <div className="space-y-2">
 <Label htmlFor="servings">Porties</Label>
 <Input id="servings" type="number" value={servings} onChange={(e) => setServings(e.target.value)} placeholder="bv. 4" />
 </div>
 <div className="space-y-2">
 <Label htmlFor="prep">Bereidingstijd (min)</Label>
 <Input id="prep" type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} placeholder="bv. 45" />
 </div>
 <div className="space-y-2">
 <Label htmlFor="price">Verkoopprijs (€)</Label>
 <Input id="price" type="number" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="bv. 28.00" />
 </div>
 </div>
 <div className="space-y-2">
 <Label htmlFor="notes">Notities</Label>
 <textarea
 id="notes"
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 placeholder="Interne notities, opmaakbeschrijving..."
 />
 </div>
 </CardContent>
 </Card>
 )}

 {/* Step 2 — Components */}
 {step === 1 && (
 <ComponentBuilder components={components} onChange={setComponents} />
 )}

 {/* Step 3 — Review */}
 {step === 2 && (
 <div className="space-y-4">
 {/* Summary header */}
 <Card>
 <CardHeader>
 <CardTitle className="text-base">Receptoverzicht</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-sm text-muted-foreground">Name</p>
 <p className="font-semibold">{name}</p>
 </div>
 <div>
 <p className="text-sm text-muted-foreground">Categorie</p>
 <p className="font-medium">
 {selectedCategory?.name || 'Geen'}
 {subcategoryId && selectedCategory?.subcategories?.find((s) => s.id === subcategoryId)?.name
 ? ` → ${selectedCategory.subcategories.find((s) => s.id === subcategoryId)!.name}`
 : ''}
 </p>
 </div>
 <div>
 <p className="text-sm text-muted-foreground">Porties</p>
 <p className="font-medium">{servings || '—'}</p>
 </div>
 <div>
 <p className="text-sm text-muted-foreground">Bereidingstijd</p>
 <p className="font-medium">{prepTime ? `${prepTime} min` : '—'}</p>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Cost summary */}
 <Card>
 <CardHeader>
 <CardTitle className="text-base">Kostenanalyse</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="space-y-1">
 <p className="text-xs text-muted-foreground uppercase">Totale Kost</p>
 <p className="text-xl font-bold">{formatCurrency(totalCost)}</p>
 </div>
 <div className="space-y-1">
 <p className="text-xs text-muted-foreground uppercase">Per Portie</p>
 <p className="text-xl font-bold">{formatCurrency(costPerServing)}</p>
 </div>
 <div className="space-y-1">
 <p className="text-xs text-muted-foreground uppercase">Food Cost %</p>
 <p className={cn('text-xl font-bold', getFoodCostColor())}>
 {foodCostPct > 0 ? `${foodCostPct.toFixed(1)}%` : '—'}
 </p>
 </div>
 <div className="space-y-1">
 <p className="text-xs text-muted-foreground uppercase">Marge</p>
 <p className={cn('text-xl font-bold', margin >= 0 ? 'text-green-600' : 'text-red-600')}>
 {numSellingPrice > 0 ? formatCurrency(margin) : '—'}
 </p>
 </div>
 </div>

 {/* Food cost bar */}
 {numSellingPrice > 0 && (
 <div className="mt-4 space-y-1">
 <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
 <div
 className={cn(
 'h-full rounded-full transition-all',
 foodCostPct < 30 ? 'bg-green-500' : foodCostPct <= 35 ? 'bg-yellow-500' : 'bg-red-500'
 )}
 style={{ width: `${Math.min(foodCostPct, 100)}%` }}
 />
 </div>
 <div className="flex justify-between text-xs text-muted-foreground">
 <span>0%</span>
 <span className="text-green-600">30%</span>
 <span className="text-yellow-600">35%</span>
 <span>100%</span>
 </div>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Components breakdown */}
 {components.filter((c) => c.name.trim()).map((comp, ci) => {
 const compCost = comp.ingredients.reduce((s, ing) => s + (ing.cost_per_unit || 0) * ing.quantity, 0)
 return (
 <Card key={ci}>
 <CardHeader className="pb-2">
 <div className="flex items-center justify-between">
 <CardTitle className="text-sm">{comp.name}</CardTitle>
 <span className="text-sm font-bold">{formatCurrency(compCost)}</span>
 </div>
 </CardHeader>
 <CardContent>
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b text-left text-muted-foreground text-xs">
 <th className="pb-2 font-medium">Ingrediënt</th>
 <th className="pb-2 font-medium text-right">Hvh</th>
 <th className="pb-2 font-medium text-right">Eenheid</th>
 <th className="pb-2 font-medium text-right">Kost</th>
 </tr>
 </thead>
 <tbody>
 {comp.ingredients.filter((i) => i.ingredient_id).map((ing, ii) => (
 <tr key={ii} className="border-b last:border-0">
 <td className="py-1.5 font-medium">{ing.ingredient_name || '—'}</td>
 <td className="py-1.5 text-right">{ing.quantity}</td>
 <td className="py-1.5 text-right">{ing.unit}</td>
 <td className="py-1.5 text-right font-medium">{formatCurrency((ing.cost_per_unit || 0) * ing.quantity)}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </CardContent>
 </Card>
 )
 })}
 </div>
 )}

 {/* Navigation buttons */}
 <div className="flex items-center justify-between pt-2">
 <div>
 {step > 0 && (
 <Button type="button" variant="outline" onClick={() => setStep(step - 1)} className="gap-2">
 <ArrowLeft className="h-4 w-4" /> Terug
 </Button>
 )}
 </div>
 <div className="flex gap-3">
 <Button type="button" variant="ghost" onClick={() => router.back()}>Annuleren</Button>
 {step < 2 ? (
 <Button type="button" onClick={() => setStep(step + 1)} disabled={!canProceed()} className="gap-2">
 Volgende <ArrowRight className="h-4 w-4" />
 </Button>
 ) : (
 <Button type="button" onClick={handleSubmit} disabled={loading || !name} className="gap-2">
 {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
 {recipe ? 'Recept Bijwerken' : 'Recept Opslaan'}
 </Button>
 )}
 </div>
 </div>
 </div>
 )
}
