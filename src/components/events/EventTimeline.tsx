'use client'

import { useState } from 'react'
import { Plus, X, Clock, ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from 'lucide-react'

interface TimelineBlock {
  id: string
  time: string
  type: 'reception' | 'appetizers' | 'walking_dinner' | 'seated' | 'dessert' | 'speech' | 'break' | 'custom' | 'fingerfood'
  label: string
  duration_minutes: number
  notes?: string
}

interface CapacityAdvice {
  maxItems: number | null
  itemLabel: string
  warningMessage?: string
  colorClass: string
}

function calculateCapacity(block: TimelineBlock, numPersons: number): CapacityAdvice {
  const { type, duration_minutes } = block
  if (type === 'speech' || type === 'break') {
    return { maxItems: 0, itemLabel: '', warningMessage: 'Servicepauze — geen service', colorClass: 'red' }
  }
  if (type === 'reception' || type === 'fingerfood' || type === ('cocktail' as string)) {
    const hours = duration_minutes / 60
    let items = 0
    if (hours >= 1) items += 5
    if (hours >= 2) items += 4
    if (hours >= 3) items += 3
    return { maxItems: items, itemLabel: 'stuks pp', colorClass: items > 0 ? 'amber' : 'gray' }
  }
  if (type === 'appetizers') {
    return { maxItems: Math.floor(duration_minutes / 15) * 2, itemLabel: 'appetizers', colorClass: 'amber' }
  }
  if (type === 'walking_dinner') {
    const maxDishes = Math.min(4, Math.floor(duration_minutes / 30))
    return {
      maxItems: maxDishes,
      itemLabel: 'gerechten',
      warningMessage: maxDishes >= 4 ? 'max 4 (professioneel advies)' : undefined,
      colorClass: maxDishes <= 2 ? 'red' : maxDishes <= 3 ? 'amber' : 'green'
    }
  }
  if (type === 'seated') {
    const minPerCourse = numPersons > 50 ? 60 : 45
    const maxCourses = Math.floor(duration_minutes / minPerCourse)
    return {
      maxItems: maxCourses,
      itemLabel: `gangen (${minPerCourse} min/gang)`,
      colorClass: maxCourses >= 3 ? 'green' : maxCourses >= 2 ? 'amber' : 'red'
    }
  }
  if (type === 'dessert') {
    return { maxItems: 1, itemLabel: 'dessertgang', colorClass: 'green' }
  }
  return { maxItems: null, itemLabel: '', colorClass: 'gray' }
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  reception: { label: 'Receptie', color: '#E8A040', bg: '#FEF3E2', border: '#E8A040' },
  fingerfood: { label: 'Fingerfood', color: '#C4703A', bg: '#FDF2EB', border: '#C4703A' },
  appetizers: { label: 'Appetizers', color: '#9E7E60', bg: '#F5EDE0', border: '#9E7E60' },
  walking_dinner: { label: 'Walking Dinner', color: '#3A5C3A', bg: '#EBF4E8', border: '#3A5C3A' },
  seated: { label: 'Zittend diner', color: '#2C1810', bg: '#F5EDE0', border: '#C4703A' },
  dessert: { label: 'Dessert', color: '#9E7E60', bg: '#F9F6F2', border: '#E8D5B5' },
  speech: { label: 'Speech / Toast', color: '#DC2626', bg: '#FEF2F2', border: '#DC2626' },
  break: { label: 'Pauze', color: '#9E7E60', bg: '#F5F5F5', border: '#D1D5DB' },
  custom: { label: 'Eigen blok', color: '#6B7280', bg: '#F9FAFB', border: '#D1D5DB' },
}

const TYPE_OPTIONS = [
  { value: 'reception', label: 'Receptie / Ontvangst' },
  { value: 'fingerfood', label: 'Fingerfood / Hapjes' },
  { value: 'appetizers', label: 'Appetizers' },
  { value: 'walking_dinner', label: 'Walking Dinner' },
  { value: 'seated', label: 'Zittend diner' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'speech', label: 'Speech / Toast' },
  { value: 'break', label: 'Pauze / Overgang' },
  { value: 'custom', label: 'Eigen blok' },
]

function CapacityBadge({ advice }: { advice: CapacityAdvice }) {
  if (advice.maxItems === null) return null
  if (advice.maxItems === 0) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontWeight: 600 }}>
        <AlertTriangle style={{ width: 10, height: 10 }} />
        {advice.warningMessage}
      </span>
    )
  }
  const colorMap = {
    red: { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626' },
    amber: { bg: '#FEF3E2', border: '#FCD34D', color: '#C4703A' },
    green: { bg: '#F0FDF4', border: '#86EFAC', color: '#3A5C3A' },
    gray: { bg: '#F9FAFB', border: '#E5E7EB', color: '#6B7280' },
  }
  const c = colorMap[advice.colorClass as keyof typeof colorMap] || colorMap.gray
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 20, background: c.bg, border: `1px solid ${c.border}`, color: c.color, fontWeight: 600 }}>
      <CheckCircle style={{ width: 10, height: 10 }} />
      max {advice.maxItems} {advice.itemLabel}
      {advice.warningMessage && <span style={{ fontWeight: 400, opacity: 0.8 }}>&nbsp;·&nbsp;{advice.warningMessage}</span>}
    </span>
  )
}

