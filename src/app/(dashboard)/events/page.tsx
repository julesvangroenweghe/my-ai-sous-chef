'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, CalendarDays, MapPin, Users, ArrowRight, Clock, Euro, ClipboardList, Sparkles, AlertTriangle } from 'lucide-react'
import { ChefTip } from '@/components/ai/chef-tip'

interface Event {
 id: string
 name: string
 event_date: string
 event_type: string
 num_persons: number | null
 location: string | null
 status: string
 price_per_person: number | null
 notes: string | null
 created_at: string
}

const eventTypeConfig: Record<string, { emoji: string; label: string; color: string }> = {
 walking_dinner: { emoji: '', label: 'Walking Dinner', color: 'bg-amber-50 text-amber-700 border-amber-200' },
 buffet: { emoji: '', label: 'Buffet', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
 sit_down: { emoji: '', label: 'Sit-down Diner', color: 'bg-blue-50 text-blue-700 border-blue-200' },
 cocktail: { emoji: '', label: 'Cocktail', color: 'bg-purple-50 text-purple-700 border-purple-200' },
 brunch: { emoji: '', label: 'Brunch', color: 'bg-rose-50 text-rose-700 border-rose-200' },
 tasting: { emoji: '', label: 'Tasting Menu', color: 'bg-violet-50 text-violet-700 border-violet-200' },
}

const statusConfig: Record<string, { label: string; dot: string; bg: string }> = {
 draft: { label: 'Concept', dot: 'bg-stone-400', bg: 'bg-stone-50 text-stone-600' },
 confirmed: { label: 'Bevestigd', dot: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-700' },
 in_prep: { label: 'In voorbereiding', dot: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700' },
 completed: { label: 'Afgerond', dot: 'bg-blue-400', bg: 'bg-blue-50 text-blue-700' },
 cancelled: { label: 'Geannuleerd', dot: 'bg-red-400', bg: 'bg-red-50 text-red-600' },
}

function getRelativeDate(dateStr: string): { text: string; urgent: boolean } {
 const date = new Date(dateStr)
 const now = new Date()
 const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
 
 if (diff < 0) return { text: `${Math.abs(diff)}d geleden`, urgent: false }
 if (diff === 0) return { text: 'Vandaag!', urgent: true }
 if (diff === 1) return { text: 'Morgen', urgent: true }
 if (diff <= 7) return { text: `${diff} dagen`, urgent: true }
 if (diff <= 30) return { text: `${Math.ceil(diff / 7)} weken`, urgent: false }
 return { text: `${Math.ceil(diff / 30)} maanden`, urgent: false }
}

export default function EventsPage() {
 const [events, setEvents] = useState<Event[]>([])
 const [loading, setLoading] = useState(true)
 const supabase = createClient()

 useEffect(() => {
 async function load() {
 const { data } = await supabase.from('events').select('*').order('event_date', { ascending: true })
 setEvents((data || []) as Event[])
 setLoading(false)
 }
 load()
 }, [])

 const upcoming = events.filter(e => new Date(e.event_date) >= new Date() && e.status !== 'cancelled')
 const past = events.filter(e => new Date(e.event_date) < new Date() || e.status === 'cancelled')
 const totalPersons = upcoming.reduce((sum, e) => sum + (e.num_persons || 0), 0)
 const totalRevenue = upcoming.reduce((sum, e) => sum + ((e.num_persons || 0) * (e.price_per_person || 0)), 0)

 return (
 <div className="space-y-8">
 {/* Header */}
 <div className="animate-fade-in">
 <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
 <div>
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
 <CalendarDays className="w-5 h-5 text-emerald-600" />
 </div>
 <div>
 <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">Events & MEP</h1>
 <p className="text-stone-400 text-sm mt-0.5">Plan events en genereer automatische productieplannen</p>
 </div>
 </div>
 </div>
 <Link href="/events/new" className="btn-primary shrink-0">
 <Plus className="w-4 h-4" /> Nieuw Event
 </Link>
 </div>
 </div>

 {/* Stats Strip */}
 {upcoming.length > 0 && (
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
 <div className="card p-4 text-center">
 <div className="font-mono text-2xl font-bold text-stone-900">{upcoming.length}</div>
 <div className="text-xs text-stone-400">Komende events</div>
 </div>
 <div className="card p-4 text-center">
 <div className="font-mono text-2xl font-bold text-stone-900">{totalPersons}</div>
 <div className="text-xs text-stone-400">Totaal personen</div>
 </div>
 <div className="card p-4 text-center">
 <div className="font-mono text-2xl font-bold text-emerald-600">€{totalRevenue.toLocaleString('nl-BE')}</div>
 <div className="text-xs text-stone-400">Verwachte omzet</div>
 </div>
 <Link href="/mep" className="card-hover p-4 text-center group">
 <div className="font-mono text-2xl font-bold text-brand-600">
 <ClipboardList className="w-6 h-6 mx-auto" />
 </div>
 <div className="text-xs text-stone-400 group-hover:text-brand-600 transition-colors">MEP Planning →</div>
 </Link>
 </div>
 )}

 {/* Smart Tip */}
 {upcoming.some(e => !e.price_per_person) && (
 <ChefTip
 tip="Sommige events hebben nog geen prijs per persoon. Voeg deze toe voor nauwkeurige omzetberekeningen."
 variant="cost"
 />
 )}

 {/* Events List */}
 {loading ? (
 <div className="space-y-3">
 {[...Array(3)].map((_, i) => (
 <div key={i} className="card p-6 flex gap-4 animate-pulse">
 <div className="skeleton w-16 h-16 rounded-2xl shrink-0" />
 <div className="flex-1 space-y-2">
 <div className="skeleton w-56 h-5 rounded" />
 <div className="skeleton w-40 h-4 rounded" />
 <div className="skeleton w-32 h-3 rounded" />
 </div>
 </div>
 ))}
 </div>
 ) : events.length === 0 ? (
 <div className="card p-12 text-center animate-scale-in">
 <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
 <CalendarDays className="w-10 h-10 text-emerald-300" />
 </div>
 <h3 className="font-display text-xl font-semibold text-stone-900 mb-2">Nog geen events gepland</h3>
 <p className="text-stone-400 text-sm max-w-[45ch] mx-auto mb-8 leading-relaxed">
 Plan je eerste event en genereer automatisch een MEP productieplan met exacte hoeveelheden, timing en preplijsten.
 </p>
 <Link href="/events/new" className="btn-primary">
 <Plus className="w-4 h-4" /> Plan je eerste event
 </Link>
 </div>
 ) : (
 <div className="space-y-6">
 {/* Upcoming */}
 {upcoming.length > 0 && (
 <div>
 <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3 flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
 Komende events ({upcoming.length})
 </h2>
 <div className="space-y-2">
 {upcoming.map((event, i) => {
 const date = new Date(event.event_date)
 const dayNum = date.getDate()
 const monthShort = date.toLocaleDateString('nl-BE', { month: 'short' }).toUpperCase()
 const dayName = date.toLocaleDateString('nl-BE', { weekday: 'long' })
 const typeConfig = eventTypeConfig[event.event_type] || { emoji: '', label: event.event_type, color: 'bg-stone-50 text-stone-600 border-stone-200' }
 const status = statusConfig[event.status] || statusConfig.draft
 const relative = getRelativeDate(event.event_date)

 return (
 <Link
 key={event.id}
 href={`/events/${event.id}`}
 className="card-hover flex items-center gap-5 p-5 group animate-slide-up opacity-0"
 style={{ animationDelay: `${i * 75}ms`, animationFillMode: 'forwards' }}
 >
 {/* Date Block */}
 <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0 ${relative.urgent ? 'bg-brand-600 text-white' : 'bg-stone-900 text-white'}`}>
 <span className="text-[10px] uppercase tracking-wide opacity-70">{monthShort}</span>
 <span className="font-mono text-2xl font-bold leading-none">{dayNum}</span>
 </div>

 {/* Info */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-lg">{typeConfig.emoji}</span>
 <h3 className="font-display font-semibold text-stone-900 group-hover:text-brand-700 transition-colors truncate">
 {event.name}
 </h3>
 <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${typeConfig.color}`}>
 {typeConfig.label}
 </span>
 </div>
 <div className="flex items-center gap-4 mt-1.5 text-sm text-stone-400">
 <span className="flex items-center gap-1">
 <CalendarDays className="w-3.5 h-3.5" /> {dayName}
 </span>
 {event.num_persons && (
 <span className="flex items-center gap-1">
 <Users className="w-3.5 h-3.5" /> {event.num_persons} pers.
 </span>
 )}
 {event.location && (
 <span className="flex items-center gap-1 truncate">
 <MapPin className="w-3.5 h-3.5" /> {event.location}
 </span>
 )}
 </div>
 </div>

 {/* Right Side */}
 <div className="text-right shrink-0 space-y-1">
 <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${status.bg}`}>
 <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
 {status.label}
 </span>
 <div className={`text-xs font-mono ${relative.urgent ? 'text-brand-600 font-semibold' : 'text-stone-400'}`}>
 {relative.text}
 </div>
 {event.price_per_person && (
 <div className="text-xs text-stone-400">€{event.price_per_person}/pp</div>
 )}
 </div>

 <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all shrink-0" />
 </Link>
 )
 })}
 </div>
 </div>
 )}

 {/* Past */}
 {past.length > 0 && (
 <div>
 <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
 Afgelopen events ({past.length})
 </h2>
 <div className="space-y-2 opacity-60">
 {past.map((event) => {
 const date = new Date(event.event_date)
 const typeConfig = eventTypeConfig[event.event_type] || { emoji: '', label: event.event_type, color: '' }
 return (
 <Link
 key={event.id}
 href={`/events/${event.id}`}
 className="card flex items-center gap-4 p-4 hover:opacity-80 transition-opacity"
 >
 <span className="text-lg">{typeConfig.emoji}</span>
 <div className="flex-1 min-w-0">
 <span className="text-sm font-medium text-stone-700 truncate block">{event.name}</span>
 <span className="text-xs text-stone-400">{date.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
 </div>
 {event.num_persons && <span className="text-xs text-stone-400">{event.num_persons} pers.</span>}
 </Link>
 )
 })}
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 )
}
