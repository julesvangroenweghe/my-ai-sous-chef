import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Ingredient {
  ingredient_name: string
  quantity_per_person: number
  total_quantity: number
  unit: string
  cost_per_unit: number
  grammage_warning?: boolean
}

interface Component {
  component_name: string
  ingredients: Ingredient[]
}

interface Course {
  course: string
  course_label?: string
  course_order: number
  category_sort_order?: number
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
  categories?: Array<{ code: string; label: string; sort_order: number }>
  totals: {
    food_cost_per_person: number
    total_food_cost: number
    food_cost_percentage: number
  }
}

// ─── Category sort order ──────────────────────────────────────────────────────

const MEP_CATEGORY_ORDER: Record<string, number> = {
  DRANKEN: 10,
  FINGERFOOD: 20,
  FINGERBITES: 30,
  HAPJES: 40,
  AMUSE: 50,
  VOORGERECHT: 60,
  TUSSENGERECHT: 70,
  HOOFDGERECHT: 80,
  DESSERT: 90,
  KAAS: 100,
  MIGNARDISES: 200,
  HALFABRICAAT: 250,
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

function getCategoryLabel(courseCode: string, categories?: MepData['categories']): string {
  const code = courseCode.toUpperCase().trim()
  if (categories) {
    const cat = categories.find((c) => c.code === code)
    if (cat) return cat.label
  }
  // Fallback labels
  const labels: Record<string, string> = {
    DRANKEN: 'Dranken',
    FINGERFOOD: 'Fingerfood',
    FINGERBITES: 'Fingerbites',
    HAPJES: 'Hapjes',
    AMUSE: 'Amuse',
    VOORGERECHT: 'Voorgerecht',
    TUSSENGERECHT: 'Tussengerecht',
    HOOFDGERECHT: 'Hoofdgerecht',
    DESSERT: 'Dessert',
    KAAS: 'Kaas',
    MIGNARDISES: 'Mignardises',
    HALFABRICAAT: 'Halfabricaat',
  }
  return labels[code] || courseCode
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
  amberDark: '#92400E',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: colors.white,
    paddingTop: 28,
    paddingBottom: 32,
    paddingHorizontal: 22,
    fontSize: 8,
    color: colors.black,
  },

  // ── Header
  header: {
    marginBottom: 14,
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
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: colors.black,
    letterSpacing: 0.5,
    maxWidth: 280,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerDate: {
    fontSize: 8,
    color: colors.gray600,
    textAlign: 'right',
  },
  headerMeta: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.gray100,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 4,
  },
  metaLabel: {
    fontSize: 6.5,
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: colors.black,
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.amberLight,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 4,
  },
  costValue: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: colors.amberDark,
  },

  // ── Column layout
  columnContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  column: {
    flex: 1,
  },

  // ── Category separator
  categorySection: {
    marginBottom: 2,
  },
  categorySeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 8,
  },
  categoryLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: colors.gray200,
  },
  categoryLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: colors.amber,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginHorizontal: 6,
  },

  // ── Course block
  courseBlock: {
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: colors.gray200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  courseHeader: {
    backgroundColor: colors.black,
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  courseHeaderLeft: {
    flex: 1,
  },
  recipeName: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: colors.white,
  },
  servingSize: {
    fontSize: 6.5,
    color: colors.gray400,
    marginTop: 1,
  },
  courseHeaderRight: {
    alignItems: 'flex-end',
    marginLeft: 6,
  },
  courseCostPp: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: colors.amber,
  },
  courseBody: {
    paddingHorizontal: 7,
    paddingVertical: 5,
  },

  // ── Component group
  componentLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: colors.amber,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    marginTop: 4,
  },
  componentLabelFirst: {
    marginTop: 0,
  },

  // ── Ingredient row
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 1.5,
    borderBottomWidth: 0.3,
    borderBottomColor: colors.gray200,
  },
  ingredientName: {
    flex: 1,
    fontSize: 7.5,
    color: colors.black,
  },
  ingredientQpp: {
    width: 32,
    fontSize: 6.5,
    color: colors.gray400,
    textAlign: 'right',
  },
  ingredientTotal: {
    width: 38,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: colors.black,
    textAlign: 'right',
  },

  // ── Space between dishes
  dishSpacer: {
    height: 3,
  },

  // ── Footer
  footer: {
    marginTop: 14,
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: colors.black,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  footerLeft: {},
  footerLabel: {
    fontSize: 6.5,
    color: colors.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: colors.black,
    marginTop: 1,
  },
  footerSubValue: {
    fontSize: 8,
    color: colors.gray600,
    marginTop: 2,
  },
  footerRight: {
    alignItems: 'flex-end',
  },
  footerPct: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
  },
  generatedAt: {
    fontSize: 6,
    color: colors.gray400,
    marginTop: 6,
    textAlign: 'center',
  },

  // VAT lines
  vatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  vatLabel: {
    fontSize: 7,
    color: colors.gray400,
  },
  vatValue: {
    fontSize: 7,
    color: colors.gray600,
    fontFamily: 'Helvetica-Bold',
  },
})

