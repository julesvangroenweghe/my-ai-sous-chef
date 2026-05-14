'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

const STAGE_CONFIG = {
  optie: { label: 'Optie', color: '#9E7E60', bg: '#F5EDD9' },
  verstuurd: { label: 'Offerte verstuurd', color: '#C4703A', bg: '#FDF0E6' },
  bevestigd: { label: 'Bevestigd', color: '#3A5C3A', bg: '#EAF2EA' },
  afgerond: { label: 'Afgerond', color: '#2C5282', bg: '#EBF4FF' },
  betaald: { label: 'Betaald', color: '#276749', bg: '#E6F7EE' },
  verloren: { label: 'Verloren', color: '#742A2A', bg: '#FFF5F5' }
}

const ACTIVE_STAGES = ['optie', 'verstuurd', 'bevestigd', 'afgerond', 'betaald']

interface Deal {
  id: string
  title: string
  stage: string
  description: string | null
  estimated_value: number | null
  num_persons: number | null
  event_date: string | null
  event_location: string | null
  probability: number
  next_action: string | null
  next_action_date: string | null
  client: { id: string; name: string; company: string | null; email: string | null; phone: string | null } | null
  tasks: Task[]
  activities: Activity[]
}

interface Task {
  id: string
  title: string
  due_date: string | null
  completed_at: string | null
  priority: string
}

interface Activity {
  id: string
  type: string
  content: string | null
  created_at: string
}

