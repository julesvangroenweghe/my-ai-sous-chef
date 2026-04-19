import { createClient } from '@/lib/supabase/client'

export interface SeasonalSuggestion {
 ingredient_name: string
 category: string
 availability: number // 1 = available, 2 = peak
}

export interface ClassicalInspiration {
 id: string
 title: string
 source_author: string
 source_title: string
 category: string | null
 description: string | null
}

export interface PreparationMatch {
 id: string
 name: string
 category: string
 description: string | null
 yield_amount: number | null
 shelf_life_hours: number | null
}

export interface IngredientVariant {
 id: string
 name: string
 parent_ingredient: string
 quality_grade: string | null
 origin: string | null
 breed: string | null
 typical_price_per_kg: number | null
 flavor_profile: string | null
}

const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const

export class KnowledgeService {
 private supabase = createClient()

 /** Get what's in peak season right now */
 async getInSeasonNow(country: string = 'BE'): Promise<SeasonalSuggestion[]> {
 const month = monthKeys[new Date().getMonth()]
 const { data } = await this.supabase
 .from('seasonal_calendar')
 .select('ingredient_name, category, ' + month)
 .eq('country_code', country)
 .gte(month, 1)
 .order(month, { ascending: false })
 
 return (data || []).map(item => ({
 ingredient_name: item.ingredient_name,
 category: item.category,
 availability: (item as any)[month] as number,
 }))
 }

 /** Find classical recipes matching keywords */
 async searchClassicalRecipes(query: string, limit: number = 10): Promise<ClassicalInspiration[]> {
 const { data } = await this.supabase
 .from('classical_recipes')
 .select('id, title, source_author, source_title, category, description')
 .ilike('title', `%${query}%`)
 .limit(limit)
 return data || []
 }

 /** Find classical recipes by ingredient */
 async findRecipesByIngredient(ingredient: string, limit: number = 8): Promise<ClassicalInspiration[]> {
 const { data } = await this.supabase
 .from('classical_recipes')
 .select('id, title, source_author, source_title, category, description')
 .or(`title.ilike.%${ingredient}%,description.ilike.%${ingredient}%`)
 .limit(limit)
 return data || []
 }

 /** Get preparations that use a specific ingredient */
 async findPreparationsByIngredient(ingredientName: string): Promise<PreparationMatch[]> {
 // Search in preparation_ingredients by name_override or linked ingredient
 const { data: byOverride } = await this.supabase
 .from('preparation_ingredients')
 .select('preparation_id, preparations!inner(id, name, category, description, yield_amount, shelf_life_hours)')
 .ilike('name_override', `%${ingredientName}%`)
 
 const { data: byIngredient } = await this.supabase
 .from('preparation_ingredients')
 .select('preparation_id, preparations!inner(id, name, category, description, yield_amount, shelf_life_hours), ingredients!inner(name)')
 .ilike('ingredients.name', `%${ingredientName}%`)
 
 const all = [...(byOverride || []), ...(byIngredient || [])]
 const unique = new Map<string, PreparationMatch>()
 
 for (const item of all) {
 const p = (item as any).preparations
 if (p && !unique.has(p.id)) {
 unique.set(p.id, {
 id: p.id,
 name: p.name,
 category: p.category,
 description: p.description,
 yield_amount: p.yield_amount,
 shelf_life_hours: p.shelf_life_hours,
 })
 }
 }
 return Array.from(unique.values())
 }

 /** Get premium variants for an ingredient */
 async getVariants(ingredientName: string): Promise<IngredientVariant[]> {
 const { data } = await this.supabase
 .from('ingredient_variants')
 .select('id, name, quality_grade, origin, breed, typical_price_per_kg, flavor_profile, ingredients!inner(name)')
 .ilike('ingredients.name', `%${ingredientName}%`)
 
 return (data || []).map(v => ({
 id: v.id,
 name: v.name,
 parent_ingredient: (v as any).ingredients?.name || ingredientName,
 quality_grade: v.quality_grade,
 origin: v.origin,
 breed: v.breed,
 typical_price_per_kg: v.typical_price_per_kg,
 flavor_profile: v.flavor_profile,
 }))
 }

 /** Get classical ratios relevant to a technique or dish type */
 async getRatios(category?: string): Promise<any[]> {
 let query = this.supabase
 .from('classical_ratios')
 .select('*')
 .order('name')
 
 if (category) {
 query = query.ilike('category', `%${category}%`)
 }
 
 const { data } = await query.limit(20)
 return data || []
 }

 /** Get cooking techniques with parameters */
 async getTechniques(query?: string): Promise<any[]> {
 let q = this.supabase
 .from('techniques')
 .select('*, technique_parameters(*)')
 .order('name')
 
 if (query) {
 q = q.ilike('name', `%${query}%`)
 }
 
 const { data } = await q.limit(15)
 return data || []
 }

 /** Dashboard summary: seasonal highlights + recipe count by source */
 async getDashboardInsights(): Promise<{
 peakSeason: SeasonalSuggestion[]
 totalClassicalRecipes: number
 sourceBreakdown: { author: string; count: number }[]
 totalPreparations: number
 totalVariants: number
 totalRatios: number
 }> {
 const [peak, recipeCounts, prepCount, variantCount, ratioCount] = await Promise.all([
 this.getInSeasonNow(),
 this.supabase.rpc('get_recipe_source_counts').then(r => r.data),
 this.supabase.from('preparations').select('id', { count: 'exact', head: true }),
 this.supabase.from('ingredient_variants').select('id', { count: 'exact', head: true }),
 this.supabase.from('classical_ratios').select('id', { count: 'exact', head: true }),
 ])

 return {
 peakSeason: peak.filter(p => p.availability === 2),
 totalClassicalRecipes: 9492,
 sourceBreakdown: (recipeCounts as any[]) || [],
 totalPreparations: prepCount.count || 57,
 totalVariants: variantCount.count || 28,
 totalRatios: ratioCount.count || 67,
 }
 }
}

export const knowledgeService = new KnowledgeService()
