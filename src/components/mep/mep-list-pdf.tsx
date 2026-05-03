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
  }
  dishes: MepListDish[]
}

// ─── Category ordering ────────────────────────────────────────────────────────

function getCategoryOrder(cat: string): number {
  const c = (cat || '').toUpperCase().trim()
  if (c.includes('MIDDAG')) {
    if (c.includes('FINGERFOOD')) return 21
    if (c.includes('FINGERBITES')) return 31
    if (c.includes('HAPJES') || c.includes('HAPJE')) return 41
    if (c.includes('AMUSE')) return 51
    if (c.includes('DESSERT')) return 92
    return 25
  }
  if (c.includes('APERO')) {
    if (c.includes('FINGERFOOD')) return 22
    if (c.includes('FINGERBITES')) return 32
    if (c.includes('HAPJES') || c.includes('HAPJE')) return 42
    if (c.includes('AMUSE')) return 52
    if (c.includes('DESSERT')) return 93
    return 26
  }
  if (c.includes('WALKING')) {
    if (c.includes('VOOR')) return 63
    if (c.includes('HOOFD')) return 83
    if (c.includes('DESSERT')) return 94
    return 75
  }
  if (c.includes('FOODSTAND')) return 76
  if (c.includes('BARISTA')) return 201
  if (c === 'DRANKEN' || c.includes('MOCKTAIL') || c.includes('COCKTAIL')) return 10
  if (c === 'FINGERFOOD') return 20
  if (c === 'FINGERBITES') return 30
  if (c === 'HAPJES' || c === 'HAPJE' || c === 'HAPJES_WARM' || c === 'APPETIZERS') return 40
  if (c === 'AMUSE') return 50
  if (c === 'VOORGERECHT') return 60
  if (c === 'TUSSENGERECHT') return 70
  if (c === 'HOOFDGERECHT') return 80
  if (c === 'ON THE SIDE' || c === 'SAUZEN' || c.includes('BIJGERECHT')) return 85
  if (c === 'KAAS') return 88
  if (c === 'DESSERT') return 90
  if (c === 'PETITS FOURS' || c === 'PETIT FOURS') return 95
  if (c === 'AFTER SNACKS' || c === 'BBQ' || c === 'BUFFET') return 98
  if (c === 'MIGNARDISES') return 200
  if (c === 'HALFABRICAAT') return 250
  return 99
}

const CATEGORY_LABELS: Record<string, string> = {
  DRANKEN: 'Dranken',
  FINGERFOOD: 'Fingerfood',
  FINGERBITES: 'Fingerbites',
  HAPJES: 'Hapjes',
  HAPJE: 'Hapjes',
  APPETIZERS: 'Hapjes',
  AMUSE: 'Amuse',
  VOORGERECHT: 'Voorgerecht',
  TUSSENGERECHT: 'Tussengerecht',
  HOOFDGERECHT: 'Hoofdgerecht',
  'ON THE SIDE': 'On the side',
  SAUZEN: 'Sauzen',
  KAAS: 'Kaas',
  DESSERT: 'Dessert',
  'PETITS FOURS': 'Petits fours',
  'PETIT FOURS': 'Petits fours',
  MIGNARDISES: 'Mignardises',
  HALFABRICAAT: 'Halfabricaat',
  BBQ: 'BBQ',
  BUFFET: 'Buffet',
  'AFTER SNACKS': 'After snacks',
}

function getCategoryLabel(cat: string): string {
  const upper = (cat || '').toUpperCase().trim()
  return CATEGORY_LABELS[upper] || cat
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
    paddingTop: 22,
    paddingBottom: 26,
    paddingHorizontal: 18,
    fontSize: 8,
    color: '#1C1008',
  },

  // Header
  header: {
    marginBottom: 8,
    paddingBottom: 7,
    borderBottomWidth: 1.5,
    borderBottomColor: '#2d6a4f',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a2e',
    letterSpacing: 0.3,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerDate: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#2d6a4f',
  },
  headerMeta: {
    fontSize: 8.5,
    color: '#4A3728',
    marginTop: 2,
  },
  headerContact: {
    fontSize: 7.5,
    color: '#888888',
    marginTop: 2,
  },
  headerTravelRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 3,
  },
  headerTravelItem: {
    fontSize: 7.5,
    color: '#1d4ed8',
    fontFamily: 'Helvetica-Bold',
  },

  // Columns
  columnContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  column: {
    flex: 1,
  },

  // Category header
  categoryBlock: {
    marginTop: 5,
    marginBottom: 3,
  },
  categoryHeader: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a2e',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingBottom: 2,
    borderBottomWidth: 0.8,
    borderBottomColor: '#2d6a4f',
    marginBottom: 3,
  },

  // Dish block
  dishBlock: {
    marginBottom: 5,
  },
  dishNotes: {
    fontSize: 9,
    color: '#b45309',
    fontFamily: 'Helvetica-Oblique',
    marginBottom: 1,
  },
  dishTitle: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a2e',
    marginBottom: 2,
    spaceBefore: 4,
  },
  dishTiming: {
    fontSize: 7.5,
    color: '#888888',
    marginBottom: 2,
  },

  // Components
  componentGroup: {
    marginTop: 2,
    marginBottom: 1,
  },
  componentGroupHeader: {
    fontSize: 9.5,
    color: '#888888',
    fontFamily: 'Helvetica-BoldOblique',
    paddingBottom: 1,
    marginBottom: 2,
  },
  componentRow: {
    flexDirection: 'row',
    marginBottom: 1,
    flexWrap: 'wrap',
  },
  // Bullet dot
  componentBullet: {
    fontSize: 10,
    color: '#1a1a2e',
    marginRight: 2,
    width: 8,
  },
  // Component name (main text, dark)
  componentName: {
    fontSize: 10,
    color: '#1a1a2e',
    flex: 1,
  },
  // Grammage inline after name, gray
  componentQtyInline: {
    fontSize: 9,
    color: '#888888',
  },
  componentPrep: {
    fontSize: 9,
    fontFamily: 'Helvetica-Oblique',
    color: '#666666',
    marginLeft: 10,
    marginBottom: 1,
  },
  dishSpacer: {
    height: 8,
  },

  // Footer
  footer: {
    marginTop: 10,
    fontSize: 6.5,
    color: '#B8997A',
    textAlign: 'center',
  },
})

