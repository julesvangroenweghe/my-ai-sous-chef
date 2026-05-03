// src/app/api/ai-usage/route.ts
// AI usage stats voor de huidige kitchen

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DAILY_LIMIT = 50

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

    const { data: kitchenIds } = await supabase.rpc('get_my_kitchen_ids')
    if (!kitchenIds || kitchenIds.length === 0) {
      return NextResponse.json({ error: 'Geen keuken gevonden' }, { status: 404 })
    }
    const kitchenId = kitchenIds[0]

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    const [dayResult, monthResult, cacheResult] = await Promise.all([
      supabase
        .from('ai_usage_log')
        .select('action_type, tokens_used, cost_estimate_eur')
        .eq('kitchen_id', kitchenId)
        .gte('created_at', today.toISOString()),
      supabase
        .from('ai_usage_log')
        .select('action_type, tokens_used, cost_estimate_eur')
        .eq('kitchen_id', kitchenId)
        .gte('created_at', thisMonth.toISOString()),
      supabase
        .from('ai_response_cache')
        .select('hit_count, action_type')
        .gt('hit_count', 0)
        .gt('expires_at', new Date().toISOString())
    ])

    const dayData = dayResult.data || []
    const monthData = monthResult.data || []
    const cacheData = cacheResult.data || []

    const totalCacheHits = cacheData.reduce((s, r) => s + (r.hit_count || 0), 0)

    return NextResponse.json({
      today: {
        calls: dayData.length,
        limit: DAILY_LIMIT,
        remaining: Math.max(0, DAILY_LIMIT - dayData.length),
        tokens: dayData.reduce((s, r) => s + (r.tokens_used || 0), 0),
        costEur: parseFloat(dayData.reduce((s, r) => s + (r.cost_estimate_eur || 0), 0).toFixed(4))
      },
      thisMonth: {
        calls: monthData.length,
        tokens: monthData.reduce((s, r) => s + (r.tokens_used || 0), 0),
        costEur: parseFloat(monthData.reduce((s, r) => s + (r.cost_estimate_eur || 0), 0).toFixed(4)),
        byAction: monthData.reduce((acc, r) => {
          acc[r.action_type] = (acc[r.action_type] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      },
      cache: {
        totalHits: totalCacheHits,
        savedCalls: totalCacheHits,
        estimatedSavingEur: parseFloat((totalCacheHits * 0.03).toFixed(4))
      }
    })
  } catch (err) {
    console.error('AI usage stats fout:', err)
    return NextResponse.json({ error: 'Server fout' }, { status: 500 })
  }
}
