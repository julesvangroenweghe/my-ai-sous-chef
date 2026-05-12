'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface PacklistItem {
  id: string
  event_id: string
  kitchen_id: string
  category: string
  subcategory: string | null
  item_name: string
  quantity: number | null
  unit: string | null
  supplier: string
  notes: string | null
  checked: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

type TabCategory = 'keuken' | 'materiaal' | 'mobiele_keuken' | 'techniek' | 'logistiek' | 'locatie'

const TABS: { id: TabCategory; label: string }[] = [
  { id: 'keuken', label: 'Keuken' },
  { id: 'materiaal', label: 'Materiaal' },
  { id: 'mobiele_keuken', label: 'Mobiele keuken' },
  { id: 'techniek', label: 'Techniek' },
  { id: 'logistiek', label: 'Logistiek' },
  { id: 'locatie', label: 'Locatie' },
]

const SUPPLIER_BADGE: Record<string, string> = {
  SIR: 'bg-amber-100 text-amber-800 border border-amber-200',
  Levi: 'bg-blue-100 text-blue-800 border border-blue-200',
  klant: 'bg-green-100 text-green-800 border border-green-200',
}

function getSupplierBadge(supplier: string) {
  return SUPPLIER_BADGE[supplier] || 'bg-stone-100 text-stone-700 border border-stone-200'
}

function subcategoryLabel(sub: string | null): string {
  if (!sub) return 'Overig'
  const labels: Record<string, string> = {
    keukenbak: 'Keukenbak',
    ordo: 'Ordo bak',
    planken: 'Planken',
    klein: 'Klein materiaal',
    folie: 'Folie & papier',
    spuitzak: 'Spuitzak',
    vuur: 'Vuur',
    machines: 'Machines',
    messen: 'Messen',
    lepels: 'Lepels & gereedschap',
    containers: 'Containers & potten',
    zaal: 'Zaal',
    personeel: 'Personeel',
    apparatuur: 'Apparatuur (SIR)',
    huur: 'Huur (Levi)',
    stroom: 'Stroom & water',
    diversen: 'Diversen',
    kuis: 'Kuismateriaal',
    opbouw: 'Opbouw',
    check: 'Locatiechecklist',
  }
  return labels[sub] || sub.charAt(0).toUpperCase() + sub.slice(1)
}

function ArrowLeftIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function PrinterIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function SpinIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

