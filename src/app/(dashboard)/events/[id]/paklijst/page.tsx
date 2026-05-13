'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Event {
  id: string
  name: string
  event_date: string
  event_type: string
  num_persons: number | null
  location: string | null
  status: string
}

interface PacklistItem {
  id: string
  event_id: string
  kitchen_id: string
  category: string
  subcategory: string | null
  item_name: string
  quantity: number | null
  unit: string | null
  supplier: string | null
  notes: string | null
  checked: boolean
  sort_order: number
}

const CATEGORIES = [
  { key: 'keuken', label: 'Keuken & Materiaal', color: '#E8A040', bg: '#FEF3E2', border: '#F6D860' },
  { key: 'logistiek', label: 'Logistiek & Transport', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  { key: 'personeel', label: 'Personeel & Diensten', color: '#8B5CF6', bg: '#F5F3FF', border: '#C4B5FD' },
  { key: 'drank', label: 'Dranken', color: '#10B981', bg: '#ECFDF5', border: '#6EE7B7' },
  { key: 'diversen', label: 'Diversen', color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
]

const DEFAULT_ITEMS: Omit<PacklistItem, 'id' | 'event_id' | 'kitchen_id'>[] = [
  // Keuken
  { category: 'keuken', subcategory: 'Bereidingsmateriaal', item_name: 'Gastronormbakken GN 1/1', quantity: 6, unit: 'stuks', supplier: null, notes: null, checked: false, sort_order: 1 },
  { category: 'keuken', subcategory: 'Bereidingsmateriaal', item_name: 'Gastronormbakken GN 1/2', quantity: 8, unit: 'stuks', supplier: null, notes: null, checked: false, sort_order: 2 },
  { category: 'keuken', subcategory: 'Bereidingsmateriaal', item_name: 'Sauteerpannen groot', quantity: 4, unit: 'stuks', supplier: null, notes: null, checked: false, sort_order: 3 },
  { category: 'keuken', subcategory: 'Bereidingsmateriaal', item_name: 'Snijplanken (kleurcode)', quantity: 6, unit: 'stuks', supplier: null, notes: null, checked: false, sort_order: 4 },
  { category: 'keuken', subcategory: 'Bereidingsmateriaal', item_name: 'Messenset (koksmes, fileermes, schilmes)', quantity: 1, unit: 'set', supplier: null, notes: null, checked: false, sort_order: 5 },
  { category: 'keuken', subcategory: 'Bereidingsmateriaal', item_name: 'Thermometers', quantity: 3, unit: 'stuks', supplier: null, notes: null, checked: false, sort_order: 6 },
  { category: 'keuken', subcategory: 'Service', item_name: 'Serveerplanken / -borden (groot)', quantity: 10, unit: 'stuks', supplier: null, notes: null, checked: false, sort_order: 7 },
  { category: 'keuken', subcategory: 'Service', item_name: 'Amuse-lepels / -glazen', quantity: null, unit: 'stuks', supplier: null, notes: 'Aantal = gasten + 10%', checked: false, sort_order: 8 },
  { category: 'keuken', subcategory: 'Warmhouden', item_name: 'Chafing dishes', quantity: 4, unit: 'stuks', supplier: null, notes: null, checked: false, sort_order: 9 },
  { category: 'keuken', subcategory: 'Warmhouden', item_name: 'Brandstofreservoirs (chafing)', quantity: 8, unit: 'stuks', supplier: null, notes: null, checked: false, sort_order: 10 },
  // Logistiek
  { category: 'logistiek', subcategory: 'Transport', item_name: 'Koelbox groot', quantity: 2, unit: 'stuks', supplier: null, notes: null, checked: false, sort_order: 20 },
  { category: 'logistiek', subcategory: 'Transport', item_name: 'Koelelementen (bevroren)', quantity: 10, unit: 'stuks', supplier: null, notes: null, checked: false, sort_order: 21 },
  { category: 'logistiek', subcategory: 'Transport', item_name: 'Vrachtwagen / bestelwagen geboekt', quantity: 1, unit: 'stuks', supplier: null, notes: null, checked: false, sort_order: 22 },
  { category: 'logistiek', subcategory: 'Locatie', item_name: 'Stroomvoorziening bevestigd', quantity: null, unit: null, supplier: null, notes: 'Spanning + ampères checken', checked: false, sort_order: 23 },
  { category: 'logistiek', subcategory: 'Locatie', item_name: 'Verlengkabels (16A)', quantity: 3, unit: 'stuks', supplier: null, notes: null, checked: false, sort_order: 24 },
  { category: 'logistiek', subcategory: 'Locatie', item_name: 'Tafelopstelling bevestigd', quantity: null, unit: null, supplier: null, notes: null, checked: false, sort_order: 25 },
  // Personeel
  { category: 'personeel', subcategory: 'Team', item_name: 'Koks bevestigd', quantity: null, unit: 'personen', supplier: null, notes: '1 kok / 40 personen (standaard)', checked: false, sort_order: 30 },
  { category: 'personeel', subcategory: 'Team', item_name: 'Bediening bevestigd', quantity: null, unit: 'personen', supplier: null, notes: null, checked: false, sort_order: 31 },
  { category: 'personeel', subcategory: 'Uniform', item_name: 'Koksuniform + schorten mee', quantity: null, unit: 'sets', supplier: null, notes: null, checked: false, sort_order: 32 },
  // Diversen
  { category: 'diversen', subcategory: 'Admin', item_name: 'Menukaarten afgedrukt', quantity: null, unit: 'stuks', supplier: null, notes: null, checked: false, sort_order: 40 },
  { category: 'diversen', subcategory: 'Admin', item_name: 'Allergenenlijst mee', quantity: 1, unit: 'stuks', supplier: null, notes: null, checked: false, sort_order: 41 },
  { category: 'diversen', subcategory: 'Hygiëne', item_name: 'Vuilzakken groot', quantity: 10, unit: 'stuks', supplier: null, notes: null, checked: false, sort_order: 42 },
  { category: 'diversen', subcategory: 'Hygiëne', item_name: 'Handzeep + desinfectie', quantity: 2, unit: 'stuks', supplier: null, notes: null, checked: false, sort_order: 43 },
  { category: 'diversen', subcategory: 'Hygiëne', item_name: 'Handschoenen (M + L)', quantity: 2, unit: 'dozen', supplier: null, notes: null, checked: false, sort_order: 44 },
]

export default function PaklijstDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const supabase = createClient()

  const [event, setEvent] = useState<Event | null>(null)
  const [items, setItems] = useState<PacklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeCategory, setActiveCategory] = useState('keuken')
  const [editingItem, setEditingItem] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [eventId])

  async function load() {
    const { data: ev } = await supabase
      .from('events')
      .select('id, name, event_date, event_type, num_persons, location, status')
      .eq('id', eventId)
      .single()

    if (!ev) { router.push('/paklijsten'); return }
    setEvent(ev as Event)

    const { data: kitchenData } = await supabase.rpc('get_my_kitchen_ids')
    const kitchenId = kitchenData?.[0]

    const { data: existingItems } = await supabase
      .from('event_packlist_items')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: true })

    if (existingItems && existingItems.length > 0) {
      setItems(existingItems as PacklistItem[])
    } else if (kitchenId) {
      // Genereer standaard paklijst op basis van SIR templates
      await generateDefaultPacklist(kitchenId)
    }
    setLoading(false)
  }

  async function generateDefaultPacklist(kitchenId: string) {
    setGenerating(true)
    const toInsert = DEFAULT_ITEMS.map(item => ({
      ...item,
      event_id: eventId,
      kitchen_id: kitchenId,
    }))

    const { data, error } = await supabase
      .from('event_packlist_items')
      .insert(toInsert)
      .select()

    if (!error && data) {
      setItems(data as PacklistItem[])
    }
    setGenerating(false)
  }

  async function toggleCheck(item: PacklistItem) {
    const newChecked = !item.checked
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: newChecked } : i))
    await supabase
      .from('event_packlist_items')
      .update({ checked: newChecked, updated_at: new Date().toISOString() })
      .eq('id', item.id)
  }

  async function addItem(category: string) {
    const { data: kitchenData } = await supabase.rpc('get_my_kitchen_ids')
    const kitchenId = kitchenData?.[0]
    if (!kitchenId) return

    const maxOrder = Math.max(...items.filter(i => i.category === category).map(i => i.sort_order), 0)
    const { data, error } = await supabase
      .from('event_packlist_items')
      .insert({
        event_id: eventId,
        kitchen_id: kitchenId,
        category,
        subcategory: null,
        item_name: 'Nieuw item',
        quantity: null,
        unit: null,
        supplier: null,
        notes: null,
        checked: false,
        sort_order: maxOrder + 1,
      })
      .select()
      .single()

    if (!error && data) {
      setItems(prev => [...prev, data as PacklistItem])
      setEditingItem(data.id)
    }
  }

  async function updateItem(id: string, field: keyof PacklistItem, value: string | number | boolean | null) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
    await supabase
      .from('event_packlist_items')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', id)
  }

  async function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('event_packlist_items').delete().eq('id', id)
  }

  const progress = {
    total: items.length,
    checked: items.filter(i => i.checked).length,
  }
  const pct = progress.total > 0 ? Math.round((progress.checked / progress.total) * 100) : 0

  const catItems = items.filter(i => i.category === activeCategory)
  const subcats = [...new Set(catItems.map(i => i.subcategory || 'Overige'))]

  if (loading || generating) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#9E7E60' }}>
        {generating ? 'Paklijst genereren op basis van SIR templates...' : 'Laden...'}
      </div>
    )
  }

  if (!event) return null

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <Link href="/paklijsten" style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: 8, border: '1px solid #E8D5B5',
          background: 'white', color: '#9E7E60', textDecoration: 'none', marginTop: 4,
        }}>
          <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 700, color: '#2C1810', margin: '0 0 4px 0' }}>
            Paklijst — {event.name}
          </h1>
          <p style={{ color: '#9E7E60', fontSize: 13, margin: 0 }}>
            {new Date(event.event_date).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {event.location && ` · ${event.location}`}
            {event.num_persons && ` · ${event.num_persons} personen`}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 18px', background: '#E8A040', color: '#2C1810',
            border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}
        >
          <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Afdrukken
        </button>
      </div>

      {/* Progress */}
      <div style={{ background: 'white', border: '1px solid #E8D5B5', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2C1810' }}>Voortgang</span>
              <span style={{ fontSize: 13, color: '#9E7E60', fontFamily: 'monospace' }}>
                {progress.checked}/{progress.total} items
              </span>
            </div>
            <div style={{ height: 8, background: '#E8D5B5', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: pct === 100 ? '#10B981' : '#E8A040',
                width: `${pct}%`,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: pct === 100 ? '#D1FAE5' : '#FEF3E2',
            border: `2px solid ${pct === 100 ? '#6EE7B7' : '#F6D860'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700,
            color: pct === 100 ? '#065F46' : '#92400E',
          }}>
            {pct}%
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {CATEGORIES.map(cat => {
          const catCount = items.filter(i => i.category === cat.key)
          const catChecked = catCount.filter(i => i.checked).length
          const isActive = activeCategory === cat.key
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${isActive ? cat.color : '#E8D5B5'}`,
                background: isActive ? cat.bg : 'white',
                color: isActive ? cat.color : '#9E7E60',
                fontWeight: isActive ? 700 : 500, fontSize: 13,
                cursor: 'pointer', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.15s',
              }}
            >
              {cat.label}
              {catCount.length > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                  color: catChecked === catCount.length ? '#065F46' : cat.color,
                }}>
                  {catChecked}/{catCount.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Items per subcategorie */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {subcats.map(subcat => {
          const subItems = catItems.filter(i => (i.subcategory || 'Overige') === subcat)
          const catConfig = CATEGORIES.find(c => c.key === activeCategory)!
          return (
            <div key={subcat} style={{ background: 'white', border: '1px solid #E8D5B5', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{
                padding: '10px 16px', background: '#F5EDE0',
                borderBottom: '1px solid #E8D5B5',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9E7E60' }}>
                  {subcat}
                </span>
                <span style={{ fontSize: 11, color: '#B8997A' }}>
                  {subItems.filter(i => i.checked).length}/{subItems.length}
                </span>
              </div>
              <div>
                {subItems.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 16px',
                      borderBottom: idx < subItems.length - 1 ? '1px solid #F2E8D5' : 'none',
                      background: item.checked ? '#F9FAF9' : 'white',
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleCheck(item)}
                      style={{
                        width: 22, height: 22, borderRadius: 6,
                        border: `2px solid ${item.checked ? catConfig.color : '#D1C4B0'}`,
                        background: item.checked ? catConfig.bg : 'white',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.15s',
                      }}
                    >
                      {item.checked && (
                        <svg width={12} height={12} fill="none" stroke={catConfig.color} strokeWidth="2.5" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>

                    {/* Naam — inline bewerkbaar */}
                    {editingItem === item.id ? (
                      <input
                        autoFocus
                        value={item.item_name}
                        onChange={e => updateItem(item.id, 'item_name', e.target.value)}
                        onBlur={() => setEditingItem(null)}
                        onKeyDown={e => e.key === 'Enter' && setEditingItem(null)}
                        style={{
                          flex: 1, padding: '4px 8px', border: `1px solid ${catConfig.color}`,
                          borderRadius: 6, fontSize: 13, color: '#2C1810', outline: 'none',
                          background: '#FAF6EF',
                        }}
                      />
                    ) : (
                      <span
                        onClick={() => setEditingItem(item.id)}
                        style={{
                          flex: 1, fontSize: 14, cursor: 'text',
                          color: item.checked ? '#9E7E60' : '#2C1810',
                          textDecoration: item.checked ? 'line-through' : 'none',
                          transition: 'all 0.15s',
                        }}
                      >
                        {item.item_name}
                      </span>
                    )}

                    {/* Hoeveelheid */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number"
                        value={item.quantity ?? ''}
                        onChange={e => updateItem(item.id, 'quantity', e.target.value ? Number(e.target.value) : null)}
                        placeholder="Aantal"
                        style={{
                          width: 60, padding: '4px 6px', border: '1px solid #E8D5B5',
                          borderRadius: 6, fontSize: 12, textAlign: 'right', color: '#2C1810', outline: 'none',
                          background: '#FAF6EF',
                        }}
                      />
                      <input
                        value={item.unit ?? ''}
                        onChange={e => updateItem(item.id, 'unit', e.target.value || null)}
                        placeholder="eenheid"
                        style={{
                          width: 64, padding: '4px 6px', border: '1px solid #E8D5B5',
                          borderRadius: 6, fontSize: 12, color: '#9E7E60', outline: 'none',
                          background: '#FAF6EF',
                        }}
                      />
                    </div>

                    {/* Notitie */}
                    {item.notes && (
                      <span style={{ fontSize: 11, color: '#B45309', background: '#FEF3E2', padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                        {item.notes}
                      </span>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => deleteItem(item.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1C4B0', padding: 4, borderRadius: 4, flexShrink: 0 }}
                    >
                      <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Item toevoegen */}
        <button
          onClick={() => addItem(activeCategory)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px 18px', background: 'white', border: '2px dashed #E8D5B5',
            borderRadius: 12, color: '#9E7E60', fontWeight: 600, fontSize: 13,
            cursor: 'pointer', width: '100%', transition: 'all 0.15s',
          }}
        >
          <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Item toevoegen aan {CATEGORIES.find(c => c.key === activeCategory)?.label.toLowerCase()}
        </button>
      </div>
    </div>
  )
}
