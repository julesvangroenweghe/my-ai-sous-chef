'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { UnitPreferencesContext } from '@/hooks/use-unit-preferences'
import { UnitPreferences, DEFAULT_PREFERENCES } from '@/lib/units'

const STORAGE_KEY = 'chef-unit-preferences'

export function UnitPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferencesState] = useState<UnitPreferences>(DEFAULT_PREFERENCES)

  useEffect(() => {
    // Load from localStorage on mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setPreferencesState({ ...DEFAULT_PREFERENCES, ...parsed })
      }
    } catch {
      // Use defaults
    }
  }, [])

  const setPreferences = useCallback((prefs: UnitPreferences) => {
    setPreferencesState(prefs)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch {
      // localStorage not available
    }
  }, [])

  return (
    <UnitPreferencesContext.Provider value={{ preferences, setPreferences }}>
      {children}
    </UnitPreferencesContext.Provider>
  )
}
