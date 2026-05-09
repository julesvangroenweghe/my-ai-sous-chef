'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calculator, Save, RotateCcw, ChevronDown, ChevronRight, TrendingUp, Users, Truck, Building2, Percent, Euro } from 'lucide-react'

interface PricingConfig {
  id: string
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
  target_margin_pct: number
  vat_pct: number
}

function fmt(n: number) {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(n)
}

function fmtPct(n: number) {
  return n.toFixed(1) + '%'
}

export default function CateringCalculatorPage() {
  const supabase = createClient()
  const [config, setConfig] = useState<PricingConfig | null>(null)
  const [configId, setConfigId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Calculator inputs
  const [numPersons, setNumPersons] = useState(50)
  const [foodCostPP, setFoodCostPP] = useState(18)
  const [eventType, setEventType] = useState<'seated' | 'walking' | 'cocktail' | 'bbq'>('seated')

  // Overrides (copy from config)
  const [staffChef, setStaffChef] = useState(8.5)
  const [staffService, setStaffService] = useState(6)
  const [staffCommis, setStaffCommis] = useState(4)
  const [staffExtra, setStaffExtra] = useState(0)
  const [mobileCost, setMobileCost] = useState(12)
  const [mobileIncluded, setMobileIncluded] = useState(true)
  const [transport, setTransport] = useState(3.5)
  const [equipment, setEquipment] = useState(0)
  const [overhead, setOverhead] = useState(0)
  const [commVenue, setCommVenue] = useState(10)
  const [commAgent, setCommAgent] = useState(0)
  const [commPlatform, setCommPlatform] = useState(0)
  const [targetMargin, setTargetMargin] = useState(22)
  const [vat, setVat] = useState(6)

  useEffect(() => {
    async function load() {
      const { data: kitchenData } = await supabase.rpc('get_my_kitchen_ids')
      if (!kitchenData?.length) { setLoading(false); return }
      const kitchenId = kitchenData[0]
      const { data } = await supabase.from('kitchen_pricing_config').select('*').eq('kitchen_id', kitchenId).single()
      if (data) {
        setConfig(data as PricingConfig)
        setConfigId(data.id)
        setStaffChef(Number(data.staff_chef_cost_pp))
        setStaffService(Number(data.staff_service_cost_pp))
        setStaffCommis(Number(data.staff_commis_cost_pp))
        setStaffExtra(Number(data.staff_extra_cost_pp))
        setMobileCost(Number(data.mobile_kitchen_cost_pp))
        setMobileIncluded(data.mobile_kitchen_included)
        setTransport(Number(data.transport_cost_pp))
        setEquipment(Number(data.equipment_rental_cost_pp))
        setOverhead(Number(data.overhead_cost_pp))
        setCommVenue(Number(data.commission_venue_pct))
        setCommAgent(Number(data.commission_agent_pct))
        setCommPlatform(Number(data.commission_platform_pct))
        setTargetMargin(Number(data.target_margin_pct))
        setVat(Number(data.vat_pct))
        setFoodCostPP(Math.round(Number(data.target_food_cost_pct) / 100 * 65)) // rough estimate
      }
      setLoading(false)
    }
    load()
  }, [])

  const calc = useMemo(() => {
    const staffCost = staffChef + staffService + staffCommis + staffExtra
    const logisticsCost = (mobileIncluded ? mobileCost : 0) + transport + equipment + overhead
    const directCostPP = foodCostPP + staffCost + logisticsCost
    
    const totalCommPct = (commVenue + commAgent + commPlatform) / 100
    const marginPct = targetMargin / 100
    
    // price = direct_cost / (1 - commission% - margin%)
    const denominator = 1 - totalCommPct - marginPct
    const priceExVat = denominator > 0.05 ? directCostPP / denominator : directCostPP * 2
    const priceInclVat = priceExVat * (1 + vat / 100)
    
    const commCostPP = priceExVat * totalCommPct
    const marginPP = priceExVat * marginPct
    const actualFoodCostPct = priceExVat > 0 ? (foodCostPP / priceExVat) * 100 : 0
    const actualMarginPct = priceExVat > 0 ? (marginPP / priceExVat) * 100 : 0
    
    return {
      staffCost, logisticsCost, directCostPP,
      commCostPP, marginPP,
      priceExVat, priceInclVat,
      totalRevenue: priceInclVat * numPersons,
      totalRevenueExVat: priceExVat * numPersons,
      actualFoodCostPct, actualMarginPct,
      vatAmount: (priceInclVat - priceExVat) * numPersons
    }
  }, [foodCostPP, staffChef, staffService, staffCommis, staffExtra, mobileIncluded, mobileCost, transport, equipment, overhead, commVenue, commAgent, commPlatform, targetMargin, vat, numPersons])

  const handleSaveConfig = async () => {
    if (!configId) return
    setSaving(true)
    await supabase.from('kitchen_pricing_config').update({
      staff_chef_cost_pp: staffChef,
      staff_service_cost_pp: staffService,
      staff_commis_cost_pp: staffCommis,
      staff_extra_cost_pp: staffExtra,
      mobile_kitchen_included: mobileIncluded,
      mobile_kitchen_cost_pp: mobileCost,
      transport_cost_pp: transport,
      equipment_rental_cost_pp: equipment,
      overhead_cost_pp: overhead,
      commission_venue_pct: commVenue,
      commission_agent_pct: commAgent,
      commission_platform_pct: commPlatform,
      target_margin_pct: targetMargin,
      vat_pct: vat,
    }).eq('id', configId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    if (!config) return
    setStaffChef(Number(config.staff_chef_cost_pp))
    setStaffService(Number(config.staff_service_cost_pp))
    setStaffCommis(Number(config.staff_commis_cost_pp))
    setStaffExtra(Number(config.staff_extra_cost_pp))
    setMobileCost(Number(config.mobile_kitchen_cost_pp))
    setMobileIncluded(config.mobile_kitchen_included)
    setTransport(Number(config.transport_cost_pp))
    setEquipment(Number(config.equipment_rental_cost_pp))
    setOverhead(Number(config.overhead_cost_pp))
    setCommVenue(Number(config.commission_venue_pct))
    setCommAgent(Number(config.commission_agent_pct))
    setCommPlatform(Number(config.commission_platform_pct))
    setTargetMargin(Number(config.target_margin_pct))
    setVat(Number(config.vat_pct))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center">
            <Calculator className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-extrabold text-[#2C1810] tracking-tight">Catering Prijscalculator</h1>
            <p className="text-[#9E7E60] text-sm mt-0.5">Bereken de aanbevolen prijs per persoon voor elk event</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="flex items-center gap-2 px-3 py-2 text-sm text-[#9E7E60] hover:text-[#2C1810] border border-[#E8D5B5] rounded-xl hover:bg-[#F2E8D5] transition-all">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saved ? 'Opgeslagen \u2713' : saving ? 'Opslaan...' : 'Sla config op'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Inputs */}
        <div className="lg:col-span-2 space-y-4">
          {/* Event info */}
          <div className="bg-white border border-[#E8D5B5] rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold text-[#2C1810] flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" /> Event details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#9E7E60] mb-1.5 font-medium">Aantal personen</label>
                <input
                  type="number" min="1" value={numPersons}
                  onChange={e => setNumPersons(Number(e.target.value))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9E7E60] mb-1.5 font-medium">Food cost per persoon (\u20ac)</label>
                <input
                  type="number" min="0" step="0.5" value={foodCostPP}
                  onChange={e => setFoodCostPP(Number(e.target.value))}
                  className="input w-full"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#9E7E60] mb-1.5 font-medium">Type event</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'seated', label: 'Zittend', icon: '\uD83C\uDF7D\uFE0F' },
                  { key: 'walking', label: 'Walking', icon: '\uD83E\uDD7E' },
                  { key: 'cocktail', label: 'Cocktail', icon: '\uD83E\uDD42' },
                  { key: 'bbq', label: 'BBQ', icon: '\uD83D\uDD25' },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setEventType(t.key as any)}
                    className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      eventType === t.key
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : 'bg-white border-[#E8D5B5] text-[#5C4730] hover:border-amber-200'
                    }`}
                  >
                    <div className="text-lg">{t.icon}</div>
                    <div className="text-xs mt-0.5">{t.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Staff costs */}
          <div className="bg-white border border-[#E8D5B5] rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold text-[#2C1810] flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" /> Personeelskost per persoon
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Chef', value: staffChef, set: setStaffChef },
                { label: 'Service', value: staffService, set: setStaffService },
                { label: 'Commis', value: staffCommis, set: setStaffCommis },
                { label: 'Extra', value: staffExtra, set: setStaffExtra },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className="block text-xs text-[#9E7E60] mb-1.5 font-medium">{label} (\u20ac/pp)</label>
                  <input
                    type="number" min="0" step="0.5" value={value}
                    onChange={e => set(Number(e.target.value))}
                    className="input w-full"
                  />
                </div>
              ))}
            </div>
            <div className="text-xs text-right text-[#9E7E60]">
              Totaal personeel: <span className="font-semibold text-[#5C4730]">{fmt(staffChef + staffService + staffCommis + staffExtra)}/pp</span>
            </div>
          </div>

          {/* Logistics */}
          <div className="bg-white border border-[#E8D5B5] rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold text-[#2C1810] flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-500" /> Logistiek & operationeel
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-xs text-[#9E7E60] mb-1.5 font-medium">
                  <input type="checkbox" checked={mobileIncluded} onChange={e => setMobileIncluded(e.target.checked)} className="rounded" />
                  Mobiele keuken (\u20ac/pp)
                </label>
                <input
                  type="number" min="0" step="0.5" value={mobileCost}
                  onChange={e => setMobileCost(Number(e.target.value))}
                  disabled={!mobileIncluded}
                  className="input w-full disabled:opacity-40"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9E7E60] mb-1.5 font-medium">Transport (\u20ac/pp)</label>
                <input type="number" min="0" step="0.5" value={transport} onChange={e => setTransport(Number(e.target.value))} className="input w-full" />
              </div>
              <div>
                <label className="block text-xs text-[#9E7E60] mb-1.5 font-medium">Materiaalverhuur (\u20ac/pp)</label>
                <input type="number" min="0" step="0.5" value={equipment} onChange={e => setEquipment(Number(e.target.value))} className="input w-full" />
              </div>
              <div>
                <label className="block text-xs text-[#9E7E60] mb-1.5 font-medium">Overhead (\u20ac/pp)</label>
                <input type="number" min="0" step="0.5" value={overhead} onChange={e => setOverhead(Number(e.target.value))} className="input w-full" />
              </div>
            </div>
          </div>

          {/* Commissions & Margin */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center gap-2 text-sm text-[#9E7E60] hover:text-[#2C1810] py-2 transition-colors"
          >
            {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Commissies, marge & BTW
          </button>

          {showAdvanced && (
            <div className="bg-white border border-[#E8D5B5] rounded-2xl p-5 space-y-4">
              <h2 className="font-semibold text-[#2C1810] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-500" /> Commissies & marge
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#9E7E60] mb-1.5 font-medium">Zaalcommissie (%)</label>
                  <input type="number" min="0" max="50" step="0.5" value={commVenue} onChange={e => setCommVenue(Number(e.target.value))} className="input w-full" />
                </div>
                <div>
                  <label className="block text-xs text-[#9E7E60] mb-1.5 font-medium">Agentcommissie (%)</label>
                  <input type="number" min="0" max="50" step="0.5" value={commAgent} onChange={e => setCommAgent(Number(e.target.value))} className="input w-full" />
                </div>
                <div>
                  <label className="block text-xs text-[#9E7E60] mb-1.5 font-medium">Platform (%)</label>
                  <input type="number" min="0" max="50" step="0.5" value={commPlatform} onChange={e => setCommPlatform(Number(e.target.value))} className="input w-full" />
                </div>
                <div>
                  <label className="block text-xs text-[#9E7E60] mb-1.5 font-medium">Doelmarge (%)</label>
                  <input type="number" min="0" max="60" step="1" value={targetMargin} onChange={e => setTargetMargin(Number(e.target.value))} className="input w-full" />
                </div>
                <div>
                  <label className="block text-xs text-[#9E7E60] mb-1.5 font-medium">BTW (%)</label>
                  <input type="number" min="0" max="21" step="1" value={vat} onChange={e => setVat(Number(e.target.value))} className="input w-full" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Results */}
        <div className="space-y-4">
          {/* Price Result */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-2 border-amber-200 rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold text-amber-900 flex items-center gap-2">
              <Euro className="w-4 h-4" /> Aanbevolen prijs
            </h2>
            <div className="text-center py-4">
              <div className="text-5xl font-mono font-black text-amber-700">
                {fmt(calc.priceInclVat)}
              </div>
              <div className="text-sm text-amber-600 mt-1">per persoon incl. BTW</div>
              <div className="text-xs text-amber-500 mt-0.5">{fmt(calc.priceExVat)} excl. BTW</div>
            </div>
            <div className="border-t border-amber-200 pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-amber-700">Totaal omzet ({numPersons} pp)</span>
                <span className="font-mono font-bold text-amber-800">{fmt(calc.totalRevenue)}</span>
              </div>
              <div className="flex justify-between text-xs text-amber-600 mt-1">
                <span>Excl. BTW</span>
                <span className="font-mono">{fmt(calc.totalRevenueExVat)}</span>
              </div>
              <div className="flex justify-between text-xs text-amber-500 mt-0.5">
                <span>BTW ({vat}%)</span>
                <span className="font-mono">{fmt(calc.vatAmount)}</span>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="bg-white border border-[#E8D5B5] rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold text-[#2C1810] flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-[#9E7E60]" /> Kostenverdeling per persoon
            </h2>
            <div className="space-y-2">
              {[
                { label: 'Food cost', value: calc.directCostPP > 0 ? (foodCostPP / calc.priceExVat * 100) : 0, amount: foodCostPP, color: 'bg-amber-400' },
                { label: 'Personeel', value: calc.priceExVat > 0 ? (calc.staffCost / calc.priceExVat * 100) : 0, amount: calc.staffCost, color: 'bg-blue-400' },
                { label: 'Logistiek', value: calc.priceExVat > 0 ? (calc.logisticsCost / calc.priceExVat * 100) : 0, amount: calc.logisticsCost, color: 'bg-emerald-400' },
                { label: 'Commissies', value: calc.priceExVat > 0 ? (calc.commCostPP / calc.priceExVat * 100) : 0, amount: calc.commCostPP, color: 'bg-purple-400' },
                { label: 'Marge', value: calc.actualMarginPct, amount: calc.marginPP, color: 'bg-[#C4703A]' },
              ].map(({ label, value, amount, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#5C4730] font-medium">{label}</span>
                    <span className="font-mono text-[#2C1810]">{fmt(amount)} <span className="text-[#9E7E60]">({fmtPct(value)})</span></span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all duration-300`} style={{ width: `${Math.min(value, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Food cost health */}
          <div className={`rounded-2xl p-4 border ${
            calc.actualFoodCostPct <= 28 ? 'bg-emerald-50 border-emerald-200' :
            calc.actualFoodCostPct <= 33 ? 'bg-amber-50 border-amber-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <Percent className={`w-4 h-4 ${
                calc.actualFoodCostPct <= 28 ? 'text-emerald-600' :
                calc.actualFoodCostPct <= 33 ? 'text-amber-600' : 'text-red-600'
              }`} />
              <span className={`text-sm font-semibold ${
                calc.actualFoodCostPct <= 28 ? 'text-emerald-800' :
                calc.actualFoodCostPct <= 33 ? 'text-amber-800' : 'text-red-800'
              }`}>
                Food cost: {fmtPct(calc.actualFoodCostPct)}
              </span>
            </div>
            <p className={`text-xs ${
              calc.actualFoodCostPct <= 28 ? 'text-emerald-600' :
              calc.actualFoodCostPct <= 33 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {calc.actualFoodCostPct <= 28 ? 'Uitstekend' :
               calc.actualFoodCostPct <= 33 ? 'Goed — binnen target' :
               'Boven target — herzie food cost of prijs'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
