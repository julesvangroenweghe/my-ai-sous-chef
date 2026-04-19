'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Ingredient } from '@/types/database'

export function useIngredients() {
 const [ingredients, setIngredients] = useState<Ingredient[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const [searchQuery, setSearchQuery] = useState('')
 const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

 const supabase = createClient()

 const fetchIngredients = useCallback(async () => {
 try {
 setLoading(true)
 setError(null)

 let query = supabase.from('ingredients').select('*').order('name')

 if (searchQuery) {
 query = query.ilike('name', `%${searchQuery}%`)
 }
 if (selectedCategory) {
 query = query.eq('category', selectedCategory)
 }

 const { data, error: fetchError } = await query
 if (fetchError) { setError(fetchError.message); return }
 setIngredients((data || []) as Ingredient[])
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Unknown error')
 } finally {
 setLoading(false)
 }
 }, [searchQuery, selectedCategory])

 const createIngredient = useCallback(async (ingredientData: {
 name: string
 category?: string
 unit?: string
 current_price?: number
 }) => {
 try {
 const { data, error: insertError } = await supabase
 .from('ingredients')
 .insert({
 name: ingredientData.name,
 category: ingredientData.category || null,
 unit: ingredientData.unit || null,
 current_price: ingredientData.current_price || null,
 default_unit_price: ingredientData.current_price || null,
 })
 .select()
 .single()

 if (insertError) return { success: false, error: insertError.message, data: null }
 const newIng = data as Ingredient
 setIngredients((prev) => [...prev, newIng].sort((a, b) => a.name.localeCompare(b.name)))
 return { success: true, data: newIng }
 } catch (err) {
 return { success: false, error: err instanceof Error ? err.message : 'Unknown error', data: null }
 }
 }, [])

 const updateIngredient = useCallback(async (id: string, updates: Partial<Ingredient>) => {
 try {
 const { data, error: updateError } = await supabase
 .from('ingredients')
 .update({ ...updates, updated_at: new Date().toISOString() })
 .eq('id', id)
 .select()
 .single()

 if (updateError) return { success: false, error: updateError.message }
 setIngredients((prev) => prev.map((i) => (i.id === id ? (data as Ingredient) : i)))
 return { success: true }
 } catch (err) {
 return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
 }
 }, [])

 const deleteIngredient = useCallback(async (id: string) => {
 const { error: delError } = await supabase.from('ingredients').delete().eq('id', id)
 if (delError) return { success: false, error: delError.message }
 setIngredients((prev) => prev.filter((i) => i.id !== id))
 return { success: true }
 }, [])

 useEffect(() => { fetchIngredients() }, [fetchIngredients])

 return {
 ingredients, loading, error,
 searchQuery, setSearchQuery,
 selectedCategory, setSelectedCategory,
 refresh: fetchIngredients,
 createIngredient,
 updateIngredient,
 deleteIngredient,
 }
}
