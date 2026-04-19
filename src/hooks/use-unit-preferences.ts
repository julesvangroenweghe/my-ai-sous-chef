'use client'

import { createContext, useContext } from 'react'
import { UnitPreferences, DEFAULT_PREFERENCES, formatQuantity, convertToPreferred, calculateIngredientCost } from '@/lib/units'

// Context for unit preferences
export const UnitPreferencesContext = createContext<{
  preferences: UnitPreferences
  setPreferences: (prefs: UnitPreferences) => void
}>({
  preferences: DEFAULT_PREFERENCES,
  setPreferences: () => {},
})

export function useUnitPreferences() {
  const ctx = useContext(UnitPreferencesContext)
  
  return {
    ...ctx,
    // Convenience methods
    format: (value: number, unit: string) => formatQuantity(value, unit, ctx.preferences),
    convert: (value: number, unit: string) => convertToPreferred(value, unit, ctx.preferences),
    calcCost: (quantity: number, recipeUnit: string, price: number, ingredientUnit?: string, weightPerPieceG?: number | null) => 
      calculateIngredientCost(quantity, recipeUnit, price, ingredientUnit, weightPerPieceG),
  }
}
