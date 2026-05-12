'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, ChevronRight, Shield } from 'lucide-react'
import Link from 'next/link'

const pathLabels: Record<string, string> = {
 '/recipes': 'Recepten',
 '/events': 'Events & MEP',
 '/invoices': 'Facturen',
 '/ingredients': 'Ingrediënten',
 '/jules': 'Jules AI',
 '/profile': 'Profiel',
 '/mep': 'MEP',
 '/allergenen': 'Allergenen',
 '/scan': 'Scan & OCR',
 '/dashboard': 'Dashboard',
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
 <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-6 bg-white/90 backdrop-blur border-b border-[#E8D5B5]">
 <div className="flex items-center gap-2 text-sm">
 <span className="text-[#B8997A] text-xs">Kitchen</span>
 <ChevronRight className="h-3.5 w-3.5 text-[#B8997A]" />
 <span className="font-medium text-[#2C1810]">{currentLabel}</span>
 {segments.length > 1 && segments[1] !== 'new' && (
 <>
 <ChevronRight className="h-3.5 w-3.5 text-[#B8997A]" />
 <span className="font-medium text-[#2C1810] capitalize">{segments[1] === '[id]' ? 'Detail' : segments[1]}</span>
 </>
 )}
 </div>

 <div className="flex items-center gap-3">
 {/* Allergenen quick-link — always visible, red accent */}
 <Link
 href="/allergenen"
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:shadow-sm"
 style={{
 backgroundColor: pathname.startsWith('/allergenen') ? '#FEE2E2' : '#FFF5F5',
 color: '#DC2626',
 border: `1px solid ${pathname.startsWith('/allergenen') ? '#FECACA' : '#FEE2E2'}`,
 }}
 >
 <Shield className="w-3.5 h-3.5" />
 Allergenen
 </Link>

 <button
 onClick={handleSignOut}
 className="flex items-center gap-2 text-xs text-[#B8997A] hover:text-[#5C4730] transition-colors"
 >
 <LogOut className="h-3.5 w-3.5" />
 Afmelden
 </button>
 </div>
 </header>
 )
}