// ─── Dish Component ───────────────────────────────────────────────────────────

function DishCard({ dish }: { dish: MepListDish }) {
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
    <View style={S.dishBlock}>
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
            return (
              <View key={ci}>
                <View style={S.componentRow}>
                  <Text style={S.componentBullet}>·</Text>
                  <Text style={S.componentName}>
                    {comp.component_name}
                    {qtyStr ? (
                      <Text style={S.componentQtyInline}>{' '}({qtyStr})</Text>
                    ) : null}
                  </Text>
                </View>
                {comp.preparation && (
                  <Text style={S.componentPrep}>{comp.preparation}</Text>
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

  interface CatGroup {
    category: string
    label: string
    order: number
    dishes: MepListDish[]
  }
  const catGroups: CatGroup[] = []
  for (const dish of sortedDishes) {
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

  type RenderItem =
    | { type: 'category'; label: string }
    | { type: 'dish'; dish: MepListDish }

  const items: RenderItem[] = []
  for (const group of catGroups) {
    items.push({ type: 'category', label: group.label })
    for (const dish of group.dishes) {
      items.push({ type: 'dish', dish })
    }
  }

  // Distribute across columns
  const columns: RenderItem[][] = Array.from({ length: numCols }, () => [])
  let colIdx = 0
  let i = 0
  while (i < items.length) {
    const item = items[i]
    if (item.type === 'category') {
      columns[colIdx].push(item)
      i++
      if (i < items.length && items[i].type === 'dish') {
        columns[colIdx].push(items[i])
        i++
      }
    } else {
      columns[colIdx].push(item)
      i++
    }
    colIdx = (colIdx + 1) % numCols
  }

  // Travel line
  const departure = calcDeparture(event.kitchen_arrival_time, null)
  const travelParts: string[] = []
  if (departure) travelParts.push(`Vertrek Mariakerke: ${departure}`)
  if (event.kitchen_arrival_time) travelParts.push(`Aankomst keuken: ${formatTime(event.kitchen_arrival_time)}`)
  if (event.venue_address) travelParts.push(event.venue_address)

  // Info line
  const infoParts: string[] = []
  if (event.num_persons) infoParts.push(`${event.num_persons} pers.`)
  if (event.event_start_time && event.event_end_time)
    infoParts.push(`${formatTime(event.event_start_time)} – ${formatTime(event.event_end_time)}`)
  else if (event.event_start_time) infoParts.push(`Start: ${formatTime(event.event_start_time)}`)
  if (event.price_per_person) infoParts.push(`€${event.price_per_person} pp`)
  if (event.event_type) infoParts.push(translateEventType(event.event_type))

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={S.page}>
        {/* ── Header ── */}
        <View style={S.header}>
          <View style={S.headerTop}>
            <Text style={S.clientName}>{event.name}</Text>
            <View style={S.headerRight}>
              <Text style={S.headerDate}>{formatDate(event.event_date)}</Text>
            </View>
          </View>

          {infoParts.length > 0 && (
            <Text style={S.headerMeta}>{infoParts.join('  ·  ')}</Text>
          )}
          {event.contact_person && (
            <Text style={S.headerContact}>Contact: {event.contact_person}</Text>
          )}
          {travelParts.length > 0 && (
            <View style={S.headerTravelRow}>
              {travelParts.map((p, i) => (
                <Text key={i} style={S.headerTravelItem}>{p}</Text>
              ))}
            </View>
          )}
        </View>

        {/* ── Columns ── */}
        <View style={S.columnContainer}>
          {columns.map((col, ci) => (
            <View key={ci} style={S.column}>
              {col.map((item, ii) => {
                if (item.type === 'category') {
                  return (
                    <View key={ii} style={S.categoryBlock}>
                      <Text style={S.categoryHeader}>{item.label.toUpperCase()}</Text>
                    </View>
                  )
                }
                return <DishCard key={ii} dish={item.dish} />
              })}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}