interface EventTimelineProps {
  blocks: TimelineBlock[]
  numPersons?: number
  mode?: 'full' | 'compact'
  onChange?: (blocks: TimelineBlock[]) => void
}

export function EventTimeline({ blocks, numPersons = 20, mode = 'full', onChange }: EventTimelineProps) {
  const [addingBlock, setAddingBlock] = useState(false)
  const [newBlock, setNewBlock] = useState<Partial<TimelineBlock>>({ type: 'reception', duration_minutes: 60, time: '' })
  const [collapsed, setCollapsed] = useState(false)

  const handleAdd = () => {
    if (!newBlock.label?.trim() || !newBlock.type) return
    const block: TimelineBlock = {
      id: `tl-${Date.now()}`,
      time: newBlock.time || '',
      type: newBlock.type as TimelineBlock['type'],
      label: newBlock.label.trim(),
      duration_minutes: newBlock.duration_minutes || 60,
      notes: newBlock.notes,
    }
    onChange?.([...blocks, block])
    setNewBlock({ type: 'reception', duration_minutes: 60, time: '' })
    setAddingBlock(false)
  }

  const handleRemove = (id: string) => {
    onChange?.(blocks.filter(b => b.id !== id))
  }

  if (mode === 'compact') {
    if (blocks.length === 0) return null
    return (
      <div style={{ background: 'white', border: '1px solid #E8D5B5', borderRadius: 12, padding: '10px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Clock style={{ width: 14, height: 14, color: '#E8A040', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9E7E60', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verloop van de avond</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {blocks.map((block, i) => {
            const cfg = TYPE_CONFIG[block.type] || TYPE_CONFIG.custom
            const advice = calculateCapacity(block, numPersons)
            return (
              <div key={block.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ padding: '3px 10px', borderRadius: 20, background: cfg.bg, border: `1px solid ${cfg.border}`, fontSize: 11 }}>
                  {block.time && <span style={{ fontFamily: 'monospace', color: cfg.color, fontWeight: 600 }}>{block.time} </span>}
                  <span style={{ color: '#2C1810', fontWeight: 500 }}>{block.label}</span>
                  {advice.maxItems !== null && advice.maxItems > 0 && (
                    <span style={{ color: cfg.color, marginLeft: 4 }}>· max {advice.maxItems} {advice.itemLabel}</span>
                  )}
                  {block.type === 'speech' && (
                    <span style={{ color: '#DC2626', marginLeft: 4, fontWeight: 600 }}>! pauze</span>
                  )}
                </div>
                {i < blocks.length - 1 && <span style={{ color: '#D4B896', fontSize: 10 }}>→</span>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // FULL mode
  return (
    <div style={{ background: 'white', border: '1px solid #E8D5B5', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#FAF6EF', border: 'none', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock style={{ width: 14, height: 14, color: '#E8A040' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#2C1810', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verloop van de avond</span>
          {blocks.length > 0 && (
            <span style={{ fontSize: 11, color: '#9E7E60' }}>{blocks.length} blok{blocks.length !== 1 ? 'ken' : ''}</span>
          )}
        </div>
        {collapsed
          ? <ChevronDown style={{ width: 14, height: 14, color: '#9E7E60' }} />
          : <ChevronUp style={{ width: 14, height: 14, color: '#9E7E60' }} />}
      </button>

      {!collapsed && (
        <div style={{ padding: '12px 16px' }}>
          {blocks.length === 0 && !addingBlock && (
            <div style={{ textAlign: 'center', padding: '16px 0', color: '#B8997A', fontSize: 13 }}>
              Nog geen tijdlijn — voeg blokken toe om capaciteitsadvies te zien
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {blocks.map((block) => {
              const cfg = TYPE_CONFIG[block.type] || TYPE_CONFIG.custom
              const advice = calculateCapacity(block, numPersons)
              return (
                <div key={block.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10 }}>
                  {block.time && (
                    <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: cfg.color, minWidth: 44, flexShrink: 0, marginTop: 1 }}>
                      {block.time}
                    </span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#2C1810' }}>{block.label}</span>
                      <span style={{ fontSize: 11, color: cfg.color, background: 'white', border: `1px solid ${cfg.border}`, padding: '1px 8px', borderRadius: 20 }}>
                        {block.duration_minutes} min
                      </span>
                      <CapacityBadge advice={advice} />
                    </div>
                    {block.notes && (
                      <p style={{ fontSize: 11, color: '#9E7E60', margin: '3px 0 0', fontStyle: 'italic' }}>{block.notes}</p>
                    )}
                  </div>
                  {onChange && (
                    <button
                      onClick={() => handleRemove(block.id)}
                      style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: '#D4B896', flexShrink: 0 }}
                    >
                      <X style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {addingBlock ? (
            <div style={{ marginTop: 10, padding: '12px', background: '#F9F6F2', border: '1px dashed #E8D5B5', borderRadius: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    value={newBlock.type}
                    onChange={e => setNewBlock(p => ({ ...p, type: e.target.value as TimelineBlock['type'] }))}
                    style={{ flex: 1, padding: '7px 10px', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 12, color: '#2C1810', background: 'white', outline: 'none' }}
                  >
                    {TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <input
                    value={newBlock.time || ''}
                    onChange={e => setNewBlock(p => ({ ...p, time: e.target.value }))}
                    placeholder="18:00"
                    style={{ width: 70, padding: '7px 10px', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 12, color: '#2C1810', background: 'white', outline: 'none' }}
                  />
                  <input
                    type="number"
                    value={newBlock.duration_minutes || ''}
                    onChange={e => setNewBlock(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 60 }))}
                    placeholder="60 min"
                    style={{ width: 80, padding: '7px 10px', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 12, color: '#2C1810', background: 'white', outline: 'none' }}
                  />
                </div>
                <input
                  value={newBlock.label || ''}
                  onChange={e => setNewBlock(p => ({ ...p, label: e.target.value }))}
                  placeholder="Label (bv. Ontvangst met drankje)"
                  style={{ padding: '7px 10px', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 13, color: '#2C1810', background: 'white', outline: 'none' }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setAddingBlock(false)} style={{ padding: '5px 12px', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 12, color: '#9E7E60', background: 'white', cursor: 'pointer' }}>
                    Annuleren
                  </button>
                  <button onClick={handleAdd} disabled={!newBlock.label?.trim()} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#2C1810', background: '#E8A040', border: 'none', cursor: 'pointer' }}>
                    Toevoegen
                  </button>
                </div>
              </div>
            </div>
          ) : onChange && (
            <button
              onClick={() => setAddingBlock(true)}
              style={{ marginTop: 10, width: '100%', padding: '8px', border: '1px dashed #E8D5B5', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 12, color: '#9E7E60', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              Tijdlijnblok toevoegen
            </button>
          )}
        </div>
      )}
    </div>
  )
}
