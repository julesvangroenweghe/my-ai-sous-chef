'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  BookOpen, CalendarDays, FileText, TrendingUp, ArrowRight, Sparkles, 
  Clock, ChefHat, Beaker, Leaf, ClipboardList, Plus, FlaskConical,
  Activity, Flame, Target, AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { SeasonWidget } from '@/components/ai/season-widget'
import { KnowledgeStatsWidget } from '@/components/ai/knowledge-stats'
import { AlertsWidget } from '@/components/dashboard/alerts-widget'
import { CalendarWidget } from '@/components/dashboard/calendar-widget'
import { ChefGrowthWidget } from '@/components/dashboard/chef-growth-widget'
import { MenuEngineeringSpotlight } from '@/components/dashboard/menu-engineering-spotlight'
import { StyleDnaPreview } from '@/components/dashboard/style-dna-preview'
import { SuggestionsWidget } from '@/components/dashboard/suggestions-widget'
import { FadeIn, StaggerList, StaggerItem } from '@/components/ui/page-transition'

interface DashboardStats {
  recipes: number
  events: number
  ingredients: number
  invoices: number
  preparations: number
  upcomingEvents: { id: string; name: string; event_date: string; num_persons: number | null; event_type: string; status: string }[]
  recentRecipes: { id: string; name: string; category: any; updated_at: string }[]
}

// Greeting based on time of day
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return 'Goede nacht'
  if (hour < 12) return 'Goedemorgen'
  if (hour < 14) return 'Smakelijke middag'
  if (hour < 18) return 'Goedemiddag'
  if (hour < 22) return 'Goedenavond'
  return 'Goede nacht'
}

function getMotivation(): string {
  const tips = [
    'Mise en place is de basis van alles.',
    'Een goed gerecht begint bij het product, niet bij het recept.',
    'Seizoensgebonden koken = beter product, lagere kosten.',
    'De beste saus ter wereld redt geen slecht product.',
    'Eenvoud is de hoogste vorm van verfijning.',
    'Cost control is geen beperking, het is discipline.',
  ]
  return tips[Math.floor(Math.random() * tips.length)]
}

const eventTypeLabels: Record<string, string> = {
  walking_dinner: 'Walking Dinner',
  buffet: 'Buffet',
  sit_down: 'Sit-down',
  cocktail: 'Cocktail',
  brunch: 'Brunch',
}

