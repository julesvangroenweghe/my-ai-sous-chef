'use client'

import React from 'react'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search } from 'lucide-react'

interface SeasonalItem {
  id: string
  ingredient_name: string
  country_code: string
  category: string
  jan: number; feb: number; mar: number; apr: number; may: number; jun: number
  jul: number; aug: number; sep: number; oct: number; nov: number; dec: number
}

const MONTHS_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const MONTHS_FULL = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const

const CATEGORY_LABELS: Record<string, string> = {
  groenten: 'Groenten',
  fruit: 'Fruit',
  vis: 'Vis & Schaaldieren',
  wild: 'Wild & Gevogelte',
  kruiden: 'Kruiden',
  paddenstoelen: 'Paddenstoelen',
}

const CATEGORY_ORDER = ['groenten', 'fruit', 'vis', 'wild', 'kruiden', 'paddenstoelen']

// Velt-stijl: één accent per categorie, heel subtiel
const CATEGORY_STYLE: Record<string, { dot: string; dotFull: string; header: string; border: string }> = {
  groenten:     { dot: 'bg-emerald-300', dotFull: 'bg-emerald-600',  header: 'text-emerald-800', border: 'border-l-emerald-500' },
  fruit:        { dot: 'bg-rose-300',    dotFull: 'bg-rose-600',     header: 'text-rose-800',    border: 'border-l-rose-500'    },
  vis:          { dot: 'bg-sky-300',     dotFull: 'bg-sky-600',      header: 'text-sky-800',     border: 'border-l-sky-500'     },
  wild:         { dot: 'bg-amber-300',   dotFull: 'bg-amber-700',    header: 'text-amber-900',   border: 'border-l-amber-600'   },
  kruiden:      { dot: 'bg-lime-300',    dotFull: 'bg-lime-700',     header: 'text-lime-800',    border: 'border-l-lime-600'    },
  paddenstoelen:{ dot: 'bg-stone-300',   dotFull: 'bg-stone-600',    header: 'text-stone-700',   border: 'border-l-stone-500'   },
}

