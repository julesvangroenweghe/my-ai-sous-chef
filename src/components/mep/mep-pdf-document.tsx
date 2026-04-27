import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Ingredient {
  ingredient_name: string
  quantity_per_person: number
  total_quantity: number
  unit: string
  cost_per_unit: number
}

interface Component {
  component_name: string
  ingredients: Ingredient[]
}

interface Course {
  course: string
  course_order: number
  recipe_name: string
  cost_per_person: number
  total_cost: number
  components: Component[]
}

interface MepData {
  event: {
    name: string
    event_date: string
    num_persons: number
    event_type: string
    location: string | null
    price_per_person: number | null
  }
  courses: Course[]
  totals: {
    food_cost_per_person: number
    total_food_cost: number
    food_cost_percentage: number
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('nl-BE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatQty(qty: number, unit: string): string {
  if (qty >= 1000 && (unit === 'g' || unit === 'ml')) {
    const converted = qty / 1000
    const u = unit === 'g' ? 'kg' : 'L'
    return `${converted % 1 === 0 ? converted : converted.toFixed(2)} ${u}`
  }
  return `${qty % 1 === 0 ? qty : qty.toFixed(1)} ${unit}`
}

function formatEur(val: number) {
  return `€${val.toFixed(2).replace('.', ',')}`
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const colors = {
  black: '#0D0C0A',
  amber: '#E8A040',
  amberLight: '#FEF3C7',
  gray100: '#F5F5F4',
  gray200: '#E7E5E4',
  gray400: '#A8A29E',
  gray600: '#57534E',
  gray800: '#292524',
  white: '#FFFFFF',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: colors.white,
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 24,
    fontSize: 8,
    color: colors.black,
  },

  // ── Header
  header: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.amber,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  eventName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: colors.black,
    letterSpacing: 0.5,
  },
  headerDate: {
    fontSize: 9,
    color: colors.gray600,
    textAlign: 'right',
  },
  headerMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.gray100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  metaLabel: {
    fontSize: 7,
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: colors.black,
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.amberLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  costValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#92400E',
  },

  // ── Column layout
  columnContainer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  column: {
    flex: 1,
  },

  // ── Course block
  courseBlock: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  courseHeader: {
    backgroundColor: colors.black,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  courseLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: colors.amber,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recipeName: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.white,
    marginTop: 1,
  },
  courseBody: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  // ── Component group
  componentLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: colors.amber,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
    marginTop: 5,
  },
  componentLabelFirst: {
    marginTop: 0,
  },

  // ── Ingredient row
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.gray200,
  },
  ingredientName: {
    flex: 1,
    fontSize: 8,
    color: colors.black,
  },
  ingredientQpp: {
    width: 36,
    fontSize: 7,
    color: colors.gray600,
    textAlign: 'right',
    fontFamily: 'Helvetica',
  },
  ingredientTotal: {
    width: 42,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: colors.black,
    textAlign: 'right',
  },

  // ── Course cost footer
  courseCost: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 4,
    marginTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: colors.gray200,
  },
  courseCostText: {
    fontSize: 7,
    color: colors.gray600,
  },
  courseCostValue: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: colors.black,
    marginLeft: 4,
  },

  // ── Footer
  footer: {
    marginTop: 14,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: colors.black,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 7,
    color: colors.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: colors.black,
  },
  footerPct: {
    fontSize: 9,
    color: colors.gray600,
    marginTop: 2,
  },
  footerRight: {
    alignItems: 'flex-end',
  },
  generatedAt: {
    fontSize: 6,
    color: colors.gray400,
    marginTop: 6,
    textAlign: 'center',
  },
})

// ─── Component ────────────────────────────────────────────────────────────────

