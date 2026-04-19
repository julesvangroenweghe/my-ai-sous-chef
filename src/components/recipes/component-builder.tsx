'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { IngredientSearch } from '@/components/recipes/ingredient-search'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useIngredients } from '@/hooks/use-ingredients'
import type { Ingredient } from '@/types/database'

export interface ComponentIngredient {
 ingredient_id: string
 ingredient_name?: string
 quantity: number
 unit: string
 notes: string
 cost_per_unit: number
}

export interface RecipeComponentData {
 name: string
 notes: string
 ingredients: ComponentIngredient[]
}

interface ComponentBuilderProps {
 components: RecipeComponentData[]
 onChange: (components: RecipeComponentData[]) => void
}

const UNITS = ['g', 'kg', 'ml', 'l', 'stuks', 'el', 'tl', 'snuf', 'bos', 'blad']

export function ComponentBuilder({ components, onChange }: ComponentBuilderProps) {
 const [collapsedComponents, setCollapsedComponents] = useState<Set<number>>(new Set())
 const [showNewIngredient, setShowNewIngredient] = useState(false)
 const [newIngName, setNewIngName] = useState('')
 const [newIngCategory, setNewIngCategory] = useState('')
 const [newIngUnit, setNewIngUnit] = useState('')
 const [newIngPrice, setNewIngPrice] = useState('')
 const [pendingIngCallback, setPendingIngCallback] = useState<((ing: Ingredient) => void) | null>(null)
 const { createIngredient } = useIngredients()

 const addComponent = () => {
 onChange([...components, { name: '', notes: '', ingredients: [] }])
 }

 const removeComponent = (index: number) => {
 onChange(components.filter((_, i) => i !== index))
 collapsedComponents.delete(index)
 setCollapsedComponents(new Set(collapsedComponents))
 }

 const updateComponent = (index: number, field: string, value: string) => {
 const updated = [...components]
 updated[index] = { ...updated[index], [field]: value }
 onChange(updated)
 }

 const moveComponent = (index: number, direction: 'up' | 'down') => {
 const newIndex = direction === 'up' ? index - 1 : index + 1
 if (newIndex < 0 || newIndex >= components.length) return
 const updated = [...components]
 const temp = updated[index]
 updated[index] = updated[newIndex]
 updated[newIndex] = temp
 onChange(updated)
 }

 const toggleCollapse = (index: number) => {
 const next = new Set(collapsedComponents)
 if (next.has(index)) next.delete(index)
 else next.add(index)
 setCollapsedComponents(next)
 }

 const addIngredient = (compIndex: number) => {
 const updated = [...components]
 updated[compIndex].ingredients.push({
 ingredient_id: '',
 ingredient_name: '',
 quantity: 0,
 unit: 'g',
 notes: '',
 cost_per_unit: 0,
 })
 onChange(updated)
 }

 const removeIngredient = (compIndex: number, ingIndex: number) => {
 const updated = [...components]
 updated[compIndex].ingredients = updated[compIndex].ingredients.filter((_, i) => i !== ingIndex)
 onChange(updated)
 }

 const updateIngredient = (compIndex: number, ingIndex: number, field: string, value: string | number) => {
 const updated = [...components]
 updated[compIndex].ingredients[ingIndex] = {
 ...updated[compIndex].ingredients[ingIndex],
 [field]: value,
 }
 onChange(updated)
 }

 const selectIngredient = (compIndex: number, ingIndex: number, ingredient: Ingredient) => {
 const updated = [...components]
 updated[compIndex].ingredients[ingIndex] = {
 ...updated[compIndex].ingredients[ingIndex],
 ingredient_id: ingredient.id,
 ingredient_name: ingredient.name,
 cost_per_unit: ingredient.current_price || 0,
 unit: ingredient.unit || updated[compIndex].ingredients[ingIndex].unit,
 }
 onChange(updated)
 }

 const handleCreateNewIngredient = (name: string, compIndex: number, ingIndex: number) => {
 setNewIngName(name)
 setNewIngCategory('')
 setNewIngUnit('g')
 setNewIngPrice('')
 setPendingIngCallback(() => (ing: Ingredient) => {
 selectIngredient(compIndex, ingIndex, ing)
 })
 setShowNewIngredient(true)
 }

 const handleSaveNewIngredient = async () => {
 const result = await createIngredient({
 name: newIngName,
 category: newIngCategory || undefined,
 unit: newIngUnit || undefined,
 current_price: newIngPrice ? Number(newIngPrice) : undefined,
 })
 if (result.success && result.data && pendingIngCallback) {
 pendingIngCallback(result.data)
 }
 setShowNewIngredient(false)
 setPendingIngCallback(null)
 }

 const getComponentCost = (comp: RecipeComponentData) => {
 return comp.ingredients.reduce((sum, ing) => sum + (ing.cost_per_unit || 0) * ing.quantity, 0)
 }

 const totalCost = components.reduce((sum, comp) => sum + getComponentCost(comp), 0)

 return (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-lg font-semibold">Components</h2>
 <p className="text-sm text-muted-foreground">
 Total ingredient cost: <span className="font-bold text-foreground">{formatCurrency(totalCost)}</span>
 </p>
 </div>
 <Button type="button" variant="outline" size="sm" onClick={addComponent} className="gap-1">
 <Plus className="h-4 w-4" /> Add Component
 </Button>
 </div>

 {components.map((comp, ci) => {
 const isCollapsed = collapsedComponents.has(ci)
 const compCost = getComponentCost(comp)

 return (
 <Card key={ci} className="overflow-hidden">
 <CardHeader className="pb-0 pt-4 px-4">
 <div className="flex items-center gap-2">
 <div className="flex flex-col gap-0.5">
 <button type="button" onClick={() => moveComponent(ci, 'up')} disabled={ci === 0}
 className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
 <ChevronUp className="h-3 w-3" />
 </button>
 <button type="button" onClick={() => moveComponent(ci, 'down')} disabled={ci === components.length - 1}
 className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
 <ChevronDown className="h-3 w-3" />
 </button>
 </div>
 <Input
 value={comp.name}
 onChange={(e) => updateComponent(ci, 'name', e.target.value)}
 placeholder="Component name (e.g. Tartare mix, Sauce, Garnish)"
 className="font-medium"
 />
 <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
 {formatCurrency(compCost)}
 </span>
 <button
 type="button"
 onClick={() => toggleCollapse(ci)}
 className="p-1.5 text-muted-foreground hover:text-foreground"
 >
 <ChevronDown className={cn('h-4 w-4 transition-transform', isCollapsed && '-rotate-90')} />
 </button>
 <Button type="button" variant="ghost" size="icon" onClick={() => removeComponent(ci)} className="shrink-0">
 <Trash2 className="h-4 w-4 text-destructive" />
 </Button>
 </div>
 </CardHeader>

 {!isCollapsed && (
 <CardContent className="pt-3 pb-4 px-4 space-y-2">
 {/* Ingredient rows */}
 {comp.ingredients.length > 0 && (
 <div className="space-y-2">
 <div className="grid grid-cols-[1fr,80px,90px,70px,36px] gap-2 text-xs font-medium text-muted-foreground px-1">
 <span>Ingredient</span>
 <span>Qty</span>
 <span>Unit</span>
 <span className="text-right">Cost</span>
 <span></span>
 </div>
 {comp.ingredients.map((ing, ii) => (
 <div key={ii} className="grid grid-cols-[1fr,80px,90px,70px,36px] gap-2 items-center">
 <IngredientSearch
 value={ing.ingredient_id}
 onSelect={(ingredient) => selectIngredient(ci, ii, ingredient)}
 onCreateNew={(name) => handleCreateNewIngredient(name, ci, ii)}
 />
 <Input
 type="number"
 step="0.01"
 value={ing.quantity || ''}
 onChange={(e) => updateIngredient(ci, ii, 'quantity', Number(e.target.value))}
 placeholder="0"
 className="h-9"
 />
 <Select
 value={ing.unit}
 onChange={(e) => updateIngredient(ci, ii, 'unit', e.target.value)}
 className="h-9 text-sm"
 >
 {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
 </Select>
 <span className="text-sm font-medium text-right">
 {formatCurrency((ing.cost_per_unit || 0) * ing.quantity)}
 </span>
 <Button type="button" variant="ghost" size="icon" onClick={() => removeIngredient(ci, ii)} className="h-9 w-9">
 <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
 </Button>
 </div>
 ))}
 </div>
 )}
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => addIngredient(ci)}
 className="gap-1 text-muted-foreground"
 >
 <Plus className="h-3 w-3" /> Add Ingredient
 </Button>
 </CardContent>
 )}
 </Card>
 )
 })}

 {components.length === 0 && (
 <div className="border-2 border-dashed rounded-xl p-8 text-center">
 <p className="text-muted-foreground mb-3">No components yet. Add your first component.</p>
 <Button type="button" variant="outline" onClick={addComponent} className="gap-2">
 <Plus className="h-4 w-4" /> Add Component
 </Button>
 </div>
 )}

 {/* Quick-add ingredient dialog */}
 <Dialog open={showNewIngredient} onOpenChange={setShowNewIngredient}>
 <DialogHeader><DialogTitle>Quick Add Ingredient</DialogTitle></DialogHeader>
 <DialogContent className="space-y-4">
 <div className="space-y-2">
 <Label>Name *</Label>
 <Input value={newIngName} onChange={(e) => setNewIngName(e.target.value)} placeholder="e.g. Zeebaarsfilet" />
 </div>
 <div className="space-y-2">
 <Label>Category</Label>
 <Input value={newIngCategory} onChange={(e) => setNewIngCategory(e.target.value)} placeholder="e.g. Fish" />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>Unit</Label>
 <Select value={newIngUnit} onChange={(e) => setNewIngUnit(e.target.value)}>
 {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
 </Select>
 </div>
 <div className="space-y-2">
 <Label>Price per Unit (€)</Label>
 <Input type="number" step="0.01" value={newIngPrice} onChange={(e) => setNewIngPrice(e.target.value)} placeholder="0.00" />
 </div>
 </div>
 </DialogContent>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowNewIngredient(false)}>Cancel</Button>
 <Button onClick={handleSaveNewIngredient} disabled={!newIngName}>Add & Select</Button>
 </DialogFooter>
 </Dialog>
 </div>
 )
}
