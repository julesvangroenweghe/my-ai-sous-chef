'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useKitchen } from '@/providers/kitchen-provider'
import PushLevelSelector from './push-level-selector'
import MenuResult from './menu-result'

interface PricingConfig {
  target_food_cost_pct: number
  staff_chef_cost_pp: number
  staff_service_cost_pp: number
  staff_commis_cost_pp: number
  staff_extra_cost_pp: number
  mobile_kitchen_included: boolean
  mobile_kitchen_cost_pp: number
  transport_cost_pp: number
  equipment_rental_cost_pp: number
  overhead_cost_pp: number
  commission_venue_pct: number
  commission_agent_pct: number
  commission_platform_pct: number
  custom_costs: Array<{ id: string; name: string; type: 'fixed_pp' | 'pct_revenue'; value: number; category: string }>
  target_margin_pct: number
  vat_pct: number
}

function calcSuggestedPrice(config: PricingConfig, foodCostPp: number) {
  const staff_pp = (config.staff_chef_cost_pp||0) + (config.staff_service_cost_pp||0) + (config.staff_commis_cost_pp||0) + (config.staff_extra_cost_pp||0)
  const equipment_pp = (config.mobile_kitchen_included ? (config.mobile_kitchen_cost_pp||0) : 0) + (config.transport_cost_pp||0) + (config.equipment_rental_cost_pp||0)
  const overhead_pp = config.overhead_cost_pp || 0
  const custom_fixed_pp = (config.custom_costs||[]).filter(c => c.type === 'fixed_pp').reduce((s, c) => s + (c.value||0), 0)
  const base_cost_pp = foodCostPp + staff_pp + equipment_pp + overhead_pp + custom_fixed_pp
  const commission_pct = (config.commission_venue_pct||0) + (config.commission_agent_pct||0) + (config.commission_platform_pct||0) + (config.custom_costs||[]).filter(c => c.type === 'pct_revenue' && c.category === 'commission').reduce((s, c) => s + (c.value||0), 0)
  const margin_pct = config.target_margin_pct || 20
  const price_excl_vat = base_cost_pp / Math.max(0.01, 1 - margin_pct/100) / Math.max(0.01, 1 - commission_pct/100)
  const price_incl_vat = price_excl_vat * (1 + (config.vat_pct||6)/100)
  return { staff_pp, equipment_pp, overhead_pp, custom_fixed_pp, base_cost_pp, commission_pct, price_excl_vat, price_incl_vat }
}

const MENU_TYPES_BY_KITCHEN: Record<string, Array<{ value: string; label: string }>> = {
  restaurant: [
    { value: 'a_la_carte', label: 'A la carte' },
    { value: 'daily', label: 'Dagmenu' },
    { value: 'tasting', label: 'Tasting menu' },
  ],
  brasserie: [
    { value: 'daily', label: 'Dagmenu' },
    { value: 'a_la_carte', label: 'Weekmenu' },
    { value: 'event', label: 'Suggesties' },
  ],
  catering: [
    { value: 'event', label: 'Event menu' },
    { value: 'tasting', label: 'Walking dinner' },
    { value: 'fixed', label: 'Buffet' },
  ],
  foodtruck: [
    { value: 'fixed', label: 'Vast menu' },
    { value: 'daily', label: 'Dagmenu' },
  ],
  hotel: [
    { value: 'a_la_carte', label: 'Restaurant' },
    { value: 'event', label: 'Banket' },
    { value: 'daily', label: 'Dagmenu' },
  ],
}

const DEFAULT_MENU_TYPES = [
  { value: 'event', label: 'Event menu' },
  { value: 'a_la_carte', label: 'A la carte' },
  { value: 'daily', label: 'Dagmenu' },
  { value: 'tasting', label: 'Tasting menu' },
]

const ALLERGY_OPTIONS = [
  { value: 'glutenvrij', label: 'Glutenvrij' },
  { value: 'lactosevrij', label: 'Lactosevrij' },
  { value: 'vegetarisch', label: 'Vegetarisch' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'noten', label: 'Notenallergie' },
  { value: 'schaaldieren', label: 'Schaaldieren' },
]