function CourseCard({ course }: { course: Course }) {
  return (
    <View style={styles.courseBlock}>
      <View style={styles.courseHeader}>
        <Text style={styles.courseLabel}>{course.course.toUpperCase()}</Text>
        <Text style={styles.recipeName}>{course.recipe_name}</Text>
      </View>
      <View style={styles.courseBody}>
        {course.components.length === 0 ? (
          <View style={styles.ingredientRow}>
            <Text style={styles.ingredientName}>Geen componenten</Text>
            <Text style={styles.ingredientTotal}>{formatEur(course.cost_per_person)}/p</Text>
          </View>
        ) : (
          course.components.map((comp, ci) => (
            <View key={ci}>
              <Text style={[styles.componentLabel, ci === 0 ? styles.componentLabelFirst : {}]}>
                {comp.component_name}
              </Text>
              {comp.ingredients.map((ing, ii) => (
                <View key={ii} style={styles.ingredientRow}>
                  <Text style={styles.ingredientName}>{ing.ingredient_name}</Text>
                  <Text style={styles.ingredientQpp}>
                    {ing.quantity_per_person}
                    {ing.unit}/p
                  </Text>
                  <Text style={styles.ingredientTotal}>
                    {formatQty(ing.total_quantity, ing.unit)}
                  </Text>
                </View>
              ))}
            </View>
          ))
        )}
        {course.cost_per_person > 0 && (
          <View style={styles.courseCost}>
            <Text style={styles.courseCostText}>Kostprijs:</Text>
            <Text style={styles.courseCostValue}>{formatEur(course.cost_per_person)}/p</Text>
          </View>
        )}
      </View>
    </View>
  )
}

export function MepPdfDocument({ data }: { data: MepData }) {
  const { event, courses, totals } = data
  const numCols = event.num_persons >= 60 ? 4 : 3

  // Distribute courses across columns (roughly evenly)
  const columns: Course[][] = Array.from({ length: numCols }, () => [])
  courses.forEach((course, i) => {
    columns[i % numCols].push(course)
  })

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.eventName}>{event.name}</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.headerDate}>{formatDate(event.event_date)}</Text>
              {event.location && (
                <Text style={[styles.headerDate, { marginTop: 2 }]}>{event.location}</Text>
              )}
            </View>
          </View>
          <View style={styles.headerMeta}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>Pax</Text>
              <Text style={styles.metaValue}>{event.num_persons}</Text>
            </View>
            {totals.food_cost_per_person > 0 && (
              <View style={styles.costBadge}>
                <Text style={styles.metaLabel}>Food Cost</Text>
                <Text style={styles.costValue}>
                  {formatEur(totals.food_cost_per_person)}/p
                </Text>
              </View>
            )}
            {totals.food_cost_percentage > 0 && (
              <View style={styles.costBadge}>
                <Text style={styles.metaLabel}>FC%</Text>
                <Text style={styles.costValue}>{totals.food_cost_percentage.toFixed(1)}%</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Column layout ── */}
        <View style={styles.columnContainer}>
          {columns.map((col, colIdx) => (
            <View key={colIdx} style={styles.column}>
              {col.map((course, courseIdx) => (
                <CourseCard key={courseIdx} course={course} />
              ))}
            </View>
          ))}
        </View>

        {/* ── Footer ── */}
        {totals.total_food_cost > 0 && (
          <View style={styles.footer}>
            <View>
              <Text style={styles.footerLabel}>Totale voedselkost</Text>
              <Text style={styles.footerValue}>{formatEur(totals.total_food_cost)}</Text>
              {totals.food_cost_percentage > 0 && (
                <Text style={styles.footerPct}>
                  Food cost %: {totals.food_cost_percentage.toFixed(1)}%
                </Text>
              )}
            </View>
            <View style={styles.footerRight}>
              <Text style={styles.footerLabel}>Per persoon</Text>
              <Text style={styles.footerValue}>{formatEur(totals.food_cost_per_person)}</Text>
            </View>
          </View>
        )}

        <Text style={styles.generatedAt}>
          Gegenereerd op {new Date().toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })} — My AI Sous Chef
        </Text>
      </Page>
    </Document>
  )
}
