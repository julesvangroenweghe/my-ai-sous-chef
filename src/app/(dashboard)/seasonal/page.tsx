'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Leaf, Sun, Snowflake, CloudRain, Search, Flame, BookOpen, Sparkles, ChevronRight } from 'lucide-react'
import { ClassicalSuggestions } from '@/components/ai/classical-suggestions'

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

const categoryConfig: Record<string, { emoji: string; color: string; gradient: string }> = {
 groenten: { emoji: '', color: 'text-emerald-700', gradient: 'from-emerald-500 to-green-600' },
 fruit: { emoji: '', color: 'text-rose-700', gradient: 'from-rose-400 to-pink-600' },
 vis: { emoji: '', color: 'text-cyan-700', gradient: 'from-cyan-400 to-blue-600' },
 wild: { emoji: '', color: 'text-amber-700', gradient: 'from-amber-500 to-orange-600' },
 kruiden: { emoji: '', color: 'text-lime-700', gradient: 'from-lime-400 to-emerald-500' },
 paddenstoelen: { emoji: '', color: 'text-stone-700', gradient: 'from-stone-400 to-stone-600' },
}

const seasonConfig = [
 { months: [11, 0, 1], icon: Snowflake, label: 'Winter', gradient: 'from-blue-100 via-indigo-50 to-slate-100', accent: 'text-blue-600', headerBg: 'bg-blue-500' },
 { months: [2, 3, 4], icon: Leaf, label: 'Lente', gradient: 'from-emerald-50 via-green-50 to-lime-50', accent: 'text-emerald-600', headerBg: 'bg-emerald-500' },
 { months: [5, 6, 7], icon: Sun, label: 'Zomer', gradient: 'from-amber-50 via-yellow-50 to-orange-50', accent: 'text-amber-600', headerBg: 'bg-amber-500' },
 { months: [8, 9, 10], icon: CloudRain, label: 'Herfst', gradient: 'from-orange-50 via-amber-50 to-stone-50', accent: 'text-orange-600', headerBg: 'bg-orange-500' },
]

