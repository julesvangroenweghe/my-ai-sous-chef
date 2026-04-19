'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, FlaskConical, Search, ArrowUpDown, Euro } from 'lucide-react'

interface Ingredient {
  id: string
  name: string
  category: string | null
  unit: string | null
  current_price: number | null
  supplier: string | null
  updated_at: string
}

function EmptyIngredients() {
  return (
    <div className="card p-12 text-center animate-scale-in">
      <div className="w-16 h-16 bg-sky-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <FlaskConical className="w-8 h-8 text-sky-400" />
      </div>
      <h3 className="font-display text-xl font-semibold text-stone-900 mb-2">No ingredients tracked yet</h3>
      <p className="text-stone-500 text-sm max-w-[45ch] mx-auto mb-8 leading-relaxed">
        Add ingredients to start tracking prices and calculating recipe costs. Upload an invoice to auto-import.
      </p>
      <button className="btn-primary">
        <Plus className="w-4 h-4" />
        Add Ingredient
      </button>
    </div>
  )
}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('ingredients').select('*').order('name')
      setIngredients(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">Ingredients</h1>
          <p className="text-stone-500 mt-1">{ingredients.length} ingredients tracked</p>
        </div>
        <button className="btn-primary shrink-0"><Plus className="w-4 h-4" />Add Ingredient</button>
      </div>

      {ingredients.length > 0 && (
        <div className="relative animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input type="text" placeholder="Search ingredients..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-premium pl-11" />
        </div>
      )}

      {loading ? (
        <div className="card divide-y divide-stone-100">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="skeleton w-8 h-8 rounded-lg" />
              <div className="flex-1 space-y-1.5"><div className="skeleton w-32 h-4 rounded" /><div className="skeleton w-20 h-3 rounded" /></div>
              <div className="skeleton w-16 h-4 rounded" />
            </div>
          ))}
        </div>
      ) : ingredients.length === 0 ? (
        <EmptyIngredients />
      ) : (
        <div className="card divide-y divide-stone-100 overflow-hidden">
          <div className="px-5 py-3 bg-stone-50/50 flex items-center text-xs font-medium text-stone-500 uppercase tracking-wider">
            <span className="flex-1">Name</span>
            <span className="w-24">Category</span>
            <span className="w-20 text-right">Unit</span>
            <span className="w-24 text-right">Price</span>
            <span className="w-28 text-right">Supplier</span>
          </div>
          {filtered.map((ing, i) => (
            <div
              key={ing.id}
              className="px-5 py-4 flex items-center hover:bg-stone-50/50 transition-colors cursor-pointer animate-slide-up opacity-0"
              style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'forwards' }}
            >
              <span className="flex-1 font-medium text-stone-900 text-sm">{ing.name}</span>
              <span className="w-24 text-xs text-stone-500">{ing.category || '—'}</span>
              <span className="w-20 text-right text-xs text-stone-500">{ing.unit || '—'}</span>
              <span className="w-24 text-right font-mono text-sm text-stone-700 tabular-nums">
                {ing.current_price ? `€${Number(ing.current_price).toFixed(2)}` : '—'}
              </span>
              <span className="w-28 text-right text-xs text-stone-400 truncate">{ing.supplier || '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
