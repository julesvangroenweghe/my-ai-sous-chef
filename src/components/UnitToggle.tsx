'use client'

import React from 'react'
import { useUnitPreferences } from '@/hooks/use-unit-preferences'
import type { WeightUnit, VolumeUnit } from '@/lib/units'

interface UnitToggleProps {
  compact?: boolean
}

export function UnitToggle({ compact = false }: UnitToggleProps) {
  const { preferences, setPreferences } = useUnitPreferences()

  const toggleWeight = () => {
    const next: WeightUnit = preferences.weight === 'g' ? 'kg' : 'g'
    setPreferences({ ...preferences, weight: next })
  }

  const toggleVolume = () => {
    const next: VolumeUnit = preferences.volume === 'ml' ? 'l' : 'ml'
    setPreferences({ ...preferences, volume: next })
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={toggleWeight}
          className="px-2.5 py-1 text-xs font-medium rounded-md border border-stone-200 hover:border-stone-400 bg-white text-stone-700 transition-colors"
          title="Wisselen tussen gram en kilogram"
        >
          {preferences.weight}
        </button>
        <span className="text-stone-300">/</span>
        <button
          onClick={toggleVolume}
          className="px-2.5 py-1 text-xs font-medium rounded-md border border-stone-200 hover:border-stone-400 bg-white text-stone-700 transition-colors"
          title="Wisselen tussen milliliter en liter"
        >
          {preferences.volume}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-stone-50 border border-stone-200">
      <span className="text-sm font-medium text-stone-600">Eenheden:</span>
      
      <div className="flex items-center gap-1 bg-white rounded-md border border-stone-200 p-0.5">
        <button
          onClick={() => setPreferences({ ...preferences, weight: 'g' })}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            preferences.weight === 'g'
              ? 'bg-stone-800 text-white font-medium'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          gram
        </button>
        <button
          onClick={() => setPreferences({ ...preferences, weight: 'kg' })}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            preferences.weight === 'kg'
              ? 'bg-stone-800 text-white font-medium'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          kilogram
        </button>
      </div>

      <div className="flex items-center gap-1 bg-white rounded-md border border-stone-200 p-0.5">
        <button
          onClick={() => setPreferences({ ...preferences, volume: 'ml' })}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            preferences.volume === 'ml'
              ? 'bg-stone-800 text-white font-medium'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          ml
        </button>
        <button
          onClick={() => setPreferences({ ...preferences, volume: 'l' })}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            preferences.volume === 'l'
              ? 'bg-stone-800 text-white font-medium'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          liter
        </button>
      </div>
    </div>
  )
}