const COURSE_OPTIONS = [
  { value: 'AMUSE', label: 'Amuse-bouche' },
  { value: 'FINGERFOOD', label: 'Fingerfood' },
  { value: 'VOORGERECHT', label: 'Voorgerecht' },
  { value: 'TUSSENGERECHT', label: 'Tussengerecht' },
  { value: 'HOOFDGERECHT', label: 'Hoofdgerecht' },
  { value: 'KAAS', label: 'Kaas' },
  { value: 'DESSERT', label: 'Dessert' },
  { value: 'MIGNARDISES', label: 'Mignardises' },
]

const STYLE_OPTIONS = ['Modern', 'Seizoensgebonden', 'Klassiek', 'Fusion']

const SEASON_OPTIONS = [
  { value: 'auto', label: 'Automatisch (huidige maand)' },
  { value: 'lente', label: 'Lente' },
  { value: 'zomer', label: 'Zomer' },
  { value: 'herfst', label: 'Herfst' },
  { value: 'winter', label: 'Winter' },
]

const LOADING_PHASES = [
  'Culinair directeur bedenkt menu...',
  'Criticus evalueert het menu...',
  'Arbiter verfijnt het resultaat...',
]

interface MenuWizardProps {
  onMenuSaved?: (menuId: string) => void
}

