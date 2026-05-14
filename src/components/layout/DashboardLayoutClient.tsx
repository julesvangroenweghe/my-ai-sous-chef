'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import JulesAI from '@/components/layout/JulesAI'
import { PageTransition } from '@/components/ui/page-transition'

type Department = 'keuken' | 'sales' | 'logistiek'

function getDept(pathname: string): Department {
  if (pathname.startsWith('/sales')) return 'sales'
  if (pathname.startsWith('/logistiek')) return 'logistiek'
  return 'keuken'
}

const TOGGLE_COLORS: Record<Department, { bg: string; shadow: string; scan: string; scanShadow: string }> = {
  keuken:    { bg: '#E8A040', shadow: 'rgba(232,160,64,0.4)',  scan: '#C4703A', scanShadow: 'rgba(196,112,58,0.4)' },
  sales:     { bg: '#2D6A1E', shadow: 'rgba(45,106,30,0.4)',   scan: '#2D6A1E', scanShadow: 'rgba(45,106,30,0.35)' },
  logistiek: { bg: '#1E3F8A', shadow: 'rgba(30,63,138,0.4)',   scan: '#1E3F8A', scanShadow: 'rgba(30,63,138,0.35)' },
}

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [isWide, setIsWide] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()
  const dept = getDept(pathname)
  const colors = TOGGLE_COLORS[dept]

  useEffect(() => {
    const check = () => {
      const wide = window.innerWidth >= 1024
      const mobile = window.innerWidth < 640
      setIsWide(wide)
      setIsMobile(mobile)
      if (wide) setOpen(true)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#FDF8F2', position: 'relative' }}>

      {/* Backdrop */}
      {open && !isWide && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 39, backgroundColor: 'rgba(44,24,16,0.45)' }}
        />
      )}

      <Sidebar isOpen={open} onClose={() => setOpen(false)} />

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Sluit menu' : 'Open menu'}
        style={{
          position: 'fixed', top: 14,
          left: open && isWide ? 246 : 14,
          zIndex: 50, width: 38, height: 38, borderRadius: 8,
          backgroundColor: colors.bg,
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 2px 10px ${colors.shadow}`,
          transition: 'left 280ms ease-in-out, background-color 200ms ease',
        }}
      >
        {open ? (
          <svg width={16} height={16} fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width={16} height={16} fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        )}
      </button>

      {/* Floating Scan button
          Desktop: bottom-right naast Jules AI
          Mobile:  bottom-left zodat Jules (rechts) niet overlapt
      */}
      <a
        href="/scan"
        aria-label="Scan & OCR"
        style={{
          position: 'fixed',
          bottom: isMobile ? 20 : 28,
          // Mobile: links — Jules AI staat rechts
          left: isMobile ? 20 : 'auto',
          right: isMobile ? 'auto' : 84,
          zIndex: 48,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: isMobile ? '10px 14px' : '10px 16px',
          borderRadius: 24,
          backgroundColor: colors.scan,
          textDecoration: 'none',
          boxShadow: `0 4px 16px ${colors.scanShadow}`,
          transition: 'background-color 200ms ease',
        }}
      >
        <svg width={15} height={15} fill="none" stroke="white" strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
          <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
          <line x1="7" y1="12" x2="17" y2="12"/>
        </svg>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'white', whiteSpace: 'nowrap' }}>Scan</span>
      </a>

      {/* Page content */}
      <div style={{
        paddingTop: 64,
        paddingLeft: isWide && open ? 248 : 16,
        paddingRight: 16,
        paddingBottom: isMobile ? 80 : 100,
        transition: 'padding-left 280ms ease-in-out',
        minHeight: '100dvh',
      }}>
        <PageTransition>{children}</PageTransition>
      </div>

      {/* Jules AI — staat altijd rechtsonder */}
      <JulesAI />
    </div>
  )
}
