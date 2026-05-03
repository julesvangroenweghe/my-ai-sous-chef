'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import JulesAI from '@/components/layout/JulesAI'
import { PageTransition } from '@/components/ui/page-transition'

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', backgroundColor: '#FDF8F2' }}>

      {/* Overlay backdrop — only on mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — CSS class controls show/hide */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content — CSS class controls margin offset */}
      <div className="app-main-content">

        {/* Mobile sticky topbar — CSS class hides on desktop */}
        <div className="mobile-topbar">
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

        {/* Page content */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 16px 96px' }}
          className="md:px-10 md:py-8 md:pb-8">
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </div>

      <JulesAI />
    </div>
  )
}