export default function SeasonalPage() {
 const [items, setItems] = useState<SeasonalItem[]>([])
 const [loading, setLoading] = useState(true)
 const [search, setSearch] = useState('')
 const [selectedCategory, setSelectedCategory] = useState<string>('all')
 const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null)
 const supabase = createClient()

 const currentMonth = new Date().getMonth()
 const season = seasonConfig.find(s => s.months.includes(currentMonth))!
 const SeasonIcon = season.icon

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

 const categories = useMemo(() => [...new Set(items.map(i => i.category))].sort(), [items])

 const filtered = useMemo(() => {
 return items.filter(item => {
 const matchSearch = !search || item.ingredient_name.toLowerCase().includes(search.toLowerCase())
 const matchCat = selectedCategory === 'all' || item.category === selectedCategory
 return matchSearch && matchCat
 })
 }, [items, search, selectedCategory])

 const peakThisMonth = useMemo(() => {
 const mk = monthKeys[currentMonth]
 return items.filter(i => (i as any)[mk] === 2)
 }, [items, currentMonth])

 const availableThisMonth = useMemo(() => {
 const mk = monthKeys[currentMonth]
 return items.filter(i => (i as any)[mk] >= 1)
 }, [items, currentMonth])

 return (
 <div className="space-y-8">
 {/* Hero Header */}
 <div className="animate-fade-in">
 <div className={`card overflow-hidden bg-gradient-to-br ${season.gradient}`}>
 <div className="p-6 md:p-8">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <div className={`w-14 h-14 rounded-2xl ${season.headerBg} flex items-center justify-center shadow-lg`}>
 <SeasonIcon className="w-7 h-7 text-white" />
 </div>
 <div>
 <h1 className="font-display text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">
 Seizoenskalender
 </h1>
 <p className="text-stone-500 text-sm mt-0.5">
 BE België · {season.label} {new Date().getFullYear()} · {months[currentMonth]}
 </p>
 </div>
 </div>
 <div className="flex gap-3">
 <div className="text-center px-4 py-2 bg-white/70 backdrop-blur rounded-xl">
 <div className="font-mono text-xl font-bold text-emerald-600">{peakThisMonth.length}</div>
 <div className="text-[10px] text-stone-500 font-medium">Piekseizoen</div>
 </div>
 <div className="text-center px-4 py-2 bg-white/70 backdrop-blur rounded-xl">
 <div className="font-mono text-xl font-bold text-stone-700">{availableThisMonth.length}</div>
 <div className="text-[10px] text-stone-500 font-medium">Beschikbaar</div>
 </div>
 <div className="text-center px-4 py-2 bg-white/70 backdrop-blur rounded-xl">
 <div className="font-mono text-xl font-bold text-stone-700">{items.length}</div>
 <div className="text-[10px] text-stone-500 font-medium">Producten</div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Search + Filters */}
 <div className="flex flex-col sm:flex-row gap-3 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
 <div className="relative flex-1">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
 <input
 type="text"
 placeholder="Zoek product..."
 value={search}
 onChange={e => setSearch(e.target.value)}
 className="input-premium pl-10"
 />
 </div>
 <div className="flex gap-2 overflow-x-auto pb-1">
 <button
 onClick={() => setSelectedCategory('all')}
 className={`px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
 selectedCategory === 'all' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
 }`}
 >
 Alles
 </button>
 {categories.map(cat => {
 const config = categoryConfig[cat] || { emoji: '', color: '', gradient: '' }
 return (
 <button
 key={cat}
 onClick={() => setSelectedCategory(cat)}
 className={`px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
 selectedCategory === cat ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
 }`}
 >
 {config.emoji} {cat.charAt(0).toUpperCase() + cat.slice(1)}
 </button>
 )
 })}
 </div>
 </div>

 {/* Calendar Grid */}
 {loading ? (
 <div className="space-y-2">
 {[...Array(10)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
 </div>
 ) : (
 <div className="card overflow-hidden animate-slide-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="bg-stone-900 text-white">
 <th className="text-left text-xs font-semibold py-3 px-4 sticky left-0 bg-stone-900 z-10 min-w-[180px]">Product</th>
 {months.map((m, i) => (
 <th
 key={m}
 className={`text-center text-xs font-medium py-3 px-2 min-w-[52px] ${
 i === currentMonth ? 'bg-brand-600 text-white' : ''
 }`}
 >
 {m}
 </th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-stone-100">
 {filtered.map((item, idx) => {
 const config = categoryConfig[item.category] || { emoji: '', color: 'text-stone-700', gradient: '' }
 return (
 <tr 
 key={item.id} 
 className={`hover:bg-stone-50/80 transition-colors cursor-pointer ${selectedIngredient === item.ingredient_name ? 'bg-brand-50/50' : ''}`}
 onClick={() => setSelectedIngredient(selectedIngredient === item.ingredient_name ? null : item.ingredient_name)}
 >
 <td className="py-2.5 px-4 sticky left-0 bg-white group-hover:bg-stone-50 z-10">
 <div className="flex items-center gap-2">
 <span className="text-sm">{config.emoji}</span>
 <span className="text-sm font-medium text-stone-800">{item.ingredient_name}</span>
 {(item as any)[monthKeys[currentMonth]] === 2 && (
 <Flame className="w-3 h-3 text-brand-500" />
 )}
 </div>
 </td>
 {monthKeys.map((mk, i) => {
 const val = (item as any)[mk] as number
 return (
 <td key={mk} className={`text-center py-2 px-1 ${i === currentMonth ? 'bg-brand-50/30' : ''}`}>
 {val === 2 ? (
 <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center mx-auto text-[10px] font-bold shadow-sm">
 PIEK
 </div>
 ) : val === 1 ? (
 <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-xs">
 
 </div>
 ) : (
 <div className="w-8 h-8 rounded-lg bg-stone-50 flex items-center justify-center mx-auto">
 <span className="text-stone-200 text-xs">—</span>
 </div>
 )}
 </td>
 )
 })}
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* AI Classical Suggestions for selected ingredient */}
 {selectedIngredient && (
 <div className="card p-6 animate-scale-in">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <Sparkles className="w-4 h-4 text-brand-500" />
 <h3 className="font-display font-semibold text-stone-900">
 Klassieke inspiratie: {selectedIngredient}
 </h3>
 </div>
 <button onClick={() => setSelectedIngredient(null)} className="text-xs text-stone-400 hover:text-stone-600">
 Sluiten ×
 </button>
 </div>
 <ClassicalSuggestions query={selectedIngredient} maxResults={6} title="" />
 </div>
 )}
 </div>
 )
}
