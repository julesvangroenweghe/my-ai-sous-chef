'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface StyleData {
  hasProfile: boolean
  keywords: string[]
  legendeMatches: number
}

export function StyleDnaPreview() {
  const [data, setData] = useState<StyleData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadStyle() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const [profileRes, legendeRes] = await Promise.all([
          supabase
            .from('chef_profiles')
            .select('style_keywords, onboarding_completed')
            .eq('auth_user_id', user.id)
            .maybeSingle(),
          supabase
            .from('legende_recipe_matches')
            .select('id', { count: 'exact', head: true }),
        ])

        const profile = profileRes.data
        const keywords = profile?.style_keywords || []
        const onboarded = profile?.onboarding_completed || false

        setData({
          hasProfile: onboarded && keywords.length > 0,
          keywords: keywords.slice(0, 4),
          legendeMatches: legendeRes.count || 0,
        })
      } catch (err) {
        console.error('Style DNA error:', err)
        setData({ hasProfile: false, keywords: [], legendeMatches: 0 })
      } finally {
        setLoading(false)
      }
    }

    loadStyle()
  }, [])

  if (loading) {
    return (
      <div className="card p-6 space-y-3">
        <div className="skeleton w-32 h-5 rounded" />
        <div className="skeleton w-48 h-4 rounded" />
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton w-20 h-7 rounded-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  if (!data.hasProfile) {
    return (
      <Link href="/onboarding" className="card-hover p-6 group block h-full">
        <h3 className="font-display font-semibold text-stone-900 group-hover:text-[#E8A040] transition-colors">
          Stijl-DNA
        </h3>
        <p className="text-xs text-[#9E7E60] mt-0.5 mb-4">
          Ontdek je culinaire identiteit
        </p>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-stone-200 group-hover:border-[#E8A040]/30 transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-[#E8A040]">
            <path d="M10 2C10 2 4 6 4 10C4 14 7 18 10 18C13 18 16 14 16 10C16 6 10 2 10 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 2V18" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span className="text-sm font-medium text-[#B8997A] group-hover:text-stone-700 transition-colors">
            Start je stijlprofiel
          </span>
        </div>
      </Link>
    )
  }

  return (
    <Link href="/match-style" className="card-hover p-6 group block h-full">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-display font-semibold text-stone-900 group-hover:text-[#E8A040] transition-colors">
            Stijl-DNA
          </h3>
          <p className="text-xs text-[#9E7E60] mt-0.5">Je culinaire identiteit</p>
        </div>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 text-[#5C4730] group-hover:text-[#E8A040] transition-colors">
          <path d="M7 4L13 10L7 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Style Keywords as Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {data.keywords.map((keyword) => (
          <span
            key={keyword}
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-[#5C4730]"
          >
            {keyword}
          </span>
        ))}
      </div>

      {/* LEGENDE match count */}
      <div className="flex items-center gap-2 text-xs text-[#9E7E60]">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[#E8A040]">
          <path d="M7 1L8.8 4.6L13 5.2L10 8L10.6 13L7 11L3.4 13L4 8L1 5.2L5.2 4.6L7 1Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{data.legendeMatches} LEGENDE {data.legendeMatches === 1 ? 'gerecht' : 'gerechten'} gematcht</span>
      </div>
    </Link>
  )
}
