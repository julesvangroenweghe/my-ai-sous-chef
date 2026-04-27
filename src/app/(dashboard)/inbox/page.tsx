'use client'

import { useState, useEffect, useCallback } from 'react'
import { useKitchen } from '@/providers/kitchen-provider'
import { useGoogleIntegration } from '@/hooks/use-google-integration'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Mail, RefreshCw, Search, Star, Paperclip, Clock,
  ExternalLink, Link2, Inbox, ChevronDown, ChevronUp,
  FileText, Truck, AlertCircle,
} from 'lucide-react'
import { format, parseISO, isToday, isYesterday, isThisWeek } from 'date-fns'
import { nl } from 'date-fns/locale'

interface GmailMessage {
  id: string
  from: string
  subject: string
  date: string
  snippet: string
  labels: string[]
}

function categorizeEmail(msg: GmailMessage): { label: string; color: string; icon: any } {
  const subjectLower = (msg.subject || '').toLowerCase()
  const fromLower = (msg.from || '').toLowerCase()
  const snippetLower = (msg.snippet || '').toLowerCase()
  
  // Leverancier/invoice detection
  const supplierKeywords = ['factuur', 'invoice', 'bestelling', 'order', 'levering', 'delivery', 'prijslijst', 'offerte']
  if (supplierKeywords.some(k => subjectLower.includes(k) || snippetLower.includes(k))) {
    return { label: 'Leverancier', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: Truck }
  }
  
  // Price list detection
  if (subjectLower.includes('prijs') || subjectLower.includes('tarief') || subjectLower.includes('price')) {
    return { label: 'Prijslijst', color: 'bg-amber-500/15 text-amber-700 border-amber-500/30', icon: FileText }
  }
  
  // Event/booking detection
  if (subjectLower.includes('event') || subjectLower.includes('boeking') || subjectLower.includes('reserv') || subjectLower.includes('catering')) {
    return { label: 'Event', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', icon: Star }
  }
  
  return { label: 'Algemeen', color: 'bg-[#ECD9BE]/15 text-[#9E7E60] border-stone-500/30', icon: Mail }
}

function formatEmailDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr)
    if (isToday(date)) return format(date, 'HH:mm')
    if (isYesterday(date)) return 'Gisteren'
    if (isThisWeek(date)) return format(date, 'EEEE', { locale: nl })
    return format(date, 'd MMM', { locale: nl })
  } catch {
    return dateStr
  }
}

function extractSenderName(from: string): string {
  // "Name <email>" → "Naam"
  const match = from.match(/^"?([^"<]+)"?\s*</)
  if (match) return match[1].trim()
  // Just email
  return from.split('@')[0]
}

export default function InboxPage() {
  const { kitchenId } = useKitchen()
  const { connected, loading: integrationLoading, connect } = useGoogleIntegration()
  const [messages, setMessages] = useState<GmailMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const fetchMessages = useCallback(async () => {
    if (!kitchenId || !connected) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ kitchen_id: kitchenId })
      if (search) params.set('q', search)
      const res = await fetch(`/api/gmail/messages?${params}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages(data.messages || [])
    } catch (err: any) {
      setError(err.message || 'Kon berichten niet ophalen')
    } finally {
      setLoading(false)
    }
  }, [kitchenId, connected, search])

  useEffect(() => {
    if (connected && kitchenId) fetchMessages()
  }, [connected, kitchenId])

  const filteredMessages = messages.filter(msg => {
    if (filter === 'all') return true
    const cat = categorizeEmail(msg)
    return cat.label === filter
  })

  if (integrationLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 animate-spin text-[#9E7E60]" />
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-[#9E7E60]" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#2C1810] mb-3 font-outfit">Inbox</h1>
          <p className="text-[#9E7E60] mb-8 max-w-md mx-auto">
            Koppel je Google account om mails van leveranciers te bekijken, 
            prijslijsten te detecteren en facturen te verwerken.
          </p>
          <Button onClick={connect} className="bg-brand-500 hover:bg-brand-600 text-[#2C1810]">
            <Link2 className="w-4 h-4 mr-2" />
            Google Account koppelen
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2C1810] font-outfit">Inbox</h1>
          <p className="text-[#9E7E60] text-sm mt-1">
            {messages.length} berichten van leveranciers en klanten
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchMessages}
          disabled={loading}
          className="border-[#E8D5B5] text-[#5C4730] hover:bg-white"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Laden...' : 'Vernieuwen'}
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B8997A]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchMessages()}
            placeholder="Zoek in berichten..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E8D5B5] text-[#2C1810] text-sm placeholder:text-[#B8997A] focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
        </div>
        <div className="flex gap-1.5">
          {['all', 'Leverancier', 'Prijslijst', 'Event'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                  : 'bg-white text-[#9E7E60] border border-[#E8D5B5] hover:bg-[#FDF8F2]'
              }`}
            >
              {f === 'all' ? 'Alles' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Messages */}
      <div className="space-y-1">
        {filteredMessages.length === 0 && !loading && (
          <div className="text-center py-12">
            <Inbox className="w-12 h-12 text-[#5C4730] mx-auto mb-4" />
            <p className="text-[#9E7E60]">
              {search ? 'Geen berichten gevonden' : 'Je inbox is leeg'}
            </p>
          </div>
        )}

        {filteredMessages.map((msg) => {
          const cat = categorizeEmail(msg)
          const CatIcon = cat.icon
          const isExpanded = expandedId === msg.id
          const senderName = extractSenderName(msg.from)

          return (
            <button
              key={msg.id}
              onClick={() => setExpandedId(isExpanded ? null : msg.id)}
              className="w-full text-left"
            >
              <div
                className={`px-4 py-3 rounded-xl border transition-all duration-200 ${
                  isExpanded
                    ? 'bg-white/90 border-[#D4B896]'
                    : 'bg-[#FDF8F2]/60 border-[#E8D5B5] hover:bg-white/80 hover:border-[#E8D5B5]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cat.color.split(' ')[0]}`}>
                    <CatIcon className={`w-4 h-4 ${cat.color.split(' ')[1]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#2C1810] truncate">
                        {senderName}
                      </span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cat.color}`}>
                        {cat.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-[#5C4730] truncate">{msg.subject || '(geen onderwerp)'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-[#B8997A]">{formatEmailDate(msg.date)}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#B8997A]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#B8997A]" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-[#E8D5B5]/60">
                    <p className="text-xs text-[#B8997A] mb-1">Van: {msg.from}</p>
                    <p className="text-sm text-[#5C4730] leading-relaxed">{msg.snippet}</p>
                    {msg.labels?.includes('IMPORTANT') && (
                      <Badge variant="outline" className="mt-2 text-[10px] border-amber-500/30 text-amber-700">
                        <Star className="w-3 h-3 mr-1" />
                        Belangrijk
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
