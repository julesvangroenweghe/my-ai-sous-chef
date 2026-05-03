'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import JulesAI from '@/components/layout/JulesAI'
import { PageTransition } from '@/components/ui/page-transition'

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const showSidebar = isDesktop || sidebarOpen

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', backgroundColor: '#FDF8F2', position: 'relative' }}>

      {/* Overlay backdrop — mobile only, when sidebar open */}
      {sidebarOpen && !isDesktop && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 39,
            backgroundColor: 'rgba(44, 24, 16, 0.45)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Sidebar — always position:fixed, transform controls show/hide */}
      <Sidebar
        sidebarOpen={showSidebar}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Desktop spacer — pushes content to the right on desktop */}
      {isDesktop && (
        <div style={{ width: 232, flexShrink: 0 }} aria-hidden="true" />
      )}

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>

        {/* Mobile sticky topbar — hidden on desktop via JS */}
        {!isDesktop && (
          <div style={{
            display: 'flex',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            backgroundColor: '#F2E8D5',
            borderBottom: '1px solid #DDD0B8',
            flexShrink: 0,
          }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}
              aria-label="Open menu"
            >
              <svg width={22} height={22} fill="none" stroke="#5C4730" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.png" alt="My AI Sous Chef" style={{ width: 28, height: 28, objectFit: 'contain' }} />
              <span style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 15, fontWeight: 700, color: '#E8A040' }}>
                My AI Sous Chef
              </span>
            </div>
          </div>
        )}

        {/* Page content */}
        <div style={{ flex: 1, padding: isDesktop ? '32px 40px' : '20px 16px 96px' }}>
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </div>

      <JulesAI />
    </div>
  )
}
