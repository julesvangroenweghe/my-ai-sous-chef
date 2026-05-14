'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Perkament & Koper + Bosgroen kleurpalet
const STAGE_CONFIG = {
  optie: {
    label: 'Optie',
    color: '#9E7E60',
    bg: '#F5EDD9',
    border: '#E8D5B5',
    dot: 'bg-[#9E7E60]'
  },
  verstuurd: {
    label: 'Offerte verstuurd',
    color: '#C4703A',
    bg: '#FDF0E6',
    border: '#F0C8A0',
    dot: 'bg-[#C4703A]'
  },
  bevestigd: {
    label: 'Bevestigd',
    color: '#3A5C3A',
    bg: '#EAF2EA',
    border: '#B8D4B8',
    dot: 'bg-[#3A5C3A]'
  },
  afgerond: {
    label: 'Afgerond',
    color: '#2C5282',
    bg: '#EBF4FF',
    border: '#BEE3F8',
    dot: 'bg-[#2C5282]'
  },
  betaald: {
    label: 'Betaald',
    color: '#276749',
    bg: '#E6F7EE',
    border: '#9AE6B4',
    dot: 'bg-[#276749]'
  },
  verloren: {
    label: 'Verloren',
    color: '#742A2A',
    bg: '#FFF5F5',
    border: '#FEB2B2',
    dot: 'bg-[#742A2A]'
  }
}

const ACTIVE_STAGES = ['optie', 'verstuurd', 'bevestigd', 'afgerond', 'betaald']

interface Deal {
  id: string
  title: string
  stage: string
  estimated_value: number | null
  num_persons: number | null
  event_date: string | null
  event_location: string | null
  probability: number
  next_action: string | null
  next_action_date: string | null
  client: { name: string; company: string | null } | null
  created_at: string
}

