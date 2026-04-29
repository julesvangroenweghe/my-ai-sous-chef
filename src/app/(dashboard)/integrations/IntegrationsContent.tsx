'use client'

import { useEffect, useState, useCallback } from 'react'
import { useKitchen } from '@/providers/kitchen-provider'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, RefreshCw, Link2Off, Calendar, Mail, FileText, Clock, User, Shield } from 'lucide-react'

type GoogleStatus = {
  connected: boolean
  email?: string
  status?: string
  connected_at?: string
  last_synced?: string | null
  scopes?: string[]
}

export default function IntegrationsContent() {
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

  useEffect(() => {
    const integration = searchParams.get('integration')
    if (integration === 'success') {
      setToast({ type: 'success', message: 'Google account succesvol gekoppeld!' })
      fetchStatus()
      window.history.replaceState({}, '', '/integrations')
    } else if (integration === 'error') {
      const msg = searchParams.get('message') || 'Er ging iets mis'
      setToast({ type: 'error', message: `Koppeling mislukt: ${msg}` })
      window.history.replaceState({}, '', '/integrations')
    }
  }, [searchParams, fetchStatus])

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
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const scopeLabels: Record<string, string> = {
    'https://www.googleapis.com/auth/calendar.readonly': 'Agenda lezen',
    'https://www.googleapis.com/auth/calendar.events': 'Agenda events',
    'https://www.googleapis.com/auth/gmail.readonly': 'Gmail lezen',
    'https://www.googleapis.com/auth/userinfo.email': 'E-mailadres',
  }

  if (kitchenLoading || loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[#E8D5B5] rounded w-48" />
          <div className="h-4 bg-[#E8D5B5] rounded w-96" />
          <div className="h-48 bg-[#E8D5B5] rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2.5 ${
          toast.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle className="w-4 h-4 shrink-0" />
            : <XCircle className="w-4 h-4 shrink-0" />
          }
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-extrabold text-[#2C1810]">Integraties</h1>
        <p className="text-[#9E7E60] mt-1 text-sm">
          Koppel externe diensten aan je keuken voor automatische synchronisatie.
        </p>
      </div>

      {/* Google Workspace card */}
      <div className="bg-white border border-[#E8D5B5] rounded-2xl overflow-hidden shadow-sm">
        {/* Card header */}
        <div className="px-6 py-5 border-b border-[#E8D5B5] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white border border-[#E8D5B5] rounded-xl flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-[#2C1810]">Google Workspace</h3>
              <p className="text-xs text-[#9E7E60]">Calendar, Gmail &amp; Drive</p>
            </div>
          </div>
          {googleStatus?.connected ? (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Gekoppeld
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-stone-100 text-[#9E7E60] border border-[#E8D5B5]">
              Niet gekoppeld
            </span>
          )}
        </div>

        {/* Card body */}
        <div className="px-6 py-5">
          {googleStatus?.connected ? (
            <div className="space-y-5">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#9E7E60] uppercase tracking-wider mb-1">
                    <User className="w-3 h-3" /> Account
                  </div>
                  <div className="text-sm font-medium text-[#2C1810]">{googleStatus.email}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#9E7E60] uppercase tracking-wider mb-1">
                    <Clock className="w-3 h-3" /> Gekoppeld op
                  </div>
                  <div className="text-sm text-[#5C4730]">
                    {googleStatus.connected_at ? formatDate(googleStatus.connected_at) : '—'}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#9E7E60] uppercase tracking-wider mb-1">
                    <RefreshCw className="w-3 h-3" /> Laatste sync
                  </div>
                  <div className="text-sm text-[#5C4730]">
                    {googleStatus.last_synced ? formatDate(googleStatus.last_synced) : 'Nog niet gesynchroniseerd'}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#9E7E60] uppercase tracking-wider mb-1">
                    <Shield className="w-3 h-3" /> Status
                  </div>
                  <div className="text-sm text-emerald-700 font-medium">Actief</div>
                </div>
              </div>

              {/* Scopes */}
              {googleStatus.scopes && googleStatus.scopes.length > 0 && (
                <div>
                  <div className="text-[10px] text-[#9E7E60] uppercase tracking-wider mb-2">Machtigingen</div>
                  <div className="flex flex-wrap gap-1.5">
                    {googleStatus.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="px-2.5 py-1 rounded-lg text-xs bg-[#FAF6EF] text-[#5C4730] border border-[#E8D5B5]"
                      >
                        {scopeLabels[scope] || scope.split('/').pop()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleConnect}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-[#FAF6EF] text-[#2C1810] hover:bg-[#F2E8D5] transition-all border border-[#E8D5B5]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Opnieuw koppelen
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                >
                  <Link2Off className="w-3.5 h-3.5" />
                  {disconnecting ? 'Ontkoppelen...' : 'Ontkoppelen'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[#9E7E60]">
                Koppel je Google account om automatisch agenda-events te synchroniseren, e-mails van leveranciers te bekijken en documenten vanuit Drive te importeren.
              </p>
              <div className="flex flex-wrap gap-4 text-xs text-[#9E7E60]">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#C4703A]" />
                  Calendar sync
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#C4703A]" />
                  Gmail leveranciers
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#C4703A]" />
                  Drive documenten
                </span>
              </div>
              <button
                onClick={handleConnect}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#2C1810] text-[#F2E8D5] hover:bg-[#3D2415] transition-all shadow-sm"
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

      {/* Coming soon integrations */}
      <div className="bg-white border border-[#E8D5B5] rounded-2xl px-6 py-5 opacity-60">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#FAF6EF] rounded-xl flex items-center justify-center border border-[#E8D5B5]">
            <FileText className="w-5 h-5 text-[#9E7E60]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#2C1810]">Boekhoudpakket</h3>
            <p className="text-xs text-[#9E7E60]">Exacte, Yuki, Octopus — binnenkort beschikbaar</p>
          </div>
          <span className="ml-auto px-3 py-1 rounded-full text-xs font-medium bg-[#FAF6EF] text-[#9E7E60] border border-[#E8D5B5]">
            Binnenkort
          </span>
        </div>
      </div>
    </div>
  )
}
