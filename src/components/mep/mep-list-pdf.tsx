import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MepListComponent {
  component_name: string
  quantity: number | null
  unit: string | null
  preparation: string | null
  component_group: string | null
  sort_order: number
  allergens?: string | null
}

export interface MepListDish {
  id: string
  title: string
  category: string
  sort_order: number
  notes: string | null
  timing_label: string | null
  components: MepListComponent[]
}

export interface MepListData {
  event: {
    name: string
    event_date: string
    num_persons: number
    event_type: string
    location: string | null
    venue_address: string | null
    price_per_person: number | null
    event_start_time: string | null
    event_end_time: string | null
    contact_person: string | null
    departure_time: string | null
    kitchen_arrival_time: string | null
    travel_time_minutes: number | null
    crew_persons?: number | null
    allergens?: string | null
  }
  dishes: MepListDish[]
}

// ─── Category ordering ────────────────────────────────────────────────────────

function getCategoryOrder(cat: string): number {
  const c = (cat || '').toUpperCase().trim()

  if (c.includes('MIDDAG') || c === 'DESSERT LUNCH' || (c.includes('LUNCH') && c.includes('DESSERT'))) {
    if (c.includes('FINGERFOOD')) return 4
    if (c.includes('FINGERBITES')) return 5
    if (c.includes('HAPJES') || c.includes('HAPJE') || c.includes('APPETIZERS')) return 7
    if (c.includes('AMUSE')) return 9
    if (c.includes('VOOR')) return 62
    if (c.includes('TUSSEN')) return 72
    if (c.includes('HOOFD')) return 82
    if (c.includes('DESSERT') || c.includes('LUNCH')) return 91
    return 6
  }

  if (c.includes('WALKING')) {
    if (c.includes('VOOR')) return 63
    if (c.includes('HOOFD')) return 83
    if (c.includes('DESSERT')) return 94
    return 75
  }

  if (c.includes('SHARING')) {
    if (c.includes('VOOR')) return 64
    if (c.includes('HOOFD')) return 84
    if (c.includes('DESSERT')) return 95
    return 76
  }

  if (c.includes('APERO')) {
    if (c.includes('FINGERFOOD')) return 110
    if (c.includes('FINGERBITES')) return 115
    if (c.includes('HAPJES') || c.includes('HAPJE') || c.includes('APPETIZERS')) return 120
    if (c.includes('AMUSE')) return 125
    if (c.includes('VOOR')) return 130
    if (c.includes('TUSSEN')) return 135
    if (c.includes('HOOFD')) return 140
    if (c.includes('DESSERT')) return 145
    return 112
  }

  if (c === 'LUNCH') return 18
  if (c.includes('HOOFDGERECHT') && c.includes('PREMIUM')) return 81
  if (c.includes('FOODSTAND')) return 150
  if (c.includes('BARISTA')) return 201

  if (c === 'DRANKEN' || c.includes('MOCKTAIL') || c.includes('COCKTAIL')) return 10
  if (c === 'ONTVANGST') return 15
  if (c === 'FINGERFOOD') return 20
  if (c === 'FINGERBITES') return 30
  if (c === 'HAPJES' || c === 'HAPJE' || c === 'HAPJES_WARM' || c === 'APPETIZERS') return 40
  if (c === 'KIDS' || c === 'KINDERMENU' || c === 'KIDS MENU') return 45
  if (c === 'AMUSE') return 50
  if (c === 'VOORGERECHT') return 60
  if (c === 'TUSSENGERECHT') return 70
  if (c === 'HOOFDGERECHT') return 80
  if (c === 'ON THE SIDE' || c === 'SAUZEN' || c.includes('BIJGERECHT')) return 85
  if (c.includes('BROOD')) return 86
  if (c === 'KAAS') return 88
  if (c === 'DESSERT') return 90
  if (c === 'DESSERT BUFFET') return 91
  if (c === 'PETITS FOURS' || c === 'PETIT FOURS') return 95
  if (c === 'AFTER SNACKS' || c.includes('NIGHT SNACK') || c.includes('LATE NIGHT') || c === 'BBQ' || c === 'BUFFET') return 98
  if (c === 'MIGNARDISES') return 200
  if (c === 'HALFABRICAAT') return 250
  return 99
}

