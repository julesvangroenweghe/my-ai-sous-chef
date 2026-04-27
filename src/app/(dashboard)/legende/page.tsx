'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BookMarked, Search, ChevronDown, ChevronRight, Plus,
  Loader2, ClipboardList, Tag
} from 'lucide-react'

interface LegendeDishElement {
  id: string
  name: string
  quantity_grams: number | null
  quantity_text: string | null
  sort_order: number
}

interface LegendeDish {
  id: string
  name: string
  category_id: string | null
  category_name: string | null
  description: string | null
  elements: LegendeDishElement[]
  expanded: boolean
}

interface LegendeCategory {
  id: string
  name: string
  dish_count: number
}

export default function LegendePage() {
  const [dishes, setDishes] = useState<LegendeDish[]>([])
  const [categories, setCategories] = useState<LegendeCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    // Load categories
    const { data: cats } = await supabase
      .from('legende_categories')
      .select('id, name')
      .order('name')

    // Load dishes with elements
    const { data: dishData } = await supabase
      .from('legende_dishes')
      .select(`
        id, name, category_id, description,
        elements:legende_dish_elements(id, name, quantity_grams, quantity_text, sort_order)
      `)
      .order('name')

    if (dishData) {
      const catMap = new Map((cats || []).map(c => [c.id, c.name]))
      const catCounts = new Map<string, number>()

      const mapped: LegendeDish[] = dishData.map((d: Record<string, unknown>) => {
        const catId = d.category_id as string | null
        const catName = catId ? catMap.get(catId) || null : null
        if (catName) catCounts.set(catName, (catCounts.get(catName) || 0) + 1)
        return {
          id: d.id as string,
          name: d.name as string,
          category_id: catId,
          category_name: catName,
          description: d.description as string | null,
          elements: ((d.elements || []) as LegendeDishElement[])
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
          expanded: false,
        }
      })

      setDishes(mapped)
      // Deduplicate categories by name (sub-categories share same name)
      const uniqueCats = new Map<string, LegendeCategory>()
      for (const c of (cats || [])) {
        if (!uniqueCats.has(c.name)) {
          uniqueCats.set(c.name, {
            id: c.id,
            name: c.name,
            dish_count: catCounts.get(c.name) || 0,
          })
        }
      }
      setCategories(Array.from(uniqueCats.values()))
    }
    setLoading(false)
  }

  const toggleDish = (id: string) => {
    setDishes(prev => prev.map(d =>
      d.id === id ? { ...d, expanded: !d.expanded } : d
    ))
  }

  const filtered = dishes.filter(d => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
    if (activeCategory && d.category_name !== activeCategory) return false
    return true
  })

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-stone-100 animate-pulse" />
          <div className="space-y-2">
            <div className="w-56 h-6 bg-stone-100 rounded animate-pulse" />
            <div className="w-40 h-4 bg-stone-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="card p-6 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-stone-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
            <BookMarked className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-extrabold text-stone-900 tracking-tight">Gerechtenbibliotheek</h1>
            <p className="text-[#9E7E60] text-sm mt-0.5">LEGENDE collectie - {dishes.length} gerechten</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E7E60]" />
          <input
            type="text"
            placeholder="Zoek gerecht..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap animate-slide-up opacity-0" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            !activeCategory ? 'bg-white text-[#2C1810] border-[#D4B896]' : 'bg-white text-[#5C4730] border-stone-200 hover:border-stone-300'
          }`}
        >
          Alles ({dishes.length})
        </button>
        {categories.filter(c => c.dish_count > 0).map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              activeCategory === cat.name ? 'bg-white text-[#2C1810] border-[#D4B896]' : 'bg-white text-[#5C4730] border-stone-200 hover:border-stone-300'
            }`}
          >
            {cat.name} ({cat.dish_count})
          </button>
        ))}
      </div>

      {/* Dishes List */}
      <div className="space-y-2 animate-slide-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 bg-stone-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookMarked className="w-8 h-8 text-[#5C4730]" />
            </div>
            <p className="font-display font-semibold text-stone-900">Geen gerechten gevonden</p>
            <p className="text-sm text-[#9E7E60] mt-1">Pas je zoekopdracht aan</p>
          </div>
        ) : (
          filtered.map(dish => (
            <div key={dish.id} className="card overflow-hidden">
              <button
                onClick={() => toggleDish(dish.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-stone-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {dish.expanded ? (
                    <ChevronDown className="w-4 h-4 text-[#9E7E60]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[#9E7E60]" />
                  )}
                  <div className="text-left">
                    <p className="font-display font-semibold text-stone-900">{dish.name}</p>
                    {dish.description && (
                      <p className="text-xs text-[#9E7E60] mt-0.5">{dish.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {dish.category_name && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-[#B8997A] bg-stone-100 px-2 py-0.5 rounded-full">
                      <Tag className="w-3 h-3" />
                      {dish.category_name}
                    </span>
                  )}
                  <span className="text-xs text-[#9E7E60]">{dish.elements.length} elementen</span>
                </div>
              </button>

              {dish.expanded && (
                <div className="px-4 pb-4 space-y-2 border-t border-stone-50">
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className="border-b border-stone-100">
                        <th className="text-left py-1.5 text-[11px] text-[#9E7E60] uppercase tracking-wider font-semibold">Element</th>
                        <th className="text-right py-1.5 text-[11px] text-[#9E7E60] uppercase tracking-wider font-semibold">Hoeveelheid</th>
                        <th className="text-left py-1.5 pl-2 text-[11px] text-[#9E7E60] uppercase tracking-wider font-semibold">Eenheid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dish.elements.map(el => (
                        <tr key={el.id} className="border-b border-stone-50">
                          <td className="py-1.5 text-stone-700">{el.name}</td>
                          <td className="py-1.5 text-right font-mono text-[#5C4730]">{el.quantity_grams || '-'}</td>
                          <td className="py-1.5 pl-2 text-[#B8997A]">{el.quantity_text || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex gap-2 pt-2">
                    <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 flex items-center gap-1.5 transition-colors">
                      <Plus className="w-3 h-3" />
                      Toevoegen aan recept
                    </button>
                    <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1.5 transition-colors">
                      <ClipboardList className="w-3 h-3" />
                      Toevoegen aan MEP
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
