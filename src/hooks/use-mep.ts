'use client'

import { useCallback, useState } from 'react'
import type { MepPlanGenerated } from '@/types/mep'

export function useMep() {
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState<string | null>(null)

 const generateMep = useCallback(async (eventId: string): Promise<MepPlanGenerated | null> => {
 setLoading(true)
 setError(null)
 try {
 const res = await fetch(`/api/events/${eventId}/generate-mep`, {
 method: 'POST',
 })
 if (!res.ok) {
 const errData = await res.json()
 throw new Error(errData.error || 'Failed to generate MEP')
 }
 const data = await res.json()
 return data as MepPlanGenerated
 } catch (err) {
 const msg = err instanceof Error ? err.message : 'Failed to generate MEP'
 setError(msg)
 return null
 } finally {
 setLoading(false)
 }
 }, [])

 const getMep = useCallback(async (eventId: string): Promise<MepPlanGenerated | null> => {
 setLoading(true)
 setError(null)
 try {
 const res = await fetch(`/api/events/${eventId}/generate-mep`)
 if (!res.ok) {
 if (res.status === 404) return null
 const errData = await res.json()
 throw new Error(errData.error || 'Failed to fetch MEP')
 }
 const data = await res.json()
 return data as MepPlanGenerated
 } catch (err) {
 const msg = err instanceof Error ? err.message : 'Failed to fetch MEP'
 setError(msg)
 return null
 } finally {
 setLoading(false)
 }
 }, [])

 return {
 loading,
 error,
 generateMep,
 getMep,
 }
}
