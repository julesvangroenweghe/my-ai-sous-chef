'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { AllergenLink } from './allergen-badges'

interface Allergen {
  id: number
  code: string
  name_nl: string
  eu_number: number
  description_nl: string
}

type Severity = 'contains' | 'may_contain' | 'trace'

const severityOptions: { value: Severity; label: string; color: string }[] = [
  { value: 'contains', label: 'Bevat', color: 'bg-amber-100 text-amber-800' },
  { value: 'may_contain', label: 'Kan bevatten', color: 'bg-yellow-50 text-yellow-700' },
  { value: 'trace', label: 'Sporen', color: 'bg-stone-100 text-stone-500' },
]

export function AllergenEditor({
  ingredientId,
  currentLinks,
  onUpdate,
}: {
  ingredientId: string
  currentLinks: AllergenLink[]
  onUpdate: () => void
}) {
  const [allergens, setAllergens] = useState<Allergen[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('allergens')
        .select('*')
        .order('eu_number')
      setAllergens((data || []) as Allergen[])
      setLoading(false)
    }
    load()
  }, [])

  const getLink = (allergenId: number) =>
    currentLinks.find((l) => l.allergen_id === allergenId)

  const handleToggle = async (allergen: Allergen, currentSeverity: Severity | null) => {
    setSaving(allergen.id)

    if (currentSeverity === null) {
      // Add with 'contains'
      await fetch('/api/allergens/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient_id: ingredientId,
          allergen_id: allergen.id,
          severity: 'contains',
        }),
      })
    } else if (currentSeverity === 'contains') {
      // Cycle to may_contain
      await fetch('/api/allergens/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient_id: ingredientId,
          allergen_id: allergen.id,
          severity: 'may_contain',
        }),
      })
    } else if (currentSeverity === 'may_contain') {
      // Cycle to trace
      await fetch('/api/allergens/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient_id: ingredientId,
          allergen_id: allergen.id,
          severity: 'trace',
        }),
      })
    } else {
      // Remove
      await fetch('/api/allergens/manage', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient_id: ingredientId,
          allergen_id: allergen.id,
        }),
      })
    }

    setSaving(null)
    onUpdate()
  }

  if (loading) {
    return (
      <div className="p-3 text-xs text-stone-400">Laden...</div>
    )
  }

  return (
    <div className="p-3 space-y-1 max-h-80 overflow-y-auto">
      <div className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold mb-2 px-1">
        Klik om te wisselen: bevat &rarr; kan bevatten &rarr; sporen &rarr; verwijder
      </div>
      {allergens.map((allergen) => {
        const link = getLink(allergen.id)
        const severity = link?.severity as Severity | undefined
        const isGlobal = link && (link as any).is_global

        return (
          <button
            key={allergen.id}
            onClick={() => handleToggle(allergen, severity || null)}
            disabled={saving === allergen.id || isGlobal}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all text-xs',
              severity
                ? severity === 'contains'
                  ? 'bg-amber-50 hover:bg-amber-100'
                  : severity === 'may_contain'
                  ? 'bg-yellow-50 hover:bg-yellow-100'
                  : 'bg-stone-50 hover:bg-stone-100'
                : 'hover:bg-stone-50',
              saving === allergen.id && 'opacity-50',
              isGlobal && 'opacity-70 cursor-not-allowed'
            )}
          >
            <span className={cn(
              'w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0',
              severity
                ? severity === 'contains'
                  ? 'bg-amber-200 text-amber-900'
                  : severity === 'may_contain'
                  ? 'bg-yellow-200 text-yellow-800'
                  : 'bg-stone-200 text-stone-600'
                : 'bg-stone-100 text-stone-400'
            )}>
              {allergen.eu_number}
            </span>
            <span className={cn(
              'flex-1 font-medium',
              severity ? 'text-stone-900' : 'text-stone-400'
            )}>
              {allergen.name_nl}
            </span>
            {severity && (
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                severity === 'contains'
                  ? 'bg-amber-100 text-amber-700'
                  : severity === 'may_contain'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-stone-100 text-stone-500'
              )}>
                {severity === 'contains' ? 'Bevat' : severity === 'may_contain' ? 'Kan bevatten' : 'Sporen'}
              </span>
            )}
            {isGlobal && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                Auto
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
