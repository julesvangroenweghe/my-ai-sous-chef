'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Client {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  type: string
  city: string | null
  total_events: number
  total_revenue: number
  last_event_at: string | null
  tags: string[]
  notes: string | null
  created_at: string
}

const TYPE_LABELS: Record<string, string> = {
  particulier: 'Particulier',
  bedrijf: 'Bedrijf',
  vzw: 'VZW',
  gemeente: 'Gemeente'
}

export default function KlantenPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', company: '', email: '', phone: '', type: 'particulier', city: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchClients()
  }, [search])

  async function fetchClients() {
    try {
      const url = search ? `/api/clients?q=${encodeURIComponent(search)}` : '/api/clients'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients || [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function createClient() {
    if (!newClient.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient)
      })
      if (res.ok) {
        setShowNew(false)
        setNewClient({ name: '', company: '', email: '', phone: '', type: 'particulier', city: '' })
        fetchClients()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FDF8F2', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div className="border-b px-8 py-6" style={{ borderColor: '#E8D5B5' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/sales/pipeline" className="text-sm" style={{ color: '#9E7E60' }}>
              ← Pipeline
            </Link>
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: '#2C1810' }}>Klanten</h1>
              <p className="text-sm mt-0.5" style={{ color: '#9E7E60' }}>{clients.length} contacten</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Zoek op naam, bedrijf of e-mail..."
              className="px-4 py-2 rounded-lg text-sm border outline-none w-72"
              style={{ borderColor: '#E8D5B5', backgroundColor: 'white', color: '#2C1810' }}
            />
            <button
              onClick={() => setShowNew(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white"
              style={{ backgroundColor: '#3A5C3A' }}
            >
              + Nieuwe klant
            </button>
          </div>
        </div>
      </div>

      {/* Tabel */}
      <div className="px-8 py-6">
        {loading ? (
          <p style={{ color: '#9E7E60' }}>Laden...</p>
        ) : clients.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg font-medium" style={{ color: '#2C1810' }}>Nog geen klanten</p>
            <p className="text-sm mt-1" style={{ color: '#9E7E60' }}>Voeg je eerste klant toe om te beginnen</p>
            <button
              onClick={() => setShowNew(true)}
              className="mt-4 px-6 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#3A5C3A' }}
            >
              + Eerste klant toevoegen
            </button>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8D5B5' }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#F5EDD9', borderBottom: '1px solid #E8D5B5' }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#9E7E60' }}>Naam</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#9E7E60' }}>Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#9E7E60' }}>Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#9E7E60' }}>Stad</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: '#9E7E60' }}>Events</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: '#9E7E60' }}>Omzet</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#9E7E60' }}>Laatste event</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client, i) => (
                  <tr
                    key={client.id}
                    onClick={() => router.push(`/sales/klanten/${client.id}`)}
                    className="cursor-pointer transition-colors hover:bg-amber-50"
                    style={{ borderBottom: i < clients.length - 1 ? '1px solid #F5EDD9' : undefined, backgroundColor: 'white' }}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm" style={{ color: '#2C1810' }}>{client.name}</div>
                      {client.company && <div className="text-xs mt-0.5" style={{ color: '#9E7E60' }}>{client.company}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#F5EDD9', color: '#9E7E60' }}>
                        {TYPE_LABELS[client.type] || client.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs" style={{ color: '#2C1810' }}>{client.email || '—'}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#9E7E60' }}>{client.phone || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#9E7E60' }}>{client.city || '—'}</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: '#2C1810' }}>{client.total_events}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: '#3A5C3A' }}>
                      {client.total_revenue > 0 ? `€${client.total_revenue.toLocaleString('nl-BE')}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#9E7E60' }}>
                      {client.last_event_at ? new Date(client.last_event_at).toLocaleDateString('nl-BE') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nieuwe klant modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: '#FDF8F2', border: '1px solid #E8D5B5' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#2C1810' }}>Nieuwe klant</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#9E7E60' }}>Naam *</label>
                  <input type="text" value={newClient.name} onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))}
                    placeholder="Jan Janssen" autoFocus
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ borderColor: '#E8D5B5', backgroundColor: 'white', color: '#2C1810' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#9E7E60' }}>Type</label>
                  <select value={newClient.type} onChange={e => setNewClient(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ borderColor: '#E8D5B5', backgroundColor: 'white', color: '#2C1810' }}>
                    {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#9E7E60' }}>Bedrijfsnaam</label>
                <input type="text" value={newClient.company} onChange={e => setNewClient(p => ({ ...p, company: e.target.value }))}
                  placeholder="Optioneel"
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ borderColor: '#E8D5B5', backgroundColor: 'white', color: '#2C1810' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#9E7E60' }}>E-mail</label>
                  <input type="email" value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ borderColor: '#E8D5B5', backgroundColor: 'white', color: '#2C1810' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#9E7E60' }}>Telefoon</label>
                  <input type="tel" value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ borderColor: '#E8D5B5', backgroundColor: 'white', color: '#2C1810' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#9E7E60' }}>Gemeente</label>
                <input type="text" value={newClient.city} onChange={e => setNewClient(p => ({ ...p, city: e.target.value }))}
                  placeholder="Gent"
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ borderColor: '#E8D5B5', backgroundColor: 'white', color: '#2C1810' }} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowNew(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border"
                style={{ borderColor: '#E8D5B5', color: '#9E7E60' }}>
                Annuleren
              </button>
              <button onClick={createClient} disabled={saving || !newClient.name.trim()}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#3A5C3A' }}>
                {saving ? 'Opslaan...' : 'Klant aanmaken'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