const CATEGORY_LABELS: Record<string, string> = {
  DRANKEN: 'Dranken',
  ONTVANGST: 'Ontvangst',
  FINGERFOOD: 'Fingerfood',
  'FINGERFOOD MIDDAG': 'Fingerfood (middag)',
  'FINGERFOOD APERO': 'Fingerfood (apero)',
  FINGERBITES: 'Fingerbites',
  HAPJES: 'Hapjes',
  HAPJE: 'Hapjes',
  APPETIZERS: 'Hapjes',
  'APPETIZERS MIDDAG': 'Hapjes (middag)',
  'APPETIZERS APERO': 'Hapjes (apero)',
  AMUSE: 'Amuse',
  VOORGERECHT: 'Voorgerecht',
  'WALKING VOORGERECHT': 'Walking voorgerecht',
  'SHARING VOORGERECHT': 'Sharing voorgerecht',
  TUSSENGERECHT: 'Tussengerecht',
  HOOFDGERECHT: 'Hoofdgerecht',
  'HOOFDGERECHT PREMIUM': 'Hoofdgerecht Premium (+)',
  'WALKING DINNER': 'Walking dinner',
  'ON THE SIDE': 'On the side',
  SAUZEN: 'Sauzen',
  KAAS: 'Kaas',
  DESSERT: 'Dessert',
  'DESSERT LUNCH': 'Dessert (middag)',
  'PETITS FOURS': 'Petits fours',
  'PETIT FOURS': 'Petits fours',
  MIGNARDISES: 'Mignardises',
  'BARISTA MIGNARDISES': 'Barista / Mignardises',
  BBQ: 'BBQ',
  BUFFET: 'Buffet',
  'AFTER SNACKS': 'After snacks',
  'NIGHT SNACK': 'Night snack',
  HALFABRICAAT: 'Halfabricaat',
  LUNCH: 'Lunch',
  BROOD: 'Brood',
  'BROOD & BOTER': 'Brood & boter',
  KIDS: 'Kids menu',
  KINDERMENU: 'Kids menu',
  'KIDS MENU': 'Kids menu',
  'LATE NIGHT SNACK': 'Late night snack',
  'KOFFIE & THEE': 'Koffie & thee',
  'FOODSTAND BURGER': 'Foodstand – Burger',
  'FOODSTAND PIZZA': 'Foodstand – Pizza',
  'FOODSTAND PASTA': 'Foodstand – Pasta',
  'FOODSTAND LIBANEES': 'Foodstand – Libanees',
}

function getCategoryLabel(cat: string): string {
  const upper = (cat || '').toUpperCase().trim()
  return CATEGORY_LABELS[upper] || cat
}

const SMALL_CATS = new Set([
  'DRANKEN', 'MOCKTAILS', 'BROOD & BOTER', 'KAAS',
  'MIGNARDISES', 'PETITS FOURS', 'PETIT FOURS', 'NIGHT SNACK',
  'LATE NIGHT SNACK', 'KIDS', 'KINDERMENU', 'KIDS MENU',
  'HALFABRICAAT', 'ON THE SIDE', 'SAUZEN', 'AFTER SNACKS',
])

function isSmallCategory(cat: string): boolean {
  return SMALL_CATS.has((cat || '').toUpperCase().trim())
}

// ─── Allergen Intelligence ─────────────────────────────────────────────────────
//
// Builds a map: allergen → list of dish titles that contain it.
// Two modes:
//   1. Event has explicit allergens (e.g. "noten, kiwi") → only map those
//   2. No event allergens → map ALL allergens found in components (full transparency)