export default function PaklijstPage() {
  const params = useParams()
  const eventId = params.id as string
  const supabase = createClient()

  const [eventName, setEventName] = useState('')
  const [items, setItems] = useState<PacklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabCategory>('keuken')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const [editQty, setEditQty] = useState('')
  const [addingCategory, setAddingCategory] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQty, setNewItemQty] = useState('')
  const [newItemSupplier, setNewItemSupplier] = useState('SIR')
  const [saving, setSaving] = useState(false)

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }, [supabase])

  const fetchItems = useCallback(async () => {
    const token = await getToken()
    const res = await fetch(`/api/events/${eventId}/paklijst`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) {
      const data = await res.json()
      setItems(data.items || [])
    }
    setLoading(false)
  }, [eventId, getToken])

  const fetchEvent = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('name')
      .eq('id', eventId)
      .single()
    if (data) setEventName(data.name)
  }, [eventId, supabase])

  useEffect(() => {
    fetchEvent()
    fetchItems()
  }, [fetchEvent, fetchItems])

  const toggleItem = useCallback(async (item: PacklistItem) => {
    // Optimistic update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i))
    const token = await getToken()
    const res = await fetch(`/api/events/${eventId}/paklijst/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ checked: !item.checked })
    })
    if (!res.ok) {
      // Revert on error
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: item.checked } : i))
    }
  }, [eventId, getToken])

  const saveEdit = useCallback(async (item: PacklistItem) => {
    const token = await getToken()
    const updates: Record<string, unknown> = {}
    if (editNote !== (item.notes || '')) updates.notes = editNote || null
    if (editQty !== String(item.quantity ?? '')) updates.quantity = editQty ? Number(editQty) : null
    if (Object.keys(updates).length === 0) { setEditingId(null); return }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updates } : i))
    setEditingId(null)
    await fetch(`/api/events/${eventId}/paklijst/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates)
    })
  }, [editNote, editQty, eventId, getToken])

  const addItem = useCallback(async () => {
    if (!newItemName.trim()) return
    setSaving(true)
    const token = await getToken()
    const body = {
      category: activeTab,
      item_name: newItemName.trim(),
      quantity: newItemQty ? Number(newItemQty) : null,
      supplier: newItemSupplier,
      checked: false,
    }
    const res = await fetch(`/api/events/${eventId}/paklijst`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    })
    if (res.ok) {
      const newItem = await res.json()
      setItems(prev => [...prev, newItem])
    }
    setNewItemName('')
    setNewItemQty('')
    setNewItemSupplier('SIR')
    setAddingCategory(null)
    setSaving(false)
  }, [newItemName, newItemQty, newItemSupplier, activeTab, eventId, getToken])

  const resetTab = useCallback(async () => {
    if (!confirm('Alle vinkjes in dit tabblad resetten?')) return
    const token = await getToken()
    const tabItems = items.filter(i => i.category === activeTab && i.checked)
    setItems(prev => prev.map(i => i.category === activeTab ? { ...i, checked: false } : i))
    await Promise.all(tabItems.map(item =>
      fetch(`/api/events/${eventId}/paklijst/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ checked: false })
      })
    ))
  }, [items, activeTab, eventId, getToken])

  const tabItems = items.filter(i => i.category === activeTab)
  const checkedCount = tabItems.filter(i => i.checked).length
  const progress = tabItems.length > 0 ? Math.round((checkedCount / tabItems.length) * 100) : 0

  // Group by subcategory, preserving insertion order
  const grouped: Record<string, PacklistItem[]> = {}
  for (const item of tabItems) {
    const key = item.subcategory || '__none__'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(item)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-amber-500">
        <SpinIcon />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 print:hidden">
        <Link
          href={`/events/${eventId}`}
          className="p-2 rounded-xl bg-[#FAF6EF] border border-[#E8D5B5] text-[#9E7E60] hover:text-[#2C1810] transition-all"
        >
          <ArrowLeftIcon />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-display font-bold text-[#2C1810]">Paklijst</h1>
          <p className="text-sm text-[#9E7E60] truncate">{eventName}</p>
        </div>
        <button
          onClick={resetTab}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-[#E8D5B5] rounded-xl bg-white text-[#9E7E60] hover:text-[#2C1810] hover:bg-[#F2E8D5] transition-all"
        >
          <ResetIcon />
          Reset vinkjes
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-[#E8D5B5] rounded-xl bg-white text-[#9E7E60] hover:text-[#2C1810] hover:bg-[#F2E8D5] transition-all"
        >
          <PrinterIcon />
          Afdrukken
        </button>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 bg-white border border-[#E8D5B5] rounded-xl p-1 overflow-x-auto print:hidden">
        {TABS.map(tab => {
          const tabCount = items.filter(i => i.category === tab.id).length
          const tabChecked = items.filter(i => i.category === tab.id && i.checked).length
          const pct = tabCount > 0 ? Math.round((tabChecked / tabCount) * 100) : 0
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-1 justify-center ${
                isActive
                  ? 'bg-amber-100 text-amber-800 border border-amber-200 shadow-sm'
                  : 'text-[#9E7E60] hover:text-[#2C1810] hover:bg-[#F2E8D5]'
              }`}
            >
              {tab.label}
              {tabCount > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  pct === 100
                    ? 'bg-green-100 text-green-700'
                    : isActive
                    ? 'bg-amber-200 text-amber-800'
                    : 'bg-stone-100 text-stone-600'
                }`}>
                  {pct}%
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="bg-white border border-[#E8D5B5] rounded-xl p-4 print:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-[#2C1810]">
            {TABS.find(t => t.id === activeTab)?.label}
          </span>
          <span className="text-sm text-[#9E7E60]">{checkedCount} / {tabItems.length} items</span>
        </div>
        <div className="h-2 bg-[#F0E8D8] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-amber-400'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {progress === 100 && tabItems.length > 0 && (
          <p className="text-xs text-green-600 mt-1.5 font-medium">Alles aangevinkt!</p>
        )}
      </div>

      {/* Checklist */}
      <div className="bg-white border border-[#E8D5B5] rounded-2xl overflow-hidden shadow-sm">
        {Object.keys(grouped).length === 0 ? (
          <div className="p-8 text-center text-[#9E7E60] text-sm">
            Geen items in deze categorie
          </div>
        ) : (
          Object.entries(grouped).map(([subcategory, subItems]) => (
            <div key={subcategory}>
              {/* Subcategory header */}
              <div className="px-5 py-2 bg-[#F5EDE0] border-b border-[#E8D5B5]">
                <span className="text-xs font-semibold text-[#9E7E60] uppercase tracking-wider">
                  {subcategoryLabel(subcategory === '__none__' ? null : subcategory)}
                </span>
              </div>

              {subItems.map(item => (
                <div
                  key={item.id}
                  className={`border-b border-[#F0E8D8] last:border-b-0 transition-colors ${
                    item.checked ? 'bg-[#FAFAF8]' : 'bg-white hover:bg-[#FDF8F4]'
                  }`}
                >
                  {editingId === item.id ? (
                    // Edit mode
                    <div className="px-5 py-3 flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleItem(item)}
                        className="mt-1 w-4 h-4 rounded border-[#E8D5B5] cursor-pointer accent-amber-500 shrink-0"
                      />
                      <div className="flex-1 space-y-2">
                        <span className={`text-sm font-medium block ${item.checked ? 'line-through text-[#B8997A]' : 'text-[#2C1810]'}`}>
                          {item.item_name}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <input
                            type="number"
                            value={editQty}
                            onChange={e => setEditQty(e.target.value)}
                            placeholder="Hoeveelheid"
                            className="w-28 px-2 py-1.5 text-xs border border-[#E8D5B5] rounded-lg bg-[#FAF6EF] text-[#2C1810] focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                          <input
                            type="text"
                            value={editNote}
                            onChange={e => setEditNote(e.target.value)}
                            placeholder="Notitie..."
                            className="flex-1 min-w-32 px-2 py-1.5 text-xs border border-[#E8D5B5] rounded-lg bg-[#FAF6EF] text-[#2C1810] focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                          <button
                            onClick={() => saveEdit(item)}
                            className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 transition-colors"
                          >
                            Opslaan
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 border border-[#E8D5B5] text-[#9E7E60] text-xs rounded-lg hover:bg-[#F2E8D5] transition-colors"
                          >
                            Annuleren
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="px-5 py-3 flex items-center gap-3 group">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleItem(item)}
                        className="w-4 h-4 rounded border-[#E8D5B5] cursor-pointer accent-amber-500 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm ${item.checked ? 'line-through text-[#B8997A]' : 'text-[#2C1810]'}`}>
                          {item.item_name}
                        </span>
                        {item.notes && (
                          <p className="text-xs text-[#9E7E60] mt-0.5 truncate">{item.notes}</p>
                        )}
                      </div>
                      {item.quantity != null && (
                        <span className="text-xs text-[#9E7E60] font-mono shrink-0">
                          {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                        </span>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${getSupplierBadge(item.supplier)}`}>
                        {item.supplier}
                      </span>
                      <button
                        onClick={() => {
                          setEditingId(item.id)
                          setEditNote(item.notes || '')
                          setEditQty(item.quantity != null ? String(item.quantity) : '')
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#9E7E60] hover:text-[#2C1810] hover:bg-[#F2E8D5] transition-all shrink-0"
                        title="Bewerken"
                      >
                        <EditIcon />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}

        {/* Add item */}
        {addingCategory === activeTab ? (
          <div className="px-5 py-3 bg-[#FAF6EF] border-t border-[#E8D5B5] flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="Naam item..."
              autoFocus
              className="flex-1 min-w-40 px-3 py-2 text-sm border border-[#E8D5B5] rounded-lg bg-white text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <input
              type="number"
              value={newItemQty}
              onChange={e => setNewItemQty(e.target.value)}
              placeholder="Qty"
              className="w-20 px-3 py-2 text-sm border border-[#E8D5B5] rounded-lg bg-white text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <select
              value={newItemSupplier}
              onChange={e => setNewItemSupplier(e.target.value)}
              className="px-3 py-2 text-sm border border-[#E8D5B5] rounded-lg bg-white text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option>SIR</option>
              <option>Levi</option>
              <option>klant</option>
            </select>
            <button
              onClick={addItem}
              disabled={saving || !newItemName.trim()}
              className="px-4 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {saving ? '...' : 'Toevoegen'}
            </button>
            <button
              onClick={() => setAddingCategory(null)}
              className="px-3 py-2 border border-[#E8D5B5] text-[#9E7E60] text-sm rounded-lg hover:bg-[#F2E8D5] transition-colors"
            >
              Annuleren
            </button>
          </div>
        ) : (
          <div className="px-5 py-3 border-t border-[#E8D5B5]">
            <button
              onClick={() => setAddingCategory(activeTab)}
              className="flex items-center gap-2 text-sm text-[#9E7E60] hover:text-amber-600 transition-colors"
            >
              <PlusIcon />
              Item toevoegen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
