'use client'

import React from 'react'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Leaf, Sun, Snowflake, CloudRain, Flame } from 'lucide-react'

interface SeasonalItem {
  id: string
  ingredient_name: string
  country_code: string
  category: string
  jan: number; feb: number; mar: number; apr: number; may: number; jun: number
  jul: number; aug: number; sep: number; oct: number; nov: number; dec: number
}

const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const monthsFull = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']
const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const

const categoryLabels: Record<string, string> = {
  groenten: 'Groenten',
  fruit: 'Fruit',
  vis: 'Vis & Schaaldieren',
  wild: 'Wild & Gevogelte',
  kruiden: 'Kruiden',
  paddenstoelen: 'Paddenstoelen',
}

const categoryOrder = ['groenten', 'fruit', 'vis', 'wild', 'kruiden', 'paddenstoelen']

const categoryColors: Record<string, { bar: string; peak: string; dot: string; header: string; text: string }> = {
  groenten: { bar: 'bg-emerald-200', peak: 'bg-emerald-500', dot: 'bg-emerald-400', header: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800' },
  fruit: { bar: 'bg-rose-200', peak: 'bg-rose-500', dot: 'bg-rose-400', header: 'bg-rose-50 border-rose-200', text: 'text-rose-800' },
  vis: { bar: 'bg-sky-200', peak: 'bg-sky-500', dot: 'bg-sky-400', header: 'bg-sky-50 border-sky-200', text: 'text-sky-800' },
  wild: { bar: 'bg-amber-200', peak: 'bg-amber-600', dot: 'bg-amber-400', header: 'bg-amber-50 border-amber-200', text: 'text-amber-800' },
  kruiden: { bar: 'bg-lime-200', peak: 'bg-lime-500', dot: 'bg-lime-400', header: 'bg-lime-50 border-lime-200', text: 'text-lime-800' },
  paddenstoelen: { bar: 'bg-stone-300', peak: 'bg-stone-600', dot: 'bg-stone-400', header: 'bg-stone-100 border-stone-300', text: 'text-stone-700' },
}

export default function SeasonalPage() {
  const [items, setItems] = useState<SeasonalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const supabase = createClient()

  const currentMonth = new Date().getMonth()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('seasonal_calendar')
        .select('*')
        .eq('country_code', 'BE')
        .order('category')
        .order('ingredient_name')
      setItems(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const categories = useMemo(() => {
    const cats = [...new Set(items.map(i => i.category))]
    return cats.sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b))
  }, [items])

  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchSearch = !search || item.ingredient_name.toLowerCase().includes(search.toLowerCase())
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory
      return matchSearch && matchCat
    })
  }, [items, search, selectedCategory])

  const grouped = useMemo(() => {
    const groups: Record<string, SeasonalItem[]> = {}
    for (const item of filtered) {
      if (!groups[item.category]) groups[item.category] = []
      groups[item.category].push(item)
    }
    return groups
  }, [filtered])

  const peakCount = useMemo(() => {
    const mk = monthKeys[currentMonth]
    return items.filter(i => (i as any)[mk] === 2).length
  }, [items, currentMonth])

  const availableCount = useMemo(() => {
    const mk = monthKeys[currentMonth]
    return items.filter(i => (i as any)[mk] >= 1).length
  }, [items, currentMonth])

  return (
    <div className="space-y-6">
      {/* Header — compact */}
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-stone-900 tracking-tight">
              Seizoenskalender
            </h1>
            <p className="text-stone-400 text-sm mt-0.5">
              Belgie  ·  {monthsFull[currentMonth]} {new Date().getFullYear()}  ·  {availableCount} beschikbaar, {peakCount} piekseizoen
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              Piekseizoen
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-2.5 rounded-sm bg-emerald-200 inline-block" />
              Beschikbaar
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-2.5 rounded-sm bg-stone-100 inline-block" />
              Niet in seizoen
            </span>
          </div>
        </div>
      </div>

      {/* Search + Category filter */}
      <div className="flex flex-col sm:flex-row gap-3 animate-slide-up opacity-0" style={{ animationDelay: '80ms', animationFillMode: 'forwards' }}>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Zoek product..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-premium pl-9 py-2 text-sm"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              selectedCategory === 'all' ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            Alles ({items.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              {categoryLabels[cat] || cat} ({items.filter(i => i.category === cat).length})
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Matrix */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(15)].map((_, i) => <div key={i} className="skeleton h-8 rounded" />)}
        </div>
      ) : (
        <div className="card overflow-hidden animate-slide-up opacity-0" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: '640px' }}>
              {/* Month header */}
              <thead>
                <tr>
                  <th className="text-left text-[11px] font-semibold text-stone-500 py-2 px-3 bg-stone-50 border-b border-stone-200 sticky left-0 z-10 min-w-[160px]">
                    Product
                  </th>
                  {months.map((m, i) => (
                    <th
                      key={i}
                      className={`text-center text-[11px] font-semibold py-2 px-0 border-b min-w-[38px] ${
                        i === currentMonth
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'text-stone-400 bg-stone-50 border-stone-200'
                      }`}
                    >
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categoryOrder
                  .filter(cat => grouped[cat] && grouped[cat].length > 0)
                  .map(cat => {
                    const colors = categoryColors[cat] || categoryColors.groenten
                    return (
                      <React.Fragment key={cat}>
                        {/* Category header row */}
                        <tr>
                          <td
                            colSpan={13}
                            className={`text-[11px] font-bold uppercase tracking-wider py-1.5 px-3 ${colors.header} ${colors.text} border-b`}
                          >
                            {categoryLabels[cat] || cat}
                          </td>
                        </tr>
                        {/* Products */}
                        {grouped[cat].map((item) => (
                          <tr key={item.id} className="hover:bg-stone-50/60 transition-colors group">
                            <td className="py-1 px-3 sticky left-0 bg-white group-hover:bg-stone-50/60 z-10 border-b border-stone-50">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[13px] text-stone-800">{item.ingredient_name}</span>
                                {(item as any)[monthKeys[currentMonth]] === 2 && (
                                  <Flame className="w-3 h-3 text-amber-500 shrink-0" />
                                )}
                              </div>
                            </td>
                            {monthKeys.map((mk, i) => {
                              const val = (item as any)[mk] as number
                              const isCurrentMonth = i === currentMonth
                              return (
                                <td
                                  key={mk}
                                  className={`text-center py-1 px-0.5 border-b border-stone-50 ${
                                    isCurrentMonth ? 'bg-stone-50' : ''
                                  }`}
                                >
                                  {val === 2 ? (
                                    <div className={`mx-auto w-full h-5 rounded-sm ${colors.peak}`} />
                                  ) : val === 1 ? (
                                    <div className={`mx-auto w-full h-5 rounded-sm ${colors.bar}`} />
                                  ) : (
                                    <div className="mx-auto w-full h-5" />
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    )
                  })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-stone-400 text-sm">
              Geen producten gevonden
            </div>
          )}
        </div>
      )}
    </div>
  )
}

