'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#1a1917',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#f5f0e8',
          fontFamily: 'Inter, sans-serif',
          fontSize: '13px',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        },
        classNames: {
          success: 'toast-success',
          error: 'toast-error',
          warning: 'toast-warning',
        },
      }}
      icons={{
        success: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#E8A040" strokeWidth="1.5"/>
            <path d="M5 8l2 2 4-4" stroke="#E8A040" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
        error: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.5"/>
            <path d="M6 6l4 4M10 6l-4 4" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ),
      }}
    />
  )
}

// Re-export toast for easy use
export { toast } from 'sonner'
