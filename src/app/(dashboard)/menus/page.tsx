"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Loader2, Trash2, UtensilsCrossed, X, Users, Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

interface EventMenu {
  id: string
  name: string
  event_type: string | null
  guest_count: number | null
  event_date: string | null
  status: string
  notes: string | null
  venue: string | null
  created_at: string
  menu_items?: { id: string; course: string }[]
}

const statusLabels: Record<string, string> = {
  draft: 'Concept',
  confirmed: 'Bevestigd',
  in_progress: 'In uitvoering',
  completed: 'Afgerond',
  cancelled: 'Geannuleerd',
}

const statusColors: Record<string, string> = {
  draft: 'bg-[#FDF8F2] text-[#9E7E60]',
  confirmed: 'bg-emerald-500/15 text-emerald-400',
  in_progress: 'bg-amber-500/15 text-amber-700',
  completed: 'bg-blue-500/15 text-blue-400',
  cancelled: 'bg-red-500/15 text-red-400',
}

const typeLabels: Record<string, string> = {
  walking_dinner: 'Walking Dinner',
  buffet: 'Buffet',
  sit_down: 'Sit-down',
}

export default function MenusPage() {
  const supabase = createClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [eventType, setEventType] = useState("walking_dinner")
  const [guestCount, setGuestCount] = useState("")
  const [menus, setMenus] = useState<EventMenu[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const fetchMenus = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: false })
    if (error) console.error('Menus fetch error:', error)
    setMenus((data ?? []) as EventMenu[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchMenus() }, [fetchMenus])

  const handleCreate = async () => {
    if (!title) return
    setCreating(true)
    await supabase.from("events").insert({
      name: title,
      notes: notes || null,
      status: "draft",
      event_type: eventType,
      guest_count: guestCount ? parseInt(guestCount) : null,
      event_date: new Date().toISOString(),
    })
    setTitle("")
    setNotes("")
    setGuestCount("")
    setDialogOpen(false)
    setCreating(false)
    fetchMenus()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Dit menu verwijderen?')) return
    await supabase.from("events").delete().eq("id", id)
    fetchMenus()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-600/20 flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-extrabold text-[#2C1810] tracking-tight">Menu&apos;s</h1>
            <p className="text-[#9E7E60] text-sm mt-0.5">{menus.length} menu&apos;s aangemaakt</p>
          </div>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
        >
          <Plus className="mr-2 h-4 w-4" /> Nieuw menu
        </Button>
      </div>

      {/* Create dialog */}
      {dialogOpen && (
        <Card className="bg-white/80 border-amber-500/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[#2C1810]">Nieuw menu aanmaken</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setDialogOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-[#9E7E60]">Naam *</Label>
                <Input 
                  id="title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="bv. Bruiloft Van den Berg"
                  className="bg-white border-[#E8D5B5] text-[#2C1810]" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type" className="text-[#9E7E60]">Type</Label>
                <select
                  id="type"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full rounded-md bg-white border border-[#E8D5B5] text-[#2C1810] px-3 py-2 text-sm"
                >
                  <option value="walking_dinner">Walking Dinner</option>
                  <option value="buffet">Buffet</option>
                  <option value="sit_down">Sit-down Dinner</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gasten" className="text-[#9E7E60]">Aantal gasten</Label>
                <Input 
                  id="gasten" 
                  type="number"
                  value={guestCount} 
                  onChange={(e) => setGuestCount(e.target.value)} 
                  placeholder="bv. 80"
                  className="bg-white border-[#E8D5B5] text-[#2C1810]" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-[#9E7E60]">Notities</Label>
                <Textarea 
                  id="notes" 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Allergieën, wensen, etc."
                  className="bg-white border-[#E8D5B5] text-[#2C1810]" 
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-[#E8D5B5] text-[#9E7E60]">
                Annuleren
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={!title || creating} 
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Aanmaken
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Menu list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : menus.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-4">
            <UtensilsCrossed className="w-8 h-8 text-zinc-600" />
          </div>
          <p className="text-[#9E7E60] mb-4">Nog geen menu&apos;s aangemaakt</p>
          <Button onClick={() => setDialogOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-black">
            <Plus className="mr-2 h-4 w-4" /> Eerste menu aanmaken
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menus.map((menu) => (
            <Link href={`/events/${menu.id}`} key={menu.id}>
              <div className="bg-white/50 border border-[#E8D5B5]/50 rounded-lg hover:border-amber-500/30 transition-all hover:bg-white/80 cursor-pointer h-full">
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-display font-semibold text-[#2C1810] text-lg leading-tight">
                      {menu.name}
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[#9E7E60] hover:text-red-400 shrink-0"
                      onClick={(e) => { e.preventDefault(); handleDelete(menu.id) }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`px-2 py-1 rounded-full font-medium ${statusColors[menu.status] || statusColors.draft}`}>
                      {statusLabels[menu.status] || menu.status}
                    </span>
                    {menu.event_type && (
                      <span className="px-2 py-1 rounded-full bg-[#FDF8F2] text-[#9E7E60]">
                        {typeLabels[menu.event_type] || menu.event_type}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-[#9E7E60]">
                    {menu.guest_count && (
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {menu.guest_count} gasten
                      </span>
                    )}
                    {menu.event_date && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(menu.event_date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>

                  {menu.menu_items && menu.menu_items.length > 0 && (
                    <p className="text-xs text-[#9E7E60]">
                      {menu.menu_items.length} gerechten
                    </p>
                  )}
                  
                  {menu.notes && (
                    <p className="text-sm text-[#9E7E60] truncate">{menu.notes}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