interface AllergenDishMap {
  allergen: string
  dishes: string[]
  fromEvent: boolean  // true = guest has this allergy; false = just present in menu
}

function buildAllergenMap(eventAllergens: string | null | undefined, dishes: MepListDish[]): AllergenDishMap[] {
  // Collect all allergens from all components across all dishes
  const allFound = new Map<string, Set<string>>() // allergen → set of dish titles

  for (const dish of dishes) {
    for (const comp of dish.components) {
      if (!comp.allergens) continue
      const compAllergens = comp.allergens.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      for (const a of compAllergens) {
        if (!allFound.has(a)) allFound.set(a, new Set())
        allFound.get(a)!.add(dish.title)
      }
    }
  }

  const eventAllergenList = eventAllergens
    ? eventAllergens.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    : []

  if (eventAllergenList.length > 0) {
    // Mode 1: Guest has specific allergies — show those first (fromEvent=true),
    // then also show any other allergens found in menu (fromEvent=false)
    const result: AllergenDishMap[] = []

    // Guest allergens first
    for (const ea of eventAllergenList) {
      // Fuzzy match: look for event allergen as substring in found allergens
      const matchedDishes = new Set<string>()
      for (const [foundA, dishSet] of allFound) {
        if (foundA.includes(ea) || ea.includes(foundA)) {
          dishSet.forEach(d => matchedDishes.add(d))
        }
      }
      result.push({
        allergen: ea,
        dishes: [...matchedDishes],
        fromEvent: true,
      })
    }

    // Other allergens in menu (not explicitly listed by guest)
    for (const [foundA, dishSet] of allFound) {
      const alreadyCovered = eventAllergenList.some(ea => foundA.includes(ea) || ea.includes(foundA))
      if (!alreadyCovered) {
        result.push({
          allergen: foundA,
          dishes: [...dishSet],
          fromEvent: false,
        })
      }
    }

    return result
  } else {
    // Mode 2: No guest allergens declared — show all allergens found in menu
    return [...allFound.entries()].map(([a, dishSet]) => ({
      allergen: a,
      dishes: [...dishSet],
      fromEvent: false,
    }))
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('nl-BE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(t: string | null): string {
  if (!t) return ''
  return t.slice(0, 5)
}

function formatQtyShort(qty: number | null, unit: string | null): string {
  if (!qty) return ''
  const q = qty % 1 === 0 ? qty.toString() : qty.toFixed(1)
  return unit ? `${q} ${unit}` : q
}

function formatTotalQty(qty: number | null, unit: string | null, numPersons: number): string {
  if (!qty || !numPersons) return ''
  const total = qty * numPersons
  const u = (unit || '').toLowerCase().trim()
  if ((u === 'g' || u === 'gr') && total >= 1000) {
    const kg = total / 1000
    return `${kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(1)} kg`
  }
  if ((u === 'ml' || u === 'cl') && total >= 1000) {
    const l = u === 'cl' ? total / 100 : total / 1000
    return `${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)} L`
  }
  const t = total % 1 === 0 ? total.toString() : total.toFixed(1)
  return unit ? `${t} ${unit}` : t
}

function translateEventType(t: string): string {
  const map: Record<string, string> = {
    cocktail: 'Cocktailreceptie',
    walking_dinner: 'Walking dinner',
    sit_down: 'Diner aan tafel',
    seated_dinner: 'Diner aan tafel',
    buffet: 'Buffet',
    daily_service: 'Dagservice',
    tasting: 'Proeverij',
    reception: 'Receptie',
    bbq: 'BBQ',
    brunch: 'Brunch',
    lunch: 'Lunch',
    huwelijk: 'Huwelijk',
  }
  return map[t] || t
}

function calcDeparture(kitchenArrival: string | null, travelMin: number | null): string | null {
  if (!kitchenArrival || !travelMin) return null
  try {
    const [hh, mm] = kitchenArrival.split(':').map(Number)
    const totalMin = hh * 60 + mm - Math.round(travelMin * 1.15)
    const dh = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60)
    const dm = ((totalMin % 1440) + 1440) % 1440 % 60
    return `${String(dh).padStart(2, '0')}:${String(dm).padStart(2, '0')}`
  } catch {
    return null
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 16,
    fontSize: 7.5,
    color: '#1C1008',
  },
  header: {
    marginBottom: 7,
    paddingBottom: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: '#2d6a4f',
  },
  clientName: {
    fontSize: 17,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a2e',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  headerDate: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#2d6a4f',
    marginBottom: 2,
  },
  headerMeta: {
    fontSize: 8,
    color: '#4A3728',
    marginTop: 1,
  },
  headerContact: {
    fontSize: 7,
    color: '#888888',
    marginTop: 1,
  },
  headerTravelLine: {
    fontSize: 7,
    color: '#1d4ed8',
    fontFamily: 'Helvetica-Bold',
    marginTop: 2,
  },
  // ── Allergen block styles ──
  allergenBlock: {
    marginTop: 5,
    marginBottom: 0,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 7,
    paddingRight: 7,
    backgroundColor: '#fff5f5',
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },
  allergenBlockTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  allergenRow: {
    flexDirection: 'row',
    marginBottom: 2.5,
    alignItems: 'flex-start',
  },
  allergenBadge: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    backgroundColor: '#dc2626',
    paddingTop: 1.5,
    paddingBottom: 1.5,
    paddingLeft: 4,
    paddingRight: 4,
    marginRight: 5,
    minWidth: 52,
    textAlign: 'center',
  },
  allergenBadgeOrange: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    backgroundColor: '#b45309',
    paddingTop: 1.5,
    paddingBottom: 1.5,
    paddingLeft: 4,
    paddingRight: 4,
    marginRight: 5,
    minWidth: 52,
    textAlign: 'center',
  },
  allergenDishList: {
    fontSize: 7.5,
    color: '#1a1a2e',
    flex: 1,
    flexWrap: 'wrap',
  },
  allergenDishNone: {
    fontSize: 7,
    color: '#16a34a',
    fontFamily: 'Helvetica-Bold',
    flex: 1,
  },
  allergenNoIssues: {
    fontSize: 7.5,
    color: '#16a34a',
    fontFamily: 'Helvetica-Bold',
  },
  // ── rest ──
  columnContainer: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'flex-start',
  },
  column: {
    flex: 1,
  },
  categoryBlock: {
    marginBottom: 4,
  },
  categoryHeader: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    backgroundColor: '#2d6a4f',
    paddingTop: 2.5,
    paddingBottom: 2.5,
    paddingLeft: 5,
    paddingRight: 5,
    marginBottom: 3,
  },
  dishBlock: {
    marginBottom: 4,
  },
  dishNotes: {
    fontSize: 8,
    color: '#b45309',
    fontFamily: 'Helvetica-Oblique',
    marginBottom: 1,
  },
  dishTitle: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a2e',
    marginBottom: 1.5,
  },
  dishTiming: {
    fontSize: 7,
    color: '#888888',
    marginBottom: 1.5,
  },
  componentGroup: {
    marginTop: 1.5,
    marginBottom: 1,
  },
  componentGroupHeader: {
    fontSize: 8.5,
    color: '#888888',
    fontFamily: 'Helvetica-BoldOblique',
    paddingBottom: 1,
    marginBottom: 1.5,
  },
  componentRow: {
    flexDirection: 'row',
    marginBottom: 1.2,
  },
  componentBullet: {
    fontSize: 9,
    color: '#1a1a2e',
    marginRight: 2,
    width: 7,
  },
  componentText: {
    fontSize: 9,
    color: '#1a1a2e',
    flex: 1,
    flexWrap: 'wrap',
  },
  componentQty: {
    fontSize: 8,
    color: '#4A3728',
    fontFamily: 'Helvetica-Bold',
  },
  componentGray: {
    fontSize: 8,
    color: '#888888',
  },
  componentAllergenDot: {
    fontSize: 7,
    color: '#dc2626',
    fontFamily: 'Helvetica-Bold',
    marginLeft: 9,
    marginBottom: 0.5,
  },
  dishSpacer: {
    height: 5,
  },
  footer: {
    marginTop: 8,
    fontSize: 6,
    color: '#B8997A',
    textAlign: 'center',
  },
  pageBreakSpacer: {
    height: 14,
  },
})

