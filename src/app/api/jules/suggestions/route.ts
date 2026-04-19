import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
 const supabase = await createClient()
 const { searchParams } = new URL(request.url)
 const type = searchParams.get('type')
 const priority = searchParams.get('priority')

 const { data: { user } } = await supabase.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const { data: chef } = await supabase
 .from('chef_profiles')
 .select('id')
 .eq('auth_user_id', user.id)
 .single()

 if (!chef) return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 })

 let query = supabase
 .from('jules_suggestions')
 .select('*')
 .eq('chef_id', chef.id)
 .in('status', ['pending', 'seen'])
 .order('created_at', { ascending: false })

 if (type) query = query.eq('suggestion_type', type)
 if (priority) query = query.eq('priority', priority)

 const { data, error } = await query
 if (error) return NextResponse.json({ error: error.message }, { status: 500 })
 return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
 const supabase = await createClient()

 const { data: { user } } = await supabase.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const { data: chef } = await supabase
 .from('chef_profiles')
 .select('id')
 .eq('auth_user_id', user.id)
 .single()

 if (!chef) return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 })

 const { data: membership } = await supabase
 .from('kitchen_members')
 .select('kitchen_id')
 .eq('chef_id', chef.id)
 .limit(1)
 .single()

 const kitchenId = membership?.kitchen_id
 const suggestions: Array<{
 chef_id: string
 kitchen_id: string | null
 suggestion_type: string
 title: string
 body: string
 data: Record<string, unknown>
 priority: string
 status: string
 }> = []

 // 1. Check for ingredient price changes >10%
 const { data: ingredients } = await supabase
 .from('ingredients')
 .select('id, name, current_price')
 .not('current_price', 'is', null)

 if (ingredients) {
 for (const ing of ingredients) {
 const { data: priceHistory } = await supabase
 .from('ingredient_prices')
 .select('price, recorded_at')
 .eq('ingredient_id', ing.id)
 .order('recorded_at', { ascending: false })
 .limit(2)

 if (priceHistory && priceHistory.length >= 2) {
 const latest = priceHistory[0].price
 const previous = priceHistory[1].price
 if (previous > 0) {
 const changePercent = ((latest - previous) / previous) * 100
 if (Math.abs(changePercent) > 10) {
 suggestions.push({
 chef_id: chef.id,
 kitchen_id: kitchenId || null,
 suggestion_type: 'cost_alert',
 title: `Price ${changePercent > 0 ? 'increase' : 'decrease'}: ${ing.name}`,
 body: `${ing.name} price changed by ${changePercent.toFixed(1)}% (€${previous.toFixed(2)} → €${latest.toFixed(2)}).`,
 data: {
 ingredient_id: ing.id,
 previous_price: previous,
 current_price: latest,
 change_percent: changePercent,
 },
 priority: Math.abs(changePercent) > 25 ? 'urgent' : 'high',
 status: 'pending',
 })
 }
 }
 }
 }
 }

 // 2. Check recipes with food cost >35%
 const { data: recipes } = await supabase
 .from('recipes')
 .select('id, name, food_cost_percentage, selling_price, total_cost_per_serving')
 .eq('is_active', true)
 .gt('food_cost_percentage', 35)

 if (recipes) {
 for (const recipe of recipes) {
 suggestions.push({
 chef_id: chef.id,
 kitchen_id: kitchenId || null,
 suggestion_type: 'cost_alert',
 title: `High food cost: ${recipe.name}`,
 body: `Food cost is ${(recipe.food_cost_percentage || 0).toFixed(1)}% (target: <35%). Consider adjusting pricing or ingredients.`,
 data: {
 recipe_id: recipe.id,
 food_cost_percentage: recipe.food_cost_percentage,
 selling_price: recipe.selling_price,
 cost_per_serving: recipe.total_cost_per_serving,
 suggested_action: 'Review ingredient costs or increase selling price.',
 },
 priority: (recipe.food_cost_percentage || 0) > 45 ? 'urgent' : 'high',
 status: 'pending',
 })
 }
 }

 // 3. Seasonal suggestions based on month
 const month = new Date().getMonth()
 const seasonalItems: Record<number, Array<{ name: string; tip: string }>> = {
 0: [{ name: 'Blood oranges', tip: 'Peak season for blood oranges — great in desserts and salads' }],
 1: [{ name: 'Celeriac', tip: 'Celeriac is at its best — ideal for soups and purées' }],
 2: [{ name: 'Asparagus', tip: 'Spring asparagus arriving — update your starters' }],
 3: [{ name: 'Morels', tip: 'Morel season is here — perfect for elevated dishes' }],
 4: [{ name: 'Strawberries', tip: 'Local strawberries in season — update your dessert menu' }],
 5: [{ name: 'Courgettes', tip: 'Courgette season — light and versatile for summer menus' }],
 6: [{ name: 'Tomatoes', tip: 'Heirloom tomatoes at peak — perfect for salads and sauces' }],
 7: [{ name: 'Stone fruits', tip: 'Peaches and nectarines in season for desserts' }],
 8: [{ name: 'Wild mushrooms', tip: 'Wild mushroom season starting — chanterelles and porcini' }],
 9: [{ name: 'Pumpkin', tip: 'Pumpkin and squash season — great for autumn menus' }],
 10: [{ name: 'Chestnuts', tip: 'Chestnuts available — excellent in stuffings and soups' }],
 11: [{ name: 'Winter truffles', tip: 'Truffle season — elevate your winter dishes' }],
 }

 const seasonal = seasonalItems[month]
 if (seasonal) {
 for (const item of seasonal) {
 suggestions.push({
 chef_id: chef.id,
 kitchen_id: kitchenId || null,
 suggestion_type: 'seasonal_ingredient',
 title: `In Season: ${item.name}`,
 body: item.tip,
 data: { ingredient: item.name, month },
 priority: 'low',
 status: 'pending',
 })
 }
 }

 // 4. Flag recipes not updated recently (>90 days)
 const ninetyDaysAgo = new Date()
 ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

 const { data: staleRecipes } = await supabase
 .from('recipes')
 .select('id, name, updated_at')
 .eq('is_active', true)
 .lt('updated_at', ninetyDaysAgo.toISOString())
 .limit(5)

 if (staleRecipes && staleRecipes.length > 0) {
 suggestions.push({
 chef_id: chef.id,
 kitchen_id: kitchenId || null,
 suggestion_type: 'cost_alert',
 title: `${staleRecipes.length} recipes need cost review`,
 body: `These recipes haven't been updated in over 90 days. Ingredient prices may have changed.`,
 data: {
 affected_recipes: staleRecipes.map((r) => r.name),
 recipe_ids: staleRecipes.map((r) => r.id),
 suggested_action: 'Recalculate costs for these recipes to ensure accuracy.',
 },
 priority: 'medium',
 status: 'pending',
 })
 }

 // Insert new suggestions (avoid duplicates by checking existing pending ones)
 let inserted = 0
 for (const sug of suggestions) {
 const { data: existing } = await supabase
 .from('jules_suggestions')
 .select('id')
 .eq('chef_id', sug.chef_id)
 .eq('title', sug.title)
 .in('status', ['pending', 'seen'])
 .limit(1)

 if (!existing || existing.length === 0) {
 await supabase.from('jules_suggestions').insert(sug)
 inserted++
 }
 }

 return NextResponse.json({
 success: true,
 generated: suggestions.length,
 inserted,
 })
}
