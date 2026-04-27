'use client'

import { useState } from 'react'
import { Lightbulb, X, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface ChefTipProps {
 tip: string
 source?: string
 actionLabel?: string
 actionHref?: string
 variant?: 'default' | 'seasonal' | 'cost' | 'technique'
}

const variantStyles = {
 default: 'bg-gradient-to-r from-brand-50 to-amber-50 border-brand-200/50',
 seasonal: 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200/50',
 cost: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/50',
 technique: 'bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200/50',
}

const iconStyles = {
 default: 'text-brand-600',
 seasonal: 'text-emerald-600',
 cost: 'text-blue-600',
 technique: 'text-violet-600',
}

export function ChefTip({ tip, source, actionLabel, actionHref, variant = 'default' }: ChefTipProps) {
 const [dismissed, setDismissed] = useState(false)

 if (dismissed) return null

 return (
 <div className={`flex items-start gap-3 p-4 rounded-2xl border ${variantStyles[variant]} animate-fade-in`}>
 <div className="shrink-0 mt-0.5">
 <Lightbulb className={`w-4 h-4 ${iconStyles[variant]}`} />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm text-stone-700 leading-relaxed">{tip}</p>
 {source && (
 <p className="text-[11px] text-[#9E7E60] mt-1 font-medium">{source}</p>
 )}
 </div>
 {actionHref && actionLabel && (
 <Link 
 href={actionHref}
 className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 mt-0.5 transition-colors"
 >
 {actionLabel} <ChevronRight className="w-3 h-3" />
 </Link>
 )}
 <button 
 onClick={() => setDismissed(true)} 
 className="shrink-0 text-[#5C4730] hover:text-[#B8997A] transition-colors mt-0.5"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 </div>
 )
}
