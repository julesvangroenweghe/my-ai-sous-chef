// MEP (Mise en Place) specific types for event planning & generation

export const COURSE_CATEGORIES = [
  'Drinks',
  'Fingerfood',
  'Appetizers',
  'Main Course',
  'Walking Dinner',
  'Buffet Items',
  'Dessert',
  'Mignardises',
  'Dips & Sauces',
  'Side Dishes',
] as const

export type CourseCategory = (typeof COURSE_CATEGORIES)[number]

export const EVENT_TYPES = [
  'walking_dinner',
  'buffet',
  'sit_down',
  'cocktail',
  'brunch',
  'daily_service',
  'tasting',
] as const

export type EventType = (typeof EVENT_TYPES)[number]

export const EVENT_STATUSES = ['draft', 'confirmed', 'in_prep', 'completed', 'cancelled'] as const
export type EventStatus = (typeof EVENT_STATUSES)[number]

export type TimingCategory = 'advance' | 'day_of' | 'on_stand'

// --- Generated MEP structures ---

export interface MepPlanGenerated {
  id: string
  event_id: string
  generated_at: string
  total_cost: number
  cost_per_person: number
  sections: MepSection[]
}

export interface MepSection {
  course_category: string
  items: MepItem[]
}

export interface MepItem {
  recipe_name: string
  recipe_id: string
  components: MepComponentDetail[]
  total_grams_per_person: number
}

export interface MepComponentDetail {
  component_name: string
  ingredients: MepIngredientDetail[]
  timing: TimingCategory
}

export interface MepIngredientDetail {
  name: string
  quantity_per_person: number
  quantity_total: number
  unit: string
  cost_per_unit: number
  total_cost: number
  category?: string
}

// --- Shopping list aggregation ---

export interface ShoppingListItem {
  ingredient_name: string
  category: string
  total_quantity: number
  unit: string
  estimated_cost: number
  used_in: string[] // recipe names
}

export interface ShoppingListGroup {
  category: string
  items: ShoppingListItem[]
  subtotal: number
}

// --- Event form data ---

export interface EventFormData {
  name: string
  event_date: string
  event_type: EventType
  num_persons: number | null
  price_per_person: number | null
  location: string
  contact_person: string
  departure_time: string
  arrival_time: string
  notes: string
  status: EventStatus
}

export interface MenuItemFormData {
  recipe_id: string
  course_category: string
  sort_order: number
  notes?: string
}