export default function DealDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [newTask, setNewTask] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [addingTask, setAddingTask] = useState(false)

  useEffect(() => {
    if (params.id) fetchDeal()
  }, [params.id])

  async function fetchDeal() {
    const res = await fetch(`/api/pipeline/${params.id}`)
    if (res.ok) {
      const data = await res.json()
      setDeal(data.deal)
    }
    setLoading(false)
  }

  async function updateField(field: string, value: any) {
    if (!deal) return
    setDeal(prev => prev ? { ...prev, [field]: value } : null)
    await fetch(`/api/pipeline/${deal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value })
    })
  }

  async function addNote() {
    if (!newNote.trim() || !deal) return
    setAddingNote(true)
    await fetch(`/api/pipeline/${deal.id}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'notitie', content: newNote })
    })
    setNewNote('')
    setAddingNote(false)
    fetchDeal()
  }

  async function addTask() {
    if (!newTask.trim() || !deal) return
    setAddingTask(true)
    await fetch(`/api/pipeline/${deal.id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTask })
    })
    setNewTask('')
    setAddingTask(false)
    fetchDeal()
  }

  async function toggleTask(taskId: string, completed: boolean) {
    if (!deal) return
    await fetch(`/api/pipeline/${deal.id}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed_at: completed ? new Date().toISOString() : null })
    })
    fetchDeal()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FDF8F2' }}>
      <p style={{ color: '#9E7E60' }}>Laden...</p>
    </div>
  )

  if (!deal) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FDF8F2' }}>
      <p style={{ color: '#9E7E60' }}>Deal niet gevonden</p>
    </div>
  )

  const stageConfig = STAGE_CONFIG[deal.stage as keyof typeof STAGE_CONFIG]
  const currentStageIndex = ACTIVE_STAGES.indexOf(deal.stage)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FDF8F2', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div className="border-b px-8 py-5" style={{ borderColor: '#E8D5B5' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/sales/pipeline" className="text-sm" style={{ color: '#9E7E60' }}>← Pipeline</Link>
            <h1 className="text-xl font-semibold" style={{ color: '#2C1810' }}>{deal.title}</h1>
            <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ backgroundColor: stageConfig.bg, color: stageConfig.color }}>
              {stageConfig.label}
            </span>
          </div>
          {deal.estimated_value && (
            <div className="text-right">
              <p className="text-xl font-semibold" style={{ color: '#3A5C3A' }}>€{deal.estimated_value.toLocaleString('nl-BE')}</p>
              {deal.num_persons && <p className="text-xs" style={{ color: '#9E7E60' }}>{deal.num_persons} personen</p>}
            </div>
          )}
        </div>

        {/* Pipeline stappen */}
        <div className="flex items-center gap-0 mt-4">
          {ACTIVE_STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG]
            const isActive = i <= currentStageIndex
            const isCurrent = stage === deal.stage
            return (
              <button
                key={stage}
                onClick={() => updateField('stage', stage)}
                className="flex items-center"
              >
                <div
                  className="px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    backgroundColor: isCurrent ? cfg.bg : isActive ? '#F5EDD9' : 'white',
                    color: isCurrent ? cfg.color : isActive ? '#9E7E60' : '#C8B89A',
                    border: `1px solid ${isCurrent ? cfg.color : isActive ? '#E8D5B5' : '#E8D5B5'}`,
                    borderRadius: i === 0 ? '8px 0 0 8px' : i === ACTIVE_STAGES.length - 1 ? '0 8px 8px 0' : '0',
                    borderLeft: i > 0 ? 'none' : undefined,
                    fontWeight: isCurrent ? '600' : '400'
                  }}
                >
                  {cfg.label}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-8 grid grid-cols-3 gap-6">
        {/* Links: deal details */}
        <div className="col-span-2 space-y-5">
          {/* Basisgegevens kaart */}
          <div className="rounded-xl p-5" style={{ backgroundColor: 'white', border: '1px solid #E8D5B5' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: '#2C1810' }}>Gegevens</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#9E7E60' }}>Eventdatum</label>
                <input type="date" value={deal.event_date || ''} onChange={e => updateField('event_date', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ borderColor: '#E8D5B5', color: '#2C1810' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#9E7E60' }}>Locatie</label>
                <input type="text" value={deal.event_location || ''} onChange={e => updateField('event_location', e.target.value)}
                  placeholder="Locatie event"
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ borderColor: '#E8D5B5', color: '#2C1810' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#9E7E60' }}>Geschatte waarde (€)</label>
                <input type="number" value={deal.estimated_value || ''} onChange={e => updateField('estimated_value', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ borderColor: '#E8D5B5', color: '#2C1810' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#9E7E60' }}>Aantal personen</label>
                <input type="number" value={deal.num_persons || ''} onChange={e => updateField('num_persons', parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ borderColor: '#E8D5B5', color: '#2C1810' }} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: '#9E7E60' }}>Volgende actie</label>
                <input type="text" value={deal.next_action || ''} onChange={e => updateField('next_action', e.target.value)}
                  placeholder="bv. Offerte versturen"
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ borderColor: '#E8D5B5', color: '#2C1810' }} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: '#9E7E60' }}>Beschrijving</label>
                <textarea value={deal.description || ''} onChange={e => updateField('description', e.target.value)}
                  rows={3} placeholder="Extra info over deze deal..."
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
                  style={{ borderColor: '#E8D5B5', color: '#2C1810' }} />
              </div>
            </div>
          </div>

          {/* Taken */}
          <div className="rounded-xl p-5" style={{ backgroundColor: 'white', border: '1px solid #E8D5B5' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: '#2C1810' }}>Taken</h3>
            <div className="space-y-2 mb-3">
              {(deal.tasks || []).map(task => (
                <div key={task.id} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ backgroundColor: '#F5EDD9' }}>
                  <input type="checkbox" checked={!!task.completed_at}
                    onChange={e => toggleTask(task.id, e.target.checked)}
                    className="rounded" style={{ accentColor: '#3A5C3A' }} />
                  <span className="text-sm flex-1" style={{ color: task.completed_at ? '#9E7E60' : '#2C1810', textDecoration: task.completed_at ? 'line-through' : 'none' }}>
                    {task.title}
                  </span>
                  {task.due_date && (
                    <span className="text-xs" style={{ color: '#9E7E60' }}>
                      {new Date(task.due_date).toLocaleDateString('nl-BE')}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newTask} onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder="Nieuwe taak..."
                className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ borderColor: '#E8D5B5', color: '#2C1810' }} />
              <button onClick={addTask} disabled={addingTask || !newTask.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#3A5C3A' }}>
                +
              </button>
            </div>
          </div>

          {/* Activiteitenlog */}
          <div className="rounded-xl p-5" style={{ backgroundColor: 'white', border: '1px solid #E8D5B5' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: '#2C1810' }}>Activiteiten</h3>
            <div className="space-y-3 mb-4">
              {(deal.activities || []).length === 0 && (
                <p className="text-sm" style={{ color: '#9E7E60' }}>Nog geen activiteiten</p>
              )}
              {(deal.activities || []).map(activity => (
                <div key={activity.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ backgroundColor: '#C4703A' }} />
                  <div className="flex-1">
                    <p className="text-sm" style={{ color: '#2C1810' }}>{activity.content}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#9E7E60' }}>
                      {new Date(activity.created_at).toLocaleString('nl-BE')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNote()}
                placeholder="Notitie toevoegen..."
                className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ borderColor: '#E8D5B5', color: '#2C1810' }} />
              <button onClick={addNote} disabled={addingNote || !newNote.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#C4703A' }}>
                Toevoegen
              </button>
            </div>
          </div>
        </div>

        {/* Rechts: klantkaart */}
        <div className="space-y-5">
          {deal.client ? (
            <div className="rounded-xl p-5" style={{ backgroundColor: 'white', border: '1px solid #E8D5B5' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#2C1810' }}>Klant</h3>
              <div className="space-y-2">
                <p className="font-semibold text-sm" style={{ color: '#2C1810' }}>{deal.client.name}</p>
                {deal.client.company && <p className="text-xs" style={{ color: '#9E7E60' }}>{deal.client.company}</p>}
                {deal.client.email && (
                  <a href={`mailto:${deal.client.email}`} className="text-xs block" style={{ color: '#C4703A' }}>
                    {deal.client.email}
                  </a>
                )}
                {deal.client.phone && <p className="text-xs" style={{ color: '#9E7E60' }}>{deal.client.phone}</p>}
              </div>
              <Link href={`/sales/klanten/${deal.client.id}`}
                className="mt-3 block text-center text-xs py-2 rounded-lg border transition-colors"
                style={{ borderColor: '#E8D5B5', color: '#9E7E60' }}>
                Klantprofiel bekijken
              </Link>
            </div>
          ) : (
            <div className="rounded-xl p-5" style={{ backgroundColor: 'white', border: '1px solid #E8D5B5' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#2C1810' }}>Klant</h3>
              <p className="text-xs mb-3" style={{ color: '#9E7E60' }}>Nog geen klant gekoppeld</p>
              <Link href="/sales/klanten" className="block text-center text-xs py-2 rounded-lg border" style={{ borderColor: '#E8D5B5', color: '#9E7E60' }}>
                Klant koppelen
              </Link>
            </div>
          )}

          {/* Kansen */}
          <div className="rounded-xl p-5" style={{ backgroundColor: 'white', border: '1px solid #E8D5B5' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#2C1810' }}>Kans op sluiting</h3>
            <div className="flex items-center gap-3">
              <input type="range" min="0" max="100" value={deal.probability}
                onChange={e => updateField('probability', parseInt(e.target.value))}
                className="flex-1" style={{ accentColor: '#3A5C3A' }} />
              <span className="text-lg font-semibold w-12 text-right" style={{ color: '#3A5C3A' }}>{deal.probability}%</span>
            </div>
            {deal.estimated_value && (
              <p className="text-xs mt-2" style={{ color: '#9E7E60' }}>
                Gewogen waarde: €{((deal.estimated_value * deal.probability) / 100).toLocaleString('nl-BE')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