// ─── Allergen Summary Block ────────────────────────────────────────────────────

function AllergenSummary({ allergenMap }: { allergenMap: AllergenDishMap[] }) {
  if (allergenMap.length === 0) return null

  // Guest allergens that have NO matching dishes = safe
  const guestAllergens = allergenMap.filter(a => a.fromEvent)
  const otherAllergens = allergenMap.filter(a => !a.fromEvent)

  return (
    <View style={S.allergenBlock}>
      <Text style={S.allergenBlockTitle}>Allergenenoverzicht</Text>

      {guestAllergens.map((item, i) => (
        <View key={i} style={S.allergenRow}>
          <Text style={S.allergenBadge}>
            {item.allergen.toUpperCase()}
          </Text>
          {item.dishes.length === 0 ? (
            <Text style={S.allergenDishNone}>Niet aanwezig in menu</Text>
          ) : (
            <Text style={S.allergenDishList}>
              {'! '}{item.dishes.join('  ·  ')}
            </Text>
          )}
        </View>
      ))}

      {otherAllergens.length > 0 && (
        <>
          {guestAllergens.length > 0 && (
            <View style={{ height: 3 }} />
          )}
          {otherAllergens.map((item, i) => (
            <View key={i} style={S.allergenRow}>
              <Text style={S.allergenBadgeOrange}>
                {item.allergen.toUpperCase()}
              </Text>
              <Text style={S.allergenDishList}>
                {item.dishes.join('  ·  ')}
              </Text>
            </View>
          ))}
        </>
      )}
    </View>
  )
}

