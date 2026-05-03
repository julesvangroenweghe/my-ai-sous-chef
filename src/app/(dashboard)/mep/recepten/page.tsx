'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function getCategoryOrder(cat: string): number {
  const c = cat.toUpperCase()
  if (c.includes('DRANK') || c === 'DRANKEN') return 10
  if (c.includes('MOCK') || c.includes('COCKTAIL')) return 12
  if (c.includes('FINGERFOOD')) return 20
  if (c.includes('FINGERBITE')) return 25
  if (c.includes('HAPJE') || c === 'HAPJES' || c === 'APPETIZERS') return 40
  if (c.includes('AMUSE')) return 50
  if (c.includes('WALKING')) return 75
  if (c.includes('VOOR')) return 80
  if (c.includes('TUSSEN')) return 85
  if (c.includes('HOOFD')) return 90
  if (c.includes('SIDE') || c.includes('GARNI')) return 95
  if (c.includes('DESSERT')) return 100
  if (c.includes('KAAS')) return 110
  if (c.includes('MIGNARDISE')) return 200
  if (c.includes('HALFABRICAAT')) return 250
  return 150
}

interface DishSummary {
  title: string
  category: string
  legende_dish_id: string | null
  event_count: number
  event_ids: string[]
}

interface Component {
  id: string
  component_name: string
  quantity: number | null
  unit: string | null
  preparation: string | null
  component_group: string | null
  supplier: string | null
  is_ai_suggestion: boolean
  sort_order: number
}

interface EventOccurrence {
  event_id: string
  event_name: string
  event_date: string
}

interface DishDetails {
  components: Component[]
  aliases: string[]
  occurrences: EventOccurrence[]
}

