'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Utensils, Calendar, Receipt, Brain, User } from 'lucide-react'

const mobileNav = [
 { href: '/recipes', label: 'Recipes', icon: Utensils },
 { href: '/events', label: 'Events', icon: Calendar },
 { href: '/invoices', label: 'Invoices', icon: Receipt },
 { href: '/jules', label: 'Jules', icon: Brain },
 { href: '/profile', label: 'Profile', icon: User },
]

export function MobileNav() {
 const pathname = usePathname()

 return (
 <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-200 safe-area-pb">
 <div className="flex items-center justify-around h-16">
 {mobileNav.map((item) => {
 const isActive = pathname.startsWith(item.href)
 return (
 <Link
 key={item.href}
 href={item.href}
 className={cn(
 'flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors',
 isActive ? 'text-brand-600' : 'text-[#9E7E60]'
 )}
 >
 <item.icon className="h-5 w-5" />
 <span>{item.label}</span>
 </Link>
 )
 })}
 </div>
 </nav>
 )
}
