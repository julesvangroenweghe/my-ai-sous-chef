'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
 LayoutDashboard, BookOpen, Calendar, FileText, Apple,
 Sparkles, User, LogOut, ChevronLeft, ChevronRight,
 ClipboardList, Truck, ChefHat, Leaf, ShoppingCart,
 Palette, ScanLine, Settings, Link2, Mail, CalendarDays,
 BadgeEuro, UtensilsCrossed,
} from 'lucide-react'
import { useState } from 'react'

interface NavSection {
  title: string
  items: { href: string; label: string; icon: any }[]
}

const navSections: NavSection[] = [
  {
    title: 'Overzicht',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/dashboard/jules', label: 'Jules AI', icon: Sparkles },
    ],
  },
  {
    title: 'Keuken',
    items: [
      { href: '/dashboard/recipes', label: 'Recepten', icon: BookOpen },
      { href: '/dashboard/ingredients', label: 'Ingredienten', icon: Apple },
      { href: '/dashboard/preparations', label: 'Halffabricaten', icon: ChefHat },
      { href: '/dashboard/food-cost', label: 'Food Cost', icon: BadgeEuro },
    ],
  },
  {
    title: 'Planning',
    items: [
      { href: '/dashboard/events', label: 'Events & MEP', icon: Calendar },
      { href: '/dashboard/calendar', label: 'Agenda', icon: CalendarDays },
      { href: '/dashboard/recipes/checklist', label: 'Checklist', icon: ClipboardList },
    ],
  },
  {
    title: 'Leveranciers',
    items: [
      { href: '/dashboard/suppliers', label: 'Leveranciers', icon: Truck },
      { href: '/dashboard/invoices', label: 'Facturen', icon: FileText },
      { href: '/dashboard/inbox', label: 'Inbox', icon: Mail },
    ],
  },
  {
    title: 'Kennis',
    items: [
      { href: '/dashboard/legende', label: 'LEGENDE', icon: UtensilsCrossed },
      { href: '/dashboard/match-style', label: 'Match My Style', icon: Palette },
      { href: '/dashboard/seasonal', label: 'Seizoenskalender', icon: Leaf },
      { href: '/dashboard/scan', label: 'OCR Scanner', icon: ScanLine },
    ],
  },
]

const bottomItems = [
  { href: '/dashboard/integrations', label: 'Integraties', icon: Link2 },
  { href: '/dashboard/settings', label: 'Instellingen', icon: Settings },
  { href: '/dashboard/profile', label: 'Profiel', icon: User },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname?.startsWith(href)

  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: any }) => (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
        isActive(href)
          ? 'bg-brand-500/15 text-brand-400'
          : 'text-stone-400 hover:text-white hover:bg-stone-800'
      }`}
    >
      <Icon className="w-[18px] h-[18px] flex-shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  )

  return (
    <aside
      className={`${
        collapsed ? 'w-[72px]' : 'w-60'
      } h-screen bg-stone-900 text-stone-300 flex flex-col transition-all duration-300 border-r border-stone-800 flex-shrink-0`}
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-stone-800">
        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-stone-800">
          <Image
            src="/logo-icon.png"
            alt="My AI Sous Chef"
            width={36}
            height={36}
            className="object-contain"
          />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-white font-outfit truncate">
              My AI Sous Chef
            </h1>
            <p className="text-[11px] text-stone-500 truncate">Kitchen Intelligence</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2.5 overflow-y-auto space-y-4 scrollbar-thin">
        {navSections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-600">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-2.5 border-t border-stone-800 space-y-0.5">
        {bottomItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
        <div className="flex items-center gap-1 mt-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-stone-500 hover:text-white hover:bg-stone-800 transition-all duration-200 flex-1"
          >
            {collapsed ? (
              <ChevronRight className="w-[18px] h-[18px] flex-shrink-0" />
            ) : (
              <ChevronLeft className="w-[18px] h-[18px] flex-shrink-0" />
            )}
            {!collapsed && <span>Inklappen</span>}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-stone-500 hover:text-red-400 hover:bg-stone-800 transition-all duration-200 flex-shrink-0"
            title="Uitloggen"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </aside>
  )
}
