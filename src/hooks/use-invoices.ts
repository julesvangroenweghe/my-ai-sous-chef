'use client'

import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Invoice, IngredientPrice } from '@/types/database'

interface InvoiceFilters {
 status?: string
 supplier?: string
 search?: string
}

export function useInvoices() {
 const supabase = createClient()
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState<string | null>(null)

 const getInvoices = useCallback(async (filters?: InvoiceFilters): Promise<Invoice[]> => {
 setLoading(true)
 setError(null)
 try {
 let query = supabase
 .from('invoices')
 .select('*')
 .order('created_at', { ascending: false })

 if (filters?.status) query = query.eq('ocr_status', filters.status)
 if (filters?.supplier) query = query.ilike('supplier_name', `%${filters.supplier}%`)

 const { data, error: fetchError } = await query
 if (fetchError) throw fetchError
 return (data || []) as Invoice[]
 } catch (err) {
 const msg = err instanceof Error ? err.message : 'Failed to fetch invoices'
 setError(msg)
 return []
 } finally {
 setLoading(false)
 }
 }, [])

 const uploadInvoice = useCallback(async (file: File): Promise<string | null> => {
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

 const fileName = `${Date.now()}_${file.name}`
 const { data: upload, error: uploadError } = await supabase.storage
 .from('invoices')
 .upload(fileName, file)

 if (uploadError) throw uploadError

 const { data: { publicUrl } } = supabase.storage.from('invoices').getPublicUrl(fileName)

 const { data: invoice, error: insertError } = await supabase
 .from('invoices')
 .insert({
 kitchen_id: membership?.kitchen_id,
 image_url: publicUrl,
 ocr_status: 'pending',
 })
 .select()
 .single()

 if (insertError) throw insertError
 return invoice?.id || null
 } catch (err) {
 const msg = err instanceof Error ? err.message : 'Failed to upload invoice'
 setError(msg)
 return null
 } finally {
 setLoading(false)
 }
 }, [])

 const scanInvoice = useCallback(async (id: string) => {
 setLoading(true)
 setError(null)
 try {
 const response = await fetch('/api/invoices/scan', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ invoice_id: id }),
 })
 if (!response.ok) throw new Error('Scan failed')
 return await response.json()
 } catch (err) {
 const msg = err instanceof Error ? err.message : 'Failed to scan invoice'
 setError(msg)
 return null
 } finally {
 setLoading(false)
 }
 }, [])

 const reviewInvoice = useCallback(async (
 id: string,
 corrections: {
 supplier_name?: string
 invoice_date?: string
 line_items?: Array<{
 product_name: string
 quantity: number
 unit: string
 unit_price: number
 total: number
 }>
 }
 ) => {
 setLoading(true)
 setError(null)
 try {
 const response = await fetch(`/api/invoices/${id}`, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(corrections),
 })
 if (!response.ok) throw new Error('Update failed')
 return await response.json()
 } catch (err) {
 const msg = err instanceof Error ? err.message : 'Failed to update invoice'
 setError(msg)
 return null
 } finally {
 setLoading(false)
 }
 }, [])

 const confirmInvoice = useCallback(async (
 id: string,
 matchedItems: Array<{
 ingredient_id: string
 price: number
 source: string
 }>
 ) => {
 setLoading(true)
 setError(null)
 try {
 const response = await fetch(`/api/invoices/${id}/confirm`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ matched_items: matchedItems }),
 })
 if (!response.ok) throw new Error('Confirmation failed')
 return await response.json()
 } catch (err) {
 const msg = err instanceof Error ? err.message : 'Failed to confirm invoice'
 setError(msg)
 return null
 } finally {
 setLoading(false)
 }
 }, [])

 const getPriceHistory = useCallback(async (ingredientId: string): Promise<IngredientPrice[]> => {
 setLoading(true)
 setError(null)
 try {
 const { data, error: fetchError } = await supabase
 .from('ingredient_prices')
 .select('*')
 .eq('ingredient_id', ingredientId)
 .order('recorded_at', { ascending: false })
 .limit(24)

 if (fetchError) throw fetchError
 return (data || []) as IngredientPrice[]
 } catch (err) {
 const msg = err instanceof Error ? err.message : 'Failed to fetch price history'
 setError(msg)
 return []
 } finally {
 setLoading(false)
 }
 }, [])

 return {
 loading,
 error,
 getInvoices,
 uploadInvoice,
 scanInvoice,
 reviewInvoice,
 confirmInvoice,
 getPriceHistory,
 }
}
