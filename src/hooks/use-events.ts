'use client'

import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Event, EventMenuItem } from '@/types/database'
import type { EventFormData, MenuItemFormData } from '@/types/mep'

interface EventFilters {
 search?: string
 status?: string
 event_type?: string
 date_from?: string
 date_to?: string
}

export function useEvents() {
 const supabase = createClient()
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState<string | null>(null)

 const getEvents = useCallback(async (filters?: EventFilters) => {
 setLoading(true)
 setError(null)
 try {
 let query = supabase
 .from('events')
 .select('*')
 .order('event_date', { ascending: true })

 if (filters?.search) {
 query = query.ilike('name', `%${filters.search}%`)
 }
 if (filters?.status) {
 query = query.eq('status', filters.status)
 }
 if (filters?.event_type) {
 query = query.eq('event_type', filters.event_type)
 }
 if (filters?.date_from) {
 query = query.gte('event_date', filters.date_from)
 }
 if (filters?.date_to) {
 query = query.lte('event_date', filters.date_to)
 }

 const { data, error: fetchError } = await query
 if (fetchError) throw fetchError
 return (data || []) as Event[]
 } catch (err) {
 const msg = err instanceof Error ? err.message : 'Failed to fetch events'
 setError(msg)
 return []
 } finally {
 setLoading(false)
 }
 }, [])

 const getEvent = useCallback(async (id: string) => {
 setLoading(true)
 setError(null)
 try {
 const { data, error: fetchError } = await supabase
 .from('events')
 .select(`
 *,
 menu_items:event_menu_items(
 *,
 recipe:recipes(
 *,
 category:recipe_categories(id, name),
 components:recipe_components(
 *,
 ingredients:recipe_component_ingredients(
 *,
 ingredient:ingredients(*)
 )
 )
 )
 ),
 dietary_flags:event_dietary_flags(*)
 `)
 .eq('id', id)
 .single()

 if (fetchError) throw fetchError
 return data as unknown as Event
 } catch (err) {
 const msg = err instanceof Error ? err.message : 'Failed to fetch event'
 setError(msg)
 return null
 } finally {
 setLoading(false)
 }
 }, [])

 const createEvent = useCallback(async (eventData: EventFormData, menuItems?: MenuItemFormData[]) => {
 setLoading(true)
 setError(null)
 try {
 const { data: { user } } = await supabase.auth.getUser()
 if (!user) throw new Error('Not authenticated')

 const { data: membership } = await supabase
 .from('kitchen_members')
 .select('kitchen_id')
 .limit(1)
 .single()

 const { data: event, error: insertError } = await supabase
 .from('events')
 .insert({
 name: eventData.name,
 event_date: eventData.event_date,
 event_type: eventData.event_type,
 num_persons: eventData.num_persons || null,
 price_per_person: eventData.price_per_person || null,
 location: eventData.location || null,
 contact_person: eventData.contact_person || null,
 departure_time: eventData.departure_time || null,
 arrival_time: eventData.arrival_time || null,
 notes: eventData.notes || null,
 status: eventData.status || 'draft',
 kitchen_id: membership?.kitchen_id,
 })
 .select()
 .single()

 if (insertError) throw insertError

 // Insert menu items if provided
 if (menuItems && menuItems.length > 0) {
 const { error: menuError } = await supabase
 .from('event_menu_items')
 .insert(
 menuItems.map((item) => ({
 event_id: event.id,
 recipe_id: item.recipe_id,
 course_order: item.sort_order,
 }))
 )
 if (menuError) throw menuError
 }

 return { success: true, id: event.id }
 } catch (err) {
 const msg = err instanceof Error ? err.message : 'Failed to create event'
 setError(msg)
 return { success: false, error: msg }
 } finally {
 setLoading(false)
 }
 }, [])

 const updateEvent = useCallback(async (id: string, eventData: Partial<EventFormData>) => {
 setLoading(true)
 setError(null)
 try {
 const updatePayload: Record<string, unknown> = {
 updated_at: new Date().toISOString(),
 }

 if (eventData.name !== undefined) updatePayload.name = eventData.name
 if (eventData.event_date !== undefined) updatePayload.event_date = eventData.event_date
 if (eventData.event_type !== undefined) updatePayload.event_type = eventData.event_type
 if (eventData.num_persons !== undefined) updatePayload.num_persons = eventData.num_persons || null
 if (eventData.price_per_person !== undefined) updatePayload.price_per_person = eventData.price_per_person || null
 if (eventData.location !== undefined) updatePayload.location = eventData.location || null
 if (eventData.contact_person !== undefined) updatePayload.contact_person = eventData.contact_person || null
 if (eventData.departure_time !== undefined) updatePayload.departure_time = eventData.departure_time || null
 if (eventData.arrival_time !== undefined) updatePayload.arrival_time = eventData.arrival_time || null
 if (eventData.notes !== undefined) updatePayload.notes = eventData.notes || null
 if (eventData.status !== undefined) updatePayload.status = eventData.status

 const { error: updateError } = await supabase
 .from('events')
 .update(updatePayload)
 .eq('id', id)

 if (updateError) throw updateError
 return { success: true }
 } catch (err) {
 const msg = err instanceof Error ? err.message : 'Failed to update event'
 setError(msg)
 return { success: false, error: msg }
 } finally {
 setLoading(false)
 }
 }, [])

 const deleteEvent = useCallback(async (id: string) => {
 try {
 const { error: delError } = await supabase
 .from('events')
 .update({ status: 'cancelled', updated_at: new Date().toISOString() })
 .eq('id', id)
 if (delError) throw delError
 return { success: true }
 } catch (err) {
 const msg = err instanceof Error ? err.message : 'Failed to delete event'
 return { success: false, error: msg }
 }
 }, [])

 // Menu item operations
 const getMenuItems = useCallback(async (eventId: string) => {
 try {
 const { data, error: fetchError } = await supabase
 .from('event_menu_items')
 .select(`
 *,
 recipe:recipes(
 *,
 category:recipe_categories(id, name),
 components:recipe_components(
 *,
 ingredients:recipe_component_ingredients(
 *,
 ingredient:ingredients(*)
 )
 )
 )
 `)
 .eq('event_id', eventId)
 .order('course_order', { ascending: true })

 if (fetchError) throw fetchError
 return (data || []) as unknown as EventMenuItem[]
 } catch (err) {
 const msg = err instanceof Error ? err.message : 'Failed to fetch menu items'
 setError(msg)
 return []
 }
 }, [])

 const addMenuItem = useCallback(async (eventId: string, item: MenuItemFormData) => {
 try {
 const { data, error: insertError } = await supabase
 .from('event_menu_items')
 .insert({
 event_id: eventId,
 recipe_id: item.recipe_id,
 course_order: item.sort_order,
 })
 .select()
 .single()

 if (insertError) throw insertError
 return { success: true, id: data.id }
 } catch (err) {
 const msg = err instanceof Error ? err.message : 'Failed to add menu item'
 setError(msg)
 return { success: false, error: msg }
 }
 }, [])

 const removeMenuItem = useCallback(async (itemId: string) => {
 try {
 const { error: delError } = await supabase
 .from('event_menu_items')
 .delete()
 .eq('id', itemId)
 if (delError) throw delError
 return { success: true }
 } catch (err) {
 const msg = err instanceof Error ? err.message : 'Failed to remove menu item'
 return { success: false, error: msg }
 }
 }, [])

 const updateMenuItems = useCallback(async (eventId: string, items: MenuItemFormData[]) => {
 try {
 // Delete existing items
 await supabase.from('event_menu_items').delete().eq('event_id', eventId)

 // Insert new items
 if (items.length > 0) {
 const { error: insertError } = await supabase
 .from('event_menu_items')
 .insert(
 items.map((item) => ({
 event_id: eventId,
 recipe_id: item.recipe_id,
 course_order: item.sort_order,
 }))
 )
 if (insertError) throw insertError
 }

 return { success: true }
 } catch (err) {
 const msg = err instanceof Error ? err.message : 'Failed to update menu'
 setError(msg)
 return { success: false, error: msg }
 }
 }, [])

 return {
 loading,
 error,
 getEvents,
 getEvent,
 createEvent,
 updateEvent,
 deleteEvent,
 getMenuItems,
 addMenuItem,
 removeMenuItem,
 updateMenuItems,
 }
}
