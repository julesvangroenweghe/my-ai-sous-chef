'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Save, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'

interface CustomCost {
  id: string
  name: string
  type: 'fixed_pp' | 'pct_revenue'
  value: number
  category: 'personnel' | 'equipment' | 'commission' | 'other'
}

interface PricingConfig {
  target_food_cost_pct: number
  staff_chef_cost_pp: number
  staff_service_cost_pp: number
  staff_commis_cost_pp: number
  staff_extra_cost_pp: number
  staff_notes: string
  mobile_kitchen_included: boolean
  mobile_kitchen_cost_pp: number
  transport_cost_pp: number
  equipment_rental_cost_pp: number
  overhead_cost_pp: number
  commission_venue_pct: number
  commission_agent_pct: number
  commission_platform_pct: number
  custom_costs: CustomCost[]
  target_margin_pct: number
  vat_pct: number
}

const DEFAULT: PricingConfig = {
  target_food_cost_pct: 30,
  staff_chef_cost_pp: 0,
  staff_service_cost_pp: 0,
  staff_commis_cost_pp: 0,
  staff_extra_cost_pp: 0,
  staff_notes: '',
  mobile_kitchen_included: false,
  mobile_kitchen_cost_pp: 0,
  transport_cost_pp: 0,
  equipment_rental_cost_pp: 0,
  overhead_cost_pp: 0,
  commission_venue_pct: 0,
  commission_agent_pct: 0,
  commission_platform_pct: 0,
  custom_costs: [],
  target_margin_pct: 20,
  vat_pct: 6,
}

function calcSellingPrice(config: PricingConfig, foodCostPp: number): {
  food_cost_pp: number
  staff_pp: number
  equipment_pp: number
  overhead_pp: number
  custom_fixed_pp: number
  base_cost_pp: number
  commission_pct: number
  price_excl_vat: number
  price_incl_vat: number
  food_cost_pct_actual: number
} {
  const staff_pp =
    (config.staff_chef_cost_pp || 0) +
    (config.staff_service_cost_pp || 0) +
    (config.staff_commis_cost_pp || 0) +
    (config.staff_extra_cost_pp || 0)

  const equipment_pp =
    (config.mobile_kitchen_included ? (config.mobile_kitchen_cost_pp || 0) : 0) +
    (config.transport_cost_pp || 0) +
    (config.equipment_rental_cost_pp || 0)

  const overhead_pp = config.overhead_cost_pp || 0

  const custom_fixed_pp = (config.custom_costs || [])
    .filter(c => c.type === 'fixed_pp')
    .reduce((sum, c) => sum + (c.value || 0), 0)

  const base_cost_pp = foodCostPp + staff_pp + equipment_pp + overhead_pp + custom_fixed_pp

  // Commission and custom pct add-ons (applied on top of selling price, so divide out)
  const commission_pct =
    (config.commission_venue_pct || 0) +
    (config.commission_agent_pct || 0) +
    (config.commission_platform_pct || 0) +
    (config.custom_costs || [])
      .filter(c => c.type === 'pct_revenue' && c.category === 'commission')
      .reduce((sum, c) => sum + (c.value || 0), 0)

  const margin_pct = config.target_margin_pct || 20

  // price_excl_vat = base_cost / (1 - margin%) / (1 - commission%)
  const divisor1 = Math.max(0.01, 1 - margin_pct / 100)
  const divisor2 = Math.max(0.01, 1 - commission_pct / 100)
  const price_excl_vat = base_cost_pp / divisor1 / divisor2
  const price_incl_vat = price_excl_vat * (1 + (config.vat_pct || 6) / 100)

  const food_cost_pct_actual = price_excl_vat > 0 ? (foodCostPp / price_excl_vat) * 100 : 0

  return {
    food_cost_pp: foodCostPp,
    staff_pp,
    equipment_pp,
    overhead_pp,
    custom_fixed_pp,
    base_cost_pp,
    commission_pct,
    price_excl_vat,
    price_incl_vat,
    food_cost_pct_actual,
  }
}

