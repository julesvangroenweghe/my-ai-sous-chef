'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface RunbookItem {
  id: string
  event_id: string
  kitchen_id: string
  time_offset_minutes: number | null
  absolute_time: string | null
  title: string
  description: string | null
  assigned_to: string | null
  category: 'prep' | 'service' | 'logistics' | 'cleanup'
  is_done: boolean
  sort_order: number
}

interface EventInfo {
  id: string
  name: string
  event_date: string
  num_persons: number | null
  event_type: string
}

const CATEGORY_CONFIG = {
  prep: { label: 'Voorbereiding', color: '#E8A040', bg: '#FEF3E2', border: '#E8A040' },
  service: { label: 'Service', color: '#C4703A', bg: '#FDF2EB', border: '#C4703A' },
  logistics: { label: 'Logistiek', color: '#3B82F6', bg: '#EFF6FF', border: '#3B82F6' },
  cleanup: { label: 'Afbouw', color: '#9E7E60', bg: '#F5EDE0', border: '#9E7E60' },
}

function formatTime(item: RunbookItem): string {
  if (item.absolute_time) return item.absolute_time
  if (item.time_offset_minutes !== null) {
    const absMin = Math.abs(item.time_offset_minutes)
    const hours = Math.floor(absMin / 60)
    const mins = absMin % 60
    const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
    if (item.time_offset_minutes < 0) {
      if (item.time_offset_minutes <= -1440) return `D-${Math.floor(absMin / 1440)} ${timeStr}`
      return `-${timeStr}`
    }
    return `+${timeStr}`
  }
  return ''
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('nl-BE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

interface InlineEditFormProps {
  item: RunbookItem
  onSave: (updated: Partial<RunbookItem>) => Promise<void>
  onCancel: () => void
}

function InlineEditForm({ item, onSave, onCancel }: InlineEditFormProps) {
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description || '')
  const [assignedTo, setAssignedTo] = useState(item.assigned_to || '')
  const [absoluteTime, setAbsoluteTime] = useState(item.absolute_time || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    await onSave({
      title: title.trim(),
      description: description.trim() || null,
      assigned_to: assignedTo.trim() || null,
      absolute_time: absoluteTime.trim() || null,
    })
    setSaving(false)
  }

  return (
    <div style={{ background: '#FDF8F2', border: '1px solid #E8D5B5', borderRadius: 8, padding: '12px 16px', marginTop: 4 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Titel taak"
          style={{ padding: '7px 10px', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 13, color: '#2C1810', background: 'white', outline: 'none' }}
        />
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Omschrijving (optioneel)"
          style={{ padding: '7px 10px', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 12, color: '#2C1810', background: 'white', outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            placeholder="Toegewezen aan"
            style={{ flex: 1, padding: '7px 10px', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 12, color: '#2C1810', background: 'white', outline: 'none' }}
          />
          <input
            value={absoluteTime}
            onChange={e => setAbsoluteTime(e.target.value)}
            placeholder="Tijdstip (bv. 09:00)"
            style={{ width: 130, padding: '7px 10px', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 12, color: '#2C1810', background: 'white', outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '5px 12px', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 12, color: '#9E7E60', background: 'white', cursor: 'pointer' }}>
            Annuleren
          </button>
          <button onClick={handleSave} disabled={saving || !title.trim()} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: 'white', background: saving ? '#ccc' : '#E8A040', border: 'none', cursor: saving ? 'default' : 'pointer' }}>
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface AddItemFormProps {
  category: string
  onAdd: (data: Partial<RunbookItem>) => Promise<void>
  onCancel: () => void
}

function AddItemForm({ category, onAdd, onCancel }: AddItemFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [absoluteTime, setAbsoluteTime] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    if (!title.trim()) return
    setAdding(true)
    await onAdd({
      title: title.trim(),
      description: description.trim() || null,
      assigned_to: assignedTo.trim() || null,
      category: category as RunbookItem['category'],
      absolute_time: absoluteTime.trim() || null,
    })
    setAdding(false)
    setTitle('')
    setDescription('')
    setAssignedTo('')
    setAbsoluteTime('')
  }

  return (
    <div style={{ background: '#FDF8F2', border: '1px dashed #E8D5B5', borderRadius: 8, padding: '12px 16px', margin: '8px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Nieuwe taak..."
          autoFocus
          style={{ padding: '7px 10px', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 13, color: '#2C1810', background: 'white', outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            placeholder="Toegewezen aan"
            style={{ flex: 1, padding: '7px 10px', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 12, color: '#2C1810', background: 'white', outline: 'none' }}
          />
          <input
            value={absoluteTime}
            onChange={e => setAbsoluteTime(e.target.value)}
            placeholder="Tijdstip"
            style={{ width: 130, padding: '7px 10px', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 12, color: '#2C1810', background: 'white', outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '5px 12px', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 12, color: '#9E7E60', background: 'white', cursor: 'pointer' }}>
            Annuleren
          </button>
          <button onClick={handleAdd} disabled={adding || !title.trim()} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: 'white', background: adding ? '#ccc' : '#E8A040', border: 'none', cursor: adding ? 'default' : 'pointer' }}>
            {adding ? 'Toevoegen...' : 'Toevoegen'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DraaiboekPage() {
  const params = useParams()
  const eventId = params.id as string
  const supabase = createClient()

  const [event, setEvent] = useState<EventInfo | null>(null)
  const [items, setItems] = useState<RunbookItem[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingCategory, setAddingCategory] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const getAuthHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ? `Bearer ${session.access_token}` : ''
  }, [supabase])

  const fetchItems = useCallback(async () => {
    const authHeader = await getAuthHeader()
    const res = await fetch(`/api/events/${eventId}/runbook`, {
      headers: { authorization: authHeader }
    })
    if (res.ok) {
      const data = await res.json()
      setItems(data.items || [])
    }
  }, [eventId, getAuthHeader])

  const fetchEvent = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('id, name, event_date, num_persons, event_type')
      .eq('id', eventId)
      .single()
    if (data) setEvent(data as EventInfo)
    setLoading(false)
  }, [eventId, supabase])

  useEffect(() => {
    fetchEvent()
    fetchItems()
  }, [fetchEvent, fetchItems])

  const handleGenerate = async () => {
    if (items.length > 0) {
      if (!confirm('Er zijn al items in het draaiboek. Wil je ze vervangen met een AI-gegenereerd draaiboek?')) return
    }
    setGenerating(true)
    setError(null)
    try {
      const authHeader = await getAuthHeader()
      const res = await fetch(`/api/events/${eventId}/runbook/generate`, {
        method: 'POST',
        headers: { authorization: authHeader }
      })
      if (res.ok) {
        await fetchItems()
      } else {
        const data = await res.json()
        setError(data.error || 'AI generatie mislukt')
      }
    } catch {
      setError('Generatie mislukt. Probeer opnieuw.')
    }
    setGenerating(false)
  }

  const handleToggleDone = async (item: RunbookItem) => {
    const authHeader = await getAuthHeader()
    const res = await fetch(`/api/events/${eventId}/runbook`, {
      method: 'PATCH',
      headers: { authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: item.id, is_done: !item.is_done })
    })
    if (res.ok) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_done: !i.is_done } : i))
    }
  }

  const handleSaveEdit = async (itemId: string, updates: Partial<RunbookItem>) => {
    const authHeader = await getAuthHeader()
    const res = await fetch(`/api/events/${eventId}/runbook`, {
      method: 'PATCH',
      headers: { authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, ...updates })
    })
    if (res.ok) {
      const data = await res.json()
      setItems(prev => prev.map(i => i.id === itemId ? data : i))
    }
    setEditingId(null)
  }

  const handleDelete = async (itemId: string) => {
    const authHeader = await getAuthHeader()
    const res = await fetch(`/api/events/${eventId}/runbook?item_id=${itemId}`, {
      method: 'DELETE',
      headers: { authorization: authHeader }
    })
    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== itemId))
    }
    setDeleteConfirmId(null)
  }

  const handleAddItem = async (data: Partial<RunbookItem>) => {
    const authHeader = await getAuthHeader()
    const res = await fetch(`/api/events/${eventId}/runbook`, {
      method: 'POST',
      headers: { authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (res.ok) {
      await fetchItems()
    }
    setAddingCategory(null)
  }

  const handlePrint = () => window.print()

  const groupedItems = (['prep', 'service', 'logistics', 'cleanup'] as const).reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat).sort((a, b) => a.sort_order - b.sort_order)
    return acc
  }, {} as Record<string, RunbookItem[]>)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <div style={{ width: 32, height: 32, border: '3px solid #E8D5B5', borderTopColor: '#E8A040', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (!event) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <p style={{ color: '#9E7E60', marginBottom: 8 }}>Event niet gevonden</p>
        <Link href="/events" style={{ color: '#E8A040', fontSize: 14 }}>Terug naar events</Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 0 60px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print {
          .no-print { display: none !important; }
          .print-page { background: white !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }} className="no-print">
          <Link href={`/events/${eventId}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9E7E60', textDecoration: 'none', fontSize: 13 }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Terug naar event
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#2C1810', margin: 0, fontFamily: 'Georgia, serif' }}>Draaiboek</h1>
            <p style={{ color: '#9E7E60', fontSize: 14, margin: '4px 0 0' }}>
              {event.name} · {formatDate(event.event_date)}{event.num_persons ? ` · ${event.num_persons} pax` : ''}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} className="no-print">
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: generating ? '#E8D5B5' : '#E8A040', color: 'white',
                fontSize: 13, fontWeight: 600, cursor: generating ? 'default' : 'pointer'
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 3l1.88 5.76L20 10l-6.12 1.24L12 17l-1.88-5.76L4 10l6.12-1.24z"/>
              </svg>
              {generating ? 'Genereren...' : 'AI Genereer'}
            </button>

            <button
              onClick={() => setAddingCategory('prep')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8,
                border: '1px solid #E8D5B5', background: 'white',
                color: '#2C1810', fontSize: 13, fontWeight: 500, cursor: 'pointer'
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Toevoegen
            </button>

            <button
              onClick={handlePrint}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8,
                border: '1px solid #E8D5B5', background: 'white',
                color: '#9E7E60', fontSize: 13, cursor: 'pointer'
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#DC2626', fontSize: 13 }} className="no-print">
          {error}
        </div>
      )}

      {/* Global add form (top) */}
      {addingCategory === 'prep' && !items.length && (
        <AddItemForm
          category="prep"
          onAdd={handleAddItem}
          onCancel={() => setAddingCategory(null)}
        />
      )}

      {/* Timeline view per categorie */}
      {items.length === 0 && !generating ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', border: '1px solid #E8D5B5', borderRadius: 16 }}>
          <svg width="48" height="48" fill="none" stroke="#D4B896" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 16px', display: 'block' }}>
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <p style={{ color: '#9E7E60', fontSize: 15, fontWeight: 500, margin: '0 0 6px' }}>Nog geen draaiboek</p>
          <p style={{ color: '#B8997A', fontSize: 13, margin: '0 0 20px' }}>Genereer automatisch via AI of voeg items handmatig toe.</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#E8A040', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            {generating ? 'Genereren...' : 'AI Genereer draaiboek'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {(['prep', 'service', 'logistics', 'cleanup'] as const).map(cat => {
            const cfg = CATEGORY_CONFIG[cat]
            const catItems = groupedItems[cat] || []

            return (
              <div key={cat} style={{ background: 'white', border: '1px solid #E8D5B5', borderRadius: 16, overflow: 'hidden' }}>
                {/* Categorie header */}
                <div style={{ padding: '14px 20px', borderBottom: `2px solid ${cfg.border}`, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.color }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#2C1810' }}>{cfg.label}</span>
                    <span style={{ fontSize: 12, color: '#9E7E60' }}>({catItems.length} taken)</span>
                  </div>
                  <button
                    onClick={() => setAddingCategory(addingCategory === cat ? null : cat)}
                    className="no-print"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: `1px solid ${cfg.border}`, background: 'white', color: cfg.color, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}
                  >
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Toevoegen
                  </button>
                </div>

                {/* Items */}
                <div style={{ padding: '8px 0' }}>
                  {catItems.length === 0 && addingCategory !== cat && (
                    <div style={{ padding: '16px 20px', color: '#B8997A', fontSize: 13, textAlign: 'center' }}>
                      Geen taken — klik op Toevoegen
                    </div>
                  )}

                  {catItems.map((item, idx) => (
                    <div key={item.id}>
                      <div
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12,
                          padding: '10px 20px',
                          borderBottom: idx < catItems.length - 1 ? '1px solid #F5EDE0' : 'none',
                          background: item.is_done ? '#F9F9F9' : 'white',
                          transition: 'background 0.15s',
                        }}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggleDone(item)}
                          className="no-print"
                          style={{
                            width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 1,
                            border: `2px solid ${item.is_done ? cfg.color : '#D4B896'}`,
                            background: item.is_done ? cfg.color : 'white',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          {item.is_done && (
                            <svg width="11" height="11" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                          )}
                        </button>

                        {/* Tijdstip */}
                        {formatTime(item) && (
                          <span style={{ fontSize: 11, fontFamily: 'monospace', color: cfg.color, fontWeight: 600, minWidth: 50, marginTop: 3, flexShrink: 0 }}>
                            {formatTime(item)}
                          </span>
                        )}

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 500, color: item.is_done ? '#9E7E60' : '#2C1810', textDecoration: item.is_done ? 'line-through' : 'none' }}>
                              {item.title}
                            </span>
                            {item.assigned_to && (
                              <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: '#F5EDE0', color: '#9E7E60', flexShrink: 0 }}>
                                {item.assigned_to}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p style={{ fontSize: 12, color: '#9E7E60', margin: '3px 0 0', lineHeight: 1.5 }}>
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Acties */}
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} className="no-print">
                          <button
                            onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                            style={{ padding: '4px 8px', border: '1px solid #E8D5B5', borderRadius: 5, background: 'white', color: '#9E7E60', cursor: 'pointer', fontSize: 11 }}
                          >
                            Bewerken
                          </button>
                          {deleteConfirmId === item.id ? (
                            <>
                              <button
                                onClick={() => handleDelete(item.id)}
                                style={{ padding: '4px 8px', border: 'none', borderRadius: 5, background: '#EF4444', color: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                              >
                                Verwijderen
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                style={{ padding: '4px 8px', border: '1px solid #E8D5B5', borderRadius: 5, background: 'white', color: '#9E7E60', cursor: 'pointer', fontSize: 11 }}
                              >
                                Nee
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(item.id)}
                              style={{ padding: '4px 6px', border: '1px solid #E8D5B5', borderRadius: 5, background: 'white', color: '#B8997A', cursor: 'pointer' }}
                            >
                              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inline edit form */}
                      {editingId === item.id && (
                        <div style={{ padding: '0 20px 12px' }} className="no-print">
                          <InlineEditForm
                            item={item}
                            onSave={(updates) => handleSaveEdit(item.id, updates)}
                            onCancel={() => setEditingId(null)}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add form per categorie */}
                  {addingCategory === cat && (
                    <div style={{ padding: '0 20px 12px' }} className="no-print">
                      <AddItemForm
                        category={cat}
                        onAdd={handleAddItem}
                        onCancel={() => setAddingCategory(null)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Progress summary */}
      {items.length > 0 && (
        <div style={{ marginTop: 24, padding: '14px 20px', background: 'white', border: '1px solid #E8D5B5', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16 }} className="no-print">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#9E7E60' }}>Voortgang draaiboek</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#2C1810' }}>
                {items.filter(i => i.is_done).length} / {items.length} taken
              </span>
            </div>
            <div style={{ height: 4, background: '#F0E8D8', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#E8A040', borderRadius: 4, width: `${items.length > 0 ? (items.filter(i => i.is_done).length / items.length) * 100 : 0}%`, transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
