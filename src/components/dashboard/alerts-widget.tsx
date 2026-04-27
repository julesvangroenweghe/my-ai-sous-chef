'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  TrendingUp,
  Leaf,
  CalendarDays,
  AlertCircle,
  Lightbulb,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Bell,
} from 'lucide-react'
import Link from 'next/link'

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

const typeIcons: Record<Alert['type'], typeof AlertTriangle> = {
  food_cost_warning: TrendingUp,
  seasonal_suggestion: Leaf,
  price_change: TrendingUp,
  upcoming_event: CalendarDays,
  missing_data: AlertCircle,
  optimization: Lightbulb,
}

const severityStyles: Record<Alert['severity'], { border: string; bg: string; icon: string }> = {
  critical: {
    border: 'border-l-red-500',
    bg: 'bg-red-50/50',
    icon: 'text-red-600',
  },
  warning: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-50/50',
    icon: 'text-amber-600',
  },
  info: {
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-50/50',
    icon: 'text-emerald-600',
  },
}

export function AlertsWidget() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/alerts')
      if (!res.ok) throw new Error('Kon meldingen niet laden')
      const data = await res.json()
      setAlerts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  const visibleAlerts = showAll ? alerts : alerts.slice(0, 5)
  const hasMore = alerts.length > 5

  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="font-display font-semibold text-stone-900">Meldingen</h3>
          </div>
        </div>
        <div className="px-6 pb-5 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="skeleton w-8 h-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton w-48 h-4 rounded" />
                <div className="skeleton w-full h-3 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 text-[#9E7E60] text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Meldingen konden niet geladen worden</span>
          <button onClick={fetchAlerts} className="ml-auto text-brand-600 hover:text-brand-700">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-stone-900 text-sm">Alles onder controle</h3>
            <p className="text-xs text-[#9E7E60]">Geen meldingen op dit moment. Goed bezig, chef!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
            <Bell className="w-4 h-4 text-amber-600" />
          </div>
          <h3 className="font-display font-semibold text-stone-900">Meldingen</h3>
          {alerts.length > 0 && (
            <span className="text-xs font-mono font-medium text-[#9E7E60] bg-stone-100 px-2 py-0.5 rounded-full">
              {alerts.length}
            </span>
          )}
        </div>
        <button
          onClick={fetchAlerts}
          className="text-[#5C4730] hover:text-[#B8997A] transition-colors"
          title="Vernieuw meldingen"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="divide-y divide-stone-100">
        {visibleAlerts.map((alert) => {
          const Icon = typeIcons[alert.type] || AlertCircle
          const styles = severityStyles[alert.severity]

          return (
            <div
              key={alert.id}
              className={`flex items-start gap-3 px-6 py-3.5 border-l-[3px] ${styles.border} ${styles.bg} transition-all`}
            >
              <div className={`shrink-0 mt-0.5 ${styles.icon}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800">{alert.title}</p>
                <p className="text-xs text-[#B8997A] mt-0.5 leading-relaxed">{alert.message}</p>
              </div>
              {alert.actionHref && alert.actionLabel && (
                <Link
                  href={alert.actionHref}
                  className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-0.5 mt-0.5 transition-colors whitespace-nowrap"
                >
                  {alert.actionLabel}
                  <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          )
        })}
      </div>

      {hasMore && (
        <div className="px-6 py-3 border-t border-stone-100">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-medium text-[#9E7E60] hover:text-brand-600 transition-colors flex items-center gap-1 mx-auto"
          >
            {showAll ? (
              <>Toon minder <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>Toon meer ({alerts.length - 5}) <ChevronDown className="w-3 h-3" /></>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
