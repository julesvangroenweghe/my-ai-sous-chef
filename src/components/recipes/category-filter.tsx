'use client'

import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { RecipeCategory } from '@/types/database'

interface CategoryFilterProps {
 categories: RecipeCategory[]
 selected: string | null
 selectedSub: string | null
 onSelect: (categoryId: string | null, subcategoryId?: string | null) => void
 recipeCounts?: Record<string, number>
}

export function CategoryFilter({
 categories,
 selected,
 selectedSub,
 onSelect,
 recipeCounts = {},
}: CategoryFilterProps) {
 const [expandedCat, setExpandedCat] = useState<string | null>(selected)

 return (
 <div className="space-y-1">
 <button
 onClick={() => onSelect(null, null)}
 className={cn(
 'flex items-center justify-between w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors',
 !selected
 ? 'bg-primary/10 text-primary'
 : 'text-muted-foreground hover:bg-muted hover:text-foreground'
 )}
 >
 <span>All Recipes</span>
 {recipeCounts['all'] !== undefined && (
 <span className="text-xs bg-muted rounded-full px-2 py-0.5">{recipeCounts['all']}</span>
 )}
 </button>

 {categories.map((cat) => {
 const hasSubs = cat.subcategories && cat.subcategories.length > 0
 const isExpanded = expandedCat === cat.id
 const isSelected = selected === cat.id && !selectedSub

 return (
 <div key={cat.id}>
 <button
 onClick={() => {
 if (hasSubs) {
 setExpandedCat(isExpanded ? null : cat.id)
 }
 onSelect(cat.id, null)
 }}
 className={cn(
 'flex items-center justify-between w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors',
 isSelected
 ? 'bg-primary/10 text-primary'
 : 'text-muted-foreground hover:bg-muted hover:text-foreground'
 )}
 >
 <span>{cat.name}</span>
 <div className="flex items-center gap-1">
 {recipeCounts[cat.id] !== undefined && (
 <span className="text-xs bg-muted rounded-full px-2 py-0.5">{recipeCounts[cat.id]}</span>
 )}
 {hasSubs && (
 <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')} />
 )}
 </div>
 </button>

 {hasSubs && isExpanded && (
 <div className="ml-3 pl-3 border-l border-muted space-y-0.5 mt-0.5">
 {cat.subcategories!.map((sub) => (
 <button
 key={sub.id}
 onClick={() => onSelect(cat.id, sub.id)}
 className={cn(
 'flex items-center justify-between w-full rounded-lg px-3 py-1.5 text-sm transition-colors',
 selectedSub === sub.id
 ? 'bg-primary/10 text-primary font-medium'
 : 'text-muted-foreground hover:bg-muted hover:text-foreground'
 )}
 >
 <span>{sub.name}</span>
 </button>
 ))}
 </div>
 )}
 </div>
 )
 })}
 </div>
 )
}
