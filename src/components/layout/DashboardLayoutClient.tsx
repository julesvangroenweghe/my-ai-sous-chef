'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import JulesAI from '@/components/layout/JulesAI'
import { PageTransition } from '@/components/ui/page-transition'

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (sidebarOpen) setSidebarOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: '#FDF8F2' }}>
      {/* Mobile overlay backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(44, 24, 16, 0.45)',
            zIndex: 39,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <Sidebar
        isMobile={isMobile}
        isOpen={isMobile ? sidebarOpen : true}
        onClose={() => setSidebarOpen(false)}
      />

      <main
        style={{
          marginLeft: isMobile ? 0 : 232,
          flex: 1,
          minHeight: '100dvh',
          background: '#FDF8F2',
        }}
      >
        {/* Mobile sticky header */}
        {isMobile && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 30,
            backgroundColor: '#F2E8D5',
            borderBottom: '1px solid #DDD0B8',
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 6, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width={20} height={20} fill="none" stroke="#5C4730" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.png" alt="logo" style={{ width: 28, height: 28, objectFit: 'contain' }} />
              <span style={{ fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 700, color: '#E8A040' }}>
                My AI Sous Chef
              </span>
            </div>
          </div>
        )}

        <div style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: isMobile ? '20px 16px 80px' : '32px 40px',
        }}>
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </main>

      <JulesAI />
    </div>
  )
}
