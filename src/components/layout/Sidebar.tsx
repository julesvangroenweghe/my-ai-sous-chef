'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  BookOpen, CalendarDays, FileText, FlaskConical, 
  Sparkles, User, Settings, LogOut, ChefHat,
  LayoutDashboard, Menu, X, ClipboardList,
  TrendingUp, Truck, Building2, Store, UtensilsCrossed,
  ShoppingCart, Leaf, Beaker, Camera, ClipboardCheck, BookMarked, ScanLine, Link2, Mail
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useKitchen } from '@/providers/kitchen-provider'
import type { KitchenType } from '@/types/database'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  recipes: BookOpen,
  events: CalendarDays,
  mep: ClipboardList,
  invoices: FileText,
  ingredients: FlaskConical,
  jules_ai: Sparkles,
  food_cost: TrendingUp,
  menu: UtensilsCrossed,
  suggestions: Store,
  daily_prep: ShoppingCart,
  outlets: Building2,
  brands: Building2,
  preparations: Beaker,
  seasonal: Leaf,
  calendar: CalendarDays,
  scan: ScanLine,
  suppliers: ShoppingCart,
  legende: BookMarked,
  match_my_style: ClipboardCheck,
  menu_builder: Sparkles,
  checklist: ClipboardCheck,
  integrations: Link2,
  inbox: Mail,
  knowledge: BookOpen,
  kennisbank: BookOpen,
  profile: User,
  settings: Settings,
}

const labelMap: Record<string, string> = {
  dashboard: 'Dashboard',
  recipes: 'Recepten',
  events: 'Events & MEP',
  mep: 'MEP Plans',
  invoices: 'Facturen',
  ingredients: 'Ingrediënten',
  jules_ai: 'Jules AI',
  food_cost: 'Food Cost',
  menu: 'Menukaart',
  suggestions: 'Dagsuggesties',
  scan: 'Scan',
  suppliers: 'Leveranciers',
  legende: 'LEGENDE',
  match_my_style: 'Match My Style',
  menu_builder: 'Menu Builder',
  checklist: 'Checklist',
  integrations: 'Integraties',
  inbox: 'Inbox',
  knowledge: 'Kennisbank',
  kennisbank: 'Kennisbank',
  daily_prep: 'Dagproductie',
  outlets: 'Outlets',
  brands: 'Brands',
  preparations: 'Halffabricaten',
  seasonal: 'Seizoenskalender',
  calendar: 'Kalender',
  profile: 'Profiel',
  settings: 'Instellingen',
}

const hrefMap: Record<string, string> = {
  dashboard: '/dashboard',
  recipes: '/recipes',
  events: '/events',
  mep: '/mep',
  invoices: '/invoices',
  ingredients: '/ingredients',
  jules_ai: '/jules',
  food_cost: '/food-cost',
  menu: '/menu',
  suggestions: '/suggestions',
  daily_prep: '/daily-prep',
  scan: '/scan',
  suppliers: '/suppliers',
  legende: '/legende',
  match_my_style: '/match-style',
  menu_builder: '/menu-builder',
  checklist: '/recipes/checklist',
  integrations: '/integrations',
  inbox: '/inbox',
  knowledge: '/knowledge',
  kennisbank: '/knowledge',
  outlets: '/outlets',
  brands: '/brands',
  preparations: '/preparations',
  seasonal: '/seasonal',
  calendar: '/calendar',
  profile: '/profile',
  settings: '/settings',
}

const kitchenTypeLabel: Record<string, string> = {
  restaurant: 'Restaurant',
  brasserie: 'Brasserie',
  catering: 'Catering',
  foodtruck: 'Foodtruck',
  hotel: 'Hotel',
  dark_kitchen: 'Dark Kitchen',
}