// ─── Dish Component ───────────────────────────────────────────────────────────

function DishCard({
  dish,
  numPersons,
  highlightAllergens,
}: {
  dish: MepListDish
  numPersons: number
  highlightAllergens: Set<string>
}) {
  const grouped: { groupName: string | null; items: MepListComponent[] }[] = []
  for (const comp of dish.components) {
    const g = comp.component_group || null
    const existing = grouped.find((x) => x.groupName === g)
    if (existing) {
      existing.items.push(comp)
    } else {
      grouped.push({ groupName: g, items: [comp] })
    }
  }

  return (
    <View style={S.dishBlock} wrap={false}>
      {dish.notes && <Text style={S.dishNotes}>⚑ {dish.notes}</Text>}
      <Text style={S.dishTitle}>{dish.title}</Text>
      {dish.timing_label && <Text style={S.dishTiming}>{dish.timing_label}</Text>}
      {grouped.map((group, gi) => (
        <View key={gi} style={group.groupName ? S.componentGroup : undefined}>
          {group.groupName && (
            <Text style={S.componentGroupHeader}>■ {group.groupName}</Text>
          )}
          {group.items.map((comp, ci) => {
            const qtyStr = formatQtyShort(comp.quantity, comp.unit)
            const totalStr = numPersons > 0 ? formatTotalQty(comp.quantity, comp.unit, numPersons) : ''
            const compAllergens = comp.allergens
              ? comp.allergens.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
              : []
            // Highlight if any allergen of this component is in the highlight set
            const hasHighlight = compAllergens.some(a =>
              [...highlightAllergens].some(h => a.includes(h) || h.includes(a))
            )

            return (
              <View key={ci}>
                <View style={S.componentRow}>
                  <Text style={S.componentBullet}>·</Text>
                  <Text style={[S.componentText, hasHighlight ? { color: '#dc2626', fontFamily: 'Helvetica-Bold' } : {}]}>
                    {comp.component_name}
                    {(qtyStr || comp.preparation) && (
                      <Text style={S.componentGray}>
                        {' ('}
                        {qtyStr && <Text style={S.componentQty}>{qtyStr}</Text>}
                        {qtyStr && totalStr ? (
                          <Text style={S.componentGray}>{`  →  ${totalStr} totaal`}</Text>
                        ) : null}
                        {comp.preparation ? (
                          <Text style={S.componentGray}>{qtyStr ? ` · ${comp.preparation}` : comp.preparation}</Text>
                        ) : null}
                        {')'}
                      </Text>
                    )}
                  </Text>
                </View>
                {compAllergens.length > 0 && (
                  <Text style={S.componentAllergenDot}>
                    {compAllergens.join(', ')}
                  </Text>
                )}
              </View>
            )
          })}
        </View>
      ))}
      <View style={S.dishSpacer} />
    </View>
  )
}

