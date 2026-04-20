/**
 * Unit Conversion System
 * Converts between g/kg/ml/l with chef-preferred display unit
 * Handles stuks/piece ingredients via weight_per_piece_g
 */

export type WeightUnit = 'g' | 'kg'
export type VolumeUnit = 'ml' | 'l'
export type DisplayUnit = WeightUnit | VolumeUnit

export interface UnitPreferences {
  weight: WeightUnit    // 'g' or 'kg'
  volume: VolumeUnit    // 'ml' or 'l'
}

export const DEFAULT_PREFERENCES: UnitPreferences = {
  weight: 'g',   // European pro default
  volume: 'ml',
}

// Convert any weight to grams (base unit)
function toGrams(value: number, fromUnit: string): number {
  switch (fromUnit.toLowerCase()) {
    case 'kg': return value * 1000
    case 'g': return value
    case 'oz': return value * 28.3495
    case 'lb': return value * 453.592
    default: return value // assume grams
  }
}

// Convert any volume to ml (base unit)
function toMl(value: number, fromUnit: string): number {
  switch (fromUnit.toLowerCase()) {
    case 'l': return value * 1000
    case 'ml': return value
    case 'cl': return value * 10
    case 'dl': return value * 100
    default: return value // assume ml
  }
}

// Is this a weight unit?
function isWeightUnit(unit: string): boolean {
  return ['g', 'kg', 'oz', 'lb'].includes(unit.toLowerCase())
}

// Is this a volume unit?
function isVolumeUnit(unit: string): boolean {
  return ['ml', 'l', 'cl', 'dl'].includes(unit.toLowerCase())
}

// Is this a count/piece unit (needs weight_per_piece for conversion)?
function isCountUnit(unit: string): boolean {
  return ['stuk', 'stuks', 'st', 'piece', 'pcs', 'bos', 'tak', 'takje', 'blad', 'teen', 'snuf', 'snufje', 'el', 'tl', 'eetlepel', 'theelepel'].includes(unit.toLowerCase())
}

/**
 * Convert a quantity from its stored unit to the chef's preferred display unit
 */
export function convertToPreferred(
  value: number,
  fromUnit: string,
  preferences: UnitPreferences = DEFAULT_PREFERENCES
): { value: number; unit: string } {
  if (!value && value !== 0) return { value: 0, unit: fromUnit }
  
  // Count units: no conversion
  if (isCountUnit(fromUnit)) {
    return { value, unit: fromUnit }
  }

  // Weight conversion
  if (isWeightUnit(fromUnit)) {
    const grams = toGrams(value, fromUnit)
    if (preferences.weight === 'kg') {
      return { value: grams / 1000, unit: 'kg' }
    }
    return { value: grams, unit: 'g' }
  }

  // Volume conversion
  if (isVolumeUnit(fromUnit)) {
    const ml = toMl(value, fromUnit)
    if (preferences.volume === 'l') {
      return { value: ml / 1000, unit: 'l' }
    }
    return { value: ml, unit: 'ml' }
  }

  // Unknown unit: return as-is
  return { value, unit: fromUnit }
}

/**
 * Format a quantity for display with smart decimal handling
 * - Whole numbers: no decimals (500 g)
 * - Small amounts: up to 2 decimals (0.15 kg)
 * - Medium amounts: 1 decimal (1.5 kg)
 */
export function formatQuantity(
  value: number,
  fromUnit: string,
  preferences: UnitPreferences = DEFAULT_PREFERENCES
): string {
  const converted = convertToPreferred(value, fromUnit, preferences)
  const v = converted.value
  
  let formatted: string
  if (v === 0) {
    formatted = '0'
  } else if (v >= 100) {
    formatted = Math.round(v).toString()
  } else if (v >= 10) {
    formatted = v % 1 === 0 ? v.toString() : v.toFixed(1)
  } else if (v >= 1) {
    // Remove trailing zeros
    formatted = parseFloat(v.toFixed(2)).toString()
  } else {
    formatted = parseFloat(v.toFixed(3)).toString()
  }
  
  return `${formatted} ${converted.unit}`
}

/**
 * Convert price per unit to price per preferred unit
 * e.g., €12/kg → €0.012/g when preference is grams
 * But we always DISPLAY price per kg for readability
 */
export function formatPricePerUnit(
  pricePerKg: number,
  _preferences: UnitPreferences = DEFAULT_PREFERENCES
): string {
  // Price is always shown per kg for readability (industry standard)
  return `${pricePerKg.toFixed(2)}/kg`
}

