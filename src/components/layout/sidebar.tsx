'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  FileText, 
  Apple,
  Sparkles,
  User,
  LogOut 
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Recipes', href: '/dashboard/recipes', icon: BookOpen },
  { name: 'Events & MEP', href: '/dashboard/events', icon: Calendar },
  { name: 'Invoices', href: '/dashboard/invoices', icon: FileText },
  { name: 'Ingredients', href: '/dashboard/ingredients', icon: Apple },
  { name: 'Jules AI', href: '/dashboard/jules', icon: Sparkles },
  { name: 'Profile', href: '/dashboard/profile', icon: User },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-stone-900 text-stone-100">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-stone-800">
        <Image 
          src="/logo-192.png" 
          alt="My AI Sous Chef" 
          width={36} 
          height={36}
          className="rounded-full"
        />
        <div>
          <h1 className="text-base font-semibold tracking-tight text-white">My AI Sous Chef</h1>
          <p className="text-xs text-stone-400">Kitchen Intelligence</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname?.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-brand-500/15 text-brand-400' 
                  : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
              }`}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 ${
                isActive ? 'text-brand-400' : 'text-stone-500'
              }`} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Sign Out */}
      <div className="px-3 py-4 border-t border-stone-800">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition-all duration-200"
        >
          <LogOut className="w-5 h-5 text-stone-500" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
