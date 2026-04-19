'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  BookOpen, CalendarDays, FileText, FlaskConical, 
  Sparkles, User, Settings, LogOut, ChefHat,
  LayoutDashboard, Menu, X
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Recipes', href: '/recipes', icon: BookOpen },
  { name: 'Events & MEP', href: '/events', icon: CalendarDays },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Ingredients', href: '/ingredients', icon: FlaskConical },
  { name: 'Jules AI', href: '/jules', icon: Sparkles },
]

const bottomNav = [
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 flex items-center gap-3">
        <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
          <ChefHat className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-display font-bold text-white text-sm">My AI Sous Chef</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
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
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-stone-700/50" />

      {/* Bottom Navigation */}
      <div className="px-3 py-4 space-y-1">
        {bottomNav.map((item) => {
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
          Sign out
        </button>
      </div>
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
          <div className="relative w-64 h-full bg-stone-900 shadow-sidebar animate-slide-in-right">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-white"
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
