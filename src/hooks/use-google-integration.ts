'use client'

import { useState, useEffect, useCallback } from 'react'
import { useKitchen } from '@/providers/kitchen-provider'

interface IntegrationStatus {
  connected: boolean
  email?: string
  status?: string
  connected_at?: string
  last_synced?: string | null
  scopes?: string[]
}

export function useGoogleIntegration() {
  const { kitchenId } = useKitchen()
  const [status, setStatus] = useState<IntegrationStatus>({ connected: false })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const fetchStatus = useCallback(async () => {
    if (!kitchenId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/integrations/google/status?kitchen_id=${kitchenId}`)
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus({ connected: false })
    } finally {
      setLoading(false)
    }
  }, [kitchenId])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const connect = useCallback(() => {
    if (!kitchenId) return
    window.location.href = `/api/integrations/google/authorize?kitchen_id=${kitchenId}`
  }, [kitchenId])

  const disconnect = useCallback(async () => {
    if (!kitchenId) return
    setDisconnecting(true)
    try {
      await fetch('/api/integrations/google/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kitchen_id: kitchenId }),
      })
      setStatus({ connected: false })
    } catch (err) {
      console.error('Disconnect error:', err)
    } finally {
      setDisconnecting(false)
    }
  }, [kitchenId])

  const syncCalendar = useCallback(async (timeMin?: string, timeMax?: string) => {
    if (!kitchenId) return null
    setSyncing(true)
    try {
      const params = new URLSearchParams({ kitchen_id: kitchenId })
      if (timeMin) params.set('time_min', timeMin)
      if (timeMax) params.set('time_max', timeMax)
      
      const res = await fetch(`/api/integrations/google/calendar?${params}`)
      const data = await res.json()
      
      if (data.success) {
        await fetchStatus() // Refresh status after sync
      }
      
      return data
    } catch (err) {
      console.error('Sync error:', err)
      return null
    } finally {
      setSyncing(false)
    }
  }, [kitchenId, fetchStatus])

  return {
    ...status,
    loading,
    syncing,
    disconnecting,
    connect,
    disconnect,
    syncCalendar,
    refetch: fetchStatus,
  }
}
