'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import JulesAI from '@/components/layout/JulesAI'
import { PageTransition } from '@/components/ui/page-transition'

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-dvh bg-[#FDF8F2]">
      {/* Mobile overlay backdrop — only on mobile, only when open */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-[39] md:hidden"
          style={{ backgroundColor: 'rgba(44, 24, 16, 0.45)', backdropFilter: 'blur(2px)' }}
        />
      )}

      {/* Sidebar — CSS translateX handles show/hide on mobile */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content area — on desktop offset by sidebar width */}
      <main className="flex-1 min-h-dvh bg-[#FDF8F2] md:ml-[232px] w-full">

        {/* Mobile sticky topbar — hidden on desktop via Tailwind */}
        <div className="flex md:hidden sticky top-0 z-30 items-center gap-3 px-4 py-3"
          style={{ backgroundColor: '#F2E8D5', borderBottom: '1px solid #DDD0B8' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md"
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            aria-label="Open menu"
          >
            <svg width={22} height={22} fill="none" stroke="#5C4730" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="My AI Sous Chef" className="w-7 h-7 object-contain" />
            <span style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 15, fontWeight: 700, color: '#E8A040' }}>
              My AI Sous Chef
            </span>
          </div>
        </div>

        {/* Page content */}
        <div className="max-w-[1280px] mx-auto px-4 py-5 pb-24 md:px-10 md:py-8 md:pb-8">
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </main>

      <JulesAI />
    </div>
  )
}