interface SectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-[#E8D5B5] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 bg-[#FEF9F2] hover:bg-[#FEF3E2] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-amber-600">{icon}</span>
          <span className="font-semibold text-[#2C1810] text-sm">{title}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-[#9E7E60]" /> : <ChevronDown size={16} className="text-[#9E7E60]" />}
      </button>
      {open && <div className="p-4 bg-white space-y-3">{children}</div>}
    </div>
  )
}

interface NumFieldProps {
  label: string
  value: number
  onChange: (v: number) => void
  suffix?: string
  hint?: string
  step?: number
}

function NumField({ label, value, onChange, suffix = '€', hint, step = 0.5 }: NumFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#5C4730] mb-1">{label}</label>
      {hint && <p className="text-xs text-[#9E7E60] mb-1">{hint}</p>}
      <div className="flex items-center gap-1">
        <span className="text-sm text-[#9E7E60] w-4">{suffix}</span>
        <input
          type="number"
          min={0}
          step={step}
          value={value || 0}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-28 px-3 py-1.5 border border-[#E8D5B5] rounded-lg text-sm bg-white text-[#2C1810] focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
      </div>
    </div>
  )
}

interface PricingConfigPanelProps {
  onConfigChange?: (config: PricingConfig) => void
  compact?: boolean
}

