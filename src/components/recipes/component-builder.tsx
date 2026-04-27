'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { IngredientSearch } from '@/components/recipes/ingredient-search'
import { calcComponentCost } from '@/lib/units'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useIngredients } from '@/hooks/use-ingredients'
import type { Ingredient } from '@/types/database'

export interface ComponentIngredient {
  ingredient_id: string
  ingredient_name?: string
  quantity: number
  unit: string
  notes: string
  cost_per_unit: number  // price per kg (for 'kg'/'l' units) or price per gram (for 'g'/'ml' units)
  price_per_kg: number   // raw price per kg from DB — used to recalculate when unit changes
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

/**
 * Compute cost per 1 unit based on price_per_kg and the selected unit.
 * price_per_kg is always stored as €/kg regardless of display unit.
 */
const getCostPerUnit = (pricePerKg: number, unit: string): number => {
  if (!pricePerKg) return 0
  switch (unit) {
    case 'g':
    case 'ml':
      return pricePerKg / 1000   // €/g or €/ml
    case 'kg':
    case 'l':
      return pricePerKg          // €/kg or €/l
    default:
      return pricePerKg          // stuks, el, tl, etc. — treat as per-unit
  }
}

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
      price_per_kg: 0,
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
    const ing = updated[compIndex].ingredients[ingIndex]
    updated[compIndex].ingredients[ingIndex] = {
      ...ing,
      [field]: value,
    }
    // When unit changes, recalculate cost_per_unit using stored price_per_kg
    if (field === 'unit' && ing.price_per_kg) {
      updated[compIndex].ingredients[ingIndex].cost_per_unit = getCostPerUnit(ing.price_per_kg, value as string)
    }
    onChange(updated)
  }

  const selectIngredient = (compIndex: number, ingIndex: number, ingredient: Ingredient) => {
    const updated = [...components]
    const currentUnit = updated[compIndex].ingredients[ingIndex].unit || 'g'  // keep user's selected unit
    const pricePerKg = ingredient.current_price || 0
    updated[compIndex].ingredients[ingIndex] = {
      ...updated[compIndex].ingredients[ingIndex],
      ingredient_id: ingredient.id,
      ingredient_name: ingredient.name,
      price_per_kg: pricePerKg,
      cost_per_unit: getCostPerUnit(pricePerKg, currentUnit),
      // Intentionally NOT overriding unit — respect the user's selected unit
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
    return comp.ingredients.reduce((sum, ing) => sum + calcComponentCost(ing.unit, ing.cost_per_unit || 0, ing.quantity), 0)
  }

  const totalCost = components.reduce((sum, comp) => sum + getComponentCost(comp), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Componenten</h2>
          <p className="text-sm text-muted-foreground">
            Totale ingredientkost: <span className="font-bold text-foreground">{formatCurrency(totalCost)}</span>
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addComponent} className="gap-1">
          <Plus className="h-4 w-4" /> Component toevoegen
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
                  placeholder="Componentnaam (bv. Tartaarmix, Saus, Garnituur)"
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
                      <span>Ingrediënt</span>
                      <span>Hvh</span>
                      <span>Eenheid</span>
                      <span className="text-right">Kost</span>
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
                          {formatCurrency(calcComponentCost(ing.unit, ing.cost_per_unit || 0, ing.quantity))}
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
                  <Plus className="h-3 w-3" /> Ingrediënt toevoegen
                </Button>
              </CardContent>
            )}
          </Card>
        )
      })}

      {components.length === 0 && (
        <div className="border-2 border-dashed rounded-xl p-8 text-center">
          <p className="text-muted-foreground mb-3">Nog geen componenten. Voeg je eerste component toe.</p>
          <Button type="button" variant="outline" onClick={addComponent} className="gap-2">
            <Plus className="h-4 w-4" /> Component toevoegen
          </Button>
        </div>
      )}

      {/* Quick-add ingredient dialog */}
      <Dialog open={showNewIngredient} onOpenChange={setShowNewIngredient}>
        <DialogHeader><DialogTitle>Snel Ingrediënt Toevoegen</DialogTitle></DialogHeader>
        <DialogContent className="space-y-4">
          <div className="space-y-2">
            <Label>Naam *</Label>
            <Input value={newIngName} onChange={(e) => setNewIngName(e.target.value)} placeholder="bv. Zeebaarsfilet" />
          </div>
          <div className="space-y-2">
            <Label>Categorie</Label>
            <Input value={newIngCategory} onChange={(e) => setNewIngCategory(e.target.value)} placeholder="bv. Vis" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Eenheid</Label>
              <Select value={newIngUnit} onChange={(e) => setNewIngUnit(e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prijs per kg (€)</Label>
              <Input type="number" step="0.01" value={newIngPrice} onChange={(e) => setNewIngPrice(e.target.value)} placeholder="0.00" />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowNewIngredient(false)}>Annuleren</Button>
          <Button onClick={handleSaveNewIngredient} disabled={!newIngName}>Toevoegen & Selecteren</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