const defaultNavByType: Record<string, string[]> = {
  restaurant: ['dashboard', 'recipes', 'menu', 'ingredients', 'preparations', 'seasonal', 'mep', 'invoices', 'food_cost', 'jules_ai'],
  brasserie: ['dashboard', 'recipes', 'suggestions', 'ingredients', 'mep', 'invoices', 'food_cost', 'jules_ai'],
  catering: ['dashboard', 'recipes', 'events', 'menu_builder', 'calendar', 'ingredients', 'preparations', 'seasonal', 'mep', 'invoices', 'inbox', 'food_cost', 'jules_ai'],
  foodtruck: ['dashboard', 'recipes', 'ingredients', 'daily_prep', 'invoices', 'food_cost'],
  hotel: ['dashboard', 'recipes', 'outlets', 'events', 'calendar', 'ingredients', 'mep', 'invoices', 'food_cost', 'jules_ai'],
  dark_kitchen: ['dashboard', 'recipes', 'brands', 'ingredients', 'daily_prep', 'invoices', 'food_cost'],
}

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const supabase = createClient()
  const { kitchen, kitchenType, settings, loading } = useKitchen()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const navFeatures = settings?.features 
    || defaultNavByType[kitchenType || 'restaurant'] 
    || defaultNavByType.restaurant

  const mainNav = navFeatures
    .filter((f: string) => f !== 'settings' && f !== 'profile')
    .map((feature: string) => ({
      name: labelMap[feature] || feature,
      href: hrefMap[feature] || `/${feature}`,
      icon: iconMap[feature] || LayoutDashboard,
    }))

  const NavContent = () => (
    <div className="flex flex-col h-full" style={{ background: '#0D0C0A' }}>

      {/* Logo area — Gronda-stijl: groot, sereen, amber */}
      <div className="px-5 pt-7 pb-5" style={{ borderBottom: '1px solid #1E1C18' }}>
        <Link href="/dashboard" className="flex items-center gap-3 group">
          {/* Amber chef hat icon */}
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 36,
              height: 36,
              background: 'rgba(232,160,64,0.1)',
              border: '1px solid rgba(232,160,64,0.2)',
              borderRadius: 8,
            }}
          >
            <ChefHat style={{ width: 18, height: 18, color: '#E8A040' }} />
          </div>

          <div className="flex flex-col">
            {/* Serif brand name — Gronda-stijl */}
            <span
              style={{
                fontFamily: 'Georgia, Cambria, serif',
                fontSize: 14,
                fontWeight: 400,
                color: '#F0EBE3',
                letterSpacing: '0.02em',
                lineHeight: 1.2,
              }}
            >
              My AI Sous Chef
            </span>
            {kitchen && !loading && (
              <span
                style={{
                  fontSize: 10,
                  color: '#E8A040',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                  marginTop: 2,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {kitchen.name}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* Kitchen type pill */}
      {!loading && kitchenType && (
        <div className="px-5 pt-4 pb-0">
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#5A5448',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#E8A040',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            {kitchenTypeLabel[kitchenType] || kitchenType}
          </span>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 mb-0.5">
              <div style={{ width: 16, height: 16, background: '#1E1C18', borderRadius: 4 }} />
              <div style={{ height: 10, background: '#1E1C18', borderRadius: 3, width: 60 + i * 8 }} />
            </div>
          ))
        ) : (
          mainNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 10px',
                  marginBottom: 1,
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  letterSpacing: '0.01em',
                  color: isActive ? '#F0EBE3' : '#6B6358',
                  background: isActive ? 'rgba(232,160,64,0.07)' : 'transparent',
                  transition: 'all 0.15s ease',
                  textDecoration: 'none',
                  position: 'relative',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  borderLeft: isActive ? '2px solid #E8A040' : '2px solid transparent',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = '#C8BFB4'
                    ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = '#6B6358'
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  }
                }}
              >
                <item.icon
                  style={{
                    width: 15,
                    height: 15,
                    flexShrink: 0,
                    color: isActive ? '#E8A040' : '#4A4540',
                    strokeWidth: 1.75,
                  }}
                />
                {item.name}
              </Link>
            )
          })
        )}
      </nav>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #1E1C18', margin: '0 12px' }} />

      {/* Bottom nav */}
      <div className="px-3 py-4 space-y-0.5">
        {[
          { name: 'Profiel', href: '/profile', icon: User },
          { name: 'Instellingen', href: '/settings', icon: Settings },
        ].map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 10px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 400,
                color: isActive ? '#F0EBE3' : '#5A5448',
                background: isActive ? 'rgba(232,160,64,0.07)' : 'transparent',
                transition: 'all 0.15s ease',
                textDecoration: 'none',
                borderLeft: isActive ? '2px solid #E8A040' : '2px solid transparent',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              <item.icon style={{ width: 15, height: 15, flexShrink: 0, color: isActive ? '#E8A040' : '#3A3630', strokeWidth: 1.75 }} />
              {item.name}
            </Link>
          )
        })}

        <button
          onClick={handleSignOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '7px 10px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 400,
            color: '#5A5448',
            background: 'transparent',
            transition: 'all 0.15s ease',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            borderLeft: '2px solid transparent',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = '#ef4444'
            ;(e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = '#5A5448'
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          }}
        >
          <LogOut style={{ width: 15, height: 15, strokeWidth: 1.75 }} />
          Afmelden
        </button>
      </div>

      {/* Food Cost indicator */}
      {settings && !loading && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #1A1814',
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#3A3630',
              marginBottom: 6,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            Food Cost Target
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                flex: 1,
                height: 2,
                background: '#1E1C18',
                borderRadius: 9999,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${settings.food_cost_target_max}%`,
                  background: 'linear-gradient(90deg, #E8A040 0%, #f9bd3a 100%)',
                  borderRadius: 9999,
                }}
              />
            </div>
            <span
              style={{
                fontSize: 10,
                color: '#5A5448',
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {settings.food_cost_target_min}–{settings.food_cost_target_max}%
            </span>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg text-white shadow-lg"
        style={{ background: '#0D0C0A', border: '1px solid #1E1C18' }}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-60 h-full shadow-sidebar" style={{ background: '#0D0C0A' }}>
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 z-10"
              style={{ color: '#5A5448', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X className="w-5 h-5" />
            </button>
            <NavContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex w-56 shrink-0 h-screen sticky top-0"
        style={{
          background: '#0D0C0A',
          borderRight: '1px solid #1A1814',
        }}
      >
        <div className="w-full">
          <NavContent />
        </div>
      </aside>
    </>
  )
}