export default function MEPReceptenPage() {
  const supabase = createClient()
  const [dishes, setDishes] = useState<DishSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [expandedDish, setExpandedDish] = useState<string | null>(null)
  const [dishDetails, setDishDetails] = useState<Record<string, DishDetails>>({})
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null)

  useEffect(() => {
    loadDishes()
  }, [])

  async function loadDishes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('mep_dishes')
      .select('title, category, legende_dish_id, event_id')

    if (error) {
      console.error('Error loading dishes:', error)
      setLoading(false)
      return
    }

    const map = new Map<string, {
      title: string
      category: string
      legende_dish_id: string | null
      eventIds: Set<string>
    }>()

    for (const row of data || []) {
      const key = `${row.title}||${row.category || 'Overig'}`
      if (!map.has(key)) {
        map.set(key, {
          title: row.title,
          category: row.category || 'Overig',
          legende_dish_id: row.legende_dish_id ?? null,
          eventIds: new Set(),
        })
      }
      if (row.event_id) map.get(key)!.eventIds.add(row.event_id)
    }

    const result: DishSummary[] = Array.from(map.values()).map(v => ({
      title: v.title,
      category: v.category,
      legende_dish_id: v.legende_dish_id,
      event_count: v.eventIds.size,
      event_ids: Array.from(v.eventIds),
    }))

    setDishes(result)
    setLoading(false)
  }

  async function loadDishDetails(dish: DishSummary) {
    const key = `${dish.title}||${dish.category}`
    if (dishDetails[key]) return
    setLoadingDetails(key)

    // Load components from most recent event for this dish title
    const { data: dishRows } = await supabase
      .from('mep_dishes')
      .select('id, event_id, events(id, name, event_date)')
      .eq('title', dish.title)
      .order('created_at', { ascending: false })

    const occurrences: EventOccurrence[] = []
    const seenEvents = new Set<string>()
    let mostRecentDishId: string | null = null

    for (const row of dishRows || []) {
      const ev = Array.isArray(row.events) ? row.events[0] : (row.events as any)
      if (ev && !seenEvents.has(ev.id)) {
        seenEvents.add(ev.id)
        occurrences.push({
          event_id: ev.id,
          event_name: ev.name || 'Event',
          event_date: ev.event_date || '',
        })
      }
      if (!mostRecentDishId) mostRecentDishId = row.id
    }

    // Sort occurrences by date desc
    occurrences.sort((a, b) => b.event_date.localeCompare(a.event_date))

    // Load components for most recent dish
    let components: Component[] = []
    if (mostRecentDishId) {
      const { data: compData } = await supabase
        .from('mep_components')
        .select('id, component_name, quantity, unit, preparation, component_group, supplier, is_ai_suggestion, sort_order')
        .eq('dish_id', mostRecentDishId)
        .order('sort_order', { ascending: true })
      components = compData || []
    }

    // Load aliases via legende_dish_id
    let aliases: string[] = []
    if (dish.legende_dish_id) {
      const { data: aliasData } = await supabase
        .from('mep_dish_aliases')
        .select('alias')
        .eq('legende_dish_id', dish.legende_dish_id)
      aliases = (aliasData || []).map(a => a.alias)
    }

    setDishDetails(prev => ({
      ...prev,
      [key]: { components, aliases, occurrences },
    }))
    setLoadingDetails(null)
  }

  function toggleDish(dish: DishSummary) {
    const key = `${dish.title}||${dish.category}`
    if (expandedDish === key) {
      setExpandedDish(null)
    } else {
      setExpandedDish(key)
      loadDishDetails(dish)
    }
  }

  const categories = Array.from(new Set(dishes.map(d => d.category))).sort(
    (a, b) => getCategoryOrder(a) - getCategoryOrder(b)
  )

  const filtered = dishes
    .filter(d => {
      const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase())
      const matchCat = categoryFilter === 'all' || d.category === categoryFilter
      return matchSearch && matchCat
    })
    .sort((a, b) => {
      const catDiff = getCategoryOrder(a.category) - getCategoryOrder(b.category)
      if (catDiff !== 0) return catDiff
      return a.title.localeCompare(b.title, 'nl')
    })

  const grouped = new Map<string, DishSummary[]>()
  for (const d of filtered) {
    if (!grouped.has(d.category)) grouped.set(d.category, [])
    grouped.get(d.category)!.push(d)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FDF8F2', padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <h1 style={{
            fontSize: 26,
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 700,
            color: '#2C1810',
            margin: 0,
          }}>
            📚 MEP Receptendatabank
          </h1>
        </div>
        <p style={{ fontSize: 14, color: '#7A5C3A', margin: 0 }}>
          Alle gerechten uit MEP-lijsten, gegroepeerd per categorie.
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 360 }}>
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="#9C8060" strokeWidth="2" strokeLinecap="round"
            style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Zoek op gerecht..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 34,
              paddingRight: 12,
              paddingTop: 9,
              paddingBottom: 9,
              border: '1px solid #DDD0B8',
              borderRadius: 8,
              backgroundColor: '#FFFCF7',
              fontSize: 14,
              color: '#2C1810',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{
            padding: '9px 14px',
            border: '1px solid #DDD0B8',
            borderRadius: 8,
            backgroundColor: '#FFFCF7',
            fontSize: 14,
            color: '#2C1810',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="all">Alle categorieën</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '9px 14px',
          border: '1px solid #DDD0B8',
          borderRadius: 8,
          backgroundColor: '#FEF3E2',
          fontSize: 13,
          color: '#B5631A',
          fontWeight: 500,
        }}>
          {filtered.length} gerechten
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{
              height: 64,
              borderRadius: 10,
              backgroundColor: '#F2E8D5',
              animation: 'pulse 1.5s infinite',
            }} />
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9C8060' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🍽️</div>
          <p style={{ fontSize: 16, fontFamily: 'Georgia, serif' }}>
            {search || categoryFilter !== 'all'
              ? 'Geen gerechten gevonden voor deze filter.'
              : 'Nog geen gerechten in de MEP-databank.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {Array.from(grouped.entries()).map(([category, categoryDishes]) => (
            <div key={category}>
              {/* Category header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 10,
                paddingBottom: 8,
                borderBottom: '1px solid #E5D8C0',
              }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#E8A040',
                  fontFamily: 'Georgia, serif',
                }}>
                  {category}
                </span>
                <span style={{
                  fontSize: 11,
                  color: '#9C8060',
                  backgroundColor: '#F2E8D5',
                  borderRadius: 10,
                  padding: '1px 8px',
                }}>
                  {categoryDishes.length}
                </span>
              </div>

              {/* Dish cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {categoryDishes.map(dish => {
                  const key = `${dish.title}||${dish.category}`
                  const isExpanded = expandedDish === key
                  const details = dishDetails[key]
                  const isLoadingThis = loadingDetails === key

                  return (
                    <div
                      key={key}
                      style={{
                        border: `1px solid ${isExpanded ? '#E8A040' : '#E5D8C0'}`,
                        borderRadius: 10,
                        backgroundColor: isExpanded ? '#FFFCF7' : '#FDFAF5',
                        overflow: 'hidden',
                        transition: 'border-color 0.15s',
                      }}
                    >
                      {/* Dish row */}
                      <button
                        onClick={() => toggleDish(dish)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '12px 16px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <svg
                          width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="#9C8060" strokeWidth="2"
                          style={{
                            flexShrink: 0,
                            transform: isExpanded ? 'rotate(90deg)' : 'none',
                            transition: 'transform 0.15s',
                          }}
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>

                        <span style={{
                          flex: 1,
                          fontSize: 14,
                          fontWeight: 500,
                          color: '#2C1810',
                          fontFamily: 'Georgia, serif',
                        }}>
                          {dish.title}
                        </span>

                        <span style={{
                          fontSize: 11,
                          color: '#7A5C3A',
                          backgroundColor: '#F2E8D5',
                          borderRadius: 10,
                          padding: '2px 8px',
                          whiteSpace: 'nowrap',
                        }}>
                          {dish.event_count} {dish.event_count === 1 ? 'event' : 'events'}
                        </span>

                        <span style={{
                          fontSize: 11,
                          color: '#E8A040',
                          backgroundColor: '#FEF3E2',
                          borderRadius: 10,
                          padding: '2px 8px',
                          whiteSpace: 'nowrap',
                        }}>
                          {category}
                        </span>
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div style={{
                          padding: '0 16px 16px',
                          borderTop: '1px solid #EDE3D0',
                        }}>
                          {isLoadingThis ? (
                            <div style={{ padding: '16px 0', color: '#9C8060', fontSize: 13 }}>
                              Gegevens laden...
                            </div>
                          ) : details ? (
                            <div>
                              {/* Aliases */}
                              {details.aliases.length > 0 && (
                                <div style={{ marginTop: 12, marginBottom: 12 }}>
                                  <span style={{ fontSize: 11, color: '#9C8060', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                    Aliassen:
                                  </span>
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
                                    {details.aliases.map((alias, i) => (
                                      <span key={i} style={{
                                        fontSize: 12,
                                        color: '#5C4730',
                                        backgroundColor: '#F2E8D5',
                                        borderRadius: 6,
                                        padding: '2px 8px',
                                        border: '1px solid #DDD0B8',
                                      }}>
                                        {alias}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Components */}
                              <div style={{ marginTop: 14 }}>
                                <div style={{ fontSize: 11, color: '#9C8060', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                                  Componenten (meest recente event)
                                </div>
                                {details.components.length === 0 ? (
                                  <p style={{ fontSize: 13, color: '#9C8060', fontStyle: 'italic' }}>
                                    Geen componenten gevonden.
                                  </p>
                                ) : (
                                  <div style={{
                                    border: '1px solid #E5D8C0',
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                  }}>
                                    {details.components.map((comp, idx) => (
                                      <div
                                        key={comp.id}
                                        style={{
                                          display: 'grid',
                                          gridTemplateColumns: '2fr 80px 60px 2fr',
                                          gap: 8,
                                          padding: '8px 12px',
                                          backgroundColor: idx % 2 === 0 ? '#FFFCF7' : '#FAF5EE',
                                          borderBottom: idx < details.components.length - 1 ? '1px solid #EDE3D0' : 'none',
                                          alignItems: 'start',
                                        }}
                                      >
                                        <span style={{
                                          fontSize: 13,
                                          color: comp.is_ai_suggestion ? '#f97316' : '#2C1810',
                                          fontWeight: comp.is_ai_suggestion ? 500 : 400,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 5,
                                        }}>
                                          {comp.is_ai_suggestion && (
                                            <span title="AI suggestie" style={{ fontSize: 10, color: '#f97316' }}>✦</span>
                                          )}
                                          {comp.component_name}
                                        </span>
                                        <span style={{ fontSize: 13, color: '#5C4730' }}>
                                          {comp.quantity !== null ? comp.quantity : '—'}
                                        </span>
                                        <span style={{ fontSize: 12, color: '#7A5C3A' }}>
                                          {comp.unit || ''}
                                        </span>
                                        <span style={{ fontSize: 12, color: '#7A5C3A', fontStyle: 'italic' }}>
                                          {comp.preparation || ''}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Event occurrences */}
                              {details.occurrences.length > 0 && (
                                <div style={{ marginTop: 14 }}>
                                  <div style={{ fontSize: 11, color: '#9C8060', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                                    Gebruikt in events
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {details.occurrences.map(occ => (
                                      <Link
                                        key={occ.event_id}
                                        href={`/mep/${occ.event_id}`}
                                        style={{
                                          fontSize: 12,
                                          color: '#B5631A',
                                          backgroundColor: '#FEF3E2',
                                          borderRadius: 6,
                                          padding: '3px 10px',
                                          border: '1px solid #F0C070',
                                          textDecoration: 'none',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 5,
                                        }}
                                      >
                                        {occ.event_date && (
                                          <span style={{ color: '#9C8060' }}>
                                            {new Date(occ.event_date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })}
                                          </span>
                                        )}
                                        <span>{occ.event_name}</span>
                                        <span style={{ fontSize: 10 }}>→</span>
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
