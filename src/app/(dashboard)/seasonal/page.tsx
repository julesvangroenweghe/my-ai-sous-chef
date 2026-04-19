'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Leaf, Sun, Snowflake, CloudRain, Search, Filter } from 'lucide-react'

interface SeasonalItem {
  id: string
  ingredient_name: string
  country_code: string
  category: string
  jan: number; feb: number; mar: number; apr: number; may: number; jun: number
  jul: number; aug: number; sep: number; oct: number; nov: number; dec: number
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const

const categoryEmojis: Record<string, string> = {
  'groenten': '🥦',
  'fruit': '🍎',
  'vis': '🐟',
  'wild': '🦌',
  'kruiden': '🌿',
  'paddenstoelen': '🍄',
}

const seasonIcons = [
  { months: [11, 0, 1], icon: Snowflake, label: 'Winter', color: 'text-blue-400' },
  { months: [2, 3, 4], icon: Leaf, label: 'Lente', color: 'text-emerald-400' },
  { months: [5, 6, 7], icon: Sun, label: 'Zomer', color: 'text-amber-400' },
  { months: [8, 9, 10], icon: CloudRain, label: 'Herfst', color: 'text-orange-400' },
]

function getAvailabilityColor(value: number): string {
  if (value === 2) return 'bg-emerald-500 text-white'       // Peak season
  if (value === 1) return 'bg-emerald-500/30 text-emerald-300'  // Available
  return 'bg-stone-800/50 text-stone-700'                    // Not available
}

function getAvailabilityLabel(value: number): string {
  if (value === 2) return 'Piek'
  if (value === 1) return '✓'
  return ''
}

export default function SeasonalPage() {
  const [items, setItems] = useState<SeasonalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showPeakOnly, setShowPeakOnly] = useState(false)
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

  const categories = useMemo(() => {
    const cats = [...new Set(items.map(i => i.category))]
    return cats.sort()
  }, [items])

  const currentSeason = seasonIcons.find(s => s.months.includes(currentMonth))
  const CurrentSeasonIcon = currentSeason?.icon || Sun

  // Filter items
  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchSearch = item.ingredient_name.toLowerCase().includes(search.toLowerCase())
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory
      const monthKey = monthKeys[currentMonth]
      const matchPeak = !showPeakOnly || item[monthKey] === 2
      return matchSearch && matchCategory && matchPeak
    })
  }, [items, search, selectedCategory, showPeakOnly, currentMonth])

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, SeasonalItem[]> = {}
    for (const item of filtered) {
      if (!groups[item.category]) groups[item.category] = []
      groups[item.category].push(item)
    }
    return groups
  }, [filtered])

  // Stats
  const inSeasonNow = items.filter(i => i[monthKeys[currentMonth]] >= 1).length
  const peakNow = items.filter(i => i[monthKeys[currentMonth]] === 2).length

  if (loading) {
    return (
      <div className="space-y-8">
        <div><h1 className="text-2xl font-display font-bold text-stone-100">Seizoenskalender</h1></div>
        <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-8">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-8 bg-stone-800 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-100">Seizoenskalender</h1>
          <p className="text-stone-400 mt-1">
            <span className={currentSeason?.color}>
              <CurrentSeasonIcon className="w-4 h-4 inline mr-1" />
              {currentSeason?.label}
            </span>
            {' · '}{inSeasonNow} in seizoen · {peakNow} op piekseizoek · België 🇧🇪
          </p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(categoryEmojis).slice(0, 4).map(([cat, emoji]) => {
          const catItems = items.filter(i => i.category === cat)
          const inSeason = catItems.filter(i => i[monthKeys[currentMonth]] >= 1).length
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? 'all' : cat)}
              className={`p-3 rounded-xl border transition-all text-left ${
                selectedCategory === cat
                  ? 'bg-brand-500/10 border-brand-500/30'
                  : 'bg-stone-900/50 border-stone-800 hover:border-stone-700'
              }`}
            >
              <span className="text-lg">{emoji}</span>
              <div className="text-sm font-semibold text-stone-200 mt-1 capitalize">{cat}</div>
              <div className="text-xs text-stone-500">{inSeason}/{catItems.length} in seizoen</div>
            </button>
          )
        })}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            type="text"
            placeholder="Zoek ingrediënt..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-100 placeholder:text-stone-500 focus:ring-2 focus:ring-brand-500 text-sm"
          />
        </div>
        <button
          onClick={() => setShowPeakOnly(!showPeakOnly)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            showPeakOnly
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
              : 'bg-stone-800 border border-stone-700 text-stone-400 hover:text-stone-200'
          }`}
        >
          <Sun className="w-4 h-4" />
          Alleen piekseizoen
        </button>
      </div>

      {/* Calendar grid */}
      {Object.entries(grouped).map(([category, catItems]) => (
        <div key={category} className="space-y-2">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-2">
            <span>{categoryEmojis[category] || '📦'}</span>
            {category} ({catItems.length})
          </h2>
          
          <div className="bg-stone-900/50 border border-stone-800 rounded-xl overflow-hidden">
            {/* Month headers */}
            <div className="px-4 py-2 bg-stone-800/50 flex items-center text-[10px] font-medium text-stone-500 uppercase tracking-wider border-b border-stone-800">
              <div className="w-40 shrink-0">Product</div>
              {months.map((month, idx) => (
                <div
                  key={month}
                  className={`flex-1 text-center ${idx === currentMonth ? 'text-brand-400 font-bold' : ''}`}
                >
                  {month}
                </div>
              ))}
            </div>

            {/* Rows */}
            {catItems.map(item => (
              <div
                key={item.id}
                className="px-4 py-2 flex items-center border-b border-stone-800/50 last:border-0 hover:bg-stone-800/20 transition-colors"
              >
                <div className="w-40 shrink-0 text-sm text-stone-300 font-medium truncate">
                  {item.ingredient_name}
                </div>
                {monthKeys.map((key, idx) => (
                  <div key={key} className="flex-1 flex justify-center px-0.5">
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-semibold ${
                        getAvailabilityColor(item[key])
                      } ${idx === currentMonth ? 'ring-1 ring-brand-400' : ''}`}
                    >
                      {getAvailabilityLabel(item[key])}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-stone-500 pt-2">
        <span className="font-medium">Legende:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center text-white text-[9px] font-bold">P</span>
          Piekseizoen
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-emerald-500/30 flex items-center justify-center text-emerald-300 text-[9px]">✓</span>
          Beschikbaar
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-stone-800/50" />
          Niet in seizoen
        </span>
      </div>
    </div>
  )
}
