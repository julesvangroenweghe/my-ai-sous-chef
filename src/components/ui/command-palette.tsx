'use client'

import { useEffect, useState, useCallback } from 'react'
import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'

interface CommandItem {
  id: string
  label: string
  description?: string
  shortcut?: string
  icon?: React.ReactNode
  action: () => void
  group: string
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const router = useRouter()

  // ⌘K / Ctrl+K opent het palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const commands: CommandItem[] = [
    // Navigatie
    { id: 'dashboard', label: 'Dashboard', icon: <NavIcon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />, group: 'Navigatie', action: () => { router.push('/dashboard'); setOpen(false) } },
    { id: 'recipes', label: 'Recepten', icon: <NavIcon d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />, group: 'Navigatie', action: () => { router.push('/recipes'); setOpen(false) } },
    { id: 'mep', label: 'MEP Planning', icon: <NavIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />, group: 'Navigatie', action: () => { router.push('/mep'); setOpen(false) } },
    { id: 'menu-builder', label: 'Menu Builder', icon: <NavIcon d="M4 6h16M4 10h16M4 14h16M4 18h16" />, group: 'Navigatie', action: () => { router.push('/menu-builder'); setOpen(false) } },
    { id: 'knowledge', label: 'Kennisbank', icon: <NavIcon d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />, group: 'Navigatie', action: () => { router.push('/knowledge'); setOpen(false) } },
    { id: 'match-style', label: 'Match My Style', icon: <NavIcon d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />, group: 'Navigatie', action: () => { router.push('/match-style'); setOpen(false) } },
    { id: 'seasonal', label: 'Seizoenskalender', icon: <NavIcon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />, group: 'Navigatie', action: () => { router.push('/seasonal'); setOpen(false) } },
    { id: 'suppliers', label: 'Leveranciers', icon: <NavIcon d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />, group: 'Navigatie', action: () => { router.push('/suppliers'); setOpen(false) } },
    // Snelle acties
    { id: 'new-recipe', label: 'Nieuw recept aanmaken', shortcut: 'N', group: 'Acties', icon: <NavIcon d="M12 4v16m8-8H4" />, action: () => { router.push('/recipes/new'); setOpen(false) } },
    { id: 'new-mep', label: 'Nieuwe MEP aanmaken', group: 'Acties', icon: <NavIcon d="M12 4v16m8-8H4" />, action: () => { router.push('/mep/new'); setOpen(false) } },
    { id: 'settings', label: 'Instellingen', group: 'Acties', icon: <NavIcon d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />, action: () => { router.push('/settings'); setOpen(false) } },
  ]

  const filtered = search.length === 0
    ? commands
    : commands.filter(c =>
        c.label.toLowerCase().includes(search.toLowerCase()) ||
        c.group.toLowerCase().includes(search.toLowerCase())
      )

  const groups = [...new Set(filtered.map(c => c.group))]

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh]"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Palette */}
      <div className="relative w-full max-w-lg mx-4">
        <Command
          className="w-full rounded-xl overflow-hidden shadow-2xl"
          style={{
            background: '#141312',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,160,64,0.1)',
          }}
          shouldFilter={false}
        >
          {/* Zoekbalk */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Zoek pagina's, recepten, acties..."
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f5f0e8',
                fontSize: '14px',
                flex: 1,
                fontFamily: 'Inter, sans-serif',
              }}
            />
            <kbd style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: 'Inter, sans-serif' }}>ESC</kbd>
          </div>

          {/* Resultaten */}
          <Command.List style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
                Geen resultaten gevonden
              </div>
            )}
            {groups.map(group => (
              <Command.Group key={group} heading={group}>
                <div style={{ padding: '4px 8px 2px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>
                  {group}
                </div>
                {filtered.filter(c => c.group === group).map(item => (
                  <Command.Item
                    key={item.id}
                    value={item.id}
                    onSelect={item.action}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13.5px',
                      color: '#e8e0d4',
                      fontFamily: 'Inter, sans-serif',
                    }}
                    className="command-item"
                  >
                    <span style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.shortcut && (
                      <kbd style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', padding: '1px 5px', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                        {item.shortcut}
                      </kbd>
                    )}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          {/* Footer hint */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 14px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Hint keys={['↑', '↓']} label="navigeren" />
            <Hint keys={['↵']} label="openen" />
            <Hint keys={['⌘K']} label="sluiten" />
          </div>
        </Command>
      </div>

      <style>{`
        .command-item:hover, [data-selected="true"] .command-item {
          background: rgba(232, 160, 64, 0.08) !important;
        }
        [cmdk-item][data-selected="true"] {
          background: rgba(232, 160, 64, 0.1) !important;
          color: #E8A040 !important;
        }
        [cmdk-item][data-selected="true"] svg {
          stroke: rgba(232, 160, 64, 0.6) !important;
        }
      `}</style>
    </div>
  )
}

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
    </svg>
  )
}

function Hint({ keys, label }: { keys: string[], label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontFamily: 'Inter, sans-serif' }}>
      {keys.map(k => (
        <kbd key={k} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '3px', padding: '1px 5px', fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{k}</kbd>
      ))}
      <span>{label}</span>
    </div>
  )
}