export default function PipelinePage() {
  const router = useRouter()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewDeal, setShowNewDeal] = useState(false)
  const [newDeal, setNewDeal] = useState({ title: '', stage: 'optie', estimated_value: '', num_persons: '', event_date: '', event_location: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchDeals()
  }, [])

  async function fetchDeals() {
    try {
      const res = await fetch('/api/pipeline')
      if (res.ok) {
        const data = await res.json()
        setDeals(data.deals || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function createDeal() {
    if (!newDeal.title.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newDeal.title,
          stage: newDeal.stage,
          estimated_value: newDeal.estimated_value ? parseFloat(newDeal.estimated_value) : null,
          num_persons: newDeal.num_persons ? parseInt(newDeal.num_persons) : null,
          event_date: newDeal.event_date || null,
          event_location: newDeal.event_location || null
        })
      })
      if (res.ok) {
        setShowNewDeal(false)
        setNewDeal({ title: '', stage: 'optie', estimated_value: '', num_persons: '', event_date: '', event_location: '' })
        fetchDeals()
      }
    } finally {
      setSaving(false)
    }
  }

  async function moveStage(dealId: string, newStage: string) {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d))
    await fetch(`/api/pipeline/${dealId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage })
    })
  }

  const dealsByStage = ACTIVE_STAGES.reduce((acc, stage) => {
    acc[stage] = deals.filter(d => d.stage === stage)
    return acc
  }, {} as Record<string, Deal[]>)

  const totalPipeline = deals
    .filter(d => ['optie', 'verstuurd', 'bevestigd'].includes(d.stage))
    .reduce((sum, d) => sum + (d.estimated_value || 0), 0)

  const totalBevestigd = deals
    .filter(d => d.stage === 'bevestigd')
    .reduce((sum, d) => sum + (d.estimated_value || 0), 0)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FDF8F2', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div className="border-b px-8 py-6" style={{ borderColor: '#E8D5B5', backgroundColor: '#FDF8F2' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#2C1810' }}>Sales Pipeline</h1>
            <p className="text-sm mt-0.5" style={{ color: '#9E7E60' }}>
              Van eerste contact tot betaalde factuur
            </p>
          </div>
          <div className="flex items-center gap-6">
            {/* KPI's */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-xs font-medium" style={{ color: '#9E7E60' }}>Open pipeline</p>
                <p className="text-lg font-semibold" style={{ color: '#C4703A' }}>
                  €{totalPipeline.toLocaleString('nl-BE')}
                </p>
              </div>
              <div className="w-px h-8" style={{ backgroundColor: '#E8D5B5' }} />
              <div className="text-center">
                <p className="text-xs font-medium" style={{ color: '#9E7E60' }}>Bevestigd</p>
                <p className="text-lg font-semibold" style={{ color: '#3A5C3A' }}>
                  €{totalBevestigd.toLocaleString('nl-BE')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/sales/klanten"
                className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
                style={{ borderColor: '#E8D5B5', color: '#2C1810', backgroundColor: 'white' }}
              >
                Klanten
              </Link>
              <button
                onClick={() => setShowNewDeal(true)}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#3A5C3A' }}
              >
                + Nieuwe deal
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <div className="p-6 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p style={{ color: '#9E7E60' }}>Laden...</p>
          </div>
        ) : (
          <div className="flex gap-4 min-w-max">
            {ACTIVE_STAGES.map(stage => {
              const config = STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG]
              const stageDeals = dealsByStage[stage] || []
              const stageValue = stageDeals.reduce((sum, d) => sum + (d.estimated_value || 0), 0)

              return (
                <div key={stage} className="w-72 flex-shrink-0">
                  {/* Column header */}
                  <div
                    className="rounded-xl px-4 py-3 mb-3 flex items-center justify-between"
                    style={{ backgroundColor: config.bg, border: `1px solid ${config.border}` }}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                      <span className="text-sm font-semibold" style={{ color: config.color }}>
                        {config.label}
                      </span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: config.border, color: config.color }}
                      >
                        {stageDeals.length}
                      </span>
                    </div>
                    {stageValue > 0 && (
                      <span className="text-xs font-medium" style={{ color: config.color }}>
                        €{stageValue.toLocaleString('nl-BE')}
                      </span>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="space-y-3">
                    {stageDeals.map(deal => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        stageConfig={config}
                        onMove={moveStage}
                        onClick={() => router.push(`/sales/deals/${deal.id}`)}
                      />
                    ))}

                    {stageDeals.length === 0 && (
                      <div
                        className="rounded-xl p-4 text-center text-sm border-2 border-dashed"
                        style={{ borderColor: config.border, color: '#9E7E60' }}
                      >
                        Geen deals
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Nieuwe deal modal */}
      {showNewDeal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{ backgroundColor: '#FDF8F2', border: '1px solid #E8D5B5' }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#2C1810' }}>Nieuwe deal aanmaken</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#9E7E60' }}>Naam event / deal *</label>
                <input
                  type="text"
                  value={newDeal.title}
                  onChange={e => setNewDeal(p => ({ ...p, title: e.target.value }))}
                  placeholder="bv. Huwelijk Van den Berg — 80p"
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ borderColor: '#E8D5B5', backgroundColor: 'white', color: '#2C1810' }}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#9E7E60' }}>Fase</label>
                  <select
                    value={newDeal.stage}
                    onChange={e => setNewDeal(p => ({ ...p, stage: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ borderColor: '#E8D5B5', backgroundColor: 'white', color: '#2C1810' }}
                  >
                    {ACTIVE_STAGES.map(s => (
                      <option key={s} value={s}>{STAGE_CONFIG[s as keyof typeof STAGE_CONFIG].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#9E7E60' }}>Aantal personen</label>
                  <input
                    type="number"
                    value={newDeal.num_persons}
                    onChange={e => setNewDeal(p => ({ ...p, num_persons: e.target.value }))}
                    placeholder="100"
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ borderColor: '#E8D5B5', backgroundColor: 'white', color: '#2C1810' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#9E7E60' }}>Geschatte waarde (€)</label>
                  <input
                    type="number"
                    value={newDeal.estimated_value}
                    onChange={e => setNewDeal(p => ({ ...p, estimated_value: e.target.value }))}
                    placeholder="8500"
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ borderColor: '#E8D5B5', backgroundColor: 'white', color: '#2C1810' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#9E7E60' }}>Eventdatum</label>
                  <input
                    type="date"
                    value={newDeal.event_date}
                    onChange={e => setNewDeal(p => ({ ...p, event_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ borderColor: '#E8D5B5', backgroundColor: 'white', color: '#2C1810' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#9E7E60' }}>Locatie</label>
                <input
                  type="text"
                  value={newDeal.event_location}
                  onChange={e => setNewDeal(p => ({ ...p, event_location: e.target.value }))}
                  placeholder="bv. Kasteel de Maurissens, Tienen"
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ borderColor: '#E8D5B5', backgroundColor: 'white', color: '#2C1810' }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowNewDeal(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors"
                style={{ borderColor: '#E8D5B5', color: '#9E7E60' }}
              >
                Annuleren
              </button>
              <button
                onClick={createDeal}
                disabled={saving || !newDeal.title.trim()}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#3A5C3A' }}
              >
                {saving ? 'Aanmaken...' : 'Deal aanmaken'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DealCard({ deal, stageConfig, onMove, onClick }: {
  deal: Deal
  stageConfig: typeof STAGE_CONFIG[keyof typeof STAGE_CONFIG]
  onMove: (id: string, stage: string) => void
  onClick: () => void
}) {
  const isOverdue = deal.next_action_date && new Date(deal.next_action_date) < new Date()
  const daysToEvent = deal.event_date
    ? Math.ceil((new Date(deal.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div
      onClick={onClick}
      className="rounded-xl p-4 cursor-pointer transition-all hover:shadow-md group"
      style={{ backgroundColor: 'white', border: '1px solid #E8D5B5' }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-tight" style={{ color: '#2C1810' }}>
          {deal.title}
        </h3>
        {deal.estimated_value && (
          <span className="text-xs font-semibold shrink-0" style={{ color: stageConfig.color }}>
            €{deal.estimated_value.toLocaleString('nl-BE')}
          </span>
        )}
      </div>

      {deal.client && (
        <p className="text-xs mt-1" style={{ color: '#9E7E60' }}>
          {deal.client.company || deal.client.name}
        </p>
      )}

      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {deal.num_persons && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F5EDD9', color: '#9E7E60' }}>
            {deal.num_persons}p
          </span>
        )}
        {daysToEvent !== null && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: daysToEvent < 30 ? '#FDF0E6' : '#EAF2EA',
              color: daysToEvent < 30 ? '#C4703A' : '#3A5C3A'
            }}
          >
            {daysToEvent < 0 ? 'Voorbij' : `${daysToEvent}d`}
          </span>
        )}
        {deal.event_location && (
          <span className="text-xs truncate max-w-[120px]" style={{ color: '#9E7E60' }}>
            {deal.event_location}
          </span>
        )}
      </div>

      {deal.next_action && (
        <div
          className="mt-3 p-2 rounded-lg text-xs"
          style={{
            backgroundColor: isOverdue ? '#FFF5F5' : '#F5EDD9',
            color: isOverdue ? '#742A2A' : '#9E7E60',
            border: `1px solid ${isOverdue ? '#FEB2B2' : '#E8D5B5'}`
          }}
        >
          {isOverdue && '! '}Actie: {deal.next_action}
        </div>
      )}

      {/* Stage move pijlen */}
      <div
        className="flex items-center justify-end gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => e.stopPropagation()}
      >
        {ACTIVE_STAGES.indexOf(deal.stage) > 0 && (
          <button
            onClick={() => onMove(deal.id, ACTIVE_STAGES[ACTIVE_STAGES.indexOf(deal.stage) - 1])}
            className="text-xs px-2 py-1 rounded border transition-colors"
            style={{ borderColor: '#E8D5B5', color: '#9E7E60', backgroundColor: 'white' }}
          >
            ←
          </button>
        )}
        {ACTIVE_STAGES.indexOf(deal.stage) < ACTIVE_STAGES.length - 1 && (
          <button
            onClick={() => onMove(deal.id, ACTIVE_STAGES[ACTIVE_STAGES.indexOf(deal.stage) + 1])}
            className="text-xs px-2 py-1 rounded border transition-colors text-white"
            style={{ backgroundColor: stageConfig.color, borderColor: stageConfig.color }}
          >
            →
          </button>
        )}
      </div>
    </div>
  )
}
