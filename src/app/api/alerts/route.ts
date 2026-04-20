import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface Alert {
  id: string
  type: 'food_cost_warning' | 'seasonal_suggestion' | 'price_change' | 'upcoming_event' | 'missing_data' | 'optimization'
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  actionLabel?: string
  actionHref?: string
  data?: Record<string, any>
}

export async function GET() {
  const supabase = await createClient()

  // Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'No profile found' }, { status: 404 })

  const { data: membership } = await supabase
    .from('kitchen_members')
    .select('kitchen_id')
    .eq('chef_id', profile.id)
    .limit(1)
    .single()
  if (!membership) return NextResponse.json({ error: 'No kitchen found' }, { status: 404 })

  const kitchenId = membership.kitchen_id
  const alerts: Alert[] = []

  // 1. Food cost warnings: recipes where food_cost_percentage > 35%
  try {
    const { data: highCostRecipes } = await supabase
      .from('recipes')
      .select('id, name, food_cost_percentage, selling_price')
      .eq('kitchen_id', kitchenId)
      .eq('status', 'active')
      .gt('food_cost_percentage', 35)
      .order('food_cost_percentage', { ascending: false })
      .limit(3)

    if (highCostRecipes && highCostRecipes.length > 0) {
      for (const recipe of highCostRecipes) {
        const pct = recipe.food_cost_percentage?.toFixed(1)
        alerts.push({
          id: `food_cost_${recipe.id}`,
          type: 'food_cost_warning',
          severity: (recipe.food_cost_percentage || 0) > 45 ? 'critical' : 'warning',
          title: `Hoge food cost: ${recipe.name}`,
          message: `Dit recept heeft een food cost van ${pct}%. Overweeg de verkoopprijs aan te passen of goedkopere alternatieven te zoeken.`,
          actionLabel: 'Bekijk recept',
          actionHref: `/recipes/${recipe.id}`,
          data: { food_cost_percentage: recipe.food_cost_percentage, selling_price: recipe.selling_price },
        })
      }
    }
  } catch { /* skip */ }

  // 2. Upcoming events without MEP (status draft or confirmed, within 7 days)
  try {
    const now = new Date()
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const { data: upcomingEvents } = await supabase
      .from('events')
      .select('id, name, event_date, status, num_persons')
      .eq('kitchen_id', kitchenId)
      .gte('event_date', now.toISOString().split('T')[0])
      .lte('event_date', in7Days.toISOString().split('T')[0])
      .in('status', ['draft', 'confirmed'])
      .order('event_date')
      .limit(3)

    if (upcomingEvents && upcomingEvents.length > 0) {
      for (const event of upcomingEvents) {
        const eventDate = new Date(event.event_date)
        const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        alerts.push({
          id: `event_prep_${event.id}`,
          type: 'upcoming_event',
          severity: daysUntil <= 2 ? 'critical' : 'warning',
          title: `Event "${event.name}" nadert`,
          message: `Nog ${daysUntil} ${daysUntil === 1 ? 'dag' : 'dagen'} tot dit event${event.num_persons ? ` (${event.num_persons} personen)` : ''}. De MEP is nog niet gestart.`,
          actionLabel: 'MEP starten',
          actionHref: `/events/${event.id}`,
          data: { event_date: event.event_date, status: event.status, days_until: daysUntil },
        })
      }
    }
  } catch { /* skip */ }

  // 3. Seasonal suggestions
  try {
    const currentMonth = new Date().getMonth() + 1
    const { data: seasonalProducts } = await supabase
      .from('seasonal_products')
      .select('id, name, peak_months, category')
      .contains('peak_months', [currentMonth])
      .limit(5)

    if (seasonalProducts && seasonalProducts.length > 0) {
      const productNames = seasonalProducts.slice(0, 4).map(p => p.name).join(', ')
      alerts.push({
        id: `seasonal_${currentMonth}`,
        type: 'seasonal_suggestion',
        severity: 'info',
        title: 'Seizoensproducten beschikbaar',
        message: `Deze maand op hun best: ${productNames}. Seizoensgebonden koken verlaagt je kosten en verhoogt de kwaliteit.`,
        actionLabel: 'Bekijk seizoensproducten',
        actionHref: '/ingredients?season=current',
        data: { products: seasonalProducts.map(p => p.name), month: currentMonth },
      })
    }
  } catch { /* skip */ }

  // 4. Price changes: supplier_products with recent updates
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentPriceChanges } = await supabase
      .from('supplier_products')
      .select('id, ingredient_id, price_per_unit, updated_at, ingredient:ingredients(name)')
      .gte('updated_at', sevenDaysAgo)
      .order('updated_at', { ascending: false })
      .limit(5)

    if (recentPriceChanges && recentPriceChanges.length > 0) {
      const count = recentPriceChanges.length
      alerts.push({
        id: `price_changes_recent`,
        type: 'price_change',
        severity: 'info',
        title: `${count} prijswijziging${count > 1 ? 'en' : ''} deze week`,
        message: `Er ${count === 1 ? 'is' : 'zijn'} ${count} leveranciersprijs${count > 1 ? 'wijzigingen' : 'wijziging'} gedetecteerd. Controleer of je receptkosten nog kloppen.`,
        actionLabel: 'Bekijk ingredienten',
        actionHref: '/ingredients',
        data: { count, products: recentPriceChanges.map(p => (p.ingredient as any)?.name).filter(Boolean) },
      })
    }
  } catch { /* skip */ }

  // 5. Missing data: recipes without selling_price
  try {
    const { data: missingPriceRecipes, count: missingCount } = await supabase
      .from('recipes')
      .select('id, name', { count: 'exact', head: false })
      .eq('kitchen_id', kitchenId)
      .eq('status', 'active')
      .is('selling_price', null)
      .limit(3)

    if (missingCount && missingCount > 0) {
      alerts.push({
        id: 'missing_selling_price',
        type: 'missing_data',
        severity: 'warning',
        title: `${missingCount} recept${missingCount > 1 ? 'en' : ''} zonder verkoopprijs`,
        message: `Zonder verkoopprijs kan de food cost niet berekend worden. Vul de verkoopprijs aan voor nauwkeurige margeberekeningen.`,
        actionLabel: 'Recepten bekijken',
        actionHref: '/recipes',
        data: { count: missingCount, recipes: missingPriceRecipes?.map(r => r.name) },
      })
    }
  } catch { /* skip */ }

  // 6. Optimization: recipes with food cost below 20% (potentially overpriced)
  try {
    const { data: lowCostRecipes } = await supabase
      .from('recipes')
      .select('id, name, food_cost_percentage, selling_price')
      .eq('kitchen_id', kitchenId)
      .eq('status', 'active')
      .gt('food_cost_percentage', 0)
      .lt('food_cost_percentage', 20)
      .not('selling_price', 'is', null)
      .order('food_cost_percentage')
      .limit(3)

    if (lowCostRecipes && lowCostRecipes.length > 0) {
      const names = lowCostRecipes.map(r => r.name).join(', ')
      alerts.push({
        id: 'optimization_low_cost',
        type: 'optimization',
        severity: 'info',
        title: 'Optimalisatiekans: lage food cost',
        message: `${names} ${lowCostRecipes.length === 1 ? 'heeft' : 'hebben'} een food cost onder 20%. Overweeg meer premium ingredienten of een lagere verkoopprijs voor betere competitiviteit.`,
        actionLabel: 'Recepten analyseren',
        actionHref: '/recipes',
        data: { recipes: lowCostRecipes.map(r => ({ name: r.name, pct: r.food_cost_percentage })) },
      })
    }
  } catch { /* skip */ }

  // Sort: critical first, then warning, then info
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 }
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  // Max 8 alerts
  return NextResponse.json(alerts.slice(0, 8))
}
