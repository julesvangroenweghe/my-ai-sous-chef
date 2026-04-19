import { knowledgeService } from './knowledge-service'

export interface ChefSuggestion {
 type: 'seasonal' | 'classical' | 'preparation' | 'technique' | 'cost_tip'
 title: string
 description: string
 confidence: 'high' | 'medium' | 'low'
 source?: string
 actionLabel?: string
 actionHref?: string
 metadata?: Record<string, any>
}

/** Generate suggestions based on context without calling external AI */
export async function generateLocalSuggestions(context: {
 currentPage?: string
 ingredients?: string[]
 dishType?: string
 eventType?: string
 numPersons?: number
}): Promise<ChefSuggestion[]> {
 const suggestions: ChefSuggestion[] = []

 // 1. Seasonal suggestions — always relevant
 try {
 const seasonal = await knowledgeService.getInSeasonNow()
 const peak = seasonal.filter(s => s.availability === 2).slice(0, 5)
 
 if (peak.length > 0) {
 const monthNames = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
 const currentMonth = monthNames[new Date().getMonth()]
 
 suggestions.push({
 type: 'seasonal',
 title: `Piekseizoen in ${currentMonth}`,
 description: peak.map(p => p.ingredient_name).join(', '),
 confidence: 'high',
 source: 'Seizoenskalender België',
 actionLabel: 'Bekijk kalender',
 actionHref: '/seasonal',
 metadata: { items: peak }
 })
 }
 } catch { /* ignore */ }

 // 2. Ingredient-based suggestions
 if (context.ingredients && context.ingredients.length > 0) {
 for (const ingredient of context.ingredients.slice(0, 3)) {
 try {
 const [recipes, preparations] = await Promise.all([
 knowledgeService.findRecipesByIngredient(ingredient, 3),
 knowledgeService.findPreparationsByIngredient(ingredient),
 ])

 if (recipes.length > 0) {
 suggestions.push({
 type: 'classical',
 title: `Klassieke inspiratie: ${ingredient}`,
 description: recipes.map(r => `${r.title} (${r.source_author})`).join(' · '),
 confidence: 'medium',
 source: recipes[0].source_title,
 metadata: { recipes }
 })
 }

 if (preparations.length > 0) {
 suggestions.push({
 type: 'preparation',
 title: `Halffabricaten met ${ingredient}`,
 description: preparations.map(p => p.name).join(', '),
 confidence: 'high',
 actionLabel: 'Bekijk halffabricaten',
 actionHref: '/preparations',
 metadata: { preparations }
 })
 }
 } catch { /* ignore */ }
 }
 }

 // 3. Event-based suggestions
 if (context.eventType === 'walking_dinner' || context.eventType === 'buffet') {
 suggestions.push({
 type: 'technique',
 title: 'Tip: Voorbereidingstijd optimaliseren',
 description: `Bij ${context.eventType === 'walking_dinner' ? 'walking dinners' : 'buffetten'} zijn koud-serveerbare halffabricaten ideaal. Denk aan gels, pickles en sauzen die vooraf gemaakt worden.`,
 confidence: 'high',
 actionLabel: 'Bekijk halffabricaten',
 actionHref: '/preparations',
 })
 }

 if (context.numPersons && context.numPersons > 50) {
 suggestions.push({
 type: 'cost_tip',
 title: 'Groot volume: inkoop optimaliseren',
 description: `Bij ${context.numPersons} personen kun je onderhandelen met leveranciers voor volumekorting. Check je factuurhistorie voor beste prijzen.`,
 confidence: 'medium',
 actionLabel: 'Bekijk facturen',
 actionHref: '/invoices',
 })
 }

 return suggestions
}
