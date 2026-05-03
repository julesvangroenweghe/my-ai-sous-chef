'use client'

import { useState, useEffect, useCallback } from 'react'

type Alert = {
  id: string
  type: 'price_update' | 'out_of_stock' | 'deal' | 'general'
  title: string
  body: string
  ingredient_name?: string
  old_price?: number
  new_price?: number
  unit?: string
  deal_description?: string
  supplier_id?: string
  relevant_event_ids?: string[]
  read_at?: string
  dismissed_at?: string
  created_at: string
  metadata?: { emailFrom?: string; urgency?: string }
  suppliers?: { name: string }
}

const TYPE_CONFIG = {
  price_update: { label: 'Prijswijziging', color: '#C4703A', bg: '#FEF3E2', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
  out_of_stock: { label: 'Niet voorradig', color: '#E53E3E', bg: '#FFF5F5', icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01' },
  deal: { label: 'Aanbieding', color: '#38A169', bg: '#F0FFF4', icon: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01' },
  general: { label: 'Algemeen', color: '#718096', bg: '#F7FAFC', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  const fetchAlerts = useCallback(async () => {
    const res = await fetch('/api/alerts')
    if (res.ok) {
      const data = await res.json()
      setAlerts(data.alerts || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  const markRead = async (id: string) => {
    await fetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'read' }) })
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read_at: new Date().toISOString() } : a))
  }

  const dismiss = async (id: string) => {
    await fetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'dismiss' }) })
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.type === filter)
  const unread = alerts.filter(a => !a.read_at).length

  return (
    <div style={{ padding: '32px 40px', maxWidth: 800 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#2C1810', fontFamily: 'Georgia, serif', margin: 0 }}>Meldingen</h1>
        <p style={{ fontSize: 14, color: '#9E7E60', marginTop: 4 }}>
          Automatisch gesignaleerd vanuit leveranciersmails
          {unread > 0 && <span style={{ marginLeft: 8, backgroundColor: '#E53E3E', color: 'white', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10 }}>{unread} ongelezen</span>}
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #E8D5B5', paddingBottom: 12 }}>
        {[['all', 'Alle'], ['price_update', 'Prijswijzigingen'], ['out_of_stock', 'Niet voorradig'], ['deal', 'Aanbiedingen']].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
              border: '1px solid', cursor: 'pointer',
              backgroundColor: filter === key ? '#FEF3E2' : 'transparent',
              borderColor: filter === key ? '#E8A040' : '#E8D5B5',
              color: filter === key ? '#B5631A' : '#6B5040',
            }}>
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9E7E60' }}>Laden...</div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9E7E60' }}>
          <svg width={40} height={40} fill="none" stroke="#C4B09A" strokeWidth="1.5" viewBox="0 0 24 24" style={{ marginBottom: 12 }}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <div style={{ fontSize: 14 }}>Geen meldingen</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(alert => {
          const config = TYPE_CONFIG[alert.type] || TYPE_CONFIG.general
          const isUnread = !alert.read_at
          return (
            <div key={alert.id}
              onClick={() => !alert.read_at && markRead(alert.id)}
              style={{
                backgroundColor: isUnread ? config.bg : 'white',
                border: `1px solid ${isUnread ? config.color + '40' : '#E8D5B5'}`,
                borderLeft: `3px solid ${config.color}`,
                borderRadius: 8, padding: '14px 16px',
                cursor: isUnread ? 'pointer' : 'default',
                display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: config.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width={16} height={16} fill="none" stroke={config.color} strokeWidth="2" viewBox="0 0 24 24">
                  <path d={config.icon}/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: config.color, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{config.label}</span>
                  {alert.suppliers?.name && <span style={{ fontSize: 11, color: '#9E7E60' }}>· {alert.suppliers.name}</span>}
                  {isUnread && <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: config.color, marginLeft: 'auto', flexShrink: 0 }} />}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#2C1810', marginBottom: 4 }}>{alert.title}</div>
                <div style={{ fontSize: 13, color: '#6B5040', lineHeight: 1.5 }}>{alert.body}</div>

                {/* Prijswijziging detail */}
                {alert.type === 'price_update' && alert.old_price && alert.new_price && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: '#9E7E60' }}>Oud: <span style={{ textDecoration: 'line-through' }}>€{alert.old_price}/{alert.unit || 'kg'}</span></span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: alert.new_price > alert.old_price ? '#E53E3E' : '#38A169' }}>
                      Nieuw: €{alert.new_price}/{alert.unit || 'kg'}
                    </span>
                  </div>
                )}

                {/* Deal detail */}
                {alert.type === 'deal' && alert.ingredient_name && (
                  <div style={{ marginTop: 8, padding: '6px 10px', backgroundColor: '#F0FFF4', borderRadius: 5, fontSize: 12, color: '#276749' }}>
                    Product: <strong>{alert.ingredient_name}</strong>
                    {alert.relevant_event_ids && alert.relevant_event_ids.length > 0 && (
                      <span style={{ marginLeft: 8 }}>· Bruikbaar voor {alert.relevant_event_ids.length} aankomende event(s)</span>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                  <span style={{ fontSize: 11, color: '#B5A090' }}>
                    {new Date(alert.created_at).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); dismiss(alert.id) }}
                    style={{ fontSize: 11, color: '#B5A090', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>
                    Sluiten
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
