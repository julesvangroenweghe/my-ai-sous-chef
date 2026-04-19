'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, FlaskConical, Beaker, Scale, Thermometer, Leaf } from 'lucide-react'

interface KnowledgeStats {
  classicalRecipes: number
  preparations: number
  variants: number
  ratios: number
  techniques: number
  seasonalItems: number
}

const statItems = [
  { key: 'classicalRecipes', icon: BookOpen, label: 'Klassieke recepten', color: 'text-brand-600 bg-brand-50' },
  { key: 'preparations', icon: Beaker, label: 'Halffabricaten', color: 'text-violet-600 bg-violet-50' },
  { key: 'variants', icon: FlaskConical, label: 'Chef varianten', color: 'text-amber-600 bg-amber-50' },
  { key: 'ratios', icon: Scale, label: 'Ratio\'s', color: 'text-emerald-600 bg-emerald-50' },
  { key: 'techniques', icon: Thermometer, label: 'Technieken', color: 'text-cyan-600 bg-cyan-50' },
  { key: 'seasonalItems', icon: Leaf, label: 'Seizoensproducten', color: 'text-green-600 bg-green-50' },
] as const

export function KnowledgeStatsWidget() {
  const [stats, setStats] = useState<KnowledgeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [recipes, preps, variants, ratios, techniques, seasonal] = await Promise.all([
        supabase.from('classical_recipes').select('id', { count: 'exact', head: true }),
        supabase.from('preparations').select('id', { count: 'exact', head: true }),
        supabase.from('ingredient_variants').select('id', { count: 'exact', head: true }),
        supabase.from('classical_ratios').select('id', { count: 'exact', head: true }),
        supabase.from('techniques').select('id', { count: 'exact', head: true }),
        supabase.from('seasonal_calendar').select('id', { count: 'exact', head: true }),
      ])

      setStats({
        classicalRecipes: recipes.count || 0,
        preparations: preps.count || 0,
        variants: variants.count || 0,
        ratios: ratios.count || 0,
        techniques: techniques.count || 0,
        seasonalItems: seasonal.count || 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="card p-6">
        <div className="skeleton w-48 h-5 rounded mb-4" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-xl bg-stone-900 flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-stone-900 text-sm">Culinaire Kennisbank</h3>
          <p className="text-[11px] text-stone-400">Escoffier · Artusi · Hirtzler · Soyer · Filippini</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {stats && statItems.map(({ key, icon: Icon, label, color }) => (
          <div key={key} className="text-center px-2 py-3 rounded-xl bg-stone-50/80 hover:bg-stone-50 transition-colors">
            <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mx-auto mb-1.5`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="font-mono text-lg font-bold text-stone-900 tabular-nums leading-none">
              {(stats[key] as number).toLocaleString('nl-BE')}
            </div>
            <div className="text-[10px] text-stone-400 mt-1 leading-tight">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
