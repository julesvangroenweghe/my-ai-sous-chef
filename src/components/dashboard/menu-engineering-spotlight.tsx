'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useKitchen } from '@/providers/kitchen-provider'
import Link from 'next/link'

interface MenuData {
  hasMenus: boolean
  latestMenu?: { name: string; status: string; created_at: string }
  avgScore?: number
  auditCount?: number
}

export function MenuEngineeringSpotlight() {
  const { kitchenId, loading: kitchenLoading } = useKitchen()
  const [data, setData] = useState<MenuData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (kitchenLoading || !kitchenId) return

    async function loadData() {
      try {
        const [menusRes, auditRes] = await Promise.all([
          supabase
            .from('saved_menus')
            .select('name, status, created_at')
            .eq('kitchen_id', kitchenId)
            .order('created_at', { ascending: false })
            .limit(1),
          supabase
            .from('audit_rulesets')
            .select('avg_score, total_audits')
            .eq('kitchen_id', kitchenId)
            .limit(1)
            .single(),
        ])

        const latestMenu = menusRes.data?.[0]
        const audit = auditRes.data

        setData({
          hasMenus: !!latestMenu,
          latestMenu: latestMenu || undefined,
          avgScore: audit?.avg_score || undefined,
          auditCount: audit?.total_audits || undefined,
        })
      } catch (err) {
        console.error('Menu spotlight error:', err)
        setData({ hasMenus: false })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [kitchenId, kitchenLoading])

  if (loading || kitchenLoading) {
    return (
      <div className="card p-6 space-y-3">
        <div className="skeleton w-36 h-5 rounded" />
        <div className="skeleton w-56 h-4 rounded" />
        <div className="skeleton w-full h-20 rounded-xl" />
      </div>
    )
  }

  return (
    <Link href="/menu-engineering" className="card-hover p-6 group block h-full">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-display font-semibold text-stone-900 group-hover:text-[#E8A040] transition-colors">
            Menu Engineering
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">
            AI-gestuurd menu samenstellen met culinaire audit
          </p>
        </div>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 text-stone-300 group-hover:text-[#E8A040] transition-colors">
          <path d="M7 4L13 10L7 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {data?.hasMenus && data.latestMenu ? (
        <div className="space-y-3">
          {/* Latest menu info */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-stone-50">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-[#6B6560]">
              <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
              <path d="M5 6H11M5 8.5H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-stone-700 truncate block">{data.latestMenu.name}</span>
              <span className="text-xs text-stone-400">
                {new Date(data.latestMenu.created_at).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}
              </span>
            </div>
            {data.latestMenu.status && (
              <span className="text-xs font-medium text-stone-400 capitalize">{data.latestMenu.status}</span>
            )}
          </div>

          {/* Audit mini preview */}
          {data.avgScore != null && data.avgScore > 0 && (
            <div className="flex items-center gap-3">
              <MiniScoreRing score={data.avgScore} />
              <div>
                <span className="text-xs font-medium text-stone-600">Audit score</span>
                <span className="text-xs text-stone-400 ml-2">{data.auditCount || 0} audits</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-stone-200 group-hover:border-[#E8A040]/30 transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-[#E8A040]">
            <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.2" />
            <path d="M10 6V14M6 10H14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span className="text-sm font-medium text-stone-500 group-hover:text-stone-700 transition-colors">
            Stel je eerste menu samen
          </span>
        </div>
      )}
    </Link>
  )
}

function MiniScoreRing({ score }: { score: number }) {
  const normalized = Math.min(100, Math.max(0, score))
  const r = 12
  const circumference = 2 * Math.PI * r
  const offset = circumference - (normalized / 100) * circumference

  return (
    <svg width="32" height="32" viewBox="0 0 32 32" className="transform -rotate-90">
      <circle cx="16" cy="16" r={r} fill="none" stroke="#F5F5F4" strokeWidth="3" />
      <circle
        cx="16"
        cy="16"
        r={r}
        fill="none"
        stroke="#E8A040"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  )
}
