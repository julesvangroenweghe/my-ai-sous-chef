'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import JulesAI from '@/components/layout/JulesAI'
import { PageTransition } from '@/components/ui/page-transition'

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <style>{`
        .dashboard-layout {
          display: flex;
          min-height: 100dvh;
          background: #FDF8F2;
        }
        .mobile-topbar {
          display: none;
          position: sticky;
          top: 0;
          z-index: 30;
          background-color: #F2E8D5;
          border-bottom: 1px solid #DDD0B8;
          padding: 12px 16px;
          align-items: center;
          gap: 12px;
        }
        .dashboard-main {
          margin-left: 232px;
          flex: 1;
          min-height: 100dvh;
          background: #FDF8F2;
        }
        .dashboard-content {
          max-width: 1280px;
          margin: 0 auto;
          padding: 32px 40px;
        }
        @media (max-width: 767px) {
          .mobile-topbar {
            display: flex;
          }
          .dashboard-main {
            margin-left: 0 !important;
          }
          .dashboard-content {
            padding: 20px 16px 80px !important;
          }
        }
      `}</style>

      <div className="dashboard-layout">
        {/* Mobile overlay backdrop — only rendered when open, no SSR issue */}
        {sidebarOpen && (
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

        {/* Sidebar: CSS handles show/hide on mobile, JS only controls open/close */}
        <Sidebar
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="dashboard-main">
          {/* Mobile sticky header — CSS hides this on desktop */}
          <div className="mobile-topbar">
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 6, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width={22} height={22} fill="none" stroke="#5C4730" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.png" alt="logo" style={{ width: 28, height: 28, objectFit: 'contain' }} />
              <span style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontWeight: 700, color: '#E8A040' }}>
                My AI Sous Chef
              </span>
            </div>
          </div>

          <div className="dashboard-content">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </main>

        <JulesAI />
      </div>
    </>
  )
}
