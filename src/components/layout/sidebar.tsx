'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  ChefHat, LayoutDashboard, Utensils, Calendar,
  Receipt, Carrot, Brain, User, PanelLeftClose, PanelLeft
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { href: '/recipes', label: 'Recipes', icon: Utensils },
  { href: '/events', label: 'Events & MEP', icon: Calendar },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/ingredients', label: 'Ingredients', icon: Carrot },
  { href: '/jules', label: 'Jules AI', icon: Brain },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-stone-900 text-stone-300 h-screen sticky top-0 transition-all duration-300 border-r border-white/5',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3">
        <div className="p-1.5 bg-brand-500/20 rounded-lg shrink-0">
          <ChefHat className="h-6 w-6 text-brand-400" />
        </div>
        {!collapsed && (
          <span className="font-display font-bold text-white text-sm">My AI Sous Chef</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-stone-400 hover:bg-white/5 hover:text-white'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-3 space-y-1">
        <Link
          href="/profile"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            pathname === '/profile'
              ? 'bg-brand-600 text-white'
              : 'text-stone-400 hover:bg-white/5 hover:text-white'
          )}
        >
          <User className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Profile</span>}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-500 hover:bg-white/5 hover:text-white transition-colors w-full"
        >
          {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
