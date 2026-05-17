'use client'

import { useState } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { Plus, Clock } from 'lucide-react'

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

interface EventTimelineProps {
  blocks: TimelineBlock[]
  numPersons?: number
  mode?: 'full' | 'compact'
  onChange?: (blocks: TimelineBlock[]) => void
}

function calculateCapacity(block: TimelineBlock, numPersons: number): CapacityAdvice {
  const { type, duration_minutes } = block
  if (type === 'speech' || type === 'break') {
    return { maxItems: 0, itemLabel: '', warningMessage: 'Servicepauze — geen service', colorClass: 'red' }
  }
  if (type === 'reception' || type === 'fingerfood') {
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

const TYPE_CONFIG: Record<string, { label: string; accentColor: string; bg: string; border: string; textColor: string }> = {
  reception:      { label: 'Receptie',        accentColor: '#E8A040', bg: '#FEF3E2', border: '#FCD34D', textColor: '#92400E' },
  fingerfood:     { label: 'Fingerfood',       accentColor: '#C4703A', bg: '#FDF2EB', border: '#C4703A', textColor: '#9A3412' },
  appetizers:     { label: 'Appetizers',       accentColor: '#9E7E60', bg: '#F5EDE0', border: '#C4A882', textColor: '#78350F' },
  walking_dinner: { label: 'Walking Dinner',   accentColor: '#3A5C3A', bg: '#EBF4E8', border: '#86EFAC', textColor: '#14532D' },
  seated:         { label: 'Zittend diner',    accentColor: '#C4703A', bg: '#FAF2EA', border: '#C4703A', textColor: '#7C2D12' },
  dessert:        { label: 'Dessert',          accentColor: '#9E7E60', bg: '#F9F6F2', border: '#D4B896', textColor: '#78350F' },
  speech:         { label: 'Speech / Toast',   accentColor: '#DC2626', bg: '#FEF2F2', border: '#FECACA', textColor: '#991B1B' },
  break:          { label: 'Pauze',            accentColor: '#94A3B8', bg: '#F8FAFC', border: '#CBD5E1', textColor: '#475569' },
  custom:         { label: 'Eigen blok',       accentColor: '#6B7280', bg: '#F9FAFB', border: '#D1D5DB', textColor: '#374151' },
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

function blockHeight(duration_minutes: number): number {
  return Math.max(52, Math.round(duration_minutes * 0.9))
}

interface DraggableBlockProps {
  block: TimelineBlock
  numPersons: number
  onUpdate: (id: string, updates: Partial<TimelineBlock>) => void
  onRemove: (id: string) => void
}

function DraggableBlock({ block, numPersons, onUpdate, onRemove }: DraggableBlockProps) {
  const controls = useDragControls()
  const [editingTime, setEditingTime] = useState(false)
  const [editingDuration, setEditingDuration] = useState(false)
  const [editingLabel, setEditingLabel] = useState(false)
  const cfg = TYPE_CONFIG[block.type] || TYPE_CONFIG.custom
  const advice = calculateCapacity(block, numPersons)
  const height = blockHeight(block.duration_minutes)

  return (
    <Reorder.Item value={block} dragListener={false} dragControls={controls} style={{ listStyle: 'none' }}>
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        minHeight: height,
        marginBottom: 4,
        borderRadius: 10,
        overflow: 'hidden',
        border: `1px solid ${cfg.border}`,
        background: cfg.bg,
        position: 'relative',
      }}>
        {/* Linker gekleurde accentbalk — 4px breed */}
        <div style={{
          width: 4,
          flexShrink: 0,
          background: cfg.accentColor,
          backgroundImage: (block.type === 'speech' || block.type === 'break')
            ? `repeating-linear-gradient(to bottom, ${cfg.accentColor} 0, ${cfg.accentColor} 6px, transparent 6px, transparent 10px)`
            : undefined,
        }} />

        {/* Drag handle */}
        <div
          onPointerDown={e => controls.start(e)}
          style={{
            width: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            color: '#D4B896',
            flexShrink: 0,
          }}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
            <circle cx="3" cy="3" r="1.5" />
            <circle cx="7" cy="3" r="1.5" />
            <circle cx="3" cy="8" r="1.5" />
            <circle cx="7" cy="8" r="1.5" />
            <circle cx="3" cy="13" r="1.5" />
            <circle cx="7" cy="13" r="1.5" />
          </svg>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '8px 10px 8px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 4 }}>
          {/* Tijd bovenaan */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {editingTime ? (
              <input
                autoFocus
                defaultValue={block.time}
                onBlur={e => { onUpdate(block.id, { time: e.target.value }); setEditingTime(false) }}
                onKeyDown={e => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  if (e.key === 'Escape') setEditingTime(false)
                }}
                style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: cfg.accentColor, width: 44, background: 'transparent', border: 'none', borderBottom: `1px solid ${cfg.accentColor}`, outline: 'none' }}
              />
            ) : (
              <span
                onClick={() => setEditingTime(true)}
                style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: cfg.accentColor, cursor: 'pointer', minWidth: 36 }}
                title="Klik om tijd te bewerken"
              >
                {block.time || '—:——'}
              </span>
            )}
          </div>

          {/* Label */}
          {editingLabel ? (
            <input
              autoFocus
              defaultValue={block.label}
              onBlur={e => { onUpdate(block.id, { label: e.target.value }); setEditingLabel(false) }}
              onKeyDown={e => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                if (e.key === 'Escape') setEditingLabel(false)
              }}
              style={{ fontSize: 12, fontWeight: 600, color: cfg.textColor, background: 'transparent', border: 'none', borderBottom: `1px solid ${cfg.accentColor}`, outline: 'none', width: '100%' }}
            />
          ) : (
            <span
              onClick={() => setEditingLabel(true)}
              style={{ fontSize: 12, fontWeight: 600, color: cfg.textColor, cursor: 'pointer', lineHeight: 1.3 }}
            >
              {block.label}
            </span>
          )}

          {/* Duur badge + verwijder knop */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            {editingDuration ? (
              <input
                autoFocus
                type="number"
                defaultValue={block.duration_minutes}
                onBlur={e => { onUpdate(block.id, { duration_minutes: parseInt(e.target.value) || 60 }); setEditingDuration(false) }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                style={{ fontSize: 10, width: 40, background: 'transparent', border: `1px solid ${cfg.accentColor}`, borderRadius: 4, padding: '1px 4px', outline: 'none', color: cfg.textColor }}
              />
            ) : (
              <span
                onClick={() => setEditingDuration(true)}
                style={{ fontSize: 10, color: cfg.accentColor, background: 'white', border: `1px solid ${cfg.border}`, padding: '1px 6px', borderRadius: 20, cursor: 'pointer', fontWeight: 500 }}
                title="Klik om duur te bewerken"
              >
                {block.duration_minutes} min
              </span>
            )}
            <button
              onClick={() => onRemove(block.id)}
              style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer', color: '#D4B896', padding: 0, flexShrink: 0 }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="2" y1="2" x2="8" y2="8" /><line x1="8" y1="2" x2="2" y2="8" />
              </svg>
            </button>
          </div>

          {/* Capaciteitsadvies */}
          {advice.maxItems !== null && (
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              color: advice.colorClass === 'red' ? '#DC2626' : advice.colorClass === 'green' ? '#3A5C3A' : '#C4703A',
              lineHeight: 1.3,
            }}>
              {advice.maxItems === 0
                ? '! servicepauze'
                : `max ${advice.maxItems} ${advice.itemLabel}`
              }
            </div>
          )}
        </div>
      </div>
    </Reorder.Item>
  )
}