export default function MenuWizard({ onMenuSaved }: MenuWizardProps) {
  const { kitchenType } = useKitchen()
  const [step, setStep] = useState(1)
  const [loadingPhase, setLoadingPhase] = useState(0)

  // Pricing config
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null)
  const [showPricingBreakdown, setShowPricingBreakdown] = useState(false)

  // Step 1
  const [menuType, setMenuType] = useState('event')
  const [numPersons, setNumPersons] = useState(50)
  const [pricePerPerson, setPricePerPerson] = useState(65)
  const [foodCostTarget, setFoodCostTarget] = useState(30)
  const [season, setSeason] = useState('auto')

  // Step 2
  const [selectedCourses, setSelectedCourses] = useState<string[]>(['AMUSE', 'HOOFDGERECHT', 'DESSERT'])
  const [style, setStyle] = useState('Modern')
  const [pushLevel, setPushLevel] = useState('balanced')
  const [restrictions, setRestrictions] = useState<string[]>([])
  const [customPrompt, setCustomPrompt] = useState('')

  // Step 3
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null)

  const menuTypes = MENU_TYPES_BY_KITCHEN[kitchenType || ''] || DEFAULT_MENU_TYPES
  const maxFoodCost = ((pricePerPerson * foodCostTarget) / 100).toFixed(2)

  // Load pricing config
  const loadPricingConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/kitchen/pricing-config')
      if (res.ok) {
        const data = await res.json()
        if (data.config) {
          setPricingConfig(data.config)
          // Sync food cost target from config
          if (data.config.target_food_cost_pct) setFoodCostTarget(data.config.target_food_cost_pct)
        }
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => { loadPricingConfig() }, [loadPricingConfig])

  // Compute suggested price from pricing config
  const pricingPreview = pricingConfig
    ? calcSuggestedPrice(pricingConfig, (pricePerPerson * foodCostTarget) / 100)
    : null

  useEffect(() => {
    if (!generating) return
    let idx = 0
    const interval = setInterval(() => {
      idx = Math.min(idx + 1, LOADING_PHASES.length - 1)
      setLoadingPhase(idx)
    }, 6000)
    return () => clearInterval(interval)
  }, [generating])

  const toggleCourse = (val: string) => {
    setSelectedCourses(prev => prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val])
  }

  const toggleRestriction = (val: string) => {
    setRestrictions(prev => prev.includes(val) ? prev.filter(r => r !== val) : [...prev, val])
  }

  const generate = async () => {
    setGenerating(true)
    setGenError(null)
    setResult(null)
    setLoadingPhase(0)

    try {
      const res = await fetch('/api/menu-engineering/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_type: menuType,
          kitchen_type: kitchenType,
          num_persons: numPersons,
          price_per_person: pricePerPerson,
          target_food_cost_pct: foodCostTarget,
          season: season === 'auto' ? undefined : season,
          courses: selectedCourses,
          dietary_restrictions: restrictions,
          custom_prompt: customPrompt,
          push_level: pushLevel,
          style,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Onbekende fout')
      }

      const data = await res.json()
      setResult(data)
      setStep(3)
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Fout bij genereren')
    } finally {
      setGenerating(false)
    }
  }

  const handleAccept = async () => {
    if (!result?.saved_menu_id) return
    try {
      await fetch('/api/menu-engineering/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_id: result.saved_menu_id, action: 'accepted' }),
      })
      onMenuSaved?.(result.saved_menu_id)
    } catch { /* silent */ }
  }

  const handleRegenerate = async () => {
    if (result?.saved_menu_id) {
      fetch('/api/menu-engineering/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_id: result.saved_menu_id, action: 'regenerated' }),
      }).catch(() => {})
    }
    generate()
  }

  const handleModify = () => {
    setStep(2)
    setResult(null)
  }

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-3">
        {[
          { n: 1, label: 'Basis' },
          { n: 2, label: 'Verfijning' },
          { n: 3, label: 'Resultaat' },
        ].map(({ n, label }) => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              step === n ? 'text-[#2C1810]' : step > n ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white text-[#B8997A]'
            }`} style={step === n ? { backgroundColor: '#E8A040' } : {}}>
              {step > n ? <Check className="w-4 h-4" /> : n}
            </div>
            <span className={`text-sm font-medium ${step === n ? 'text-[#2C1810]' : 'text-[#B8997A]'}`}>{label}</span>
            {n < 3 && (
              <svg className="w-4 h-4 text-[#5C4730]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M9 6l6 6-6 6" />
              </svg>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: Basis */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-6 space-y-5"
          >
            <h2 className="text-lg font-display font-semibold text-[#2C1810]">Basisgegevens</h2>

            <div className="space-y-2">
              <label className="text-xs text-[#9E7E60] font-medium">Menu type</label>
              <div className="flex flex-wrap gap-2">
                {menuTypes.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setMenuType(t.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      menuType === t.value
                        ? 'border-amber-500/40 text-amber-300'
                        : 'bg-white text-[#9E7E60] border-[#E8D5B5] hover:border-[#D4B896]'
                    }`}
                    style={menuType === t.value ? { backgroundColor: 'rgba(232,160,64,0.12)' } : {}}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-[#9E7E60] font-medium">Aantal personen</label>
                <input
                  type="number"
                  min={1}
                  value={numPersons}
                  onChange={e => setNumPersons(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-[#E8D5B5] rounded-lg text-[#3D2810] text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[#9E7E60] font-medium">Verkoopprijs per persoon</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8997A] text-sm">EUR</span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={pricePerPerson}
                    onChange={e => setPricePerPerson(Number(e.target.value))}
                    className="w-full pl-12 pr-3 py-2 bg-white border border-[#E8D5B5] rounded-lg text-[#3D2810] text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Food cost slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-[#9E7E60] font-medium">Target food cost %</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-bold" style={{ color: '#E8A040' }}>{foodCostTarget}%</span>
                  <span className="text-xs text-[#B8997A]">= max EUR {maxFoodCost}/p</span>
                </div>
              </div>
              <input
                type="range"
                min={15}
                max={45}
                value={foodCostTarget}
                onChange={e => setFoodCostTarget(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-xs text-[#5C4730]">
                <span>15%</span><span>30%</span><span>45%</span>
              </div>
            </div>

            {/* Season */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#9E7E60] font-medium">Seizoen</label>
              <select
                value={season}
                onChange={e => setSeason(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E8D5B5] rounded-lg text-[#3D2810] text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                {SEASON_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            {/* Pricing breakdown (only when config is loaded) */}
            {pricingConfig && pricingPreview && (
              <div className="border border-[#E8D5B5] rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowPricingBreakdown(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#FEF9F2] hover:bg-[#FEF3E2] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <svg width="15" height="15" fill="none" stroke="#E8A040" strokeWidth="1.5" viewBox="0 0 24 24">
                      <line x1="12" y1="1" x2="12" y2="23"/>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    <span className="text-sm font-semibold text-[#2C1810]">Volledige kostprijsberekening</span>
                    <span className="text-xs text-[#9E7E60]">— geschatte verkoopprijs: <strong className="text-amber-700">€{pricingPreview.price_excl_vat.toFixed(2)} excl. BTW</strong></span>
                  </div>
                  {showPricingBreakdown
                    ? <ChevronUp size={15} className="text-[#9E7E60]" />
                    : <ChevronDown size={15} className="text-[#9E7E60]" />}
                </button>
                {showPricingBreakdown && (
                  <div className="p-4 bg-white space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                      <div className="flex justify-between col-span-2 text-xs text-[#9E7E60] uppercase tracking-wide font-semibold pb-1 border-b border-[#F0E4CC]">
                        <span>Kostentype</span><span>Per persoon</span>
                      </div>
                      <div className="flex justify-between col-span-2">
                        <span className="text-[#5C4730]">Ingrediënten (food cost {foodCostTarget}%)</span>
                        <span className="font-medium text-[#2C1810]">€{((pricePerPerson * foodCostTarget) / 100).toFixed(2)}</span>
                      </div>
                      {pricingPreview.staff_pp > 0 && (
                        <div className="flex justify-between col-span-2">
                          <span className="text-[#5C4730]">Personeel</span>
                          <span className="font-medium text-[#2C1810]">€{pricingPreview.staff_pp.toFixed(2)}</span>
                        </div>
                      )}
                      {pricingPreview.equipment_pp > 0 && (
                        <div className="flex justify-between col-span-2">
                          <span className="text-[#5C4730]">Materiaal & logistiek</span>
                          <span className="font-medium text-[#2C1810]">€{pricingPreview.equipment_pp.toFixed(2)}</span>
                        </div>
                      )}
                      {pricingPreview.overhead_pp > 0 && (
                        <div className="flex justify-between col-span-2">
                          <span className="text-[#5C4730]">Overhead</span>
                          <span className="font-medium text-[#2C1810]">€{pricingPreview.overhead_pp.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between col-span-2 font-semibold border-t border-[#F0E4CC] pt-1.5 mt-0.5">
                        <span className="text-[#2C1810]">Totale kostprijs</span>
                        <span className="text-[#2C1810]">€{pricingPreview.base_cost_pp.toFixed(2)}</span>
                      </div>
                      {pricingPreview.commission_pct > 0 && (
                        <div className="flex justify-between col-span-2 text-xs text-[#9E7E60]">
                          <span>Commissies ({pricingPreview.commission_pct.toFixed(1)}%) + winstmarge ({pricingConfig.target_margin_pct}%)</span>
                          <span></span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2 border border-amber-200 mt-2">
                      <div>
                        <div className="font-bold text-amber-800">€{pricingPreview.price_excl_vat.toFixed(2)} <span className="font-normal text-xs">excl. BTW</span></div>
                        <div className="text-xs text-amber-700">€{pricingPreview.price_incl_vat.toFixed(2)} incl. {pricingConfig.vat_pct}% BTW</div>
                      </div>
                      <button
                        onClick={() => setPricePerPerson(Math.ceil(pricingPreview.price_excl_vat))}
                        className="px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition-colors"
                      >
                        Gebruik deze prijs
                      </button>
                    </div>
                    <p className="text-xs text-[#9E7E60]">
                      Instellingen aanpassen?{' '}
                      <a href="/instellingen/prijsberekening" className="text-amber-600 underline">Prijsberekening instellingen</a>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-5 py-2.5 text-[#2C1810] font-medium rounded-xl transition-all"
                style={{ backgroundColor: '#E8A040' }}
              >
                Volgende
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: Verfijning */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-6 space-y-5"
          >
            <h2 className="text-lg font-display font-semibold text-[#2C1810]">Verfijning</h2>

            {/* Courses */}
            <div className="space-y-2">
              <label className="text-xs text-[#9E7E60] font-medium">Gangen</label>
              <div className="grid grid-cols-2 gap-2">
                {COURSE_OPTIONS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => toggleCourse(c.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left ${
                      selectedCourses.includes(c.value)
                        ? 'border-amber-500/40 text-amber-300'
                        : 'bg-white text-[#9E7E60] border-[#E8D5B5] hover:border-[#D4B896]'
                    }`}
                    style={selectedCourses.includes(c.value) ? { backgroundColor: 'rgba(232,160,64,0.12)' } : {}}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      selectedCourses.includes(c.value) ? 'border-amber-400' : 'border-[#D4B896]'
                    }`} style={selectedCourses.includes(c.value) ? { backgroundColor: '#E8A040' } : {}}>
                      {selectedCourses.includes(c.value) && <Check className="w-2.5 h-2.5 text-[#2C1810]" />}
                    </div>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Style */}
            <div className="space-y-2">
              <label className="text-xs text-[#9E7E60] font-medium">Stijl</label>
              <div className="flex gap-2 flex-wrap">
                {STYLE_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      style === s
                        ? 'border-amber-500/40 text-amber-300'
                        : 'bg-white text-[#9E7E60] border-[#E8D5B5] hover:border-[#D4B896]'
                    }`}
                    style={style === s ? { backgroundColor: 'rgba(232,160,64,0.12)' } : {}}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Push level */}
            <PushLevelSelector value={pushLevel} onChange={setPushLevel} />

            {/* Dietary */}
            <div className="space-y-2">
              <label className="text-xs text-[#9E7E60] font-medium">Dieetwensen</label>
              <div className="flex flex-wrap gap-2">
                {ALLERGY_OPTIONS.map(a => (
                  <button
                    key={a.value}
                    onClick={() => toggleRestriction(a.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      restrictions.includes(a.value)
                        ? 'bg-red-500/20 text-red-300 border-red-500/40'
                        : 'bg-white text-[#9E7E60] border-[#E8D5B5] hover:border-[#D4B896]'
                    }`}
                  >
                    {restrictions.includes(a.value) && <Check className="w-3 h-3 inline mr-1" />}
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom prompt */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#9E7E60] font-medium">Extra wensen of context</label>
              <textarea
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                rows={3}
                placeholder="Bijvoorbeeld: thema, specifieke ingredienten, aanleiding..."
                className="w-full px-3 py-2 bg-white border border-[#E8D5B5] rounded-lg text-[#3D2810] text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
              />
            </div>

            {genError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {genError}
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-[#FDF8F2] text-[#5C4730] font-medium rounded-xl transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
                Terug
              </button>
              <button
                onClick={generate}
                disabled={selectedCourses.length === 0 || generating}
                className="flex items-center gap-2 px-5 py-2.5 text-[#2C1810] font-medium rounded-xl transition-all disabled:opacity-50"
                style={{ backgroundColor: '#E8A040' }}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {LOADING_PHASES[loadingPhase]}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="M12 3l1.88 5.76L20 10l-6.12 1.24L12 17l-1.88-5.76L4 10l6.12-1.24z"/>
                    </svg>
                    Menu genereren
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Result */}
        {step === 3 && result && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <MenuResult
              menu={result.menu}
              audit={result.audit}
              savedMenuId={result.saved_menu_id}
              pricePerPerson={pricePerPerson}
              foodCostTarget={foodCostTarget}
              onAccept={handleAccept}
              onRegenerate={handleRegenerate}
              onModify={handleModify}
              loading={generating}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
