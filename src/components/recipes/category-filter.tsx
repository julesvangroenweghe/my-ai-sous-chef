'use client'

import { Select } from '@/components/ui/select'
import type { RecipeCategory } from '@/types/database'

interface CategoryFilterProps {
  categories: RecipeCategory[]
  selected: string | null
  onSelect: (id: string | null) => void
}

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  return (
    <Select
      value={selected || ''}
      onChange={(e) => onSelect(e.target.value || null)}
      className="w-48"
    >
      <option value="">All Categories</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </Select>
  )
}
