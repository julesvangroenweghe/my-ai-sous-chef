'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, Heart, Flame, Leaf, Star, MessageCircle, Clock } from 'lucide-react'
import type { ChefMemory } from '@/types/database'
import { formatDate } from '@/lib/utils'

const typeIcons: Record<string, React.ReactNode> = {
 preference: <Heart className="h-4 w-4 text-pink-500" />,
 technique: <Flame className="h-4 w-4 text-orange-500" />,
 style: <Star className="h-4 w-4 text-yellow-500" />,
 feedback: <MessageCircle className="h-4 w-4 text-blue-500" />,
 note: <Leaf className="h-4 w-4 text-green-500" />,
}

const typeLabels: Record<string, string> = {
 preference: 'Preferences',
 technique: 'Techniques',
 style: 'Cooking Style',
 feedback: 'Feedback',
 note: 'Notes',
}

interface MemoryDisplayProps {
 memories: ChefMemory[]
}

export function MemoryDisplay({ memories }: MemoryDisplayProps) {
 const grouped = memories.reduce((acc, mem) => {
 if (!acc[mem.memory_type]) acc[mem.memory_type] = []
 acc[mem.memory_type].push(mem)
 return acc
 }, {} as Record<string, ChefMemory[]>)

 // Extract style tags from style memories
 const styleTags = grouped['style']?.map((m) => m.content) || []
 const techniques = grouped['technique']?.map((m) => m.content) || []
 const preferences = grouped['preference']?.map((m) => m.content) || []

 return (
 <Card>
 <CardHeader>
 <CardTitle className="text-base flex items-center gap-2">
 <Brain className="h-5 w-5 text-purple-600" />
 Chef Memory
 </CardTitle>
 </CardHeader>
 <CardContent>
 {memories.length === 0 ? (
 <p className="text-sm text-muted-foreground text-center py-6">
 Jules is still learning about your style. Keep cooking and Jules will remember your preferences!
 </p>
 ) : (
 <div className="space-y-5">
 {/* Style Tags */}
 {styleTags.length > 0 && (
 <div>
 <div className="flex items-center gap-2 mb-2">
 <Star className="h-4 w-4 text-yellow-500" />
 <h3 className="text-sm font-semibold">Cooking Style</h3>
 </div>
 <div className="flex flex-wrap gap-1.5 pl-6">
 {styleTags.map((tag, i) => (
 <Badge key={i} variant="secondary" className="text-xs">
 {tag}
 </Badge>
 ))}
 </div>
 </div>
 )}

 {/* Techniques */}
 {techniques.length > 0 && (
 <div>
 <div className="flex items-center gap-2 mb-2">
 <Flame className="h-4 w-4 text-orange-500" />
 <h3 className="text-sm font-semibold">Signature Techniques</h3>
 </div>
 <div className="flex flex-wrap gap-1.5 pl-6">
 {techniques.map((tech, i) => (
 <Badge key={i} variant="outline" className="text-xs">
 {tech}
 </Badge>
 ))}
 </div>
 </div>
 )}

 {/* Preferences */}
 {preferences.length > 0 && (
 <div>
 <div className="flex items-center gap-2 mb-2">
 <Heart className="h-4 w-4 text-pink-500" />
 <h3 className="text-sm font-semibold">Preferences</h3>
 </div>
 <div className="space-y-1 pl-6">
 {preferences.slice(0, 8).map((pref, i) => (
 <div key={i} className="flex items-center gap-2 text-sm">
 <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
 <span>{pref}</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Other memory types */}
 {Object.entries(grouped)
 .filter(([type]) => !['style', 'technique', 'preference'].includes(type))
 .map(([type, mems]) => (
 <div key={type}>
 <div className="flex items-center gap-2 mb-2">
 {typeIcons[type] || <Brain className="h-4 w-4" />}
 <h3 className="text-sm font-semibold">{typeLabels[type] || type}</h3>
 <Badge variant="secondary" className="text-xs">{mems.length}</Badge>
 </div>
 <div className="space-y-1 pl-6">
 {mems.slice(0, 5).map((mem) => (
 <div key={mem.id} className="flex items-center justify-between text-sm">
 <span className="text-muted-foreground">{mem.content}</span>
 <span className="text-xs text-muted-foreground flex items-center gap-1">
 <Clock className="h-3 w-3" />
 {formatDate(mem.created_at)}
 </span>
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>
 )
}
