// src/lib/ai-middleware.ts
// Rate limiting + caching voor alle AI calls

import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// Limiet per kitchen per dag (gratis tier)
const DAILY_LIMIT = 50 // later: op basis van subscription tier

// Cache TTL per action type (in uren)
const CACHE_TTL: Record<string, number> = {
  generate_menu: 2,      // 2 uur — menu's veranderen snel
  parse_brief: 24,       // 24 uur — brief is uniek, maar zelfde input = zelfde output
  ocr_scan: 168,         // 7 dagen — scans veranderen nooit
  swap_dish: 1,          // 1 uur
  culinary_popup: 4,     // 4 uur
  check_mail: 0,         // nooit cachen — elke mail is uniek
  seasonal_suggest: 24,  // 24 uur — seizoen verandert niet
}

// Cacheable actions (niet alle calls zijn cachebaar)
const CACHEABLE_ACTIONS = ['parse_brief', 'ocr_scan', 'seasonal_suggest', 'swap_dish']

export interface AIMiddlewareResult {
  allowed: boolean
  fromCache: boolean
  cachedData?: unknown
  usageToday?: number
  limit?: number
  error?: string
}

/**
 * Check rate limit voor een kitchen
 * Geeft ook cached response terug als beschikbaar
 */
export async function checkAIRateLimit(
  kitchenId: string,
  actionType: string,
  cacheInput?: unknown
): Promise<AIMiddlewareResult> {
  const supabase = await createClient()

  // 1. Check cache als van toepassing
  if (CACHEABLE_ACTIONS.includes(actionType) && cacheInput) {
    const cacheKey = generateCacheKey(actionType, cacheInput)
    const { data: cached } = await supabase
      .from('ai_response_cache')
      .select('response_data, hit_count')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (cached) {
      // Cache hit — update teller
      await supabase
        .from('ai_response_cache')
        .update({ hit_count: (cached.hit_count || 0) + 1 })
        .eq('cache_key', cacheKey)

      return { allowed: true, fromCache: true, cachedData: cached.response_data }
    }
  }

  // 2. Check rate limit
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('ai_usage_log')
    .select('*', { count: 'exact', head: true })
    .eq('kitchen_id', kitchenId)
    .gte('created_at', today.toISOString())

  const usageToday = count || 0

  if (usageToday >= DAILY_LIMIT) {
    return {
      allowed: false,
      fromCache: false,
      usageToday,
      limit: DAILY_LIMIT,
      error: `Daglimiet bereikt (${usageToday}/${DAILY_LIMIT} AI calls). Morgen worden je credits vernieuwd.`
    }
  }

  return { allowed: true, fromCache: false, usageToday, limit: DAILY_LIMIT }
}

/**
 * Log een AI call na uitvoering
 */
export async function logAIUsage(
  kitchenId: string,
  actionType: string,
  tokensUsed: number = 0
) {
  const supabase = await createClient()
  // Claude Sonnet 4 pricing: ~$3 input / $15 output per 1M tokens
  const costEur = (tokensUsed / 1_000_000) * 12 * 0.92 // gemiddeld, EUR

  await supabase.from('ai_usage_log').insert({
    kitchen_id: kitchenId,
    action_type: actionType,
    tokens_used: tokensUsed,
    cost_estimate_eur: costEur
  })
}

/**
 * Sla AI response op in cache
 */
export async function cacheAIResponse(
  actionType: string,
  cacheInput: unknown,
  responseData: unknown
) {
  const ttlHours = CACHE_TTL[actionType] || 0
  if (ttlHours === 0) return // niet cachen

  const supabase = await createClient()
  const cacheKey = generateCacheKey(actionType, cacheInput)
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + ttlHours)

  await supabase.from('ai_response_cache').upsert({
    cache_key: cacheKey,
    action_type: actionType,
    response_data: responseData as Record<string, unknown>,
    expires_at: expiresAt.toISOString()
  }, { onConflict: 'cache_key' })
}

function generateCacheKey(actionType: string, input: unknown): string {
  const normalized = JSON.stringify(input, Object.keys(input as object).sort())
  return `${actionType}:${crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16)}`
}

/**
 * Haal AI usage stats op voor een kitchen
 */
export async function getAIUsageStats(kitchenId: string) {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const thisMonth = new Date()
  thisMonth.setDate(1)
  thisMonth.setHours(0, 0, 0, 0)

  const [dayResult, monthResult] = await Promise.all([
    supabase
      .from('ai_usage_log')
      .select('action_type, tokens_used, cost_estimate_eur')
      .eq('kitchen_id', kitchenId)
      .gte('created_at', today.toISOString()),
    supabase
      .from('ai_usage_log')
      .select('action_type, tokens_used, cost_estimate_eur')
      .eq('kitchen_id', kitchenId)
      .gte('created_at', thisMonth.toISOString())
  ])

  const dayData = dayResult.data || []
  const monthData = monthResult.data || []

  return {
    today: {
      calls: dayData.length,
      limit: DAILY_LIMIT,
      remaining: Math.max(0, DAILY_LIMIT - dayData.length),
      tokens: dayData.reduce((s, r) => s + (r.tokens_used || 0), 0),
      costEur: dayData.reduce((s, r) => s + (r.cost_estimate_eur || 0), 0)
    },
    thisMonth: {
      calls: monthData.length,
      tokens: monthData.reduce((s, r) => s + (r.tokens_used || 0), 0),
      costEur: monthData.reduce((s, r) => s + (r.cost_estimate_eur || 0), 0),
      byAction: monthData.reduce((acc, r) => {
        acc[r.action_type] = (acc[r.action_type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
  }
}
