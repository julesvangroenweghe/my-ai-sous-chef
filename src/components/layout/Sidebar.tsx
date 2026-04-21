'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useKitchen } from '@/hooks/useKitchen'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { href: '/recipes', label: 'Recepten', icon: 'book' },
  { href: '/events', label: 'Events & MEP', icon: 'calendar' },
  { href: '/ingredients', label: 'Ingrediënten', icon: 'leaf' },
  { href: '/preparations', label: 'Halffabricaten', icon: 'layers' },
  { href: '/seasonal', label: 'Seizoenskalender', icon: 'sprout' },
  { href: '/scan', label: 'Scan', icon: 'scan' },
  { href: '/suppliers', label: 'Leveranciers', icon: 'truck' },
  { href: '/legende', label: 'LEGENDE', icon: 'star' },
  { href: '/match-style', label: 'Match My Style', icon: 'sparkles' },
  { href: '/checklist', label: 'Checklist', icon: 'check-square' },
  { href: '/mep-plans', label: 'MEP Plans', icon: 'clipboard' },
  { href: '/food-cost', label: 'Food Cost', icon: 'chart' },
  { href: '/invoices', label: 'Facturen', icon: 'receipt' },
  { href: '/jules-ai', label: 'Jules AI', icon: 'chef' },
  { href: '/calendar', label: 'Kalender', icon: 'cal' },
  { href: '/integrations', label: 'Integraties', icon: 'plug' },
  { href: '/inbox', label: 'Inbox', icon: 'mail' },
  { href: '/knowledge', label: 'Kennisbank', icon: 'archive' },
]

const bottomItems = [
  { href: '/profile', label: 'Profiel', icon: 'user' },
  { href: '/settings', label: 'Instellingen', icon: 'settings' },
]

function NavIcon({ type, active }: { type: string; active: boolean }) {
  const color = active ? '#E8A040' : '#6B6560'
  const s = 16

  const icons: Record<string, JSX.Element> = {
    grid: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    book: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
    calendar: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    leaf: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>,
    layers: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
    sprout: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.1 2 3.5c.2-1.4.9-2.7 2-3.5-1.1-.7-2.4-.8-3.6-.7-.4 0-.8.1-1.2.2.2.2.5.3.8.5z"/><path d="M14 7c.7-1 1.5-1.8 2.5-2.3-1.5-.3-3.2 0-4.5 1-1-.4-2-.6-3-.5-.4 0-.7.1-1 .2C9 6.3 10 7.2 10.5 8.3c1.2-1 2.4-1.5 3.5-1.3z"/></svg>,
    scan: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
    truck: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    star: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    sparkles: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 3l1.88 5.76L20 10l-6.12 1.24L12 17l-1.88-5.76L4 10l6.12-1.24z"/><path d="M19 3l.75 2.25L22 6l-2.25.75L19 9l-.75-2.25L16 6l2.25-.75z"/></svg>,
    'check-square': <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
    clipboard: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>,
    chart: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    receipt: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg>,
    chef: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>,
    cal: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>,
    plug: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8H6a2 2 0 0 0-2 2v3a6 6 0 0 0 12 0v-3a2 2 0 0 0-2-2z"/></svg>,
    mail: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    archive: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
    user: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    settings: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  }

  return icons[type] || icons['grid']
}

export default function Sidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const { kitchen } = useKitchen()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside
      style={{
        width: 232,
        minWidth: 232,
        height: '100vh',
        backgroundColor: '#0D0C0A',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 40,
        overflowY: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
          {/* Amber chef hat icon */}
          <div style={{
            width: 32, height: 32, borderRadius: 6,
            backgroundColor: 'rgba(232,160,64,0.15)',
            border: '1px solid rgba(232,160,64,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="16" height="16" fill="none" stroke="#E8A040" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6z"/>
              <line x1="6" y1="17" x2="18" y2="17"/>
            </svg>
          </div>
          <div>
            <div style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 13,
              fontWeight: 700,
              color: '#F5F0EB',
              letterSpacing: '0.01em',
              lineHeight: 1.2,
            }}>
              My AI Sous Chef
            </div>
          </div>
        </div>
        {/* Kitchen name */}
        <div style={{
          marginTop: 8,
          paddingTop: 8,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            backgroundColor: '#E8A040',
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: 11,
            fontFamily: 'Georgia, serif',
            color: '#E8A040',
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            fontWeight: 400,
          }}>
            {kitchen?.name || 'Mijn Keuken'}
          </span>
          <span style={{
            fontSize: 10,
            color: '#4A4540',
            marginLeft: 2,
          }}>
            · {kitchen?.kitchen_type || 'Catering'}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto', scrollbarWidth: 'none' }}>
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 20px',
                margin: '1px 8px',
                borderRadius: 6,
                textDecoration: 'none',
                position: 'relative',
                transition: 'all 0.15s ease',
                backgroundColor: active ? 'rgba(232,160,64,0.08)' : 'transparent',
                borderLeft: active ? '2px solid #E8A040' : '2px solid transparent',
              }}
            >
              <NavIcon type={item.icon} active={active} />
              <span style={{
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                color: active ? '#F5F0EB' : '#6B6560',
                letterSpacing: '0.01em',
                transition: 'color 0.15s ease',
              }}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '0 16px' }} />

      {/* Bottom items */}
      <div style={{ padding: '8px 0 4px' }}>
        {bottomItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 20px',
                margin: '1px 8px',
                borderRadius: 6,
                textDecoration: 'none',
                backgroundColor: active ? 'rgba(232,160,64,0.08)' : 'transparent',
                borderLeft: active ? '2px solid #E8A040' : '2px solid transparent',
              }}
            >
              <NavIcon type={item.icon} active={active} />
              <span style={{
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                color: active ? '#F5F0EB' : '#6B6560',
              }}>
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* Sign out */}
        <button
          onClick={signOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '7px 20px',
            margin: '1px 8px',
            borderRadius: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            width: 'calc(100% - 16px)',
            borderLeft: '2px solid transparent',
          }}
        >
          <svg width="16" height="16" fill="none" stroke="#4A4540" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span style={{ fontSize: 13, color: '#4A4540' }}>Afmelden</span>
        </button>
      </div>

      {/* Food cost target */}
      <div style={{
        margin: '8px 12px 16px',
        padding: '10px 12px',
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontSize: 9, color: '#4A4540', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
          Food Cost Target
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
            <div style={{ width: '75%', height: '100%', backgroundColor: '#E8A040', borderRadius: 2, opacity: 0.8 }} />
          </div>
          <span style={{ fontSize: 11, color: '#6B6560', whiteSpace: 'nowrap' }}>25–30%</span>
        </div>
      </div>
    </aside>
  )
}
