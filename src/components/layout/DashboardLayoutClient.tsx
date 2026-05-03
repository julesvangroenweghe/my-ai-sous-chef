'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import JulesAI from '@/components/layout/JulesAI'
import { PageTransition } from '@/components/ui/page-transition'

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(true) // default true = mobile-first

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      // Auto-open sidebar on desktop
      if (!mobile) setSidebarOpen(true)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', backgroundColor: '#FDF8F2', position: 'relative' }}>

      {/* Backdrop — mobile only */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 39,
            backgroundColor: 'rgba(44,24,16,0.5)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        isMobile={isMobile}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Desktop spacer */}
      {!isMobile && (
        <div style={{ width: 232, flexShrink: 0 }} aria-hidden="true" />
      )}

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Mobile topbar */}
        {isMobile && (
          <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            backgroundColor: '#F2E8D5',
            borderBottom: '1px solid #DDD0B8',
          }}>
            <button
              onClick={() => setSidebarOpen(o => !o)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 6, backgroundColor: 'rgba(232,160,64,0.1)',
              }}
              aria-label="Menu openen"
            >
              <svg width={20} height={20} fill="none" stroke="#5C4730" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="My AI Sous Chef" style={{ width: 26, height: 26, objectFit: 'contain' }} />
            <span style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 15, fontWeight: 700, color: '#E8A040',
            }}>
              My AI Sous Chef
            </span>
          </div>
        )}

        {/* Page content */}
        <div style={{ flex: 1, padding: isMobile ? '20px 16px 100px' : '32px 40px' }}>
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </div>

      {/* FLOATING MENU BUTTON — only on mobile, always visible */}
      {isMobile && !sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            position: 'fixed',
            bottom: 24,
            left: 20,
            zIndex: 50,
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: '#E8A040',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(232,160,64,0.5), 0 2px 6px rgba(0,0,0,0.15)',
          }}
          aria-label="Menu"
        >
          <svg width={20} height={20} fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      )}

      <JulesAI />
    </div>
  )
}
