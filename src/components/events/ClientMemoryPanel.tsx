'use client'

import { useState, useEffect } from 'react'

interface DishHistoryItem {
  name: string
  eventName: string
  eventDate: string
  course: string
}

interface EventHistory {
  eventId: string
  eventName: string
  eventDate: string
  numPersons: number | null
  dishes: { id: string; name: string; course: string; description?: string }[]
}

interface ClientMemoryPanelProps {
  clientId: string | null
  clientName?: string
  currentDishes?: string[] // namen van gerechten in huidige offerte
  className?: string
}

const COURSE_LABELS: Record<string, string> = {
  FINGERFOOD: 'Fingerfood',
  APPETIZER: 'Appetizer',
  AMUSE: 'Amuse',
  STARTER: 'Voorgerecht',
  FISH: 'Vis',
  MEAT: 'Vlees',
  DESSERT: 'Dessert',
  WALKING: 'Walking',
  SERVICE_ITEM: 'Service',
  Amuse: 'Amuse',
  Fingerbites: 'Fingerbites',
  Fingerfood: 'Fingerfood',
  Hapjes: 'Hapjes',
  Voorgerecht: 'Voorgerecht',
  Tussengerecht: 'Tussengerecht',
  Vis: 'Vis',
  Hoofdgerecht: 'Hoofdgerecht',
  Kaas: 'Kaas',
  Dessert: 'Dessert',
  Mignardises: 'Mignardises',
}

export function ClientMemoryPanel({ clientId, clientName, currentDishes = [], className = '' }: ClientMemoryPanelProps) {
  const [history, setHistory] = useState<EventHistory[]>([])
  const [allDishNames, setAllDishNames] = useState<DishHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    fetch(`/api/clients/${clientId}/dish-history`)
      .then(r => r.json())
      .then(data => {
        setHistory(data.history || [])
        setAllDishNames(data.allDishNames || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  if (!clientId) return null
  if (loading) return (
    <div className={`rounded-xl border border-[#E8D5B5] bg-white p-4 ${className}`}>
      <div className="text-xs text-[#9E7E60] animate-pulse">Klantgeheugen laden...</div>
    </div>
  )
  if (history.length === 0) return (
    <div className={`rounded-xl border border-[#E8D5B5] bg-white p-4 ${className}`}>
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-[#9E7E60]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <span className="text-xs text-[#9E7E60]">Eerste event voor {clientName || 'deze klant'}</span>
      </div>
    </div>
  )

  // Welke huidige gerechten zijn al eerder geserveerd?
  const repeatedDishes = currentDishes.filter(dish => {
    const normalized = dish.toLowerCase()
    return allDishNames.some(past =>
      past.name.includes(normalized.slice(0, 8)) ||
      normalized.includes(past.name.slice(0, 8))
    )
  })

  return (
    <div className={`rounded-xl border border-[#E8D5B5] bg-white overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#FDF8F2] transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#C4703A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-sm font-medium text-[#2C1810]">Klantgeheugen</span>
          <span className="text-xs bg-[#F2E8D5] text-[#9E7E60] px-1.5 py-0.5 rounded-full">
            {history.length} {history.length === 1 ? 'event' : 'events'}
          </span>
          {repeatedDishes.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
              {repeatedDishes.length} herhaling{repeatedDishes.length > 1 ? 'en' : ''}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-[#9E7E60] transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-[#E8D5B5] divide-y divide-[#F2E8D5]">
          {history.map(event => (
            <div key={event.eventId} className="px-4 py-3">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-xs font-semibold text-[#2C1810]">{event.eventName}</span>
                <span className="text-xs text-[#9E7E60]">
                  {new Date(event.eventDate).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                {event.numPersons && (
                  <span className="text-xs text-[#9E7E60]">· {event.numPersons}p</span>
                )}
              </div>
              <div className="space-y-1">
                {event.dishes.map((dish, i) => {
                  const isRepeat = currentDishes.some(cd => {
                    const normalized = cd.toLowerCase()
                    return normalized.includes(dish.name.toLowerCase().slice(0, 8)) ||
                      dish.name.toLowerCase().includes(normalized.slice(0, 8))
                  })
                  return (
                    <div key={i} className={`flex items-center gap-2 text-xs ${isRepeat ? 'text-amber-700' : 'text-[#5C4A3A]'}`}>
                      <span className="text-[10px] bg-[#F2E8D5] text-[#9E7E60] px-1.5 py-0.5 rounded font-mono uppercase tracking-wide flex-shrink-0">
                        {COURSE_LABELS[dish.course] || dish.course}
                      </span>
                      <span className={`${isRepeat ? 'font-medium' : ''}`}>{dish.name}</span>
                      {isRepeat && (
                        <span className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          al geserveerd
                        </span>
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
