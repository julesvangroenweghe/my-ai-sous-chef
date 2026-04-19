'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import type { ChefMemory } from '@/types/database'

interface MemoryTimelineProps {
 memories: ChefMemory[]
 loading?: boolean
 hasMore?: boolean
 onLoadMore?: () => void
 className?: string
}

const MEMORY_ICONS: Record<ChefMemory['memory_type'], string> = {
 preference: '',
 technique: '',
 style: '',
 feedback: '',
 note: '',
}

const MEMORY_LABELS: Record<ChefMemory['memory_type'], string> = {
 preference: 'Preference',
 technique: 'Technique',
 style: 'Style',
 feedback: 'Feedback',
 note: 'Note',
}

const MEMORY_COLORS: Record<ChefMemory['memory_type'], string> = {
 preference: 'bg-purple-100 border-purple-300',
 technique: 'bg-blue-100 border-blue-300',
 style: 'bg-pink-100 border-pink-300',
 feedback: 'bg-green-100 border-green-300',
 note: 'bg-gray-100 border-gray-300',
}

function relativeTime(dateStr: string): string {
 const now = new Date()
 const date = new Date(dateStr)
 const diffMs = now.getTime() - date.getTime()
 const diffSec = Math.floor(diffMs / 1000)
 const diffMin = Math.floor(diffSec / 60)
 const diffHour = Math.floor(diffMin / 60)
 const diffDay = Math.floor(diffHour / 24)
 const diffWeek = Math.floor(diffDay / 7)

 if (diffSec < 60) return 'just now'
 if (diffMin < 60) return `${diffMin}m ago`
 if (diffHour < 24) return `${diffHour}h ago`
 if (diffDay < 7) return `${diffDay}d ago`
 if (diffWeek < 4) return `${diffWeek}w ago`
 return date.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function MemoryTimeline({
 memories,
 loading = false,
 hasMore = false,
 onLoadMore,
 className,
}: MemoryTimelineProps) {
 if (memories.length === 0 && !loading) {
 return (
 <div className={cn('text-center py-12', className)}>
 <p className="text-4xl mb-3"></p>
 <p className="text-muted-foreground text-sm">
 Jules hasn&apos;t learned anything about you yet.
 </p>
 <p className="text-muted-foreground text-xs mt-1">
 As you use the app, Jules will build a memory of your preferences and style.
 </p>
 </div>
 )
 }

 return (
 <div className={cn('relative', className)}>
 {/* Vertical line */}
 <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

 <div className="space-y-4">
 {memories.map((memory) => (
 <div key={memory.id} className="relative flex gap-4 pl-2">
 {/* Icon circle */}
 <div
 className={cn(
 'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm',
 MEMORY_COLORS[memory.memory_type]
 )}
 >
 {MEMORY_ICONS[memory.memory_type]}
 </div>

 {/* Content */}
 <div className="flex-1 min-w-0 pb-4">
 <div className="flex items-center gap-2 mb-1">
 <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
 {MEMORY_LABELS[memory.memory_type]}
 </span>
 {memory.importance >= 4 && (
 <span className="text-xs text-orange-500 font-medium">★ Important</span>
 )}
 <span className="text-xs text-muted-foreground ml-auto shrink-0">
 {relativeTime(memory.created_at)}
 </span>
 </div>
 <p className="text-sm text-foreground leading-relaxed">{memory.content}</p>
 </div>
 </div>
 ))}
 </div>

 {/* Load more */}
 {hasMore && (
 <div className="flex justify-center pt-4">
 <Button
 variant="outline"
 size="sm"
 onClick={onLoadMore}
 disabled={loading}
 className="gap-2"
 >
 {loading && <Loader2 className="h-3 w-3 animate-spin" />}
 Load more
 </Button>
 </div>
 )}
 </div>
 )
}
