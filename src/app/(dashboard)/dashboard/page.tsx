'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, CalendarDays, FileText, TrendingUp, ArrowRight, Sparkles, Clock } from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  recipes: number
  events: number
  ingredients: number
  invoices: number
}

function StatCard({ icon: Icon, label, value, href, color, delay }: {
  icon: React.ElementType
  label: string
  value: number
  href: string
  color: string
  delay: number
}) {
  const colorMap: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    sky: 'bg-sky-50 text-sky-600',
  }

  return (
    <Link
      href={href}
      className="card-hover p-6 group animate-slide-up opacity-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all duration-200" />
      </div>
      <div className="font-mono text-2xl font-bold text-stone-900 tabular-nums">{value}</div>
      <div className="text-sm text-stone-500 mt-1">{label}</div>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex justify-between">
        <div className="skeleton w-11 h-11 rounded-2xl" />
        <div className="skeleton w-4 h-4 rounded" />
      </div>
      <div className="skeleton w-16 h-8 rounded-lg" />
      <div className="skeleton w-24 h-4 rounded" />
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Get user name
        const { data: profile } = await supabase
          .from('chef_profiles')
          .select('display_name')
          .eq('auth_user_id', user.id)
          .single()
        
        if (profile?.display_name) setUserName(profile.display_name)

        // Get counts
        const [recipes, events, ingredients, invoices] = await Promise.all([
          supabase.from('recipes').select('id', { count: 'exact', head: true }),
          supabase.from('events').select('id', { count: 'exact', head: true }),
          supabase.from('ingredients').select('id', { count: 'exact', head: true }),
          supabase.from('invoices').select('id', { count: 'exact', head: true }),
        ])

        setStats({
          recipes: recipes.count || 0,
          events: events.count || 0,
          ingredients: ingredients.count || 0,
          invoices: invoices.count || 0,
        })
      } catch (err) {
        console.error('Dashboard load error:', err)
        setStats({ recipes: 0, events: 0, ingredients: 0, invoices: 0 })
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
          {greeting()}{userName ? `, ${userName}` : ''}
        </h1>
        <p className="text-stone-500 mt-2">
          Here is what is happening in your kitchen today.
        </p>
      </div>

      {/* Stats Grid — Asymmetric Bento */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={BookOpen} label="Recipes" value={stats.recipes} href="/recipes" color="brand" delay={0} />
          <StatCard icon={CalendarDays} label="Events" value={stats.events} href="/events" color="emerald" delay={75} />
          <StatCard icon={FileText} label="Invoices" value={stats.invoices} href="/invoices" color="amber" delay={150} />
          <StatCard icon={TrendingUp} label="Ingredients" value={stats.ingredients} href="/ingredients" color="sky" delay={225} />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Jules AI Card — Wide */}
        <div className="lg:col-span-3 card p-8 animate-slide-up opacity-0" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-stone-900">Jules AI</h2>
              <p className="text-sm text-stone-500">Your culinary intelligence partner</p>
            </div>
          </div>
          <p className="text-stone-500 text-sm leading-relaxed mb-6 max-w-[50ch]">
            Ask Jules anything about your recipes, costs, or kitchen operations. Jules learns your style and gets smarter over time.
          </p>
          <Link href="/jules" className="btn-primary text-sm py-2.5 px-5">
            Talk to Jules
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 card p-6 animate-slide-up opacity-0" style={{ animationDelay: '375ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-stone-400" />
            <h3 className="font-display font-semibold text-stone-900 text-sm">Recent Activity</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
              <div className="w-2 h-2 bg-brand-500 rounded-full shrink-0" />
              <p className="text-sm text-stone-600">Welcome to My AI Sous Chef!</p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
              <div className="w-2 h-2 bg-stone-300 rounded-full shrink-0" />
              <p className="text-sm text-stone-400">Start by adding your first recipe</p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
              <div className="w-2 h-2 bg-stone-300 rounded-full shrink-0" />
              <p className="text-sm text-stone-400">Upload an invoice to track costs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
