'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Clock, CheckCircle, Send, MessageSquare, ChefHat, Loader2, Trash2, FileText } from 'lucide-react'

interface Proposal {
  id: string
  name: string
  menu_type: string
  num_persons: number | null
  price_per_person: number | null
  proposal_status: string
  revision_number: number
  client_feedback: string | null
  event_requirements: any
  created_at: string
  updated_at: string
  items: { id: string; course: string; dish_name: string }[]
}

interface Event {
  id: string
  name: string
  event_date: string
  event_type: string
  num_persons: number | null
  price_per_person: number | null
  notes: string | null
  contact_person: string | null
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: 'Draft', color: 'bg-stone-100 text-[#9E7E60] border border-[#E8D5B5]', icon: Clock },
  sent: { label: 'Verstuurd', color: 'bg-blue-50 text-blue-600 border border-blue-200', icon: Send },
  feedback: { label: 'Feedback ontvangen', color: 'bg-amber-50 text-amber-700 border border-amber-200', icon: MessageSquare },
  confirmed: { label: 'Bevestigd', color: 'bg-green-50 text-green-600 border border-green-200', icon: CheckCircle },
}

export default function EventVoorstellenPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const supabase = createClient()

  const [event, setEvent] = useState<Event | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadData()
  }, [eventId])

  const loadData = async () => {
    const [eventRes, proposalsRes] = await Promise.all([
      supabase.from('events').select('id, name, event_date, event_type, num_persons, price_per_person, notes, contact_person').eq('id', eventId).single(),
      fetch(`/api/proposals?event_id=${eventId}`).then(r => r.json()),
    ])
    if (eventRes.data) setEvent(eventRes.data)
    if (Array.isArray(proposalsRes)) setProposals(proposalsRes)
    setLoading(false)
  }

  const createNewProposal = async () => {
    if (!event) return
    setCreating(true)
    const res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        name: `Voorstel`,
        menu_type: event.event_type || 'walking_dinner',
        num_persons: event.num_persons,
        price_per_person: event.price_per_person,
        event_requirements: {
          exclusions: [],
          preferences: {},
          concept: '',
          special_requests: event.notes || '',
          contact_person: event.contact_person || '',
        },
      }),
    })
    const proposal = await res.json()
    if (proposal.id) {
      router.push(`/events/${eventId}/voorstel/${proposal.id}`)
    }
    setCreating(false)
  }

  const deleteProposal = async (proposalId: string, e: React.MouseEvent) => {
    e.preventDefault()
    if (!confirm('Voorstel verwijderen?')) return
    await fetch(`/api/proposals/${proposalId}`, { method: 'DELETE' })
    setProposals(prev => prev.filter(p => p.id !== proposalId))
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href={`/events/${eventId}`} className="p-2 rounded-xl bg-[#FAF6EF] border border-[#E8D5B5] text-[#9E7E60] hover:text-[#2C1810] transition-all mt-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#9E7E60] mb-1">{event?.name}</p>
              <h1 className="text-2xl font-display font-extrabold text-[#2C1810]">Menu Voorstellen</h1>
            </div>
            <button
              onClick={createNewProposal}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-[#2C1810] font-semibold text-sm rounded-xl transition-all disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Nieuw Voorstel
            </button>
          </div>
        </div>
      </div>

      {/* Proposals List */}
      {proposals.length === 0 ? (
        <div className="bg-white border border-[#E8D5B5] rounded-2xl p-12 text-center">
          <ChefHat className="w-12 h-12 text-[#D4B896] mx-auto mb-4" />
          <h3 className="text-lg font-display font-semibold text-[#2C1810] mb-2">Nog geen voorstellen</h3>
          <p className="text-[#9E7E60] text-sm mb-6">Maak een eerste menu voorstel voor {event?.name}</p>
          <button
            onClick={createNewProposal}
            disabled={creating}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-[#2C1810] font-semibold text-sm rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            Voorstel aanmaken
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map(proposal => {
            const sc = statusConfig[proposal.proposal_status] || statusConfig.draft
            const StatusIcon = sc.icon
            const courseCount = [...new Set(proposal.items?.map(i => i.course) || [])].length
            const dishCount = proposal.items?.length || 0

            return (
              <Link
                key={proposal.id}
                href={`/events/${eventId}/voorstel/${proposal.id}`}
                className="block bg-white border border-[#E8D5B5] rounded-2xl p-5 hover:border-brand-400/50 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#FEF3E2] border border-amber-200/50 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-amber-700">V{proposal.revision_number}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[#2C1810]">{proposal.name}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${sc.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {sc.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#9E7E60]">
                        {dishCount > 0 && <span>{dishCount} gerechten · {courseCount} gangen</span>}
                        {proposal.num_persons && <span>{proposal.num_persons} personen</span>}
                        {proposal.price_per_person && <span>€{Number(proposal.price_per_person).toFixed(0)}/p</span>}
                        <span>{new Date(proposal.updated_at).toLocaleDateString('nl-BE')}</span>
                      </div>
                      {proposal.client_feedback && (
                        <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                          <span className="font-medium">Feedback: </span>{proposal.client_feedback.slice(0, 100)}{proposal.client_feedback.length > 100 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteProposal(proposal.id, e)}
                    className="p-1.5 text-[#D4B896] hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
