'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/providers/supabase-provider'
import type { Kitchen, KitchenSettings } from '@/types/database'

interface KitchenContextType {
 kitchen: Kitchen | null
 kitchenId: string | null
 kitchenType: string | null
 settings: KitchenSettings | null
 loading: boolean
 error: string | null
 refetch: () => Promise<void>
 isFeatureEnabled: (feature: string) => boolean
 getFoodCostTarget: () => { min: number; max: number }
}

const defaultSettings: KitchenSettings = {
 mode: 'restaurant',
 food_cost_target_min: 28,
 food_cost_target_max: 32,
 default_portion_style: 'fixed',
 mep_style: 'weekly_planning',
 menu_structure: 'fixed_carte',
 features: ['recipes', 'ingredients', 'mep', 'invoices', 'food_cost', 'jules_ai'],
 workflow: {
 primary_planning: 'weekly_menu',
 scaling: 'fixed_covers',
 invoice_cycle: 'weekly',
 },
}

const KitchenContext = createContext<KitchenContextType>({
 kitchen: null,
 kitchenId: null,
 kitchenType: null,
 settings: null,
 loading: true,
 error: null,
 refetch: async () => {},
 isFeatureEnabled: () => false,
 getFoodCostTarget: () => ({ min: 28, max: 32 }),
})

export function KitchenProvider({ children }: { children: React.ReactNode }) {
 const { user } = useSupabase()
 const [kitchen, setKitchen] = useState<Kitchen | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const supabase = createClient()

 const fetchKitchen = useCallback(async () => {
 if (!user) {
 setKitchen(null)
 setLoading(false)
 return
 }

 try {
 setLoading(true)
 setError(null)

 // Get chef profile first
 const { data: profile } = await supabase
 .from('chef_profiles')
 .select('id')
 .eq('auth_user_id', user.id)
 .single()

 if (!profile) {
 setError('No chef profile found')
 setLoading(false)
 return
 }

 // Get kitchen membership
 const { data: membership } = await supabase
 .from('kitchen_members')
 .select('kitchen_id')
 .eq('chef_id', profile.id)
 .limit(1)
 .single()

 if (!membership) {
 setError('No kitchen found')
 setLoading(false)
 return
 }

 // Get kitchen with settings
 const { data: kitchenData, error: kitchenError } = await supabase
 .from('kitchens')
 .select('*')
 .eq('id', membership.kitchen_id)
 .single()

 if (kitchenError) {
 setError(kitchenError.message)
 } else {
 // Merge with defaults if settings are incomplete
 const mergedSettings = {
 ...defaultSettings,
 ...(kitchenData.settings || {}),
 }
 setKitchen({ ...kitchenData, settings: mergedSettings } as Kitchen)
 }
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Failed to load kitchen')
 } finally {
 setLoading(false)
 }
 }, [user, supabase])

 useEffect(() => {
 fetchKitchen()
 }, [fetchKitchen])

 const settings = kitchen?.settings || defaultSettings

 const isFeatureEnabled = useCallback(
 (feature: string) => {
 if (!settings?.features) return true // Default: all features enabled
 return settings.features.includes(feature)
 },
 [settings]
 )

 const getFoodCostTarget = useCallback(() => {
 return {
 min: settings?.food_cost_target_min ?? 28,
 max: settings?.food_cost_target_max ?? 32,
 }
 }, [settings])

 return (
 <KitchenContext.Provider
 value={{
 kitchen,
 kitchenId: kitchen?.id ?? null,
 kitchenType: kitchen?.type ?? null,
 settings,
 loading,
 error,
 refetch: fetchKitchen,
 isFeatureEnabled,
 getFoodCostTarget,
 }}
 >
 {children}
 </KitchenContext.Provider>
 )
}

export const useKitchen = () => useContext(KitchenContext)
