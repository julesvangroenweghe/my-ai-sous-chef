'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, Search, Apple, ArrowUpDown, Star, Award, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react'
import { AllergenBadgeList, type AllergenLink } from '@/components/allergens/allergen-badges'
import { AllergenEditor } from '@/components/allergens/allergen-editor'

interface Ingredient {
  id: string
  name: string
  category: string
  unit: string
  current_price: number | null
  standard_portion_g: number | null
  supplier_id: string | null
}

interface Variant {
  id: string
  ingredient_id: string
  name: string
  typical_price_per_kg: number | null
  origin: string | null
  quality_grade: string | null
  notes: string | null
}

const categoryEmoji: Record<string, string> = {
  groenten: '', fruit: '', vlees: '', vis: '', zuivel: '', kruiden: '',
  granen: '', noten: '', 'oliën': '', peulvruchten: '', eieren: '',
  champignons: '', aardappelen: '', 'wild & gevogelte': '', schaaldieren: '',
  conserven: '', bakkerij: '', sauzen: '', dranken: '',
}

const PAGE_SIZE = 25

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [allergenLinks, setAllergenLinks] = useState<Record<string, AllergenLink[]>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'category'>('name')
  const [showVariants, setShowVariants] = useState<string | null>(null)
  const [allergenEditorOpen, setAllergenEditorOpen] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const editorRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const loadAllergens = async () => {
    const { data } = await supabase
      .from('ingredient_allergens')
      .select('*, allergen:allergens(*)')
    
    const grouped: Record<string, AllergenLink[]> = {}
    ;(data || []).forEach((link: any) => {
      if (!grouped[link.ingredient_id]) grouped[link.ingredient_id] = []
      grouped[link.ingredient_id].push(link)
    })
    setAllergenLinks(grouped)
  }

  useEffect(() => {
    async function load() {
      const [{ data: ing }, { data: vars }] = await Promise.all([
        supabase.from('ingredients').select('*').order('name'),
        supabase.from('ingredient_variants').select('*').order('name')
      ])
      setIngredients((ing || []) as Ingredient[])
      setVariants((vars || []) as Variant[])
      setLoading(false)
    }
    load()
    loadAllergens()
  }, [])

  // Close allergen editor on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
        setAllergenEditorOpen(null)
      }
    }
    if (allergenEditorOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [allergenEditorOpen])

  // Reset page when search/filter changes
  useEffect(() => {
    setPage(1)
  }, [search, catFilter, sortBy])

  const categories = Array.from(new Set(ingredients.map(i => i.category).filter(Boolean))).sort()
  
  const filtered = ingredients
    .filter(i => {
      if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
      if (catFilter && i.category !== catFilter) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'price') return (b.current_price || 0) - (a.current_price || 0)
      if (sortBy === 'category') return (a.category || '').localeCompare(b.category || '')
      return a.name.localeCompare(b.name)
    })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const withPrice = ingredients.filter(i => i.current_price)
  const withVariants = new Set(variants.map(v => v.ingredient_id))
  const totalAllergenLinks = Object.values(allergenLinks).flat().length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-lime-100 flex items-center justify-center">
                <Apple className="w-5 h-5 text-lime-600" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-extrabold text-stone-900 tracking-tight">Ingredienten</h1>
                <p className="text-[#9E7E60] text-sm mt-0.5">{ingredients.length} ingredienten · {variants.length} chef-level varianten</p>
              </div>
            </div>
          </div>
          <Link href="/ingredients/new" className="btn-primary shrink-0">
            <Plus className="w-4 h-4" /> Nieuw Ingredient
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        <div className="card p-4">
          <div className="font-mono text-2xl font-extrabold text-stone-900">{ingredients.length}</div>
          <div className="text-xs text-[#9E7E60]">Totaal</div>
        </div>
        <div className="card p-4">
          <div className="font-mono text-2xl font-extrabold text-emerald-600">{withPrice.length}</div>
          <div className="text-xs text-[#9E7E60]">Met prijs</div>
        </div>
        <div className="card p-4">
          <div className="font-mono text-2xl font-extrabold text-violet-600">{variants.length}</div>
          <div className="text-xs text-[#9E7E60]">Varianten</div>
        </div>
        <div className="card p-4">
          <div className="font-mono text-2xl font-extrabold text-stone-900">{categories.length}</div>
          <div className="text-xs text-[#9E7E60]">Categorieen</div>
        </div>
        <div className="card p-4">
          <div className="font-mono text-2xl font-extrabold text-amber-600">{totalAllergenLinks}</div>
          <div className="text-xs text-[#9E7E60]">Allergeen-links</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 animate-slide-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E7E60]" />
          <input
            type="text"
            placeholder="Zoek ingredient..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => setCatFilter(null)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0 ${!catFilter ? 'bg-white text-[#2C1810] border-[#D4B896]' : 'bg-white text-[#5C4730] border-stone-200 hover:border-stone-300'}`}>
            Alles
          </button>
          {categories.slice(0, 10).map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(catFilter === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0 ${catFilter === cat ? 'bg-white text-[#2C1810] border-[#D4B896]' : 'bg-white text-[#5C4730] border-stone-200 hover:border-stone-300'}`}
            >
              {categoryEmoji[cat] || ''} {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div className="flex gap-2 text-xs text-[#9E7E60] animate-slide-up opacity-0" style={{ animationDelay: '250ms', animationFillMode: 'forwards' }}>
        <span className="flex items-center gap-1"><ArrowUpDown className="w-3 h-3" /> Sorteer:</span>
        {[
          { key: 'name' as const, label: 'Naam' },
          { key: 'price' as const, label: 'Prijs' },
          { key: 'category' as const, label: 'Categorie' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setSortBy(s.key)}
            className={`px-2 py-0.5 rounded ${sortBy === s.key ? 'bg-white text-[#2C1810]' : 'hover:bg-stone-100'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Ingredients List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card p-4 flex gap-3 animate-pulse">
              <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="skeleton w-40 h-4 rounded" />
                <div className="skeleton w-24 h-3 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {paginated.map((ing, i) => {
            const ingVariants = variants.filter(v => v.ingredient_id === ing.id)
            const ingAllergens = allergenLinks[ing.id] || []
            const emoji = categoryEmoji[ing.category] || ''
            const isOpen = showVariants === ing.id
            const isAllergenOpen = allergenEditorOpen === ing.id
            
            return (
              <div key={ing.id} className="animate-slide-up opacity-0" style={{ animationDelay: `${Math.min(i * 30, 300)}ms`, animationFillMode: 'forwards' }}>
                <div className="card-hover flex items-center gap-4 p-4">
                  <span
                    className="text-lg w-8 text-center cursor-pointer"
                    onClick={() => setShowVariants(isOpen ? null : ing.id)}
                  >
                    {emoji}
                  </span>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setShowVariants(isOpen ? null : ing.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-900 truncate">{ing.name}</span>
                      {ingVariants.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                          <Star className="w-2.5 h-2.5" /> {ingVariants.length}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#9E7E60] mt-0.5">
                      {ing.category} · {ing.unit}
                      {ing.standard_portion_g && ` · ${ing.standard_portion_g}g portie`}
                    </div>
                  </div>

                  {/* Allergen badges column */}
                  <div className="relative shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setAllergenEditorOpen(isAllergenOpen ? null : ing.id)
                      }}
                      className="flex items-center gap-1 hover:bg-stone-50 rounded-lg px-2 py-1 transition-all"
                      title="Allergenen bewerken"
                    >
                      {ingAllergens.length > 0 ? (
                        <AllergenBadgeList links={ingAllergens} maxVisible={3} size="xs" />
                      ) : (
                        <span className="text-[10px] text-[#5C4730] flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> Geen
                        </span>
                      )}
                    </button>

                    {/* Allergen editor popover */}
                    {isAllergenOpen && (
                      <div
                        ref={editorRef}
                        className="absolute right-0 top-full mt-1 z-50 w-72 bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-3 py-2 bg-stone-50 border-b border-stone-100">
                          <div className="text-xs font-semibold text-stone-700">Allergenen: {ing.name}</div>
                        </div>
                        <AllergenEditor
                          ingredientId={ing.id}
                          currentLinks={ingAllergens}
                          onUpdate={loadAllergens}
                        />
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    {ing.current_price ? (
                      <span className="font-mono text-sm font-semibold text-stone-900">€{ing.current_price.toFixed(2)}<span className="text-[#9E7E60] text-xs">/{ing.unit}</span></span>
                    ) : (
                      <span className="text-xs text-[#5C4730]">Geen prijs</span>
                    )}
                  </div>
                </div>

                {/* Variants Dropdown */}
                {isOpen && ingVariants.length > 0 && (
                  <div className="ml-12 mb-2 space-y-1 animate-fade-in">
                    <div className="text-[10px] uppercase tracking-wider text-violet-500 font-semibold px-3 pt-2 flex items-center gap-1">
                      <Award className="w-3 h-3" /> Chef-Level Varianten
                    </div>
                    {ingVariants.map(v => (
                      <div key={v.id} className="flex items-center gap-3 px-3 py-2 bg-violet-50/50 rounded-lg">
                        <span className="text-xs font-medium text-violet-800">{v.name}</span>
                        {v.quality_grade && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">{v.quality_grade}</span>
                        )}
                        {v.origin && <span className="text-[10px] text-[#9E7E60]">{v.origin}</span>}
                        <span className="ml-auto font-mono text-xs font-semibold text-violet-600">
                          {v.typical_price_per_kg ? `€${v.typical_price_per_kg.toFixed(2)}/kg` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center justify-between py-4">
        <div className="text-xs text-[#9E7E60]">
          {filtered.length > 0
            ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} van ${filtered.length} ingredienten`
            : `0 van ${ingredients.length} ingredienten`}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white text-[#5C4730] border-stone-200 hover:border-stone-300"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Vorige
          </button>
          <span className="text-xs text-[#B8997A] px-2">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white text-[#5C4730] border-stone-200 hover:border-stone-300"
          >
            Volgende <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
