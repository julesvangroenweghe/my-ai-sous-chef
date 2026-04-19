'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Leaf, Sun, Snowflake, CloudRain, Flame, TrendingUp, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface SeasonItem {
 ingredient_name: string
 category: string
 availability: number
}

const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const
const monthNames = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']

const categoryColors: Record<string, string> = {
 groenten: 'from-emerald-500 to-green-600',
 fruit: 'from-rose-400 to-pink-600',
 vis: 'from-cyan-400 to-blue-600',
 wild: 'from-amber-600 to-orange-700',
 kruiden: 'from-lime-400 to-emerald-600',
 paddenstoelen: 'from-stone-400 to-stone-600',
}

const categoryEmojis: Record<string, string> = {
 groenten: '', fruit: '', vis: '', wild: '', kruiden: '', paddenstoelen: '',
}

const seasonConfig = [
 { months: [11, 0, 1], icon: Snowflake, label: 'Winter', gradient: 'from-blue-100 to-indigo-100', accent: 'text-blue-600', dot: 'bg-blue-500' },
 { months: [2, 3, 4], icon: Leaf, label: 'Lente', gradient: 'from-emerald-50 to-green-100', accent: 'text-emerald-600', dot: 'bg-emerald-500' },
 { months: [5, 6, 7], icon: Sun, label: 'Zomer', gradient: 'from-amber-50 to-yellow-100', accent: 'text-amber-600', dot: 'bg-amber-500' },
 { months: [8, 9, 10], icon: CloudRain, label: 'Herfst', gradient: 'from-orange-50 to-amber-100', accent: 'text-orange-600', dot: 'bg-orange-500' },
]

export function SeasonWidget() {
 const [peak, setPeak] = useState<SeasonItem[]>([])
 const [available, setAvailable] = useState<SeasonItem[]>([])
 const [loading, setLoading] = useState(true)
 const supabase = createClient()
 const currentMonth = new Date().getMonth()
 const monthKey = monthKeys[currentMonth]
 const season = seasonConfig.find(s => s.months.includes(currentMonth))!
 const SeasonIcon = season.icon

 useEffect(() => {
 async function load() {
 const { data } = await supabase
 .from('seasonal_calendar')
 .select(`ingredient_name, category, ${monthKey}`)
 .eq('country_code', 'BE')
 .gte(monthKey, 1)
 .order(monthKey, { ascending: false })
 .order('ingredient_name')
 
 const items = (data || []).map(d => ({
 ingredient_name: d.ingredient_name,
 category: d.category,
 availability: (d as any)[monthKey] as number,
 }))
 
 setPeak(items.filter(i => i.availability === 2))
 setAvailable(items.filter(i => i.availability === 1))
 setLoading(false)
 }
 load()
 }, [])

 if (loading) {
 return (
 <div className="card p-6 space-y-4">
 <div className="skeleton w-40 h-6 rounded-lg" />
 <div className="grid grid-cols-2 gap-2">
 {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-10 rounded-xl" />)}
 </div>
 </div>
 )
 }

 const grouped = peak.reduce<Record<string, string[]>>((acc, item) => {
 if (!acc[item.category]) acc[item.category] = []
 acc[item.category].push(item.ingredient_name)
 return acc
 }, {})

 return (
 <div className="card overflow-hidden group">
 {/* Header with season gradient */}
 <div className={`bg-gradient-to-br ${season.gradient} px-6 py-5 border-b border-stone-200/30`}>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className={`w-10 h-10 rounded-2xl bg-white/80 backdrop-blur flex items-center justify-center shadow-sm`}>
 <SeasonIcon className={`w-5 h-5 ${season.accent}`} />
 </div>
 <div>
 <h3 className="font-display font-semibold text-stone-900">{season.label} {monthNames[currentMonth]}</h3>
 <p className="text-xs text-stone-500 mt-0.5">
 <Flame className="w-3 h-3 inline mr-1 text-brand-500" />
 {peak.length} op piekseizoen · {available.length} beschikbaar
 </p>
 </div>
 </div>
 <Link 
 href="/seasonal" 
 className="text-xs font-medium text-stone-400 hover:text-brand-600 transition-colors flex items-center gap-1 group-hover:text-brand-500"
 >
 Volledig <ExternalLink className="w-3 h-3" />
 </Link>
 </div>
 </div>

 {/* Peak season items by category */}
 <div className="p-5 space-y-4">
 {Object.entries(grouped).map(([category, items]) => (
 <div key={category}>
 <div className="flex items-center gap-2 mb-2">
 <span className="text-sm">{categoryEmojis[category] || ''}</span>
 <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">{category}</span>
 <div className="flex-1 h-px bg-stone-100" />
 </div>
 <div className="flex flex-wrap gap-1.5">
 {items.map(item => (
 <span 
 key={item} 
 className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100"
 >
 <span className={`w-1.5 h-1.5 rounded-full ${season.dot}`} />
 {item}
 </span>
 ))}
 </div>
 </div>
 ))}

 {peak.length === 0 && (
 <p className="text-sm text-stone-400 text-center py-4">Geen piekseizoen items deze maand</p>
 )}
 </div>
 </div>
 )
}
