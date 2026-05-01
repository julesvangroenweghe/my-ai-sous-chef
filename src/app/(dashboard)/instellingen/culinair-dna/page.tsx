'use client'

// src/app/instellingen/culinair-dna/page.tsx

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

type RuleType = 'altijd' | 'nooit' | 'soms'
type InfluenceLevel = 'inspiratie' | 'sterk' | 'dominant'

interface CulinaryRule {
  id: string
  rule_text: string
  rule_type: RuleType
  context: string
  nuance?: string
  subject?: string
  subject_type?: string
  source: string
  confidence: number
  times_applied: number
  times_overridden: number
}

interface ChefReference {
  id: string
  name: string
  nationality: string
  restaurant: string
  michelin_stars: number
  style_summary: string
  core_philosophy: string
  signature_techniques: string[]
  signature_ingredients: string[]
  flavor_profile: string[]
  is_linked: boolean
  influence_level: InfluenceLevel | null
}

const RULE_TYPE_CONFIG: Record<RuleType, { label: string; color: string; bg: string }> = {
  altijd: { label: 'Altijd', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  nooit: { label: 'Nooit', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  soms: { label: 'Soms', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
}

const CONTEXT_OPTIONS = ['algemeen', 'dessert', 'hartig', 'vis', 'vlees', 'groente', 'menu-architectuur', 'textuur', 'stijl']
const INFLUENCE_OPTIONS: { value: InfluenceLevel; label: string; desc: string }[] = [
  { value: 'inspiratie', label: 'Inspiratie', desc: 'Occasionele accenten' },
  { value: 'sterk', label: 'Sterk', desc: 'Merkbare invloed' },
  { value: 'dominant', label: 'Dominant', desc: 'Sterk aanwezig in mijn keuken' },
]

export default function CulinaryDNAPage() {
  const [rules, setRules] = useState<CulinaryRule[]>([])
  const [references, setReferences] = useState<ChefReference[]>([])
  const [activeTab, setActiveTab] = useState<'regels' | 'referenties'>('regels')
  const [loading, setLoading] = useState(true)
  const [showNewRule, setShowNewRule] = useState(false)
  const [filterType, setFilterType] = useState<RuleType | 'alle'>('alle')
  const [filterContext, setFilterContext] = useState('alle')
  const [searchRef, setSearchRef] = useState('')

  // Nieuwe regel form
  const [newRule, setNewRule] = useState({
    rule_text: '',
    rule_type: 'soms' as RuleType,
    context: 'algemeen',
    nuance: '',
    subject: '',
    subject_type: 'ingredient',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [rulesRes, refsRes] = await Promise.all([
      fetch('/api/culinary-rules'),
      fetch('/api/chef-references'),
    ])
    const [rulesData, refsData] = await Promise.all([rulesRes.json(), refsRes.json()])
    setRules(rulesData.rules || [])
    setReferences(refsData.references || [])
    setLoading(false)
  }

  async function addRule() {
    if (!newRule.rule_text.trim()) return
    const res = await fetch('/api/culinary-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRule),
    })
    const data = await res.json()
    if (data.rule) {
      setRules(prev => [data.rule, ...prev])
      setNewRule({ rule_text: '', rule_type: 'soms', context: 'algemeen', nuance: '', subject: '', subject_type: 'ingredient' })
      setShowNewRule(false)
      toast.success('Regel opgeslagen')
    }
  }

  async function deleteRule(id: string) {
    await fetch(`/api/culinary-rules?id=${id}`, { method: 'DELETE' })
    setRules(prev => prev.filter(r => r.id !== id))
    toast.success('Regel verwijderd')
  }

  async function toggleReference(ref: ChefReference) {
    if (ref.is_linked) {
      await fetch(`/api/chef-references?id=${ref.id}`, { method: 'DELETE' })
      setReferences(prev => prev.map(r => r.id === ref.id ? { ...r, is_linked: false, influence_level: null } : r))
      toast.success(`${ref.name} ontkoppeld`)
    } else {
      await fetch('/api/chef-references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chef_reference_id: ref.id, influence_level: 'inspiratie' }),
      })
      setReferences(prev => prev.map(r => r.id === ref.id ? { ...r, is_linked: true, influence_level: 'inspiratie' } : r))
      toast.success(`${ref.name} toegevoegd als inspiratie`)
    }
  }

  async function updateInfluence(ref: ChefReference, level: InfluenceLevel) {
    await fetch('/api/chef-references', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chef_reference_id: ref.id, influence_level: level }),
    })
    setReferences(prev => prev.map(r => r.id === ref.id ? { ...r, influence_level: level } : r))
    toast.success(`Invloedniveau bijgewerkt`)
  }

  const filteredRules = rules.filter(r => {
    if (filterType !== 'alle' && r.rule_type !== filterType) return false
    if (filterContext !== 'alle' && r.context !== filterContext) return false
    return true
  })

  const filteredRefs = references.filter(r =>
    r.name.toLowerCase().includes(searchRef.toLowerCase()) ||
    r.style_summary.toLowerCase().includes(searchRef.toLowerCase())
  )

  const linkedRefs = filteredRefs.filter(r => r.is_linked)
  const unlinkedRefs = filteredRefs.filter(r => !r.is_linked)

  const SOURCE_LABELS: Record<string, string> = {
    handmatig: 'Jij',
    geleerd_swap: 'Geleerd via swap',
    geleerd_rating: 'Geleerd via rating',
    popup_antwoord: 'Via vraag',
    ai_suggestie: 'AI suggestie',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#9E7E60]">Culinair DNA laden...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#2C1810]" style={{ fontFamily: 'Georgia, serif' }}>
          Culinair DNA
        </h1>
        <p className="text-[#9E7E60] mt-1">
          Leer de AI jouw culinaire logica — regels, referenties en balans.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-[#E8D5B5] rounded-xl p-4">
          <div className="text-2xl font-bold text-[#2C1810]">{rules.length}</div>
          <div className="text-sm text-[#9E7E60]">Culinaire regels</div>
        </div>
        <div className="bg-white border border-[#E8D5B5] rounded-xl p-4">
          <div className="text-2xl font-bold text-[#2C1810]">{references.filter(r => r.is_linked).length}</div>
          <div className="text-sm text-[#9E7E60]">Chef-referenties actief</div>
        </div>
        <div className="bg-white border border-[#E8D5B5] rounded-xl p-4">
          <div className="text-2xl font-bold text-[#2C1810]">{rules.filter(r => r.source !== 'handmatig').length}</div>
          <div className="text-sm text-[#9E7E60]">Automatisch geleerd</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#F2E8D5] rounded-lg p-1">
        <button
          onClick={() => setActiveTab('regels')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === 'regels'
              ? 'bg-white text-[#2C1810] shadow-sm'
              : 'text-[#9E7E60] hover:text-[#2C1810]'
          }`}
        >
          Mijn regels ({rules.length})
        </button>
        <button
          onClick={() => setActiveTab('referenties')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === 'referenties'
              ? 'bg-white text-[#2C1810] shadow-sm'
              : 'text-[#9E7E60] hover:text-[#2C1810]'
          }`}
        >
          Chef-referenties ({references.filter(r => r.is_linked).length} actief)
        </button>
      </div>

      {/* Tab: Regels */}
      {activeTab === 'regels' && (
        <div>
          {/* Filters + Nieuwe regel */}
          <div className="flex flex-wrap gap-3 mb-5 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as RuleType | 'alle')}
                className="text-sm border border-[#E8D5B5] rounded-lg px-3 py-1.5 bg-white text-[#2C1810]"
              >
                <option value="alle">Alle types</option>
                <option value="altijd">Altijd</option>
                <option value="nooit">Nooit</option>
                <option value="soms">Soms</option>
              </select>
              <select
                value={filterContext}
                onChange={e => setFilterContext(e.target.value)}
                className="text-sm border border-[#E8D5B5] rounded-lg px-3 py-1.5 bg-white text-[#2C1810]"
              >
                <option value="alle">Alle contexten</option>
                {CONTEXT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button
              onClick={() => setShowNewRule(!showNewRule)}
              className="flex items-center gap-2 bg-[#E8A040] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#C4703A] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nieuwe regel
            </button>
          </div>

          {/* Nieuwe regel form */}
          {showNewRule && (
            <div className="bg-white border border-[#E8D5B5] rounded-xl p-5 mb-5">
              <h3 className="font-semibold text-[#2C1810] mb-4">Nieuwe culinaire regel</h3>
              <div className="space-y-3">
                <textarea
                  value={newRule.rule_text}
                  onChange={e => setNewRule(p => ({ ...p, rule_text: e.target.value }))}
                  placeholder="Beschrijf de regel... bv. 'Verveine is mijn dessert-signatuurkruid'"
                  className="w-full border border-[#E8D5B5] rounded-lg px-3 py-2 text-sm text-[#2C1810] h-20 resize-none focus:outline-none focus:border-[#E8A040]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#9E7E60] mb-1 block">Type</label>
                    <select
                      value={newRule.rule_type}
                      onChange={e => setNewRule(p => ({ ...p, rule_type: e.target.value as RuleType }))}
                      className="w-full border border-[#E8D5B5] rounded-lg px-3 py-2 text-sm text-[#2C1810] bg-white"
                    >
                      <option value="altijd">Altijd</option>
                      <option value="nooit">Nooit</option>
                      <option value="soms">Soms (met context)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#9E7E60] mb-1 block">Context</label>
                    <select
                      value={newRule.context}
                      onChange={e => setNewRule(p => ({ ...p, context: e.target.value }))}
                      className="w-full border border-[#E8D5B5] rounded-lg px-3 py-2 text-sm text-[#2C1810] bg-white"
                    >
                      {CONTEXT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={newRule.subject}
                    onChange={e => setNewRule(p => ({ ...p, subject: e.target.value }))}
                    placeholder="Onderwerp (bv. miso, lavas)"
                    className="border border-[#E8D5B5] rounded-lg px-3 py-2 text-sm text-[#2C1810] focus:outline-none focus:border-[#E8A040]"
                  />
                  <input
                    value={newRule.nuance}
                    onChange={e => setNewRule(p => ({ ...p, nuance: e.target.value }))}
                    placeholder="Nuance (optioneel)"
                    className="border border-[#E8D5B5] rounded-lg px-3 py-2 text-sm text-[#2C1810] focus:outline-none focus:border-[#E8A040]"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowNewRule(false)}
                    className="px-4 py-2 text-sm text-[#9E7E60] hover:text-[#2C1810] transition-colors"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={addRule}
                    className="px-4 py-2 bg-[#E8A040] text-white rounded-lg text-sm font-medium hover:bg-[#C4703A] transition-colors"
                  >
                    Opslaan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rules lijst */}
          <div className="space-y-2">
            {filteredRules.map(rule => {
              const config = RULE_TYPE_CONFIG[rule.rule_type]
              return (
                <div key={rule.id} className={`border rounded-xl p-4 ${config.bg}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-bold uppercase tracking-wide ${config.color}`}>
                          {config.label}
                        </span>
                        {rule.context && rule.context !== 'algemeen' && (
                          <span className="text-xs bg-white/70 border border-current/20 px-2 py-0.5 rounded-full text-[#9E7E60]">
                            {rule.context}
                          </span>
                        )}
                        {rule.subject && (
                          <span className="text-xs font-medium text-[#2C1810] bg-white/70 px-2 py-0.5 rounded-full">
                            {rule.subject}
                          </span>
                        )}
                        <span className="text-xs text-[#9E7E60]">
                          — {SOURCE_LABELS[rule.source] || rule.source}
                        </span>
                      </div>
                      <p className="text-sm text-[#2C1810]">{rule.rule_text}</p>
                      {rule.nuance && (
                        <p className="text-xs text-[#9E7E60] mt-1 italic">{rule.nuance}</p>
                      )}
                      {(rule.times_applied > 0 || rule.times_overridden > 0) && (
                        <div className="flex gap-3 mt-2 text-xs text-[#9E7E60]">
                          <span>{rule.times_applied}× toegepast</span>
                          {rule.times_overridden > 0 && (
                            <span className="text-amber-600">{rule.times_overridden}× overschreven</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="text-[#9E7E60] hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}

            {filteredRules.length === 0 && (
              <div className="text-center py-12 text-[#9E7E60]">
                <p>Geen regels gevonden voor deze filter.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Chef-referenties */}
      {activeTab === 'referenties' && (
        <div>
          <div className="mb-5">
            <input
              value={searchRef}
              onChange={e => setSearchRef(e.target.value)}
              placeholder="Zoek op naam of stijl..."
              className="w-full border border-[#E8D5B5] rounded-xl px-4 py-2.5 text-sm text-[#2C1810] bg-white focus:outline-none focus:border-[#E8A040]"
            />
          </div>

          {/* Actieve referenties */}
          {linkedRefs.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-[#2C1810] mb-3 uppercase tracking-wide">
                Mijn referenties ({linkedRefs.length})
              </h3>
              <div className="space-y-3">
                {linkedRefs.map(ref => (
                  <div key={ref.id} className="bg-white border border-[#E8A040] rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-[#2C1810]">{ref.name}</span>
                          <span className="text-xs text-[#9E7E60]">{ref.restaurant}</span>
                          {ref.michelin_stars > 0 && (
                            <span className="text-xs text-[#E8A040]">{'★'.repeat(ref.michelin_stars)}</span>
                          )}
                        </div>
                        <p className="text-xs text-[#9E7E60] mb-2">{ref.style_summary}</p>
                        
                        {/* Invloedniveau */}
                        <div className="flex gap-1">
                          {INFLUENCE_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => updateInfluence(ref, opt.value)}
                              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                ref.influence_level === opt.value
                                  ? 'bg-[#E8A040] text-white border-[#E8A040]'
                                  : 'text-[#9E7E60] border-[#E8D5B5] hover:border-[#E8A040]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleReference(ref)}
                        className="text-[#9E7E60] hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Beschikbare referenties */}
          <div>
            <h3 className="text-sm font-semibold text-[#2C1810] mb-3 uppercase tracking-wide">
              Chefs toevoegen
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {unlinkedRefs.map(ref => (
                <div key={ref.id} className="bg-white border border-[#E8D5B5] rounded-xl p-4 hover:border-[#E8A040] transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-[#2C1810]">{ref.name}</span>
                        <span className="text-xs text-[#9E7E60]">{ref.nationality} · {ref.restaurant}</span>
                        {ref.michelin_stars > 0 && (
                          <span className="text-xs text-[#E8A040]">{'★'.repeat(ref.michelin_stars)}</span>
                        )}
                      </div>
                      <p className="text-xs text-[#9E7E60] mb-2">{ref.style_summary}</p>
                      <div className="flex flex-wrap gap-1">
                        {ref.flavor_profile?.slice(0, 4).map(f => (
                          <span key={f} className="text-xs bg-[#F2E8D5] text-[#9E7E60] px-2 py-0.5 rounded-full">{f}</span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleReference(ref)}
                      className="flex-shrink-0 text-xs bg-[#F2E8D5] text-[#9E7E60] group-hover:bg-[#E8A040] group-hover:text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      Toevoegen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