// ─── Column distribution across pages ────────────────────────────────────────

const MAX_COL_H = 660

function estimateCatHeight(group: { dishes: MepListDish[] }): number {
  let h = 20
  for (const dish of group.dishes) {
    h += 14
    if (dish.notes) h += 9
    if (dish.timing_label) h += 9
    const comps = dish.components || []
    const groups = new Set(comps.map(c => c.component_group || null))
    const numGroups = [...groups].filter(g => g !== null).length
    h += numGroups * 11
    h += comps.length * 10
    const allergenComps = comps.filter(c => c.allergens && c.allergens.trim())
    h += allergenComps.length * 8
    h += 5
  }
  return h
}

interface PageColumns {
  columns: { category: string; label: string; order: number; dishes: MepListDish[] }[][]
}

function distributeToPages(
  catGroups: { category: string; label: string; order: number; dishes: MepListDish[] }[],
  numCols: number
): PageColumns[] {
  const pages: PageColumns[] = []
  let currentPage: PageColumns = { columns: Array.from({ length: numCols }, () => []) }
  pages.push(currentPage)
  let colIdx = 0
  let colH = 0

  for (let i = 0; i < catGroups.length; i++) {
    const group = catGroups[i]
    const h = estimateCatHeight(group)
    const isMajor = !isSmallCategory(group.category)

    if (i > 0 && isMajor) {
      if (colIdx < numCols - 1) {
        colIdx++
        colH = 0
      } else if (colH > 0) {
        currentPage = { columns: Array.from({ length: numCols }, () => []) }
        pages.push(currentPage)
        colIdx = 0
        colH = 0
      }
    }

    if (colH > 0 && colH + h > MAX_COL_H) {
      if (colIdx < numCols - 1) {
        colIdx++
        colH = 0
      } else {
        currentPage = { columns: Array.from({ length: numCols }, () => []) }
        pages.push(currentPage)
        colIdx = 0
        colH = 0
      }
    }

    currentPage.columns[colIdx].push(group)
    colH += h
  }

  return pages
}

// ─── Main PDF Document ────────────────────────────────────────────────────────

