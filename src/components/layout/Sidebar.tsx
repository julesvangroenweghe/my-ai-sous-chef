'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useKitchen } from '@/providers/kitchen-provider'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'grid', sub: null },
  { href: '/events', label: 'Events & Planning', icon: 'calendar', sub: 'Voorstellen & offertes' },
  {
    href: '/mep',
    label: 'MEP',
    icon: 'clipboard',
    sub: 'Mis en place',
    children: [
      { href: '/mep', label: 'Overzicht', icon: 'grid-small' },
      { href: '/mep/inbox', label: 'Inbox', icon: 'tray' },
      { href: '/mep/planning', label: 'Planning', icon: 'cal-week' },
      { href: '/mep/recepten', label: 'Recepten', icon: 'recipe-db' },
      { href: '/mep/leveranciers', label: 'Leveranciers', icon: 'store' },
    ],
  },
  {
    href: '/keuken',
    label: 'Keuken',
    icon: 'book',
    sub: 'Recepten & stijl',
    children: [
      { href: '/recipes', label: 'Recepten', icon: 'book' },
      { href: '/legende', label: 'LEGENDE', icon: 'star' },
      { href: '/match-style', label: 'Match My Style', icon: 'sparkles' },
      { href: '/knowledge', label: 'Kennisbank', icon: 'archive' },
    ],
  },
  {
    href: '/producten',
    label: 'Producten',
    icon: 'leaf',
    sub: 'Ingrediënten & leveranciers',
    children: [
      { href: '/ingredients', label: 'Ingrediënten', icon: 'leaf' },
      { href: '/preparations', label: 'Halffabricaten', icon: 'layers' },
      { href: '/suppliers', label: 'Leveranciers', icon: 'truck' },
      { href: '/seasonal', label: 'Seizoenskalender', icon: 'sprout' },
    ],
  },
  {
    href: '/business',
    label: 'Business',
    icon: 'chart',
    sub: 'Kosten & engineering',
    children: [
      { href: '/menu-engineering', label: 'Menu Engineering', icon: 'menu-eng' },
      { href: '/food-cost', label: 'Food Cost', icon: 'chart' },
      { href: '/invoices', label: 'Facturen', icon: 'receipt' },
    ],
  },
  {
    href: '/communicatie',
    label: 'Communicatie',
    icon: 'mail',
    sub: 'Mail & agenda',
    children: [
      { href: '/inbox', label: 'Inbox', icon: 'mail' },
      { href: '/calendar', label: 'Kalender', icon: 'cal' },
    ],
  },
]

const bottomItems = [
  { href: '/integrations', label: 'Integraties', icon: 'plug' },
  { href: '/profile', label: 'Profiel', icon: 'user' },
  { href: '/settings', label: 'Instellingen', icon: 'settings' },
]

