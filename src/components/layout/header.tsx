'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, ChevronRight } from 'lucide-react'

const pathLabels: Record<string, string> = {
  '/recipes': 'Recipes',
  '/events': 'Events & MEP',
  '/invoices': 'Invoices',
  '/ingredients': 'Ingredients',
  '/jules': 'Jules AI',
  '/profile': 'Profile',
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const segments = pathname.split('/').filter(Boolean)
  const currentLabel = pathLabels['/' + segments[0]] || segments[0] || 'Dashboard'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white border-b">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Kitchen</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{currentLabel}</span>
        {segments.length > 1 && segments[1] !== 'new' && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium capitalize">{segments[1] === '[id]' ? 'Detail' : segments[1]}</span>
          </>
        )}
      </div>
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </header>
  )
}
