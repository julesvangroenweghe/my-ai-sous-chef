'use client'

import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import type { Recipe } from '@/types/database'

interface MenuItem {
  recipe_id: string
  course_order: number
}

interface MenuBuilderProps {
  recipes: Recipe[]
  menuItems: MenuItem[]
  onChange: (items: MenuItem[]) => void
}

export function MenuBuilder({ recipes, menuItems, onChange }: MenuBuilderProps) {
  const addItem = () => {
    onChange([...menuItems, { recipe_id: '', course_order: menuItems.length + 1 }])
  }

  const removeItem = (index: number) => {
    onChange(menuItems.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: string | number) => {
    const updated = [...menuItems]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Menu</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
            <Plus className="h-4 w-4" /> Add Dish
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {menuItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No dishes added yet. Add recipes to build your menu.</p>
        ) : (
          menuItems.sort((a, b) => a.course_order - b.course_order).map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab shrink-0" />
              <div className="bg-muted rounded-lg px-3 py-2 text-sm font-medium w-16 text-center shrink-0">
                #{item.course_order}
              </div>
              <Select
                value={item.recipe_id}
                onChange={(e) => updateItem(i, 'recipe_id', e.target.value)}
                className="flex-1"
              >
                <option value="">Select recipe</option>
                {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