export default function SeasonalPage() {
  const [items, setItems] = useState<SeasonalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const supabase = createClient()

  const currentMonth = new Date().getMonth() // 0-indexed

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

  const currentMonthKey = MONTH_KEYS[currentMonth]
  const peakNow = items.filter(i => (i as any)[currentMonthKey] === 2).length
  const availableNow = items.filter(i => (i as any)[currentMonthKey] >= 1).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-extrabold text-[#2C1810] tracking-tight">
          Seizoenskalender
        </h1>
        <p className="text-[#9E7E60] text-sm mt-1">
          België &middot; {MONTHS_FULL[currentMonth]} {new Date().getFullYear()}
          &nbsp;&middot;&nbsp;
          <span className="font-medium text-[#2C1810]">{availableNow}</span> beschikbaar
          &nbsp;&middot;&nbsp;
          <span className="font-medium text-[#2C1810]">{peakNow}</span> piekseizoen
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E7E60]" />
          <input
            type="text"
            placeholder="Zoek product..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#E8D5B5] rounded-xl text-[#2C1810] placeholder:text-[#B8997A] focus:outline-none focus:ring-2 focus:ring-[#E8A040]/30 focus:border-[#E8A040]"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              selectedCategory === 'all'
                ? 'bg-[#E8A040] text-white border-[#E8A040]'
                : 'bg-white text-[#9E7E60] border-[#E8D5B5] hover:border-[#C4A882]'
            }`}
          >
            Alles ({items.length})
          </button>
          {CATEGORY_ORDER.filter(cat => items.some(i => i.category === cat)).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                selectedCategory === cat
                  ? 'bg-[#E8A040] text-white border-[#E8A040]'
                  : 'bg-white text-[#9E7E60] border-[#E8D5B5] hover:border-[#C4A882]'
              }`}
            >
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 text-xs text-[#9E7E60]">
        <span className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 inline-block" />
          Piekseizoen
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-300 inline-block" />
          Beschikbaar
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-stone-100 border border-stone-200 inline-block" />
          Niet in seizoen
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-[#E8A040] inline-block" />
          Huidige maand
        </span>
      </div>

      {/* Velt-stijl matrix */}
      {loading ? (
        <div className="space-y-1">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="h-8 rounded bg-stone-100 animate-pulse" style={{ opacity: 1 - i * 0.04 }} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[#E8D5B5] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: '700px' }}>
              {/* Month header */}
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 bg-[#FAF6EF] border-b border-[#E8D5B5] sticky left-0 z-10 min-w-[180px]">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9E7E60]">Product</span>
                  </th>
                  {MONTHS_SHORT.map((m, i) => (
                    <th
                      key={i}
                      className={`py-3 px-0 text-center border-b min-w-[42px] ${
                        i === currentMonth
                          ? 'bg-[#FEF3E2] border-[#E8A040]/40 border-b-2'
                          : 'bg-[#FAF6EF] border-[#E8D5B5]'
                      }`}
                    >
                      <span className={`text-[11px] font-semibold uppercase tracking-wide ${
                        i === currentMonth ? 'text-[#E8A040]' : 'text-[#9E7E60]'
                      }`}>
                        {m}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CATEGORY_ORDER
                  .filter(cat => grouped[cat]?.length > 0)
                  .map(cat => {
                    const style = CATEGORY_STYLE[cat] || CATEGORY_STYLE.groenten
                    return (
                      <React.Fragment key={cat}>
                        {/* Category separator row */}
                        <tr>
                          <td
                            colSpan={13}
                            className={`py-2 px-4 bg-[#FAF6EF] border-y border-[#E8D5B5] border-l-4 ${style.border}`}
                          >
                            <span className={`text-[11px] font-bold uppercase tracking-widest ${style.header}`}>
                              {CATEGORY_LABELS[cat] || cat}
                            </span>
                          </td>
                        </tr>
                        {/* Ingredient rows */}
                        {grouped[cat].map((item, rowIdx) => (
                          <tr
                            key={item.id}
                            className={`group transition-colors hover:bg-[#FEF9F2] ${
                              rowIdx % 2 === 0 ? 'bg-white' : 'bg-[#FDFAF6]'
                            }`}
                          >
                            {/* Name cell */}
                            <td className={`py-2 px-4 sticky left-0 z-10 border-b border-[#F0E8D8] ${
                              rowIdx % 2 === 0 ? 'bg-white group-hover:bg-[#FEF9F2]' : 'bg-[#FDFAF6] group-hover:bg-[#FEF9F2]'
                            }`}>
                              <span className="text-[13px] text-[#2C1810] font-medium">
                                {item.ingredient_name}
                              </span>
                            </td>
                            {/* Month cells */}
                            {MONTH_KEYS.map((mk, i) => {
                              const val = (item as any)[mk] as number
                              const isCurrent = i === currentMonth
                              return (
                                <td
                                  key={mk}
                                  className={`text-center py-2 border-b border-[#F0E8D8] ${
                                    isCurrent ? 'bg-[#FEF3E2]/60' : ''
                                  }`}
                                >
                                  {val === 2 ? (
                                    // Piekseizoen — grote gevulde cirkel
                                    <span
                                      className={`inline-block w-4 h-4 rounded-full ${style.dotFull} ${isCurrent ? 'ring-2 ring-offset-1 ring-[#E8A040]' : ''}`}
                                      title="Piekseizoen"
                                    />
                                  ) : val === 1 ? (
                                    // Beschikbaar — kleinere lichte cirkel
                                    <span
                                      className={`inline-block w-3 h-3 rounded-full ${style.dot}`}
                                      title="Beschikbaar"
                                    />
                                  ) : (
                                    // Niet in seizoen — lege cel
                                    <span className="inline-block w-3 h-3 rounded-full bg-stone-100" />
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
            <div className="text-center py-16 text-[#9E7E60] text-sm">
              Geen producten gevonden voor &ldquo;{search}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  )
}
