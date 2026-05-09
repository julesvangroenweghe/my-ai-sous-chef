'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShieldAlert, Loader2, Sparkles, Check, X } from 'lucide-react'

interface Allergen {
  id: number
  eu_number: number
  code: string
  name_nl: string
  description_nl: string
  count: number
  ingredients: { id: string; name: string; severity: string }[]
}

const allergenColors: Record<string, string> = {
  gluten: 'bg-amber-50 border-amber-200 text-amber-800',
  shellfish: 'bg-red-50 border-red-200 text-red-800',
  eggs: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  fish: 'bg-blue-50 border-blue-200 text-blue-800',
  peanuts: 'bg-orange-50 border-orange-200 text-orange-800',
  soy: 'bg-green-50 border-green-200 text-green-800',
  milk: 'bg-sky-50 border-sky-200 text-sky-800',
  nuts: 'bg-amber-50 border-amber-200 text-amber-900',
  celery: 'bg-lime-50 border-lime-200 text-lime-800',
  mustard: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  sesame: 'bg-stone-50 border-stone-200 text-stone-800',
  sulfites: 'bg-purple-50 border-purple-200 text-purple-800',
  lupin: 'bg-rose-50 border-rose-200 text-rose-800',
  molluscs: 'bg-teal-50 border-teal-200 text-teal-800',
}

export default function AllergenenPage() {
  const supabase = createClient()
  const [allergens, setAllergens] = useState<Allergen[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Allergen | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [detectResult, setDetectResult] = useState<string | null>(null)

  const load = async () => {
    const { data: baseAllergens } = await supabase
      .from('allergens')
      .select('id, eu_number, code, name_nl, description_nl')
      .order('eu_number')

    const { data: links } = await supabase
      .from('ingredient_allergens')
      .select('allergen_id, severity, ingredient:ingredients(id, name)')

    const countMap: Record<number, { count: number; ingredients: { id: string; name: string; severity: string }[] }> = {}
    for (const link of links || []) {
      if (!countMap[link.allergen_id]) countMap[link.allergen_id] = { count: 0, ingredients: [] }
      countMap[link.allergen_id].count++
      if (link.ingredient) {
        countMap[link.allergen_id].ingredients.push({
          id: (link.ingredient as any).id,
          name: (link.ingredient as any).name,
          severity: link.severity
        })
      }
    }

    const enriched: Allergen[] = (baseAllergens || []).map((a: any) => ({
      ...a,
      count: countMap[a.id]?.count || 0,
      ingredients: (countMap[a.id]?.ingredients || []).sort((x, y) => x.name.localeCompare(y.name))
    }))

    setAllergens(enriched)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAutoDetect = async () => {
    setDetecting(true)
    setDetectResult(null)
    try {
      const res = await fetch('/api/allergens/auto-detect', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setDetectResult(data.message)
        await load()
      } else {
        setDetectResult(data.error || 'Fout bij detectie')
      }
    } catch {
      setDetectResult('Fout bij detectie')
    } finally {
      setDetecting(false)
    }
  }

  const totalLinks = allergens.reduce((s, a) => s + a.count, 0)
  const withLinks = allergens.filter(a => a.count > 0).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-extrabold text-[#2C1810] tracking-tight">Allergenen</h1>
              <p className="text-[#9E7E60] text-sm mt-0.5">
                EU verordening 1169/2011 — 14 verplichte allergenen
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleAutoDetect}
          disabled={detecting}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60 shrink-0"
        >
          {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {detecting ? 'Aan het detecteren...' : 'AI Auto-detecteer'}
        </button>
      </div>

      {/* Detect result */}
      {detectResult && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-800 flex-1">{detectResult}</p>
          <button onClick={() => setDetectResult(null)} className="text-emerald-400 hover:text-emerald-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-[#E8D5B5] rounded-xl p-4">
            <div className="text-2xl font-mono font-bold text-[#2C1810]">14</div>
            <div className="text-xs text-[#9E7E60]">EU allergenen</div>
          </div>
          <div className="bg-white border border-[#E8D5B5] rounded-xl p-4">
            <div className="text-2xl font-mono font-bold text-amber-600">{totalLinks}</div>
            <div className="text-xs text-[#9E7E60]">Ingredient-links</div>
          </div>
          <div className="bg-white border border-[#E8D5B5] rounded-xl p-4">
            <div className="text-2xl font-mono font-bold text-emerald-600">{withLinks}/14</div>
            <div className="text-xs text-[#9E7E60]">Met data</div>
          </div>
        </div>
      )}

      {/* Allergen Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {allergens.map((allergen) => {
            const colorClass = allergenColors[allergen.code] || 'bg-stone-50 border-stone-200 text-stone-800'
            return (
              <button
                key={allergen.id}
                onClick={() => setSelected(allergen)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all hover:shadow-md hover:scale-105 text-center ${colorClass}`}
              >
                <span className="text-2xl font-mono font-bold opacity-50">{allergen.eu_number}</span>
                <span className="text-xs font-semibold leading-tight">{allergen.name_nl}</span>
                <span className={`text-xl font-bold ${allergen.count > 0 ? 'opacity-100' : 'opacity-30'}`}>
                  {allergen.count}
                </span>
                <span className="text-[10px] opacity-70">ingrediënten</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col border border-[#E8D5B5]">
            <div className="px-6 py-4 border-b border-[#E8D5B5] flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-[#2C1810]">
                  {selected.eu_number}. {selected.name_nl}
                </h2>
                <p className="text-xs text-[#9E7E60] mt-0.5">{selected.description_nl}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-[#F2E8D5] rounded-lg transition-colors">
                <X className="w-4 h-4 text-[#9E7E60]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {selected.ingredients.length === 0 ? (
                <div className="text-center py-8">
                  <ShieldAlert className="w-8 h-8 text-[#D4B896] mx-auto mb-2" />
                  <p className="text-[#9E7E60] text-sm">Geen ingrediënten gelinkt</p>
                  <p className="text-xs text-[#B8997A] mt-1">Gebruik de AI Auto-detecteer om links aan te maken</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {selected.ingredients.map((ing) => (
                    <div key={ing.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#F5EDE0] transition-colors">
                      <span className="text-sm text-[#2C1810] font-medium">{ing.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        ing.severity === 'contains' ? 'bg-amber-100 text-amber-700' :
                        ing.severity === 'may_contain' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-stone-100 text-stone-600'
                      }`}>
                        {ing.severity === 'contains' ? 'Bevat' : ing.severity === 'may_contain' ? 'Kan bevatten' : 'Sporen'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