const statusDots: Record<string, string> = {
  draft: 'bg-stone-400',
  confirmed: 'bg-emerald-500',
  in_prep: 'bg-amber-500',
  completed: 'bg-blue-400',
  cancelled: 'bg-red-400',
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

        const { data: profile } = await supabase
          .from('chef_profiles')
          .select('display_name, name')
          .eq('auth_user_id', user.id)
          .single()
        
        if (profile?.display_name) { const dn = profile.display_name; setUserName(dn.startsWith('Chef ') ? dn : dn); } else if (profile?.name) { setUserName(profile.name); }

        const [recipes, events, ingredients, invoices, preparations, upcoming, recent] = await Promise.all([
          supabase.from('recipes').select('id', { count: 'exact', head: true }),
          supabase.from('events').select('id', { count: 'exact', head: true }),
          supabase.from('ingredients').select('id', { count: 'exact', head: true }),
          supabase.from('invoices').select('id', { count: 'exact', head: true }),
          supabase.from('preparations').select('id', { count: 'exact', head: true }),
          supabase.from('events')
            .select('id, name, event_date, num_persons, event_type, status')
            .gte('event_date', new Date().toISOString().split('T')[0])
            .order('event_date')
            .limit(5),
          supabase.from('recipes')
            .select('id, name, category:recipe_categories(id, name), updated_at').eq('status', 'active')
            .order('updated_at', { ascending: false })
            .limit(4),
        ])

        setStats({
          recipes: recipes.count || 0,
          events: events.count || 0,
          ingredients: ingredients.count || 0,
          invoices: invoices.count || 0,
          preparations: preparations.count || 0,
          upcomingEvents: (upcoming.data || []) as any[],
          recentRecipes: (recent.data || []) as any[],
        })
      } catch (err) {
        console.error('Dashboard load error:', err)
        setStats({ recipes: 0, events: 0, ingredients: 0, invoices: 0, preparations: 0, upcomingEvents: [], recentRecipes: [] })
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  const greeting = getGreeting()
  const motivation = getMotivation()

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-brand-600 mb-1">{greeting}</p>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight">
              {userName || 'Dashboard'}
            </h1>
            <p className="text-[#9E7E60] mt-2 text-sm italic max-w-lg">"{motivation}"</p>
          </div>
          <div className="flex gap-2">
            <Link href="/recipes/new" className="btn-secondary text-sm py-2.5 px-4">
              <Plus className="w-4 h-4" /> Recept
            </Link>
            <Link href="/events/new" className="btn-primary text-sm py-2.5 px-4">
              <Plus className="w-4 h-4" /> Event
            </Link>
          </div>
        </div>
      </div>

      {/* Proactive AI Alerts */}
      <div>
        <AlertsWidget />
      </div>

      {/* Chef Growth Widget — Full Width */}
      <FadeIn delay={0.05}>
        <ChefGrowthWidget />
      </FadeIn>

      {/* Menu Engineering Spotlight + Stijl-DNA — Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <FadeIn delay={0.1} className="lg:col-span-7">
          <MenuEngineeringSpotlight />
        </FadeIn>
        <FadeIn delay={0.15} className="lg:col-span-5">
          <StyleDnaPreview />
        </FadeIn>
      </div>

      {/* Quick Stats Strip */}
      <StaggerList className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="card p-4 space-y-2">
              <div className="skeleton w-8 h-8 rounded-xl" />
              <div className="skeleton w-12 h-6 rounded" />
              <div className="skeleton w-20 h-3 rounded" />
            </div>
          ))
        ) : (
          <>
            <StaggerItem><Link href="/recipes" className="card-hover p-4 group">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
                  <BookOpen className="w-4.5 h-4.5 text-brand-600" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#5C4730] group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="font-mono text-xl font-bold text-stone-900 tabular-nums">{stats?.recipes || 0}</div>
              <div className="text-xs text-[#9E7E60] mt-0.5">Recepten</div>
            </Link></StaggerItem>
            <StaggerItem><Link href="/events" className="card-hover p-4 group">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CalendarDays className="w-4.5 h-4.5 text-emerald-600" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#5C4730] group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="font-mono text-xl font-bold text-stone-900 tabular-nums">{stats?.events || 0}</div>
              <div className="text-xs text-[#9E7E60] mt-0.5">Events</div>
            </Link></StaggerItem>
            <StaggerItem><Link href="/ingredients" className="card-hover p-4 group">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <FlaskConical className="w-4.5 h-4.5 text-amber-600" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#5C4730] group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="font-mono text-xl font-bold text-stone-900 tabular-nums">{stats?.ingredients || 0}</div>
              <div className="text-xs text-[#9E7E60] mt-0.5">Ingrediënten</div>
            </Link></StaggerItem>
            <StaggerItem><Link href="/preparations" className="card-hover p-4 group">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                  <Beaker className="w-4.5 h-4.5 text-violet-600" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#5C4730] group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="font-mono text-xl font-bold text-stone-900 tabular-nums">{stats?.preparations || 0}</div>
              <div className="text-xs text-[#9E7E60] mt-0.5">Halffabricaten</div>
            </Link></StaggerItem>
            <StaggerItem><Link href="/invoices" className="card-hover p-4 group">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center">
                  <FileText className="w-4.5 h-4.5 text-sky-600" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#5C4730] group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="font-mono text-xl font-bold text-stone-900 tabular-nums">{stats?.invoices || 0}</div>
              <div className="text-xs text-[#9E7E60] mt-0.5">Facturen</div>
            </Link></StaggerItem>
          </>
        )}
      </StaggerList>

      {/* Main Content Grid — Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column — Upcoming + Recent */}
        <div className="lg:col-span-7 space-y-6">
          {/* Komende Events */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-display font-semibold text-stone-900">Komende Events</h3>
              </div>
              <Link href="/events" className="text-xs font-medium text-[#9E7E60] hover:text-brand-600 transition-colors">
                Alle bekijken
              </Link>
            </div>
            
            {loading ? (
              <div className="px-6 pb-5 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <div className="skeleton w-12 h-12 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton w-48 h-4 rounded" />
                      <div className="skeleton w-32 h-3 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : stats?.upcomingEvents && stats.upcomingEvents.length > 0 ? (
              <div className="divide-y divide-stone-100">
                {stats.upcomingEvents.map((event, i) => {
                  const date = new Date(event.event_date)
                  const dayNum = date.getDate()
                  const monthShort = date.toLocaleDateString('nl-BE', { month: 'short' })
                  const dayName = date.toLocaleDateString('nl-BE', { weekday: 'short' })
                  const daysUntil = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

                  return (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-stone-50/80 transition-all group"
                    >
                      {/* Date block */}
                      <div className="w-12 h-12 rounded-xl bg-white text-[#2C1810] flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] uppercase tracking-wide text-[#9E7E60] leading-none">{monthShort}</span>
                        <span className="font-mono text-lg font-bold leading-none mt-0.5">{dayNum}</span>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-stone-900 group-hover:text-brand-700 transition-colors truncate">
                            {event.name}
                          </span>
                          <span className={`w-2 h-2 rounded-full ${statusDots[event.status] || 'bg-stone-300'}`} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#9E7E60] mt-0.5">
                          <span>{eventTypeLabels[event.event_type] || event.event_type}</span>
                          {event.num_persons && <span>{event.num_persons} pers.</span>}
                          <span>{dayName}</span>
                        </div>
                      </div>
                      {/* Days until */}
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-mono font-medium ${daysUntil <= 3 ? 'text-red-500' : daysUntil <= 7 ? 'text-amber-500' : 'text-[#9E7E60]'}`}>
                          {daysUntil === 0 ? 'Vandaag!' : daysUntil === 1 ? 'Morgen' : `${daysUntil}d`}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="px-6 pb-6 text-center">
                <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CalendarDays className="w-5 h-5 text-[#5C4730]" />
                </div>
                <p className="text-sm text-[#9E7E60] mb-3">Geen komende events</p>
                <Link href="/events/new" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                  + Eerste event plannen
                </Link>
              </div>
            )}
          </div>

          {/* Recent Recipes */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-brand-600" />
                </div>
                <h3 className="font-display font-semibold text-stone-900">Recente Recepten</h3>
              </div>
              <Link href="/recipes" className="text-xs font-medium text-[#9E7E60] hover:text-brand-600 transition-colors">
                Alle bekijken
              </Link>
            </div>
            
            {loading ? (
              <div className="px-6 pb-5 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="skeleton h-12 rounded-xl" />
                ))}
              </div>
            ) : stats?.recentRecipes && stats.recentRecipes.length > 0 ? (
              <div className="divide-y divide-stone-100">
                {stats.recentRecipes.map((recipe) => {
                  const date = new Date(recipe.updated_at)
                  const timeAgo = getTimeAgo(date)
                  return (
                    <Link
                      key={recipe.id}
                      href={`/recipes/${recipe.id}`}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-stone-50/80 transition-all group"
                    >
                      <div className="w-2 h-2 rounded-full bg-brand-400 shrink-0" />
                      <span className="text-sm font-medium text-stone-700 group-hover:text-brand-700 transition-colors flex-1 truncate">
                        {recipe.name}
                      </span>
                      <span className="text-xs text-[#9E7E60] shrink-0">{timeAgo}</span>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="px-6 pb-6 text-center">
                <p className="text-sm text-[#9E7E60] mb-3">Nog geen recepten</p>
                <Link href="/recipes/new" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                  + Eerste recept maken
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Suggestions + Calendar + Season + Knowledge */}
        <div className="lg:col-span-5 space-y-6">
          <SuggestionsWidget />
          <div>
            <CalendarWidget />
          </div>
          <div>
            <SeasonWidget />
          </div>
          <div>
            <KnowledgeStatsWidget />
          </div>

          {/* Snelle Acties */}
          <div className="card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9E7E60] mb-3">Snelle acties</h3>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/recipes/new" className="flex items-center gap-2.5 p-3 rounded-xl hover:bg-stone-50 transition-all text-sm text-[#5C4730] hover:text-brand-700 group">
                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                  <Plus className="w-4 h-4 text-brand-600" />
                </div>
                Nieuw recept
              </Link>
              <Link href="/events/new" className="flex items-center gap-2.5 p-3 rounded-xl hover:bg-stone-50 transition-all text-sm text-[#5C4730] hover:text-brand-700 group">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  <CalendarDays className="w-4 h-4 text-emerald-600" />
                </div>
                Nieuw event
              </Link>
              <Link href="/mep" className="flex items-center gap-2.5 p-3 rounded-xl hover:bg-stone-50 transition-all text-sm text-[#5C4730] hover:text-brand-700 group">
                <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center group-hover:bg-sky-100 transition-colors">
                  <ClipboardList className="w-4 h-4 text-sky-600" />
                </div>
                MEP Planning
              </Link>
              <Link href="/invoices" className="flex items-center gap-2.5 p-3 rounded-xl hover:bg-stone-50 transition-all text-sm text-[#5C4730] hover:text-brand-700 group">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                  <FileText className="w-4 h-4 text-amber-600" />
                </div>
                Factuur scannen
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


function getTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m geleden`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}u geleden`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d geleden`
  return date.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })
}
