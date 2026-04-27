'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useKitchen } from '@/providers/kitchen-provider'
import Link from 'next/link'

interface Suggestion {
  id: string
  type: 'action' | 'positive' | 'cta'
  message: string
  href?: string
}

export function SuggestionsWidget() {
  const { kitchenId, loading: kitchenLoading } = useKitchen()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (kitchenLoading || !kitchenId) return

    async function loadSuggestions() {
      try {
        const result: Suggestion[] = []

        const [
          recipesNoCostRes,
          avgFoodCostRes,
          menusRes,
          eventsRes,
          suppliersRes,
        ] = await Promise.all([
          supabase
            .from('recipes')
            .select('id', { count: 'exact', head: true })
            .eq('kitchen_id', kitchenId)
            .or('total_cost_per_serving.is.null,total_cost_per_serving.eq.0'),
          supabase
            .from('recipes')
            .select('total_cost_per_serving')
            .eq('kitchen_id', kitchenId)
            .gt('total_cost_per_serving', 0),
          supabase
            .from('saved_menus')
            .select('id', { count: 'exact', head: true })
            .eq('kitchen_id', kitchenId),
          supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('kitchen_id', kitchenId)
            .gte('event_date', new Date().toISOString().split('T')[0]),
          supabase
            .from('suppliers')
            .select('id', { count: 'exact', head: true })
            .eq('kitchen_id', kitchenId),
        ])

        // Recipes without cost
        const noCostCount = recipesNoCostRes.count || 0
        if (noCostCount > 0) {
          result.push({
            id: 'no-cost',
            type: 'action',
            message: `Je hebt ${noCostCount} ${noCostCount === 1 ? 'recept' : 'recepten'} zonder kostberekening`,
            href: '/recipes',
          })
        }

        // Average food cost
        const costData = avgFoodCostRes.data || []
        if (costData.length > 0) {
          const avg = costData.reduce((sum, r) => sum + (r.total_cost_per_serving || 0), 0) / costData.length
          const avgPct = Math.round(avg * 100) / 100
          if (avgPct > 0) {
            result.push({
              id: 'food-cost',
              type: 'positive',
              message: `Je gemiddelde food cost per portie is \u20AC${avgPct.toFixed(2)}`,
            })
          }
        }

        // Menu engineering CTA
        const menuCount = menusRes.count || 0
        if (menuCount === 0) {
          const upcomingEvents = eventsRes.count || 0
          if (upcomingEvents > 0) {
            result.push({
              id: 'menu-cta',
              type: 'cta',
              message: 'Probeer Menu Engineering — stel een menu samen voor je volgende event',
              href: '/menu-engineering',
            })
          }
        }

        // Suppliers
        const supplierCount = suppliersRes.count || 0
        if (supplierCount === 0) {
          result.push({
            id: 'suppliers',
            type: 'action',
            message: 'Koppel leveranciers om facturen sneller te verwerken',
            href: '/suppliers',
          })
        }

        // Season suggestion (static, context-aware based on month)
        const month = new Date().getMonth()
        const seasonalTips: Record<number, string> = {
          0: 'Wintergroenten als knolselder en pastinaak zijn nu op hun best',
          1: 'Witloof en winterprei zijn nu in topvorm',
          2: 'Eerste lente-ingrediënten: radijsjes en waterkers verschijnen',
          3: 'Asperges zijn nu op hun best — tijd voor een seizoensmenu',
          4: 'Aardbeien en tuinkruiden zijn volop beschikbaar',
          5: 'Zomerfruit en courgette zijn nu overvloedig',
          6: 'Tomaten, bonen en zomergroenten zijn op hun piek',
          7: 'Pruimen, bramen en late zomeroogst zijn nu beschikbaar',
          8: 'Pompoen en herfstgroenten zijn terug',
          9: 'Wild en paddenstoelen zijn nu in seizoen',
          10: 'Spruitjes, boerenkool en wintergroenten verschijnen',
          11: 'Feestperiode — wild, citrus en wortelgroenten zijn ideaal',
        }

        if (seasonalTips[month]) {
          result.push({
            id: 'season',
            type: 'positive',
            message: seasonalTips[month],
            href: '/season',
          })
        }

        setSuggestions(result.slice(0, 4))
      } catch (err) {
        console.error('Suggestions error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSuggestions()
  }, [kitchenId, kitchenLoading])

  if (loading || kitchenLoading) {
    return (
      <div className="card p-5 space-y-3">
        <div className="skeleton w-24 h-4 rounded" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-10 rounded-lg" />
        ))}
      </div>
    )
  }

  if (suggestions.length === 0) return null

  const typeConfig: Record<Suggestion['type'], { icon: JSX.Element; color: string }> = {
    action: {
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
          <path d="M7 4.5V7.5M7 9.5V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ),
      color: 'text-amber-500',
    },
    positive: {
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4.5 7.5L6 9L9.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      color: 'text-emerald-500',
    },
    cta: {
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7.5L5.5 3V6.5H9L5.5 11V7.5H2Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      color: 'text-[#E8A040]',
    },
  }

  return (
    <div className="card p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9E7E60] mb-3">Suggesties</h3>
      <div className="space-y-1">
        {suggestions.map((s) => {
          const config = typeConfig[s.type]
          const inner = (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-stone-50 transition-colors group">
              <span className={`mt-0.5 shrink-0 ${config.color}`}>{config.icon}</span>
              <span className="text-sm text-[#5C4730] group-hover:text-stone-800 transition-colors">{s.message}</span>
              {s.href && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 ml-auto mt-0.5 text-[#5C4730] group-hover:text-[#E8A040] transition-colors">
                  <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          )

          if (s.href) {
            return <Link key={s.id} href={s.href}>{inner}</Link>
          }
          return <div key={s.id}>{inner}</div>
        })}
      </div>
    </div>
  )
}