// ─── Course Card Component ────────────────────────────────────────────────────

function CourseCard({ course }: { course: Course }) {
  return (
    <View style={styles.courseBlock}>
      <View style={styles.courseHeader}>
        <View style={styles.courseHeaderLeft}>
          <Text style={styles.recipeName}>{course.recipe_name}</Text>
        </View>
        {course.cost_per_person > 0 && (
          <View style={styles.courseHeaderRight}>
            <Text style={styles.courseCostPp}>{formatEur(course.cost_per_person)}/p</Text>
          </View>
        )}
      </View>
      <View style={styles.courseBody}>
        {course.components.length === 0 ? (
          <View style={styles.ingredientRow}>
            <Text style={styles.ingredientName}>Geen componenten</Text>
          </View>
        ) : (
          course.components.map((comp, ci) => (
            <View key={ci}>
              <Text style={[styles.componentLabel, ci === 0 ? styles.componentLabelFirst : {}]}>
                {comp.component_name}
              </Text>
              {comp.ingredients.map((ing, ii) => (
                <View key={ii} style={styles.ingredientRow}>
                  <Text style={styles.ingredientName}>
                    {ing.ingredient_name}
                    {ing.grammage_warning ? ' !' : ''}
                  </Text>
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
      </View>
    </View>
  )
}

// ─── Main PDF Document ────────────────────────────────────────────────────────

export function MepPdfDocument({ data }: { data: MepData }) {
  const { event, courses, totals, categories } = data
  const numCols = event.num_persons >= 60 ? 4 : 3

  // Sort courses by category sort_order (MIGNARDISES=200 always last, HALFABRICAAT=250 absolute last)
  const sortedCourses = [...courses].sort((a, b) => {
    const aSortOrder =
      a.category_sort_order ||
      MEP_CATEGORY_ORDER[a.course.toUpperCase().trim()] ||
      (a.course_order || 50) * 10
    const bSortOrder =
      b.category_sort_order ||
      MEP_CATEGORY_ORDER[b.course.toUpperCase().trim()] ||
      (b.course_order || 50) * 10
    if (aSortOrder !== bSortOrder) return aSortOrder - bSortOrder
    return a.course_order - b.course_order
  })

  // Group courses by category for display with separators
  interface CategoryGroup {
    code: string
    label: string
    sortOrder: number
    courses: Course[]
  }

  const categoryGroups: CategoryGroup[] = []
  for (const course of sortedCourses) {
    const code = course.course.toUpperCase().trim()
    const existing = categoryGroups.find((g) => g.code === code)
    if (existing) {
      existing.courses.push(course)
    } else {
      const sortOrder =
        course.category_sort_order ||
        MEP_CATEGORY_ORDER[code] ||
        (course.course_order || 50) * 10
      categoryGroups.push({
        code,
        label: getCategoryLabel(course.course, categories),
        sortOrder,
        courses: [course],
      })
    }
  }
  categoryGroups.sort((a, b) => a.sortOrder - b.sortOrder)

  // Build flat list of render items (category header + courses)
  type RenderItem =
    | { type: 'category_header'; label: string }
    | { type: 'course'; course: Course }

  const renderItems: RenderItem[] = []
  for (const group of categoryGroups) {
    renderItems.push({ type: 'category_header', label: group.label })
    for (const course of group.courses) {
      renderItems.push({ type: 'course', course })
    }
  }

  // Distribute render items across columns
  const columns: RenderItem[][] = Array.from({ length: numCols }, () => [])
  renderItems.forEach((item, i) => {
    columns[i % numCols].push(item)
  })

  // Calculate VAT breakdown for footer
  const vatFood = totals.total_food_cost * 0.12
  const totalInclVat = totals.total_food_cost + vatFood

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.eventName}>{event.name}</Text>
            <View style={styles.headerRight}>
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
                <Text style={styles.costValue}>{formatEur(totals.food_cost_per_person)}/p</Text>
              </View>
            )}
            {totals.food_cost_percentage > 0 && (
              <View style={styles.costBadge}>
                <Text style={styles.metaLabel}>FC%</Text>
                <Text style={styles.costValue}>{totals.food_cost_percentage.toFixed(1)}%</Text>
              </View>
            )}
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>Kolommen</Text>
              <Text style={styles.metaValue}>{numCols}</Text>
            </View>
          </View>
        </View>

        {/* ── Column layout ── */}
        <View style={styles.columnContainer}>
          {columns.map((col, colIdx) => (
            <View key={colIdx} style={styles.column}>
              {col.map((item, itemIdx) => {
                if (item.type === 'category_header') {
                  return (
                    <View key={itemIdx} style={styles.categorySeparator}>
                      <View style={styles.categoryLine} />
                      <Text style={styles.categoryLabel}>{item.label}</Text>
                      <View style={styles.categoryLine} />
                    </View>
                  )
                }
                return (
                  <View key={itemIdx}>
                    <CourseCard course={item.course} />
                    <View style={styles.dishSpacer} />
                  </View>
                )
              })}
            </View>
          ))}
        </View>

        {/* ── Footer ── */}
        {totals.total_food_cost > 0 && (
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerLabel}>Totale food cost</Text>
              <Text style={styles.footerValue}>{formatEur(totals.total_food_cost)}</Text>
              <View style={styles.vatRow}>
                <Text style={styles.vatLabel}>excl. BTW (12%): </Text>
                <Text style={styles.vatValue}>{formatEur(totals.total_food_cost)}</Text>
              </View>
              <View style={styles.vatRow}>
                <Text style={styles.vatLabel}>incl. BTW (12%): </Text>
                <Text style={styles.vatValue}>{formatEur(totalInclVat)}</Text>
              </View>
              <Text style={[styles.footerSubValue, { marginTop: 3 }]}>
                {formatEur(totals.food_cost_per_person)} per persoon — {event.num_persons} pax
              </Text>
            </View>
            {totals.food_cost_percentage > 0 && (
              <View style={styles.footerRight}>
                <Text style={styles.footerLabel}>Food Cost %</Text>
                <Text
                  style={[
                    styles.footerPct,
                    {
                      color:
                        totals.food_cost_percentage < 30
                          ? '#10b981'
                          : totals.food_cost_percentage <= 35
                          ? colors.amber
                          : '#ef4444',
                    },
                  ]}
                >
                  {totals.food_cost_percentage.toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.generatedAt}>
          Gegenereerd op{' '}
          {new Date().toLocaleDateString('nl-BE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}{' '}
          — My AI Sous Chef
        </Text>
      </Page>
    </Document>
  )
}
