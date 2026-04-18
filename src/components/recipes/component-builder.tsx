'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import type { Ingredient } from '@/types/database'

interface ComponentIngredient {
  ingredient_id: string
  quantity_per_person: number
  unit: string
  prep_instruction: string
}

interface Component {
  name: string
  ingredients: ComponentIngredient[]
}

interface ComponentBuilderProps {
  components: Component[]
  onChange: (components: Component[]) => void
}

const UNITS = ['g', 'ml', 'stuks', 'el', 'tl', 'snuf']

export function ComponentBuilder({ components, onChange }: ComponentBuilderProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('ingredients')
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (data) setIngredients(data)
      })
  }, [])

  const addComponent = () => {
    onChange([...components, { name: '', ingredients: [] }])
  }

  const removeComponent = (index: number) => {
    onChange(components.filter((_, i) => i !== index))
  }

  const updateComponent = (index: number, field: string, value: string) => {
    const updated = [...components]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  const addIngredient = (compIndex: number) => {
    const updated = [...components]
    updated[compIndex].ingredients.push({
      ingredient_id: '',
      quantity_per_person: 0,
      unit: 'g',
      prep_instruction: '',
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Components</h2>
        <Button type="button" variant="outline" size="sm" onClick={addComponent} className="gap-1">
          <Plus className="h-4 w-4" /> Add Component
        </Button>
      </div>

      {components.map((comp, ci) => (
        <Card key={ci}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
              <Input
                value={comp.name}
                onChange={(e) => updateComponent(ci, 'name', e.target.value)}
                placeholder="Component name (e.g. Gel van yuzu)"
                className="font-medium"
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeComponent(ci)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {comp.ingredients.map((ing, ii) => (
              <div key={ii} className="flex items-center gap-2">
                <Select
                  value={ing.ingredient_id}
                  onChange={(e) => updateIngredient(ci, ii, 'ingredient_id', e.target.value)}
                  className="flex-1"
                >
                  <option value="">Select ingredient</option>
                  {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </Select>
                <Input
                  type="number"
                  value={ing.quantity_per_person || ''}
                  onChange={(e) => updateIngredient(ci, ii, 'quantity_per_person', Number(e.target.value))}
                  placeholder="Qty"
                  className="w-20"
                />
                <Select
                  value={ing.unit}
                  onChange={(e) => updateIngredient(ci, ii, 'unit', e.target.value)}
                  className="w-24"
                >
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </Select>
                <Input
                  value={ing.prep_instruction}
                  onChange={(e) => updateIngredient(ci, ii, 'prep_instruction', e.target.value)}
                  placeholder="Prep notes"
                  className="flex-1"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeIngredient(ci, ii)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={() => addIngredient(ci)} className="gap-1 text-muted-foreground">
              <Plus className="h-3 w-3" /> Add Ingredient
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
