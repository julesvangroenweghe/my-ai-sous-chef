'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Sparkles, Save, Send, MessageSquare,
  CheckCircle, X, Loader2, ChevronDown, ChevronUp,
  GripVertical, Trash2, Edit2, Check, Clock, RefreshCw,
  Info, ChefHat
} from 'lucide-react'

interface EventRequirements {
  exclusions: string[]
  preferences: Record<string, string>
  concept: string
  special_requests: string
  contact_person: string
  concept_note?: string
  chef_note?: string
}

interface MenuItem {
  id: string
  course: string
  dish_name: string
  dish_description: string
  source_type: string
  cost_per_person: number | null
  sort_order: number
}

interface ProposalData {
  id: string
  name: string
  menu_type: string
  event_id: string | null
  num_persons: number | null
  price_per_person: number | null
  target_food_cost_pct: number | null
  proposal_status: string
  revision_number: number
  client_feedback: string | null
  event_requirements: EventRequirements
  items: MenuItem[]
}

const STATUS_FLOW = [
  { key: 'draft', label: 'Draft', color: 'text-[#9E7E60]', bg: 'bg-stone-50 border-[#E8D5B5]' },
  { key: 'sent', label: 'Verstuurd', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  { key: 'feedback', label: 'Feedback', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  { key: 'confirmed', label: 'Bevestigd', color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
]

const COURSE_ORDER = [
  'Amuse', 'Fingerbites', 'Fingerfood', 'Hapjes',
  'Voorgerecht', 'Tussengerecht', 'Vis', 'Hoofdgerecht',
  'Kaas', 'Pre-dessert', 'Dessert', 'Mignardises'
]

function totalFoodCost(items: MenuItem[]) {
  return items.reduce((s, i) => s + (Number(i.cost_per_person) || 0), 0)
}

export default function ProposalEditorPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const proposalId = params.proposalId as string

  const [proposal, setProposal] = useState<ProposalData | null>(null)
  const [eventName, setEventName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showIntake, setShowIntake] = useState(true)
  const [requirements, setRequirements] = useState<EventRequirements>({
    exclusions: [], preferences: {}, concept: '', special_requests: '', contact_person: ''
  })
  const [items, setItems] = useState<MenuItem[]>([])
  const [newExclusion, setNewExclusion] = useState('')
  const [suggestingFor, setSuggestingFor] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editDescValue, setEditDescValue] = useState('')
  const [editingDesc, setEditingDesc] = useState<string | null>(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [proposalName, setProposalName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [showConceptNote, setShowConceptNote] = useState(true)
  const [generatingFull, setGeneratingFull] = useState(false)

  const loadProposal = useCallback(async () => {
    const res = await fetch(`/api/proposals/${proposalId}`)
    const data = await res.json()
    if (data.id) {
      setProposal(data)
      const reqs = data.event_requirements || {
        exclusions: [], preferences: {}, concept: '', special_requests: '', contact_person: ''
      }
      setRequirements(reqs)
      setItems((data.items || []).sort((a: MenuItem, b: MenuItem) => a.sort_order - b.sort_order))
      setProposalName(data.name)
    }
    setLoading(false)
  }, [proposalId])

  useEffect(() => {
    loadProposal()
    // Fetch event name
    fetch(`/api/events/${eventId}`)
      .then(r => r.json())
      .then(d => { if (d?.name) setEventName(d.name) })
      .catch(() => {})
  }, [proposalId, loadProposal, eventId])

  const save = async (opts?: { silent?: boolean }) => {
    if (!proposal) return
    if (!opts?.silent) setSaving(true)
    await fetch(`/api/proposals/${proposalId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: proposalName,
        event_requirements: requirements,
        proposal_status: proposal.proposal_status,
        items: items.map((item, i) => ({ ...item, sort_order: i })),
      }),
    })
    if (!opts?.silent) {
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const updateStatus = async (status: string) => {
    if (!proposal) return
    await fetch(`/api/proposals/${proposalId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposal_status: status }),
    })
    setProposal(prev => prev ? { ...prev, proposal_status: status } : null)
  }

  const saveFeedback = async () => {
    await fetch(`/api/proposals/${proposalId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_feedback: feedbackText, proposal_status: 'feedback' }),
    })
    setProposal(prev => prev ? { ...prev, client_feedback: feedbackText, proposal_status: 'feedback' } : null)
    setShowFeedbackModal(false)
    setFeedbackText('')
  }

  // AI: volledig menu genereren
  const aiGenerateFull = async () => {
    if (!proposal) return
    setGeneratingFull(true)
    try {
      // Eerst huidige staat opslaan (requirements)
      await save({ silent: true })

      const res = await fetch('/api/proposals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId,
          menuType: proposal.menu_type,
          numPersons: proposal.num_persons || 20,
          pricePerPerson: proposal.price_per_person || 65,
          targetFoodCostPct: proposal.target_food_cost_pct || 30,
          requirements: requirements,
          eventName: eventName || proposalName,
        }),
      })

      if (!res.ok) {
        console.error('Generate failed', await res.text())
        return
      }

      // Reload vanuit DB — de API heeft items al opgeslagen
      await loadProposal()
    } catch (e) {
      console.error('AI generate error', e)
    }
    setGeneratingFull(false)
  }

  // AI: suggestie per gang
  const aiSuggestForCourse = async (course: string) => {
    setSuggestingFor(course)
    try {
      const res = await fetch('/api/menu-board/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course,
          menu_type: proposal?.menu_type || 'walking_dinner',
          existing_dishes: items.filter(i => i.course !== course).map(i => i.dish_name),
          exclusions: requirements.exclusions || [],
          concept: requirements.concept || '',
          num_persons: proposal?.num_persons || 10,
        }),
      })
      const data = await res.json()
      if (data.suggestion) {
        const newItem: MenuItem = {
          id: `ai-${Date.now()}`,
          course,
          dish_name: typeof data.suggestion === 'string' ? data.suggestion : (data.suggestion.name || ''),
          dish_description: typeof data.suggestion === 'object' ? (data.suggestion.description || '') : '',
          source_type: 'ai',
          cost_per_person: typeof data.suggestion === 'object' ? (data.suggestion.cost_per_person || null) : null,
          sort_order: items.filter(i => i.course === course).length,
        }
        setItems(prev => [...prev, newItem])
      }
    } catch (e) {
      console.error('AI suggest error', e)
    }
    setSuggestingFor(null)
  }

  const addExclusion = () => {
    if (!newExclusion.trim()) return
    setRequirements(prev => ({ ...prev, exclusions: [...(prev.exclusions || []), newExclusion.trim()] }))
    setNewExclusion('')
  }

  const removeExclusion = (idx: number) => {
    setRequirements(prev => ({ ...prev, exclusions: prev.exclusions.filter((_, i) => i !== idx) }))
  }

  // Courses gesorteerd
  const courses = [...new Set(items.map(i => i.course))].sort((a, b) => {
    const ai = COURSE_ORDER.indexOf(a)
    const bi = COURSE_ORDER.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  const addCourse = (courseName: string) => {
    const newItem: MenuItem = {
      id: `new-${Date.now()}`,
      course: courseName,
      dish_name: '',
      dish_description: '',
      source_type: 'custom',
      cost_per_person: null,
      sort_order: items.length,
    }
    setItems(prev => [...prev, newItem])
    setEditingItem(newItem.id)
    setEditValue('')
  }

  const addDishToCourse = (course: string) => {
    const newItem: MenuItem = {
      id: `new-${Date.now()}`,
      course,
      dish_name: '',
      dish_description: '',
      source_type: 'custom',
      cost_per_person: null,
      sort_order: items.filter(i => i.course === course).length,
    }
    setItems(prev => [...prev, newItem])
    setEditingItem(newItem.id)
    setEditValue('')
  }

  const saveItemName = (itemId: string) => {
    if (!editValue.trim()) {
      setItems(prev => prev.filter(i => i.id !== itemId))
    } else {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, dish_name: editValue.trim() } : i))
    }
    setEditingItem(null)
    setEditValue('')
  }

  const saveItemDesc = (itemId: string) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, dish_description: editDescValue } : i))
    setEditingDesc(null)
    setEditDescValue('')
  }

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId))
  }

  const removeCourse = (course: string) => {
    setItems(prev => prev.filter(i => i.course !== course))
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
    </div>
  )

  if (!proposal) return (
    <div className="text-center py-20">
      <p className="text-[#9E7E60]">Voorstel niet gevonden</p>
    </div>
  )

  const statusInfo = STATUS_FLOW.find(s => s.key === proposal.proposal_status) || STATUS_FLOW[0]
  const totalCost = totalFoodCost(items)
  const foodCostPct = proposal.price_per_person && totalCost > 0
    ? ((totalCost / proposal.price_per_person) * 100).toFixed(1)
    : null
  const conceptNote = requirements.concept_note
  const chefNote = requirements.chef_note

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href={`/events/${eventId}/voorstel`}
          className="p-2 rounded-xl bg-[#FAF6EF] border border-[#E8D5B5] text-[#9E7E60] hover:text-[#2C1810] transition-all mt-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={proposalName}
                    onChange={e => setProposalName(e.target.value)}
                    className="text-2xl font-display font-extrabold text-[#2C1810] bg-transparent border-b-2 border-brand-400 outline-none"
                    onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
                    autoFocus
                  />
                  <button onClick={() => setEditingName(false)} className="text-green-600">
                    <Check className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setEditingName(true)} className="flex items-center gap-2 group">
                  <h1 className="text-2xl font-display font-extrabold text-[#2C1810] group-hover:text-brand-400 transition-colors">
                    {proposalName}
                  </h1>
                  <span className="text-xs bg-[#FEF3E2] border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    V{proposal.revision_number}
                  </span>
                  <Edit2 className="w-4 h-4 text-[#D4B896] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${statusInfo.bg} ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {proposal.proposal_status === 'draft' && (
                <button
                  onClick={() => updateStatus('sent')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 text-xs font-medium rounded-xl transition-all"
                >
                  <Send className="w-3.5 h-3.5" /> Markeer verstuurd
                </button>
              )}
              {proposal.proposal_status === 'sent' && (
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-medium rounded-xl transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Feedback invoeren
                </button>
              )}
              {(proposal.proposal_status === 'feedback' || proposal.proposal_status === 'sent') && (
                <button
                  onClick={() => updateStatus('confirmed')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-600 text-xs font-medium rounded-xl transition-all"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Bevestigen
                </button>
              )}
              <button
                onClick={aiGenerateFull}
                disabled={generatingFull}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#FEF3E2] hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-medium rounded-xl transition-all disabled:opacity-50"
              >
                {generatingFull ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {generatingFull ? 'Bezig...' : 'AI Voorstel'}
              </button>
              <button
                onClick={() => save()}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-[#2C1810] text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? 'Opgeslagen' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Client Feedback Banner */}
      {proposal.client_feedback && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">Feedback van de klant</p>
              <p className="text-sm text-amber-700">{proposal.client_feedback}</p>
            </div>
          </div>
        </div>
      )}

      {/* Concept note van AI */}
      {conceptNote && (
        <div className="bg-white border border-[#E8D5B5] rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowConceptNote(!showConceptNote)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#FAF6EF] transition-all"
          >
            <div className="flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-brand-400" />
              <span className="text-sm font-semibold text-[#2C1810]">Conceptnota</span>
            </div>
            {showConceptNote ? <ChevronUp className="w-4 h-4 text-[#9E7E60]" /> : <ChevronDown className="w-4 h-4 text-[#9E7E60]" />}
          </button>
          {showConceptNote && (
            <div className="px-5 pb-4 space-y-2">
              <p className="text-sm text-[#5C4730] italic">"{conceptNote}"</p>
              {chefNote && (
                <p className="text-xs text-[#9E7E60] border-t border-[#F0E8D8] pt-2">{chefNote}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Generating overlay */}
      {generatingFull && (
        <div className="bg-[#FEF3E2] border border-amber-200 rounded-2xl p-5 text-center">
          <div className="flex items-center justify-center gap-3 text-amber-700">
            <Loader2 className="w-5 h-5 animate-spin" />
            <div>
              <p className="text-sm font-semibold">AI genereert menu voorstel...</p>
              <p className="text-xs text-amber-600 mt-1">Seizoenskalender + LEGENDE + Jules' DNA — even geduld</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Links: Intake Panel */}
        <div className="lg:col-span-1 space-y-4">
          <button
            onClick={() => setShowIntake(!showIntake)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-[#E8D5B5] rounded-xl text-sm font-semibold text-[#2C1810] hover:bg-[#FAF6EF] transition-all"
          >
            <span>Klant Briefing</span>
            {showIntake ? <ChevronUp className="w-4 h-4 text-[#9E7E60]" /> : <ChevronDown className="w-4 h-4 text-[#9E7E60]" />}
          </button>

          {showIntake && (
            <div className="bg-white border border-[#E8D5B5] rounded-2xl p-5 space-y-5">
              {/* Contactpersoon */}
              <div>
                <label className="block text-xs font-semibold text-[#9E7E60] mb-1.5 uppercase tracking-wide">Contactpersoon</label>
                <input
                  value={requirements.contact_person || ''}
                  onChange={e => setRequirements(prev => ({ ...prev, contact_person: e.target.value }))}
                  placeholder="Naam klant"
                  className="w-full px-3 py-2 bg-[#FDFAF6] border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>

              {/* Concept */}
              <div>
                <label className="block text-xs font-semibold text-[#9E7E60] mb-1.5 uppercase tracking-wide">Concept / Stijl</label>
                <textarea
                  value={requirements.concept || ''}
                  onChange={e => setRequirements(prev => ({ ...prev, concept: e.target.value }))}
                  placeholder="bvb. Elegant klassiek met moderne toets, zomers, informeel..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[#FDFAF6] border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                />
              </div>

              {/* Exclusies */}
              <div>
                <label className="block text-xs font-semibold text-[#9E7E60] mb-1.5 uppercase tracking-wide">Exclusies / Allergieën</label>
                <div className="flex gap-2 mb-2">
                  <input
                    value={newExclusion}
                    onChange={e => setNewExclusion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addExclusion()}
                    placeholder="bvb. kreeft, gluten, citroen..."
                    className="flex-1 px-3 py-1.5 bg-[#FDFAF6] border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <button
                    onClick={addExclusion}
                    className="px-3 py-1.5 bg-brand-600 text-[#2C1810] rounded-lg text-sm font-medium hover:bg-brand-700 transition-all"
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(requirements.exclusions || []).map((ex, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 border border-red-200 text-red-600 text-xs rounded-full">
                      {ex}
                      <button onClick={() => removeExclusion(i)} className="hover:text-red-800">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {(requirements.exclusions || []).length === 0 && (
                    <span className="text-xs text-[#B8997A]">Nog geen exclusies</span>
                  )}
                </div>
              </div>

              {/* Voorkeuren per gang */}
              <div>
                <label className="block text-xs font-semibold text-[#9E7E60] mb-1.5 uppercase tracking-wide">Voorkeuren per gang</label>
                <div className="space-y-2">
                  {['Voorgerecht', 'Hoofdgerecht', 'Dessert'].map(course => (
                    <div key={course}>
                      <label className="text-[10px] text-[#B8997A] uppercase tracking-wide">{course}</label>
                      <input
                        value={requirements.preferences?.[course] || ''}
                        onChange={e => setRequirements(prev => ({
                          ...prev,
                          preferences: { ...(prev.preferences || {}), [course]: e.target.value }
                        }))}
                        placeholder={course === 'Hoofdgerecht' ? 'bvb. tarbot of coquelet' : ''}
                        className="w-full px-3 py-1.5 bg-[#FDFAF6] border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-amber-300"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Bijzondere wensen */}
              <div>
                <label className="block text-xs font-semibold text-[#9E7E60] mb-1.5 uppercase tracking-wide">Bijzondere wensen</label>
                <textarea
                  value={requirements.special_requests || ''}
                  onChange={e => setRequirements(prev => ({ ...prev, special_requests: e.target.value }))}
                  placeholder="bvb. verrassing-element, live finishing, tasting gewenst..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[#FDFAF6] border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                />
              </div>
            </div>
          )}

          {/* Event parameters */}
          <div className="bg-white border border-[#E8D5B5] rounded-2xl p-4">
            <p className="text-xs font-semibold text-[#9E7E60] mb-3 uppercase tracking-wide">Event Parameters</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#9E7E60]">Personen</span>
                <span className="font-semibold text-[#2C1810]">{proposal.num_persons || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9E7E60]">Prijs/persoon</span>
                <span className="font-semibold text-[#2C1810]">€{proposal.price_per_person || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9E7E60]">Food cost doel</span>
                <span className="font-semibold text-[#2C1810]">{proposal.target_food_cost_pct || 30}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9E7E60]">Format</span>
                <span className="font-semibold text-[#2C1810] capitalize">{proposal.menu_type?.replace(/_/g, ' ')}</span>
              </div>
              {totalCost > 0 && (
                <>
                  <div className="border-t border-[#F0E8D8] pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-[#9E7E60]">Kost/persoon</span>
                      <span className="font-mono font-semibold text-[#2C1810]">€{totalCost.toFixed(2)}</span>
                    </div>
                    {foodCostPct && (
                      <div className="flex justify-between mt-1">
                        <span className="text-[#9E7E60]">Food cost</span>
                        <span className={`font-mono font-semibold ${
                          parseFloat(foodCostPct) <= (proposal.target_food_cost_pct || 30)
                            ? 'text-green-600' : 'text-amber-600'
                        }`}>
                          {foodCostPct}%
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tip */}
          <div className="bg-[#FEF3E2] border border-amber-200 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Vul de briefing in en klik <strong>AI Voorstel</strong> — de AI gebruikt seizoensproducten, Jules' LEGENDE gerechten en stijl-DNA.
              </p>
            </div>
          </div>
        </div>

        {/* Rechts: Menu Canvas */}
        <div className="lg:col-span-2 space-y-4">
          {/* Gangen */}
          {courses.map(course => {
            const courseItems = items.filter(i => i.course === course).sort((a, b) => a.sort_order - b.sort_order)
            return (
              <div key={course} className="bg-white border border-[#E8D5B5] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-[#FAF6EF] border-b border-[#F0E8D8]">
                  <span className="text-xs font-bold text-[#9E7E60] uppercase tracking-widest">{course}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => aiSuggestForCourse(course)}
                      disabled={suggestingFor === course}
                      className="flex items-center gap-1 px-2.5 py-1 bg-[#FEF3E2] hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs rounded-lg transition-all disabled:opacity-50"
                    >
                      {suggestingFor === course ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      AI
                    </button>
                    <button
                      onClick={() => addDishToCourse(course)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#F2E8D5] border border-[#E8D5B5] text-[#9E7E60] text-xs rounded-lg transition-all"
                    >
                      <Plus className="w-3 h-3" /> Voeg toe
                    </button>
                    <button
                      onClick={() => removeCourse(course)}
                      className="p-1 text-[#D4B896] hover:text-red-400 transition-colors"
                      title="Gang verwijderen"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-[#F5EDE0]">
                  {courseItems.map(item => (
                    <div key={item.id} className="flex items-start gap-3 px-5 py-3 hover:bg-[#FDFAF6] group">
                      <GripVertical className="w-4 h-4 text-[#D4B896] shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        {editingItem === item.id ? (
                          <input
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveItemName(item.id)
                              if (e.key === 'Escape') { setEditingItem(null); setEditValue('') }
                            }}
                            onBlur={() => saveItemName(item.id)}
                            placeholder="Naam gerecht..."
                            className="w-full bg-transparent border-b border-brand-400 text-sm font-medium text-[#2C1810] outline-none pb-0.5"
                            autoFocus
                          />
                        ) : (
                          <div
                            className="text-sm font-semibold text-[#2C1810] cursor-pointer hover:text-brand-400 transition-colors flex items-center gap-2"
                            onClick={() => { setEditingItem(item.id); setEditValue(item.dish_name) }}
                          >
                            <span className={item.dish_name ? '' : 'text-[#D4B896] italic font-normal'}>
                              {item.dish_name || 'Klik om naam in te vullen...'}
                            </span>
                            {item.source_type === 'ai' && (
                              <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">AI</span>
                            )}
                          </div>
                        )}
                        {/* Beschrijving */}
                        {editingDesc === item.id ? (
                          <input
                            value={editDescValue}
                            onChange={e => setEditDescValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveItemDesc(item.id)
                              if (e.key === 'Escape') { setEditingDesc(null); setEditDescValue('') }
                            }}
                            onBlur={() => saveItemDesc(item.id)}
                            placeholder="Korte beschrijving..."
                            className="w-full mt-0.5 bg-transparent border-b border-[#E8D5B5] text-xs text-[#9E7E60] outline-none pb-0.5"
                            autoFocus
                          />
                        ) : (
                          item.dish_description ? (
                            <p
                              className="text-xs text-[#9E7E60] mt-0.5 cursor-pointer hover:text-[#2C1810] transition-colors italic"
                              onClick={() => { setEditingDesc(item.id); setEditDescValue(item.dish_description) }}
                            >
                              {item.dish_description}
                            </p>
                          ) : (
                            <button
                              onClick={() => { setEditingDesc(item.id); setEditDescValue('') }}
                              className="text-xs text-[#D4B896] hover:text-[#9E7E60] mt-0.5 opacity-0 group-hover:opacity-100 transition-all italic"
                            >
                              + beschrijving
                            </button>
                          )
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.cost_per_person && (
                          <span className="text-xs font-mono text-[#9E7E60]">€{Number(item.cost_per_person).toFixed(2)}</span>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-[#B8997A] hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {courseItems.length === 0 && (
                    <div className="px-5 py-4 text-center text-xs text-[#D4B896]">
                      Leeg — klik AI of + om te vullen
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Gang toevoegen */}
          <div className="bg-white border border-dashed border-[#E8D5B5] rounded-2xl p-4">
            <p className="text-xs font-semibold text-[#9E7E60] mb-3 uppercase tracking-wide">Gang toevoegen</p>
            <div className="flex flex-wrap gap-2">
              {COURSE_ORDER.filter(c => !courses.includes(c)).map(course => (
                <button
                  key={course}
                  onClick={() => addCourse(course)}
                  className="px-3 py-1.5 bg-[#FAF6EF] hover:bg-[#F2E8D5] border border-[#E8D5B5] text-[#9E7E60] text-xs font-medium rounded-lg transition-all"
                >
                  + {course}
                </button>
              ))}
              {COURSE_ORDER.filter(c => !courses.includes(c)).length === 0 && (
                <span className="text-xs text-[#D4B896]">Alle gangen aanwezig</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-[#E8D5B5] p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-display font-semibold text-[#2C1810] mb-4">Feedback klant invoeren</h3>
            <textarea
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder="bvb. Klant wil geen citroen in het dessert, liever tarbot ipv zeebaars..."
              rows={4}
              className="w-full px-3 py-2.5 bg-[#FDFAF6] border border-[#E8D5B5] rounded-xl text-sm text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none mb-4"
              autoFocus
            />
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="px-4 py-2 text-[#9E7E60] hover:text-[#2C1810] text-sm transition-colors"
              >
                Annuleer
              </button>
              <button
                onClick={saveFeedback}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl transition-all"
              >
                Feedback opslaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
