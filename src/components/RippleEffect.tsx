'use client'

import { useState } from 'react'

interface RippleResult {
  updated_mep_items: number
  old_num_persons: number
  new_num_persons: number
}

interface Props {
  eventId: string
  currentNumPersons: number
  onComplete: (newNumPersons: number, result: RippleResult) => void
}

export function RippleEffect({ eventId, currentNumPersons, onComplete }: Props) {
  const [loading, setLoading] = useState(false)

  async function trigger(newNumPersons: number) {
    if (newNumPersons === currentNumPersons) return
    setLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/ripple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_persons: newNumPersons })
      })
      const data = await res.json()
      if (data.success) {
        onComplete(newNumPersons, data)
      }
    } finally {
      setLoading(false)
    }
  }

  return { trigger, loading }
}

// Banner die toont na ripple
export function RippleBanner({ result, onDismiss }: { result: RippleResult | null, onDismiss: () => void }) {
  if (!result) return null
  return (
    <div
      className="flex items-center justify-between p-4 rounded-xl border mb-4"
      style={{ background: '#FEF3E2', borderColor: '#E8A040' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#E8A040' }} />
        <span className="text-sm font-medium" style={{ color: '#2C1810' }}>
          Ripple Effect toegepast — {result.old_num_persons} → {result.new_num_persons} personen: {result.updated_mep_items} MEP-items herberekend
        </span>
      </div>
      <button onClick={onDismiss} className="text-xs" style={{ color: '#9E7E60' }}>✕</button>
    </div>
  )
}