export function MepListDocument({ data }: { data: MepListData }) {
  const { event, dishes } = data
  const numCols = (event.num_persons || 0) >= 60 ? 4 : 3

  const sortedDishes = [...dishes].sort((a, b) => {
    const oa = getCategoryOrder(a.category)
    const ob = getCategoryOrder(b.category)
    if (oa !== ob) return oa - ob
    return (a.sort_order || 0) - (b.sort_order || 0)
  })

  const catGroups: { category: string; label: string; order: number; dishes: MepListDish[] }[] = []
  for (const dish of sortedDishes) {
    const skipCheck = (dish.category || '').toUpperCase()
    if (skipCheck.includes('KOFFIE') || skipCheck === 'THEE') continue
    const existing = catGroups.find((g) => g.category === dish.category)
    if (existing) {
      existing.dishes.push(dish)
    } else {
      catGroups.push({
        category: dish.category,
        label: getCategoryLabel(dish.category),
        order: getCategoryOrder(dish.category),
        dishes: [dish],
      })
    }
  }
  catGroups.sort((a, b) => a.order - b.order)

  const pages = distributeToPages(catGroups, numCols)

  // Build smart allergen map
  const allergenMap = buildAllergenMap(event.allergens, dishes)
  // Set of "guest" allergens for highlighting components in dishes
  const highlightAllergens = new Set(
    allergenMap.filter(a => a.fromEvent).map(a => a.allergen)
  )

  // Header info
  const departure = event.departure_time || calcDeparture(event.kitchen_arrival_time, event.travel_time_minutes)
  const travelParts: string[] = []
  if (departure) travelParts.push(`Vertrek Mariakerke: ${departure}`)
  if (event.kitchen_arrival_time) travelParts.push(`Aankomst keuken: ${formatTime(event.kitchen_arrival_time)}`)
  if (event.venue_address) travelParts.push(event.venue_address)

  const infoParts: string[] = []
  if (event.num_persons) infoParts.push(`${event.num_persons} personen`)
  if (event.crew_persons && event.crew_persons > 0) infoParts.push(`${event.crew_persons} crew`)
  if (event.event_start_time && event.event_end_time)
    infoParts.push(`${formatTime(event.event_start_time)} – ${formatTime(event.event_end_time)}`)
  else if (event.event_start_time) infoParts.push(`Start: ${formatTime(event.event_start_time)}`)
  if (event.price_per_person) infoParts.push(`€${event.price_per_person} pp`)
  if (event.event_type) infoParts.push(translateEventType(event.event_type))

  return (
    <Document>
      {pages.map((page, pageIdx) => (
        <Page key={pageIdx} size="A4" orientation="portrait" style={S.page}>
          {/* ── Header: only on first page ── */}
          {pageIdx === 0 && (
            <View style={S.header}>
              <Text style={S.clientName}>{event.name}</Text>
              <Text style={S.headerDate}>{formatDate(event.event_date)}</Text>
              {infoParts.length > 0 && (
                <Text style={S.headerMeta}>{infoParts.join('  ·  ')}</Text>
              )}
              {event.contact_person && (
                <Text style={S.headerContact}>Contact: {event.contact_person}</Text>
              )}
              {travelParts.length > 0 && (
                <Text style={S.headerTravelLine}>{travelParts.join('  ·  ')}</Text>
              )}
              {/* Smart allergen summary */}
              {allergenMap.length > 0 && (
                <AllergenSummary allergenMap={allergenMap} />
              )}
            </View>
          )}

          {/* Continuation header for page 2+ */}
          {pageIdx > 0 && (
            <View style={{ marginBottom: 8, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#2d6a4f' }}>
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1a1a2e' }}>
                {event.name} <Text style={{ fontSize: 8, color: '#888888', fontFamily: 'Helvetica' }}>(vervolg)</Text>
              </Text>
            </View>
          )}

          {/* ── Columns ── */}
          <View style={S.columnContainer}>
            {page.columns.map((col, ci) => (
              <View key={ci} style={S.column}>
                {col.map((group, gi) => (
                  <View key={gi} style={S.categoryBlock}>
                    <Text style={S.categoryHeader}>{group.label.toUpperCase()}</Text>
                    {group.dishes.map((dish, di) => (
                      <DishCard
                        key={di}
                        dish={dish}
                        numPersons={event.num_persons || 0}
                        highlightAllergens={highlightAllergens}
                      />
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </View>

          {/* ── Footer ── */}
          <Text style={S.footer} fixed>
            SIR Catering  ·  MEP
          </Text>
        </Page>
      ))}
    </Document>
  )
}