function NavIcon({ type, active }: { type: string; active: boolean }) {
  const color = active ? '#E8A040' : '#8B7050'
  const s = 16

  const icons: Record<string, JSX.Element> = {
    grid: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    'grid-small': <svg width={12} height={12} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    book: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
    calendar: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    leaf: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>,
    layers: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
    sprout: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.1 2 3.5c.2-1.4.9-2.7 2-3.5-1.1-.7-2.4-.8-3.6-.7-.4 0-.8.1-1.2.2.2.2.5.3.8.5z"/><path d="M14 7c.7-1 1.5-1.8 2.5-2.3-1.5-.3-3.2 0-4.5 1-1-.4-2-.6-3-.5-.4 0-.7.1-1 .2C9 6.3 10 7.2 10.5 8.3c1.2-1 2.4-1.5 3.5-1.3z"/></svg>,
    scan: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
    truck: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    star: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    sparkles: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 3l1.88 5.76L20 10l-6.12 1.24L12 17l-1.88-5.76L4 10l6.12-1.24z"/><path d="M19 3l.75 2.25L22 6l-2.25.75L19 9l-.75-2.25L16 6l2.25-.75z"/></svg>,
    clipboard: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>,
    'menu-eng': <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>,
    chart: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    receipt: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg>,
    cal: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>,
    'cal-week': <svg width={12} height={12} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><rect x="6" y="13" width="5" height="5" rx="0.5" fill={color} stroke="none"/></svg>,
    plug: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8H6a2 2 0 0 0-2 2v3a6 6 0 0 0 12 0v-3a2 2 0 0 0-2-2z"/></svg>,
    mail: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    tray: <svg width={12} height={12} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M2 12h20"/><path d="M2 12l3-9h14l3 9"/><path d="M2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6"/></svg>,
    archive: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
    user: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    settings: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    'recipe-db': <svg width={12} height={12} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
    store: <svg width={12} height={12} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 9l1-4h16l1 4"/><path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/><path d="M5 21V11"/><path d="M19 21V11"/><rect x="9" y="14" width="6" height="7"/><line x1="3" y1="21" x2="21" y2="21"/></svg>,
    bell: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    close: <svg width={s} height={s} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  }

  return icons[type] || icons['grid']
}

type NavChild = { href: string; label: string; icon: string }
type NavItem = {
  href: string
  label: string
  icon: string
  sub?: string | null
  children?: NavChild[]
}