export function EventTimeline({ blocks, numPersons = 20, mode = 'full', onChange }: EventTimelineProps) {
  const [addingBlock, setAddingBlock] = useState(false)
  const [newBlock, setNewBlock] = useState<Partial<TimelineBlock>>({ type: 'reception', duration_minutes: 60, time: '' })

  const handleUpdate = (id: string, updates: Partial<TimelineBlock>) => {
    onChange?.(blocks.map(b => b.id === id ? { ...b, ...updates } : b))
  }

  const handleRemove = (id: string) => {
    onChange?.(blocks.filter(b => b.id !== id))
  }

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

  // COMPACT mode
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
                  {block.time && <span style={{ fontFamily: 'monospace', color: cfg.accentColor, fontWeight: 600 }}>{block.time} </span>}
                  <span style={{ color: '#2C1810', fontWeight: 500 }}>{block.label}</span>
                  {advice.maxItems !== null && advice.maxItems > 0 && (
                    <span style={{ color: cfg.accentColor, marginLeft: 4 }}>· max {advice.maxItems} {advice.itemLabel}</span>
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

  // FULL mode — visueel verticaal
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Clock style={{ width: 13, height: 13, color: '#E8A040', flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#9E7E60', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Tijdlijn
        </span>
        {blocks.length > 0 && (
          <span style={{ fontSize: 10, color: '#B8997A' }}>· {blocks.length} blokken</span>
        )}
      </div>

      {blocks.length === 0 && !addingBlock && (
        <div style={{
          textAlign: 'center', padding: '24px 12px',
          border: '1px dashed #E8D5B5', borderRadius: 12,
          color: '#B8997A', fontSize: 12,
        }}>
          Voeg tijdlijnblokken toe om capaciteitsadvies te zien
        </div>
      )}

      {/* Drag-and-drop lijst */}
      {onChange ? (
        <Reorder.Group
          axis="y"
          values={blocks}
          onReorder={onChange}
          style={{ listStyle: 'none', padding: 0, margin: 0 }}
        >
          {blocks.map(block => (
            <DraggableBlock
              key={block.id}
              block={block}
              numPersons={numPersons}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
            />
          ))}
        </Reorder.Group>
      ) : (
        // Read-only versie (geen onChange)
        <div>
          {blocks.map(block => {
            const cfg = TYPE_CONFIG[block.type] || TYPE_CONFIG.custom
            const advice = calculateCapacity(block, numPersons)
            const height = blockHeight(block.duration_minutes)
            return (
              <div key={block.id} style={{
                display: 'flex', alignItems: 'stretch', minHeight: height,
                marginBottom: 4, borderRadius: 10, overflow: 'hidden',
                border: `1px solid ${cfg.border}`, background: cfg.bg,
              }}>
                <div style={{ width: 4, background: cfg.accentColor, flexShrink: 0 }} />
                <div style={{ flex: 1, padding: '8px 10px 8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 4 }}>
                  {block.time && <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: cfg.accentColor }}>{block.time}</span>}
                  <span style={{ fontSize: 12, fontWeight: 600, color: cfg.textColor }}>{block.label}</span>
                  <span style={{ fontSize: 10, color: cfg.accentColor, fontWeight: 500 }}>{block.duration_minutes} min</span>
                  {advice.maxItems !== null && advice.maxItems > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: advice.colorClass === 'red' ? '#DC2626' : advice.colorClass === 'green' ? '#3A5C3A' : '#C4703A' }}>
                      max {advice.maxItems} {advice.itemLabel}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Blok toevoegen */}
      {onChange && (
        addingBlock ? (
          <div style={{ marginTop: 8, padding: 10, background: '#F9F6F2', border: '1px dashed #E8D5B5', borderRadius: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <select
                value={newBlock.type}
                onChange={e => {
                  const cfg = TYPE_OPTIONS.find(o => o.value === e.target.value)
                  setNewBlock(p => ({ ...p, type: e.target.value as TimelineBlock['type'], label: cfg?.label || '' }))
                }}
                style={{ padding: '6px 8px', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 12, color: '#2C1810', background: 'white', outline: 'none' }}
              >
                {TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={newBlock.time || ''}
                  onChange={e => setNewBlock(p => ({ ...p, time: e.target.value }))}
                  placeholder="18:00"
                  style={{ width: 60, padding: '5px 8px', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 12, color: '#2C1810', background: 'white', outline: 'none' }}
                />
                <input
                  type="number"
                  value={newBlock.duration_minutes || ''}
                  onChange={e => setNewBlock(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 60 }))}
                  placeholder="60"
                  style={{ width: 60, padding: '5px 8px', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 12, color: '#2C1810', background: 'white', outline: 'none' }}
                />
                <span style={{ fontSize: 11, color: '#9E7E60', alignSelf: 'center' }}>min</span>
              </div>
              <input
                value={newBlock.label || ''}
                onChange={e => setNewBlock(p => ({ ...p, label: e.target.value }))}
                placeholder="Label (bv. Ontvangst met drankje)"
                autoFocus
                style={{ padding: '6px 8px', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 12, color: '#2C1810', background: 'white', outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setAddingBlock(false)}
                  style={{ padding: '4px 10px', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 11, color: '#9E7E60', background: 'white', cursor: 'pointer' }}
                >
                  Annuleren
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!newBlock.label?.trim()}
                  style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#2C1810', background: '#E8A040', border: 'none', cursor: 'pointer' }}
                >
                  Toevoegen
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingBlock(true)}
            style={{ marginTop: 8, width: '100%', padding: '7px', border: '1px dashed #E8D5B5', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 11, color: '#9E7E60', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
          >
            <Plus style={{ width: 12, height: 12 }} />
            Blok toevoegen
          </button>
        )
      )}
    </div>
  )
}
