'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatCurrency } from '@/lib/utils'
import { Search, Plus } from 'lucide-react'
import type { Ingredient } from '@/types/database'

interface IngredientSearchProps {
 value: string // ingredient_id
 onSelect: (ingredient: Ingredient) => void
 onCreateNew?: (name: string) => void
 className?: string
}

export function IngredientSearch({ value, onSelect, onCreateNew, className }: IngredientSearchProps) {
 const [query, setQuery] = useState('')
 const [results, setResults] = useState<Ingredient[]>([])
 const [allIngredients, setAllIngredients] = useState<Ingredient[]>([])
 const [open, setOpen] = useState(false)
 const [selectedName, setSelectedName] = useState('')
 const containerRef = useRef<HTMLDivElement>(null)
 const inputRef = useRef<HTMLInputElement>(null)
 const supabase = createClient()

 useEffect(() => {
 supabase
 .from('ingredients')
 .select('*')
 .order('name')
 .then(({ data }) => {
 if (data) {
 setAllIngredients(data as Ingredient[])
 if (value) {
 const found = data.find((i: any) => i.id === value)
 if (found) setSelectedName(found.name)
 }
 }
 })
 }, [])

 useEffect(() => {
 if (value && allIngredients.length > 0) {
 const found = allIngredients.find((i) => i.id === value)
 if (found) setSelectedName(found.name)
 }
 }, [value, allIngredients])

 useEffect(() => {
 if (query.length === 0) {
 setResults(allIngredients.slice(0, 20))
 } else {
 const q = query.toLowerCase()
 setResults(allIngredients.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 20))
 }
 }, [query, allIngredients])

 useEffect(() => {
 const handleClick = (e: MouseEvent) => {
 if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
 setOpen(false)
 }
 }
 document.addEventListener('mousedown', handleClick)
 return () => document.removeEventListener('mousedown', handleClick)
 }, [])

 return (
 <div ref={containerRef} className={cn('relative', className)}>
 <div className="relative">
 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
 <input
 ref={inputRef}
 type="text"
 value={open ? query : selectedName}
 onChange={(e) => {
 setQuery(e.target.value)
 setOpen(true)
 }}
 onFocus={() => {
 setOpen(true)
 setQuery('')
 }}
 placeholder="Search ingredient..."
 className="flex h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
 />
 </div>

 {open && (
 <div className="absolute z-50 mt-1 w-full min-w-[240px] rounded-lg border bg-white shadow-lg max-h-48 overflow-y-auto">
 {results.map((ingredient) => (
 <button
 key={ingredient.id}
 type="button"
 onClick={() => {
 onSelect(ingredient)
 setSelectedName(ingredient.name)
 setQuery('')
 setOpen(false)
 }}
 className={cn(
 'flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-left',
 ingredient.id === value && 'bg-orange-50'
 )}
 >
 <span className="font-medium">{ingredient.name}</span>
 <span className="text-xs text-muted-foreground">
 {ingredient.current_price ? `${formatCurrency(ingredient.current_price)}/${ingredient.unit || 'unit'}` : 'No price'}
 </span>
 </button>
 ))}
 {results.length === 0 && query && (
 <div className="px-3 py-2 text-sm text-muted-foreground">No ingredients found</div>
 )}
 {onCreateNew && (
 <button
 type="button"
 onClick={() => {
 onCreateNew(query)
 setOpen(false)
 setQuery('')
 }}
 className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-primary hover:bg-orange-50 transition-colors border-t"
 >
 <Plus className="h-3.5 w-3.5" />
 Create new ingredient{query ? `: "${query}"` : ''}
 </button>
 )}
 </div>
 )}
 </div>
 )
}
