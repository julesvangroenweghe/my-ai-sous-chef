'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useInvoices } from '@/hooks/use-invoices'

interface PriceEntry {
 id: string
 price: number
 source: string | null
 recorded_at: string
}

interface PriceTrackerProps {
 ingredientId: string
 ingredientName: string
}

export function PriceTracker({ ingredientId, ingredientName }: PriceTrackerProps) {
 const { getPriceHistory, loading } = useInvoices()
 const [priceHistory, setPriceHistory] = useState<PriceEntry[]>([])

 useEffect(() => {
 async function load() {
 const data = await getPriceHistory(ingredientId)
 setPriceHistory(data)
 }
 load()
 }, [ingredientId, getPriceHistory])

 if (loading || priceHistory.length === 0) {
 return (
 <Card>
 <CardContent className="py-8 text-center text-muted-foreground">
 <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
 <p className="text-sm">No price history available for {ingredientName}</p>
 </CardContent>
 </Card>
 )
 }

 const prices = priceHistory.map((p) => p.price)
 const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length
 const min = Math.min(...prices)
 const max = Math.max(...prices)
 const latest = prices[0]
 const previous = prices.length > 1 ? prices[1] : prices[0]
 const change = previous > 0 ? ((latest - previous) / previous) * 100 : 0

 // Simple bar chart visualization
 const chartMax = max * 1.1
 const barWidth = 100 / Math.min(priceHistory.length, 12)

 return (
 <Card>
 <CardHeader>
 <CardTitle className="text-base flex items-center justify-between">
 <span>{ingredientName} — Price History</span>
 <div className="flex items-center gap-1">
 {change > 0 ? (
 <TrendingUp className="h-4 w-4 text-red-500" />
 ) : change < 0 ? (
 <TrendingDown className="h-4 w-4 text-green-500" />
 ) : (
 <Minus className="h-4 w-4 text-muted-foreground" />
 )}
 <Badge
 variant={Math.abs(change) > 10 ? 'destructive' : 'secondary'}
 className="text-xs"
 >
 {change > 0 ? '+' : ''}{change.toFixed(1)}%
 </Badge>
 </div>
 </CardTitle>
 </CardHeader>
 <CardContent>
 {/* Stats */}
 <div className="grid grid-cols-4 gap-4 mb-6">
 <div>
 <p className="text-xs text-muted-foreground">Current</p>
 <p className="text-lg font-bold">{formatCurrency(latest)}</p>
 </div>
 <div>
 <p className="text-xs text-muted-foreground">Average</p>
 <p className="text-lg font-semibold text-muted-foreground">{formatCurrency(avg)}</p>
 </div>
 <div>
 <p className="text-xs text-muted-foreground">Min</p>
 <p className="text-lg font-semibold text-green-600">{formatCurrency(min)}</p>
 </div>
 <div>
 <p className="text-xs text-muted-foreground">Max</p>
 <p className="text-lg font-semibold text-red-600">{formatCurrency(max)}</p>
 </div>
 </div>

 {/* Simple bar chart */}
 <div className="flex items-end gap-1 h-32 mt-4">
 {priceHistory
 .slice(0, 12)
 .reverse()
 .map((entry, i) => {
 const height = chartMax > 0 ? (entry.price / chartMax) * 100 : 0
 const isHighlight = Math.abs(((entry.price - avg) / avg) * 100) > 10
 return (
 <div
 key={entry.id}
 className="flex-1 flex flex-col items-center gap-1"
 >
 <span className="text-[10px] text-muted-foreground">
 {formatCurrency(entry.price)}
 </span>
 <div
 className={`w-full rounded-t-sm transition-all ${
 isHighlight ? 'bg-orange-400' : 'bg-primary/60'
 }`}
 style={{ height: `${height}%`, minHeight: '4px' }}
 />
 <span className="text-[9px] text-muted-foreground truncate w-full text-center">
 {new Date(entry.recorded_at).toLocaleDateString('nl-BE', {
 month: 'short',
 day: 'numeric',
 })}
 </span>
 </div>
 )
 })}
 </div>

 {/* Supplier breakdown */}
 {(() => {
 const suppliers = priceHistory.reduce((acc, p) => {
 const src = p.source || 'Unknown'
 if (!acc[src]) acc[src] = []
 acc[src].push(p.price)
 return acc
 }, {} as Record<string, number[]>)

 if (Object.keys(suppliers).length <= 1) return null

 return (
 <div className="mt-6">
 <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
 By Supplier
 </p>
 <div className="space-y-2">
 {Object.entries(suppliers).map(([supplier, spPrices]) => {
 const spAvg = spPrices.reduce((s, p) => s + p, 0) / spPrices.length
 return (
 <div key={supplier} className="flex items-center justify-between text-sm">
 <span>{supplier}</span>
 <div className="flex items-center gap-2">
 <span className="text-muted-foreground">
 avg {formatCurrency(spAvg)}
 </span>
 <Badge variant="secondary" className="text-xs">
 {spPrices.length} entries
 </Badge>
 </div>
 </div>
 )
 })}
 </div>
 </div>
 )
 })()}
 </CardContent>
 </Card>
 )
}
