'use client'

import { useEffect, useState, useCallback } from 'react'
import { useKitchen } from '@/providers/kitchen-provider'
import { useSearchParams } from 'next/navigation'

type GoogleStatus = {
  connected: boolean
  email?: string
  status?: string
  connected_at?: string
  last_synced?: string | null
  scopes?: string[]
}

export default function IntegrationsPage() {
  const { kitchen, loading: kitchenLoading } = useKitchen()
  const searchParams = useSearchParams()
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!kitchen?.id) return
    try {
      const res = await fetch(`/api/integrations/google/status?kitchen_id=${kitchen.id}`)
      const data = await res.json()
      setGoogleStatus(data)
    } catch {
      setGoogleStatus({ connected: false })
    } finally {
      setLoading(false)
    }
  }, [kitchen?.id])

  useEffect(() => {
    if (!kitchenLoading && kitchen?.id) {
      fetchStatus()
    }
  }, [kitchen?.id, kitchenLoading, fetchStatus])

  // Handle callback params
  useEffect(() => {
    const integration = searchParams.get('integration')
    if (integration === 'success') {
      setToast({ type: 'success', message: 'Google account succesvol gekoppeld!' })
      fetchStatus()
      // Clean URL
      window.history.replaceState({}, '', '/integrations')
    } else if (integration === 'error') {
      const msg = searchParams.get('message') || 'Er ging iets mis'
      setToast({ type: 'error', message: `Koppeling mislukt: ${msg}` })
      window.history.replaceState({}, '', '/integrations')
    }
  }, [searchParams, fetchStatus])

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleConnect = () => {
    if (!kitchen?.id) return
    window.location.href = `/api/integrations/google/authorize?kitchen_id=${kitchen.id}`
  }

  const handleDisconnect = async () => {
    if (!kitchen?.id) return
    setDisconnecting(true)
    try {
      const res = await fetch('/api/integrations/google/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kitchen_id: kitchen.id }),
      })
      if (res.ok) {
        setGoogleStatus({ connected: false })
        setToast({ type: 'success', message: 'Google account ontkoppeld' })
      } else {
        setToast({ type: 'error', message: 'Ontkoppelen mislukt' })
      }
    } catch {
      setToast({ type: 'error', message: 'Ontkoppelen mislukt' })
    } finally {
      setDisconnecting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('nl-BE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const scopeLabels: Record<string, string> = {
    'https://www.googleapis.com/auth/calendar.readonly': 'Agenda lezen',
    'https://www.googleapis.com/auth/calendar.events': 'Agenda events beheren',
    'https://www.googleapis.com/auth/gmail.readonly': 'Gmail lezen',
    'https://www.googleapis.com/auth/userinfo.email': 'E-mailadres',
  }

  if (kitchenLoading || loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-stone-800 rounded w-48" />
          <div className="h-4 bg-stone-800 rounded w-96" />
          <div className="h-48 bg-stone-800 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Toast */}
      {toast && (
        <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
          toast.type === 'success'
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          )}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-white">Integraties</h1>
        <p className="text-stone-400 mt-1">
          Koppel externe diensten aan je keuken voor automatische synchronisatie.
        </p>
      </div>

      {/* Google Integration Card */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Google logo */}
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">Google Workspace</h3>
              <p className="text-xs text-stone-400">Calendar, Gmail &amp; Drive</p>
            </div>
          </div>

          {/* Status badge */}
          {googleStatus?.connected ? (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
              Gekoppeld
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-stone-700/50 text-stone-400 border border-stone-700">
              Niet gekoppeld
            </span>
          )}
        </div>

        <div className="px-6 py-5">
          {googleStatus?.connected ? (
            <div className="space-y-4">
              {/* Connected info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">Account</div>
                  <div className="text-sm text-white">{googleStatus.email}</div>
                </div>
                <div>
                  <div className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">Gekoppeld op</div>
                  <div className="text-sm text-stone-300">
                    {googleStatus.connected_at ? formatDate(googleStatus.connected_at) : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">Laatste sync</div>
                  <div className="text-sm text-stone-300">
                    {googleStatus.last_synced ? formatDate(googleStatus.last_synced) : 'Nog niet gesynchroniseerd'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">Status</div>
                  <div className="text-sm text-green-400">Actief</div>
                </div>
              </div>

              {/* Scopes */}
              {googleStatus.scopes && googleStatus.scopes.length > 0 && (
                <div>
                  <div className="text-[10px] text-stone-500 uppercase tracking-wider mb-2">Machtigingen</div>
                  <div className="flex flex-wrap gap-2">
                    {googleStatus.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="px-2.5 py-1 rounded-lg text-xs bg-stone-800 text-stone-300 border border-stone-700"
                      >
                        {scopeLabels[scope] || scope.split('/').pop()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleConnect}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-stone-800 text-stone-300 
                    hover:bg-stone-700 hover:text-white transition-all border border-stone-700"
                >
                  Opnieuw koppelen
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 
                    transition-all disabled:opacity-50"
                >
                  {disconnecting ? 'Ontkoppelen...' : 'Ontkoppelen'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-stone-400">
                Koppel je Google account om automatisch agenda-events te synchroniseren, 
                e-mails van leveranciers te bekijken en documenten vanuit Drive te importeren.
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Calendar sync
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  Gmail leveranciers
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  Drive documenten
                </span>
              </div>
              <button
                onClick={handleConnect}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white text-stone-900 
                  hover:bg-stone-100 transition-all flex items-center gap-2 shadow-lg"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Koppel Google Account
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Future integrations teaser */}
      <div className="mt-6 grid gap-4">
        <div className="bg-stone-900/50 border border-stone-800/50 rounded-2xl px-6 py-5 opacity-50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-stone-800 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
              <h3 className="font-semibold text-stone-400">Boekhoudpakket</h3>
              <p className="text-xs text-stone-500">Exacte, Yuki, Octopus — binnenkort beschikbaar</p>
            </div>
            <span className="ml-auto px-3 py-1 rounded-full text-xs font-medium bg-stone-800 text-stone-500 border border-stone-700">
              Binnenkort
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
