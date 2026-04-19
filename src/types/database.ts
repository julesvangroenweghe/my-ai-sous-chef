// Database types matching Supabase schema

export interface ChefProfile {
 id: string
 auth_user_id: string
 display_name: string
 bio: string | null
 cuisine_styles: string[]
 signature_techniques: string[]
 preferred_ingredients: string[]
 avoided_ingredients: string[]
 cooking_philosophy: string | null
 years_experience: number | null
 current_role: string | null
 avatar_url: string | null
 is_public: boolean
 created_at: string
 updated_at: string
}

export interface ChefMemory {
 id: string
 chef_id: string
 memory_type: 'preference' | 'technique' | 'style' | 'feedback' | 'note'
 content: string
 context: Record<string, unknown> | null
 importance: number
 created_at: string
}

export interface KitchenSettings {
 mode: string
 food_cost_target_min: number
 food_cost_target_max: number
 default_portion_style: string
 mep_style: string
 menu_structure: string
 features: string[]
 workflow: {
 primary_planning: string
 scaling: string
 invoice_cycle: string
 }
}

export type KitchenType = 'restaurant' | 'brasserie' | 'hotel' | 'catering' | 'foodtruck' | 'school' | 'group' | 'dark_kitchen' | 'popup'

export interface Kitchen {
 id: string
 name: string
 type: KitchenType
 description: string | null
 address: string | null
 logo_url: string | null
 subscription_tier: 'free' | 'kitchen' | 'group'
 settings: KitchenSettings
 created_at: string
 updated_at: string
}

export interface KitchenModeDefault {
 id: string
 kitchen_type: KitchenType
 display_name: string
 description: string
 icon: string
 default_settings: KitchenSettings
 nav_items: string[]
}

export interface KitchenMember {
 id: string
 chef_id: string
 kitchen_id: string
 role: 'owner' | 'head_chef' | 'sous_chef' | 'cook' | 'manager'
 invited_at: string | null
 joined_at: string | null
 created_at: string
 updated_at: string
}

export interface Recipe {
 id: string
 kitchen_id: string
 chef_id: string | null
 category_id: string | null
 subcategory_id: string | null
 name: string
 description: string | null
 servings: number | null
 prep_time_minutes: number | null
 is_active: boolean
 notes: string | null
 total_cost_per_serving: number | null
 selling_price: number | null
 food_cost_percentage: number | null
 created_at: string
 updated_at: string
 // Joined relations
 category?: RecipeCategory
 subcategory?: RecipeSubcategory
 components?: RecipeComponent[]
}

export interface RecipeComponent {
 id: string
 recipe_id: string
 name: string
 sort_order: number
 notes: string | null
 created_at: string
 updated_at: string
 // Joined relations
 ingredients?: RecipeComponentIngredient[]
}

export interface RecipeComponentIngredient {
 id: string
 component_id: string
 ingredient_id: string
 quantity: number
 unit: string
 notes: string | null
 cost_per_unit: number | null
 created_at: string
 updated_at: string
 // Joined relations
 ingredient?: Ingredient
}

export interface RecipeCategory {
 id: string
 name: string
 sort_order: number
 created_at: string
 updated_at: string
 subcategories?: RecipeSubcategory[]
}

export interface RecipeSubcategory {
 id: string
 category_id: string
 name: string
 sort_order: number
 created_at: string
 updated_at: string
}

export interface Ingredient {
 id: string
 kitchen_id: string | null
 name: string
 category: string | null
 unit: string | null
 current_price: number | null
 supplier: string | null
 last_updated: string | null
 created_at: string
 updated_at: string
}

export interface IngredientPrice {
 id: string
 ingredient_id: string
 price: number
 source: string | null
 invoice_id: string | null
 recorded_at: string
 created_at: string
 updated_at: string
}

export interface Invoice {
 id: string
 kitchen_id: string
 supplier_name: string | null
 invoice_date: string | null
 total_amount: number | null
 image_url: string | null
 ocr_status: 'pending' | 'processing' | 'completed' | 'failed'
 ocr_data: Record<string, unknown> | null
 created_at: string
 updated_at: string
}

export interface Event {
 id: string
 kitchen_id: string
 name: string
 event_date: string
 event_type: 'walking_dinner' | 'buffet' | 'sit_down' | 'cocktail' | 'brunch' | 'daily_service' | 'tasting'
 num_persons: number | null
 price_per_person: number | null
 location: string | null
 contact_person: string | null
 departure_time: string | null
 arrival_time: string | null
 notes: string | null
 status: 'draft' | 'confirmed' | 'in_prep' | 'completed' | 'cancelled'
 created_at: string
 updated_at: string
 // Joined relations
 menu_items?: EventMenuItem[]
 dietary_flags?: EventDietaryFlag[]
}

export interface EventMenuItem {
 id: string
 event_id: string
 recipe_id: string
 course_order: number
 created_at: string
 updated_at: string
 // Joined relations
 recipe?: Recipe
}

export interface EventDietaryFlag {
 id: string
 event_id: string
 flag_name: string
 guest_name: string | null
 notes: string | null
 created_at: string
 updated_at: string
}

export interface MepPlan {
 id: string
 event_id: string
 generated_at: string
 pdf_url: string | null
 status: 'generating' | 'ready' | 'outdated'
 created_at: string
 updated_at: string
}

export interface WeeklyMepPlan {
 id: string
 kitchen_id: string
 week_number: number
 year: number
 event_ids: string[]
 generated_at: string
 pdf_url: string | null
 created_at: string
 updated_at: string
}

export interface JulesSuggestion {
 id: string
 chef_id: string
 kitchen_id: string | null
 suggestion_type: 'recipe_idea' | 'cost_alert' | 'seasonal_ingredient' | 'menu_rotation' | 'supplier_alternative' | 'prep_optimization'
 title: string
 body: string
 data: Record<string, unknown>
 priority: 'low' | 'medium' | 'high' | 'urgent'
 status: 'pending' | 'seen' | 'accepted' | 'dismissed'
 created_at: string
 updated_at: string
}
