'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
 LayoutDashboard,
 BookOpen,
 Calendar,
 FileText,
 Apple,
 Sparkles,
 User,
 LogOut,
 ChevronLeft,
 ChevronRight,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
 { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
 { href: '/dashboard/recipes', label: 'Recipes', icon: BookOpen },
 { href: '/dashboard/events', label: 'Events & MEP', icon: Calendar },
 { href: '/dashboard/invoices', label: 'Invoices', icon: FileText },
 { href: '/dashboard/ingredients', label: 'Ingredients', icon: Apple },
 { href: '/dashboard/jules', label: 'Jules AI', icon: Sparkles },
 { href: '/dashboard/profile', label: 'Profile', icon: User },
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

 return (
 <aside
 className={`${
 collapsed ? 'w-[72px]' : 'w-64'
 } h-screen bg-stone-900 text-stone-300 flex flex-col transition-all duration-300 border-r border-stone-800`}
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
 <p className="text-xs text-stone-500 truncate">Kitchen Intelligence</p>
 </div>
 )}
 </div>

 {/* Navigation */}
 <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
 {navItems.map((item) => {
 const isActive =
 item.href === '/dashboard'
 ? pathname === '/dashboard'
 : pathname?.startsWith(item.href)
 const Icon = item.icon

 return (
 <Link
 key={item.href}
 href={item.href}
 className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
 isActive
 ? 'bg-brand-500/15 text-brand-400'
 : 'text-stone-400 hover:text-white hover:bg-stone-800'
 }`}
 >
 <Icon className="w-5 h-5 flex-shrink-0" />
 {!collapsed && <span>{item.label}</span>}
 </Link>
 )
 })}
 </nav>

 {/* Footer */}
 <div className="p-3 border-t border-stone-800 space-y-1">
 <button
 onClick={() => setCollapsed(!collapsed)}
 className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-400 hover:text-white hover:bg-stone-800 transition-all duration-200 w-full"
 >
 {collapsed ? (
 <ChevronRight className="w-5 h-5 flex-shrink-0" />
 ) : (
 <ChevronLeft className="w-5 h-5 flex-shrink-0" />
 )}
 {!collapsed && <span>Collapse</span>}
 </button>
 <button
 onClick={handleLogout}
 className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-400 hover:text-red-400 hover:bg-stone-800 transition-all duration-200 w-full"
 >
 <LogOut className="w-5 h-5 flex-shrink-0" />
 {!collapsed && <span>Sign Out</span>}
 </button>
 </div>
 </aside>
 )
}
