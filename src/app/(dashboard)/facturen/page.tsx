'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface ClientInvoice {
  id: string
  invoice_number: string
  invoice_date: string
  client_name: string
  total_amount: number
  status: 'concept' | 'verzonden' | 'betaald' | 'geannuleerd'
  created_at: string
}

const statusConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
  concept:     { label: 'Concept',      bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
  verzonden:   { label: 'Verzonden',    bg: '#FEF3E2', color: '#92400E', border: '#F6D860' },
  betaald:     { label: 'Betaald',      bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
  geannuleerd: { label: 'Geannuleerd',  bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
}

export default function FacturenPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<ClientInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetch('/api/client-invoices')
      .then(r => r.json())
      .then(data => { setInvoices(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleNew = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/client-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.id) router.push(`/facturen/${data.id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: '#2C1810', margin: 0 }}>
            Facturen
          </h1>
          <p style={{ color: '#9E7E60', fontSize: 14, marginTop: 4 }}>Beheer klantfacturen voor uw events</p>
        </div>
        <button
          onClick={handleNew}
          disabled={creating}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', background: '#E8A040', color: '#2C1810',
            border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14,
            cursor: 'pointer', opacity: creating ? 0.6 : 1,
          }}
        >
          <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {creating ? 'Aanmaken...' : 'Nieuwe factuur'}
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'white', border: '1px solid #E8D5B5', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9E7E60' }}>Laden...</div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <svg width={48} height={48} fill="none" stroke="#D4B896" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 12px' }}>
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/>
              <line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/>
              <line x1="8" y1="16" x2="12" y2="16"/>
            </svg>
            <p style={{ color: '#9E7E60', fontSize: 15, marginBottom: 8 }}>Nog geen facturen</p>
            <p style={{ color: '#B8997A', fontSize: 13 }}>
              Maak een nieuwe factuur aan of open een event en klik op "Factuur aanmaken".
            </p>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '140px 1fr 140px 110px 100px',
              padding: '10px 20px',
              borderBottom: '1px solid #E8D5B5',
              background: '#F5EDE0',
            }}>
              {['Nummer', 'Klant', 'Datum', 'Bedrag', 'Status'].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9E7E60' }}>
                  {h}
                </span>
              ))}
            </div>
            {invoices.map((inv, i) => {
              const sc = statusConfig[inv.status] || statusConfig.concept
              return (
                <div
                  key={inv.id}
                  onClick={() => router.push(`/facturen/${inv.id}`)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr 140px 110px 100px',
                    padding: '14px 20px',
                    borderBottom: i < invoices.length - 1 ? '1px solid #F2E8D5' : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    alignItems: 'center',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FAF6EF')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#C4703A', fontFamily: 'monospace' }}>
                    {inv.invoice_number}
                  </span>
                  <span style={{ fontSize: 14, color: '#2C1810', fontWeight: 500 }}>
                    {inv.client_name || <span style={{ color: '#B8997A', fontStyle: 'italic' }}>Geen klant</span>}
                  </span>
                  <span style={{ fontSize: 13, color: '#9E7E60' }}>
                    {new Date(inv.invoice_date).toLocaleDateString('nl-BE')}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#2C1810', fontFamily: 'monospace' }}>
                    € {Number(inv.total_amount).toFixed(2)}
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '3px 10px', borderRadius: 20,
                    fontSize: 12, fontWeight: 600,
                    background: sc.bg, color: sc.color,
                    border: `1px solid ${sc.border}`,
                    whiteSpace: 'nowrap',
                  }}>
                    {sc.label}
                  </span>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