function NavItemComponent({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem
  pathname: string
  onNavigate?: () => void
}) {
  const anyChildActive = item.children
    ? item.children.some(c => {
        if (c.href === '/mep') return pathname === '/mep' || (pathname.startsWith('/mep/') && !['inbox','planning','recepten','leveranciers'].some(s => pathname.includes(s)))
        return pathname.startsWith(c.href)
      })
    : false

  const [open, setOpen] = useState(anyChildActive)

  useEffect(() => {
    if (anyChildActive) setOpen(true)
  }, [anyChildActive])

  const isParentActive = item.children
    ? anyChildActive
    : (item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href))

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 18px', margin: '1px 6px', borderRadius: 6,
            background: 'none', border: 'none',
            borderLeft: isParentActive ? '2px solid #E8A040' : '2px solid transparent',
            backgroundColor: isParentActive ? '#FEF3E2' : 'transparent',
            cursor: 'pointer', width: 'calc(100% - 12px)', textAlign: 'left',
          }}
        >
          <NavIcon type={item.icon} active={isParentActive} />
          <span style={{ fontSize: 13, fontWeight: isParentActive ? 500 : 400, color: isParentActive ? '#B5631A' : '#5C4730', flex: 1 }}>
            {item.label}
            {item.sub && (
              <span style={{ display: 'block', fontSize: 9, color: isParentActive ? '#C4791A' : '#9C8060', lineHeight: 1.2, marginTop: 1, fontWeight: 400 }}>
                {item.sub}
              </span>
            )}
          </span>
          <svg width={12} height={12} fill="none" stroke={isParentActive ? '#E8A040' : '#9C8060'} strokeWidth="2" viewBox="0 0 24 24"
            style={{ transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {open && (
          <div style={{ marginLeft: 28, marginBottom: 4, borderLeft: '1px solid #E5D8C0', paddingLeft: 8 }}>
            {item.children.map(child => {
              const childActive = child.href === '/mep'
                ? pathname === '/mep' || (pathname.startsWith('/mep/') && !['inbox','planning','recepten','leveranciers'].some(s => pathname.includes(s)))
                : pathname.startsWith(child.href)
              return (
                <Link key={child.href} href={child.href} onClick={onNavigate} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', margin: '1px 4px', borderRadius: 5,
                  textDecoration: 'none',
                  backgroundColor: childActive ? '#FEF3E2' : 'transparent',
                  borderLeft: childActive ? '2px solid #E8A040' : '2px solid transparent',
                }}>
                  <NavIcon type={child.icon} active={childActive} />
                  <span style={{ fontSize: 12, fontWeight: childActive ? 500 : 400, color: childActive ? '#B5631A' : '#6B5040' }}>
                    {child.label}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const active = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)

  return (
    <Link href={item.href} onClick={onNavigate} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 18px', margin: '1px 6px', borderRadius: 6,
      textDecoration: 'none',
      backgroundColor: active ? '#FEF3E2' : 'transparent',
      borderLeft: active ? '2px solid #E8A040' : '2px solid transparent',
    }}>
      <NavIcon type={item.icon} active={active} />
      <span style={{ fontSize: 13, fontWeight: active ? 500 : 400, color: active ? '#B5631A' : '#5C4730' }}>
        {item.label}
        {item.sub && (
          <span style={{ display: 'block', fontSize: 9, color: active ? '#C4791A' : '#9C8060', lineHeight: 1.2, marginTop: 1, fontWeight: 400 }}>
            {item.sub}
          </span>
        )}
      </span>
    </Link>
  )
}

interface SidebarProps {
  isMobile?: boolean
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isMobile = false, isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const signOut = async () => { await supabase.auth.signOut(); router.push('/login') }
  const { kitchen } = useKitchen()
  const [unreadAlerts, setUnreadAlerts] = useState(0)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/alerts?unread=true')
        if (res.ok) {
          const data = await res.json()
          setUnreadAlerts(data.alerts?.length || 0)
        }
      } catch { /* silent */ }
    }
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 60000)
    return () => clearInterval(interval)
  }, [])

  const scanActive = pathname.startsWith('/scan')
  const alertsActive = pathname.startsWith('/alerts')

  // On mobile, close sidebar after navigation
  const handleNavigate = () => {
    if (isMobile && onClose) onClose()
  }

  return (
    <aside style={{
      width: 232, minWidth: 232,
      height: '100vh',
      backgroundColor: '#F2E8D5',
      borderRight: '1px solid #DDD0B8',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 40,
      overflowY: 'auto',
      scrollbarWidth: 'none',
      // Mobile slide animation
      transform: isMobile ? (isOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
      transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      {/* Logo + close button on mobile */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #E5D8C0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/logo-icon.png" alt="My AI Sous Chef" width={36} height={36} style={{ objectFit: 'contain' }} />
          <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 13, fontWeight: 700, color: '#E8A040', letterSpacing: '0.01em', lineHeight: 1.3, flex: 1 }}>
            My AI<br/>
            <span style={{ fontWeight: 400, fontSize: 12, letterSpacing: '0.05em' }}>Sous Chef</span>
          </div>
          {/* Close button — mobile only */}
          {isMobile && (
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4 }}
            >
              <svg width={18} height={18} fill="none" stroke="#9C8060" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #E5D8C0', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#E8A040', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontFamily: 'Georgia, serif', color: '#B5631A', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontWeight: 500 }}>
            {kitchen?.name || 'Mijn Keuken'}
          </span>
          <span style={{ fontSize: 10, color: '#9C8060', marginLeft: 2 }}>· {kitchen?.kitchen_type || 'Catering'}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto', scrollbarWidth: 'none' }}>
        {navItems.map((item) => (
          <NavItemComponent key={item.href} item={item} pathname={pathname} onNavigate={handleNavigate} />
        ))}
      </nav>

      {/* Scan CTA */}
      <div style={{ padding: '8px 12px 4px' }}>
        <Link href="/scan" onClick={handleNavigate} style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '9px 12px', borderRadius: 7,
          backgroundColor: scanActive ? '#FEF3E2' : 'rgba(232,160,64,0.07)',
          border: `1px solid ${scanActive ? '#E8A040' : 'rgba(232,160,64,0.35)'}`,
          textDecoration: 'none',
        }}>
          <NavIcon type="scan" active={true} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#B5631A', lineHeight: 1.2 }}>Scan & OCR</div>
            <div style={{ fontSize: 10, color: '#9C8060', lineHeight: 1.2 }}>Prijslijst, factuur, recept</div>
          </div>
          <svg width={10} height={10} fill="none" stroke="#C4703A" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #E5D8C0', margin: '6px 14px 0' }} />

      {/* Bottom items */}
      <div style={{ padding: '6px 0 4px' }}>
        {/* Alerts */}
        <Link href="/alerts" onClick={handleNavigate} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '7px 18px', margin: '1px 6px', borderRadius: 6,
          textDecoration: 'none',
          backgroundColor: alertsActive ? '#FEF3E2' : 'transparent',
          borderLeft: alertsActive ? '2px solid #E8A040' : '2px solid transparent',
        }}>
          <div style={{ position: 'relative' }}>
            <NavIcon type="bell" active={alertsActive || unreadAlerts > 0} />
            {unreadAlerts > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                backgroundColor: '#E53E3E', color: 'white',
                fontSize: 8, fontWeight: 700, borderRadius: '50%',
                width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {unreadAlerts > 9 ? '9+' : unreadAlerts}
              </span>
            )}
          </div>
          <span style={{ fontSize: 13, fontWeight: (alertsActive || unreadAlerts > 0) ? 500 : 400, color: (alertsActive || unreadAlerts > 0) ? '#B5631A' : '#5C4730' }}>
            Meldingen
            {unreadAlerts > 0 && (
              <span style={{ marginLeft: 6, fontSize: 10, color: '#9C8060', fontWeight: 400 }}>{unreadAlerts} nieuw</span>
            )}
          </span>
        </Link>

        {bottomItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} onClick={handleNavigate} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 18px', margin: '1px 6px', borderRadius: 6,
              textDecoration: 'none',
              backgroundColor: active ? '#FEF3E2' : 'transparent',
              borderLeft: active ? '2px solid #E8A040' : '2px solid transparent',
            }}>
              <NavIcon type={item.icon} active={active} />
              <span style={{ fontSize: 13, fontWeight: active ? 500 : 400, color: active ? '#B5631A' : '#5C4730' }}>
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* Sign out */}
        <button onClick={signOut} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '7px 18px', margin: '1px 6px', borderRadius: 6,
          background: 'none', border: 'none', borderLeft: '2px solid transparent',
          cursor: 'pointer', width: 'calc(100% - 12px)',
        }}>
          <svg width="16" height="16" fill="none" stroke="#9C8060" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span style={{ fontSize: 13, color: '#9C8060' }}>Afmelden</span>
        </button>
      </div>

      {/* Search */}
      <button
        onClick={() => { const e = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }); document.dispatchEvent(e) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          margin: '4px 12px 0', padding: '7px 10px', borderRadius: 6,
          background: 'rgba(255,255,255,0.6)', border: '1px solid #E5D8C0',
          cursor: 'pointer', width: 'calc(100% - 24px)',
        }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9C8060" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <span style={{ fontSize: 12, color: '#9C8060', flex: 1, textAlign: 'left' }}>Zoeken...</span>
        <kbd style={{ fontSize: 10, color: '#B5A090', background: 'rgba(0,0,0,0.04)', border: '1px solid #E5D8C0', borderRadius: 3, padding: '1px 4px' }}>⌘K</kbd>
      </button>

      {/* Food cost target */}
      <div style={{ margin: '8px 12px 16px', padding: '10px 12px', borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.5)', border: '1px solid #E5D8C0' }}>
        <div style={{ fontSize: 9, color: '#9C8060', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 6 }}>Food Cost Target</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 3, backgroundColor: '#E5D8C0', borderRadius: 2 }}>
            <div style={{ width: '75%', height: '100%', backgroundColor: '#E8A040', borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 11, color: '#5C4730', whiteSpace: 'nowrap' }}>25-30%</span>
        </div>
      </div>
    </aside>
  )
}
