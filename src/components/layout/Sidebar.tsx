'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  BookOpen, CalendarDays, FileText, FlaskConical, 
  Sparkles, User, Settings, LogOut, ChefHat,
  LayoutDashboard, Menu, X, ClipboardList,
  TrendingUp, Truck, Building2, Store, UtensilsCrossed,
  ShoppingCart
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useKitchen } from '@/providers/kitchen-provider'
import type { KitchenType } from '@/types/database'

// Icon mapping for dynamic nav items
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
  profile: User,
  settings: Settings,
}

// Label mapping
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
  daily_prep: 'Dagproductie',
  outlets: 'Outlets',
  brands: 'Brands',
  profile: 'Profiel',
  settings: 'Instellingen',
}

// Href mapping
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
  outlets: '/outlets',
  brands: '/brands',
  profile: '/profile',
  settings: '/settings',
}

// Kitchen type display info
const kitchenTypeInfo: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  restaurant: { icon: <UtensilsCrossed className="w-3.5 h-3.5" />, label: 'Restaurant', color: 'text-amber-400' },
  brasserie: { icon: <Store className="w-3.5 h-3.5" />, label: 'Brasserie', color: 'text-yellow-400' },
  catering: { icon: <CalendarDays className="w-3.5 h-3.5" />, label: 'Catering', color: 'text-orange-400' },
  foodtruck: { icon: <Truck className="w-3.5 h-3.5" />, label: 'Foodtruck', color: 'text-green-400' },
  hotel: { icon: <Building2 className="w-3.5 h-3.5" />, label: 'Hotel', color: 'text-blue-400' },
  dark_kitchen: { icon: <ChefHat className="w-3.5 h-3.5" />, label: 'Dark Kitchen', color: 'text-purple-400' },
}

// Default navigation per kitchen type (fallback if no settings.features)
const defaultNavByType: Record<string, string[]> = {
  restaurant: ['dashboard', 'recipes', 'menu', 'ingredients', 'mep', 'invoices', 'food_cost', 'jules_ai'],
  brasserie: ['dashboard', 'recipes', 'suggestions', 'ingredients', 'mep', 'invoices', 'food_cost', 'jules_ai'],
  catering: ['dashboard', 'recipes', 'events', 'ingredients', 'mep', 'invoices', 'food_cost', 'jules_ai'],
  foodtruck: ['dashboard', 'recipes', 'ingredients', 'daily_prep', 'invoices', 'food_cost'],
  hotel: ['dashboard', 'recipes', 'outlets', 'events', 'ingredients', 'mep', 'invoices', 'food_cost', 'jules_ai'],
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

  // Build navigation from kitchen settings or defaults
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

  const typeInfo = kitchenTypeInfo[kitchenType || 'restaurant'] || kitchenTypeInfo.restaurant

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo + Kitchen Type */}
      <div className="px-6 py-5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-white text-sm">My AI Sous Chef</span>
            {kitchen && !loading && (
              <span className={`text-[10px] flex items-center gap-1 ${typeInfo.color}`}>
                {typeInfo.icon}
                {kitchen.name} · {typeInfo.label}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* Main Navigation — dynamic per kitchen type */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {loading ? (
          // Skeleton loader
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <div className="w-5 h-5 bg-stone-700 rounded animate-pulse" />
              <div className="h-4 bg-stone-700 rounded animate-pulse" style={{ width: `${60 + i * 10}px` }} />
            </div>
          ))
        ) : (
          mainNav.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-200
                  ${isActive 
                    ? 'bg-white/10 text-white' 
                    : 'text-stone-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <div className={`
                  relative flex items-center justify-center
                  ${isActive ? 'text-brand-400' : 'text-stone-500 group-hover:text-stone-300'}
                `}>
                  {isActive && (
                    <div className="absolute -left-3 w-0.5 h-4 bg-brand-500 rounded-r-full" />
                  )}
                  <item.icon className="w-5 h-5" />
                </div>
                {item.name}
              </Link>
            )
          })
        )}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-stone-700/50" />

      {/* Bottom Navigation */}
      <div className="px-3 py-4 space-y-1">
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
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200
                ${isActive 
                  ? 'bg-white/10 text-white' 
                  : 'text-stone-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                     text-stone-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          Afmelden
        </button>
      </div>

      {/* Food Cost Target Indicator */}
      {settings && !loading && (
        <div className="px-4 py-3 border-t border-stone-700/50">
          <div className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">Food Cost Target</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-stone-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-amber-500 rounded-full"
                style={{ width: `${settings.food_cost_target_max}%` }}
              />
            </div>
            <span className="text-xs text-stone-400 font-mono">
              {settings.food_cost_target_min}-{settings.food_cost_target_max}%
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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-stone-900 rounded-xl text-white shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 h-full bg-stone-900 shadow-sidebar">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-white z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <NavContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-stone-900 border-r border-stone-800 h-screen sticky top-0">
        <div className="w-full">
          <NavContent />
        </div>
      </aside>
    </>
  )
}
