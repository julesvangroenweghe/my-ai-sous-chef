'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useKitchen } from '@/providers/kitchen-provider'
import Link from 'next/link'

interface GrowthItem {
  label: string
  done: boolean
  current: number
  target: number
  suggestion?: string
  href?: string
}

interface GrowthData {
  items: GrowthItem[]
  percentage: number
  nextStep: string
}

export function ChefGrowthWidget() {
  const { kitchenId, loading: kitchenLoading } = useKitchen()
  const [data, setData] = useState<GrowthData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (kitchenLoading || !kitchenId) return

    async function loadGrowth() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const [
          recipesRes,
          ingredientsRes,
          ingredientsPricedRes,
          prepsRes,
          eventsRes,
          profileRes,
          legendeRes,
          suppliersRes,
          auditRes,
        ] = await Promise.all([
          supabase.from('recipes').select('id', { count: 'exact', head: true }).eq('kitchen_id', kitchenId),
          supabase.from('ingredients').select('id', { count: 'exact', head: true }).eq('kitchen_id', kitchenId),
          supabase.from('ingredients').select('id', { count: 'exact', head: true }).eq('kitchen_id', kitchenId).gt('current_price', 0),
          supabase.from('preparations').select('id', { count: 'exact', head: true }).eq('kitchen_id', kitchenId),
          supabase.from('events').select('id', { count: 'exact', head: true }).eq('kitchen_id', kitchenId),
          supabase.from('chef_profiles').select('onboarding_completed, style_keywords').eq('auth_user_id', user.id).maybeSingle(),
          supabase.from('legende_recipe_matches').select('id', { count: 'exact', head: true }),
          supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('kitchen_id', kitchenId),
          supabase.from('audit_rulesets').select('total_audits').eq('kitchen_id', kitchenId).limit(1).maybeSingle(),
        ])

        const recipes = recipesRes.count || 0
        const ingredients = ingredientsRes.count || 0
        const ingredientsPriced = ingredientsPricedRes.count || 0
        const preps = prepsRes.count || 0
        const events = eventsRes.count || 0
        const onboarded = profileRes.data?.onboarding_completed || false
        const legendeMatches = legendeRes.count || 0
        const suppliers = suppliersRes.count || 0
        const audits = auditRes.data?.total_audits || 0
        const pricedPct = ingredients > 0 ? Math.round((ingredientsPriced / ingredients) * 100) : 0

        const items: GrowthItem[] = [
          {
            label: 'Recepten aangemaakt',
            done: recipes >= 20,
            current: recipes,
            target: 20,
            suggestion: recipes < 20 ? `Voeg ${20 - recipes} meer recepten toe` : undefined,
            href: '/recipes/new',
          },
          {
            label: 'Ingrediënten met prijzen',
            done: pricedPct >= 80,
            current: pricedPct,
            target: 100,
            suggestion: pricedPct < 80 ? `${100 - pricedPct}% van je ingrediënten mist een prijs` : undefined,
            href: '/ingredients',
          },
          {
            label: 'Halffabricaten gedefinieerd',
            done: preps >= 1,
            current: preps,
            target: 5,
            suggestion: preps === 0 ? 'Maak je eerste halffabricaat aan' : undefined,
            href: '/preparations',
          },
          {
            label: 'Events gepland',
            done: events >= 1,
            current: events,
            target: 3,
            suggestion: events === 0 ? 'Plan je eerste event' : undefined,
            href: '/events/new',
          },
          {
            label: 'Stijlprofiel ingevuld',
            done: onboarded,
            current: onboarded ? 1 : 0,
            target: 1,
            suggestion: !onboarded ? 'Vul je stijlprofiel in' : undefined,
            href: '/onboarding',
          },
          {
            label: 'LEGENDE gerechten gematcht',
            done: legendeMatches >= 1,
            current: legendeMatches,
            target: 5,
            suggestion: legendeMatches === 0 ? 'Match je eerste LEGENDE gerecht' : undefined,
            href: '/match-style',
          },
          {
            label: 'Leveranciers gekoppeld',
            done: suppliers >= 1,
            current: suppliers,
            target: 3,
            suggestion: suppliers === 0 ? 'Koppel je eerste leverancier' : undefined,
            href: '/suppliers',
          },
          {
            label: 'Audit Engine getraind',
            done: audits > 0,
            current: audits,
            target: 1,
            suggestion: audits === 0 ? 'Start je eerste culinaire audit' : undefined,
            href: '/menu-engineering',
          },
        ]

        const doneCount = items.filter((i) => i.done).length
        const percentage = Math.round((doneCount / items.length) * 100)
        const firstUndone = items.find((i) => !i.done)
        const nextStep = firstUndone?.suggestion || 'Je keuken is volledig ingericht!'

        setData({ items, percentage, nextStep })
      } catch (err) {
        console.error('Growth widget error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadGrowth()
  }, [kitchenId, kitchenLoading])

  if (loading || kitchenLoading) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="skeleton w-16 h-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton w-40 h-5 rounded" />
            <div className="skeleton w-64 h-4 rounded" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton h-10 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const { items, percentage, nextStep } = data
  const circumference = 2 * Math.PI * 28
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="card p-6">
      <div className="flex items-start gap-5">
        {/* Progress Ring */}
        <div className="relative shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72" className="transform -rotate-90">
            <circle
              cx="36"
              cy="36"
              r="28"
              fill="none"
              stroke="currentColor"
              className="text-stone-100"
              strokeWidth="5"
            />
            <circle
              cx="36"
              cy="36"
              r="28"
              fill="none"
              stroke="#E8A040"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-sm font-bold text-stone-900">{percentage}%</span>
          </div>
        </div>

        {/* Title + Next Step */}
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-lg font-semibold text-stone-900">Jouw Keuken</h2>
          <p className="text-sm text-stone-400 mt-0.5">{nextStep}</p>
        </div>
      </div>

      {/* Items Grid */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {items.map((item) => (
          <GrowthItemRow key={item.label} item={item} />
        ))}
      </div>
    </div>
  )
}

function GrowthItemRow({ item }: { item: GrowthItem }) {
  const inner = (
    <div
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
        item.href ? 'hover:bg-stone-50 cursor-pointer group' : ''
      }`}
    >
      {/* Check / Cross icon */}
      {item.done ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <circle cx="8" cy="8" r="8" fill="#E8A040" fillOpacity="0.15" />
          <path d="M5 8.5L7 10.5L11 6" stroke="#E8A040" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <circle cx="8" cy="8" r="7.5" stroke="#D6D3D1" />
        </svg>
      )}
      <span className={`truncate ${item.done ? 'text-stone-400' : 'text-stone-600'}`}>
        {item.label}
      </span>
      {!item.done && item.href && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 ml-auto text-stone-300 group-hover:text-[#E8A040] transition-colors">
          <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )

  if (item.href && !item.done) {
    return <Link href={item.href}>{inner}</Link>
  }
  return inner
}