/**
 * Calculate ingredient cost with full unit awareness
 * 
 * Handles 3 cases:
 * 1. kg-priced ingredients: cost = (quantity_g / 1000) * price_per_kg
 * 2. liter-priced ingredients: cost = (quantity_ml / 1000) * price_per_liter
 * 3. stuks-priced ingredients: cost = (quantity_g / weight_per_piece_g) * price_per_stuk
 * 
 * @param recipeQuantity - quantity from recipe (per person)
 * @param recipeUnit - unit in the recipe (usually 'g' or 'ml')
 * @param ingredientPrice - price from ingredient table (current_price)
 * @param ingredientUnit - purchase unit from ingredient table ('kg', 'l', 'stuks', etc.)
 * @param weightPerPieceG - weight in grams of one piece (only for stuks ingredients)
 */
export function calculateIngredientCost(
  recipeQuantity: number,
  recipeUnit: string,
  ingredientPrice: number,
  ingredientUnit?: string,
  weightPerPieceG?: number | null
): number {
  if (!ingredientPrice || !recipeQuantity) return 0

  // If no ingredient unit provided, fall back to legacy behavior
  // (assume price matches recipe unit scale: kg for g, l for ml)
  if (!ingredientUnit) {
    if (isWeightUnit(recipeUnit)) {
      const grams = toGrams(recipeQuantity, recipeUnit)
      return (grams / 1000) * ingredientPrice
    }
    if (isVolumeUnit(recipeUnit)) {
      const ml = toMl(recipeQuantity, recipeUnit)
      return (ml / 1000) * ingredientPrice
    }
    return 0
  }

  // Case 1: Ingredient priced per kg (most common)
  if (['kg', 'g'].includes(ingredientUnit.toLowerCase())) {
    // Recipe quantity in grams or kg → convert to kg → multiply by price/kg
    if (isWeightUnit(recipeUnit)) {
      const grams = toGrams(recipeQuantity, recipeUnit)
      // If ingredient unit is 'g', price is per gram
      if (ingredientUnit.toLowerCase() === 'g') {
        return grams * ingredientPrice
      }
      return (grams / 1000) * ingredientPrice
    }
    return 0
  }

  // Case 2: Ingredient priced per liter
  if (['l', 'liter', 'ml'].includes(ingredientUnit.toLowerCase())) {
    if (isVolumeUnit(recipeUnit)) {
      const ml = toMl(recipeQuantity, recipeUnit)
      if (ingredientUnit.toLowerCase() === 'ml') {
        return ml * ingredientPrice
      }
      return (ml / 1000) * ingredientPrice
    }
    // Recipe uses grams for a liquid ingredient → assume 1ml ≈ 1g
    if (isWeightUnit(recipeUnit)) {
      const grams = toGrams(recipeQuantity, recipeUnit)
      return (grams / 1000) * ingredientPrice
    }
    return 0
  }

  // Case 3: Ingredient priced per stuk/stuks/bos/piece
  if (isCountUnit(ingredientUnit)) {
    // We need weight_per_piece to convert grams → number of pieces
    if (weightPerPieceG && weightPerPieceG > 0) {
      if (isWeightUnit(recipeUnit)) {
        const grams = toGrams(recipeQuantity, recipeUnit)
        const pieces = grams / weightPerPieceG
        return pieces * ingredientPrice
      }
      if (isVolumeUnit(recipeUnit)) {
        // For liquids measured in ml but ingredient sold per piece (rare)
        const ml = toMl(recipeQuantity, recipeUnit)
        const pieces = ml / weightPerPieceG
        return pieces * ingredientPrice
      }
    }
    // Fallback: if recipe also uses count units, direct multiply
    if (isCountUnit(recipeUnit)) {
      return recipeQuantity * ingredientPrice
    }
    // No weight_per_piece available — can't calculate
    return 0
  }

  // Unknown combination — try best guess
  if (isWeightUnit(recipeUnit)) {
    const grams = toGrams(recipeQuantity, recipeUnit)
    return (grams / 1000) * ingredientPrice
  }
  if (isVolumeUnit(recipeUnit)) {
    const ml = toMl(recipeQuantity, recipeUnit)
    return (ml / 1000) * ingredientPrice
  }

  return 0
}

// NL alias for formatQuantity — used in recipe detail page
export const formatHoeveelheid = formatQuantity