export default function PricingConfigPanel({ onConfigChange, compact = false }: PricingConfigPanelProps) {
  const [config, setConfig] = useState<PricingConfig>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [previewFoodCost, setPreviewFoodCost] = useState(18)

  const loadConfig = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/kitchen/pricing-config')
      if (res.ok) {
        const data = await res.json()
        if (data.config) {
          setConfig({ ...DEFAULT, ...data.config })
        }
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  useEffect(() => {
    onConfigChange?.(config)
  }, [config, onConfigChange])

  const update = (key: keyof PricingConfig, value: unknown) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const addCustomCost = () => {
    const newCost: CustomCost = {
      id: crypto.randomUUID(),
      name: '',
      type: 'fixed_pp',
      value: 0,
      category: 'other',
    }
    update('custom_costs', [...config.custom_costs, newCost])
  }

  const removeCustomCost = (id: string) => {
    update('custom_costs', config.custom_costs.filter(c => c.id !== id))
  }

  const updateCustomCost = (id: string, field: keyof CustomCost, value: unknown) => {
    update('custom_costs', config.custom_costs.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/kitchen/pricing-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch { /* silent */ }
    setSaving(false)
  }

  const preview = calcSellingPrice(config, previewFoodCost)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-display font-bold text-[#2C1810]">Prijsberekening</h2>
            <p className="text-sm text-[#9E7E60] mt-0.5">
              Stel je kosten, overhead en commissies in. De app berekent automatisch je verkoopprijs.
            </p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <span>✓</span> : <Save size={14} />}
            {saving ? 'Opslaan...' : saved ? 'Opgeslagen' : 'Opslaan'}
          </button>
        </div>
      )}

      {/* Food cost target */}
      <Section title="Food cost doel" defaultOpen icon={
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
      }>
        <div className="flex items-center gap-4">
          <NumField label="Food cost %" value={config.target_food_cost_pct} onChange={v => update('target_food_cost_pct', v)} suffix="%" step={1} />
          <NumField label="BTW %" value={config.vat_pct} onChange={v => update('vat_pct', v)} suffix="%" step={1} />
          <NumField label="Winstmarge %" value={config.target_margin_pct} onChange={v => update('target_margin_pct', v)} suffix="%" step={1} />
        </div>
      </Section>

      {/* Personeel */}
      <Section title="Personeel" icon={
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      }>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Kok(s) per persoon" value={config.staff_chef_cost_pp} onChange={v => update('staff_chef_cost_pp', v)} hint="Totale keukenkosten ÷ gastencount" />
          <NumField label="Bediening per persoon" value={config.staff_service_cost_pp} onChange={v => update('staff_service_cost_pp', v)} />
          <NumField label="Commis per persoon" value={config.staff_commis_cost_pp} onChange={v => update('staff_commis_cost_pp', v)} />
          <NumField label="Extra personeel per persoon" value={config.staff_extra_cost_pp} onChange={v => update('staff_extra_cost_pp', v)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#5C4730] mb-1">Notities personeel</label>
          <input
            type="text"
            value={config.staff_notes || ''}
            onChange={e => update('staff_notes', e.target.value)}
            placeholder="bv. 1 kok per 20 personen × €170/dag"
            className="w-full px-3 py-1.5 border border-[#E8D5B5] rounded-lg text-sm bg-white text-[#2C1810] focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>
      </Section>

      {/* Materiaal & logistiek */}
      <Section title="Materiaal & logistiek" icon={
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
          <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      }>
        <div className="flex items-center gap-3 mb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.mobile_kitchen_included}
              onChange={e => update('mobile_kitchen_included', e.target.checked)}
              className="w-4 h-4 accent-amber-500"
            />
            <span className="text-sm font-medium text-[#2C1810]">Mobiele keuken inbegrepen</span>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {config.mobile_kitchen_included && (
            <NumField label="Mobiele keuken per persoon" value={config.mobile_kitchen_cost_pp} onChange={v => update('mobile_kitchen_cost_pp', v)} />
          )}
          <NumField label="Transport per persoon" value={config.transport_cost_pp} onChange={v => update('transport_cost_pp', v)} />
          <NumField label="Materiaalverhuur per persoon" value={config.equipment_rental_cost_pp} onChange={v => update('equipment_rental_cost_pp', v)} />
          <NumField label="Algemene overhead per persoon" value={config.overhead_cost_pp} onChange={v => update('overhead_cost_pp', v)} />
        </div>
      </Section>

      {/* Commissies */}
      <Section title="Commissies" icon={
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      }>
        <p className="text-xs text-[#9E7E60] -mt-1 mb-2">Commissies worden afgetrokken van de verkoopprijs (niet opgeteld bij kosten)</p>
        <div className="grid grid-cols-3 gap-3">
          <NumField label="Zaalcommissie %" value={config.commission_venue_pct} onChange={v => update('commission_venue_pct', v)} suffix="%" step={0.5} />
          <NumField label="Agent/tussenpersoon %" value={config.commission_agent_pct} onChange={v => update('commission_agent_pct', v)} suffix="%" step={0.5} />
          <NumField label="Boekingsplatform %" value={config.commission_platform_pct} onChange={v => update('commission_platform_pct', v)} suffix="%" step={0.5} />
        </div>
      </Section>

      {/* Extra kosten */}
      <Section title="Extra kosten" icon={
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
      }>
        <div className="space-y-2">
          {config.custom_costs.map(cost => (
            <div key={cost.id} className="flex items-center gap-2 p-2 bg-[#FEF9F2] rounded-lg border border-[#E8D5B5]">
              <input
                type="text"
                value={cost.name}
                onChange={e => updateCustomCost(cost.id, 'name', e.target.value)}
                placeholder="Naam (bv. Bloemendeoratie)"
                className="flex-1 px-2 py-1 text-sm border border-[#E8D5B5] rounded bg-white text-[#2C1810] focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <select
                value={cost.type}
                onChange={e => updateCustomCost(cost.id, 'type', e.target.value)}
                className="px-2 py-1 text-xs border border-[#E8D5B5] rounded bg-white text-[#2C1810] focus:outline-none"
              >
                <option value="fixed_pp">€/persoon</option>
                <option value="pct_revenue">% omzet</option>
              </select>
              <input
                type="number"
                min={0}
                step={0.5}
                value={cost.value}
                onChange={e => updateCustomCost(cost.id, 'value', parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1 text-sm border border-[#E8D5B5] rounded bg-white text-[#2C1810] focus:outline-none"
              />
              <select
                value={cost.category}
                onChange={e => updateCustomCost(cost.id, 'category', e.target.value)}
                className="px-2 py-1 text-xs border border-[#E8D5B5] rounded bg-white text-[#2C1810] focus:outline-none"
              >
                <option value="personnel">Personeel</option>
                <option value="equipment">Materiaal</option>
                <option value="commission">Commissie</option>
                <option value="other">Overige</option>
              </select>
              <button onClick={() => removeCustomCost(cost.id)} className="text-red-400 hover:text-red-600">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={addCustomCost}
            className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            <Plus size={14} />
            Kost toevoegen
          </button>
        </div>
      </Section>

      {/* Live preview */}
      <div className="bg-gradient-to-br from-amber-50 to-[#FEF9F2] border border-amber-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#2C1810]">Prijsberekening voorbeeld</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9E7E60]">Food cost pp:</span>
            <input
              type="number"
              min={1}
              step={1}
              value={previewFoodCost}
              onChange={e => setPreviewFoodCost(parseFloat(e.target.value) || 0)}
              className="w-16 px-2 py-1 text-xs border border-amber-200 rounded bg-white text-[#2C1810] focus:outline-none"
            />
            <span className="text-xs text-[#9E7E60]">€</span>
          </div>
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[#9E7E60]">Ingrediëntkosten</span>
            <span className="font-medium text-[#2C1810]">€{preview.food_cost_pp.toFixed(2)}</span>
          </div>
          {preview.staff_pp > 0 && (
            <div className="flex justify-between">
              <span className="text-[#9E7E60]">Personeel</span>
              <span className="font-medium text-[#2C1810]">€{preview.staff_pp.toFixed(2)}</span>
            </div>
          )}
          {preview.equipment_pp > 0 && (
            <div className="flex justify-between">
              <span className="text-[#9E7E60]">Materiaal & logistiek</span>
              <span className="font-medium text-[#2C1810]">€{preview.equipment_pp.toFixed(2)}</span>
            </div>
          )}
          {preview.overhead_pp > 0 && (
            <div className="flex justify-between">
              <span className="text-[#9E7E60]">Overhead</span>
              <span className="font-medium text-[#2C1810]">€{preview.overhead_pp.toFixed(2)}</span>
            </div>
          )}
          {preview.custom_fixed_pp > 0 && (
            <div className="flex justify-between">
              <span className="text-[#9E7E60]">Extra kosten</span>
              <span className="font-medium text-[#2C1810]">€{preview.custom_fixed_pp.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-amber-200 pt-1.5 mt-1">
            <span className="text-[#5C4730] font-medium">Totale kostprijs</span>
            <span className="font-bold text-[#2C1810]">€{preview.base_cost_pp.toFixed(2)}</span>
          </div>
          {preview.commission_pct > 0 && (
            <div className="flex justify-between text-xs text-[#9E7E60]">
              <span>Na commissie ({preview.commission_pct.toFixed(1)}%) + marge ({config.target_margin_pct}%)</span>
              <span></span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold border-t border-amber-300 pt-2 mt-1">
            <span className="text-[#2C1810]">Verkoopprijs excl. BTW</span>
            <span className="text-amber-700">€{preview.price_excl_vat.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#9E7E60]">Verkoopprijs incl. {config.vat_pct}% BTW</span>
            <span className="font-semibold text-[#2C1810]">€{preview.price_incl_vat.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-[#9E7E60] mt-1">
            <span>Werkelijke food cost %</span>
            <span className={preview.food_cost_pct_actual > config.target_food_cost_pct + 5 ? 'text-red-500' : 'text-green-600'}>
              {preview.food_cost_pct_actual.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {compact && (
        <button
          onClick={save}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? '✓ Opgeslagen' : 'Instellingen opslaan'}
        </button>
      )}
    </div>
  )
}

export { calcSellingPrice, type PricingConfig }
