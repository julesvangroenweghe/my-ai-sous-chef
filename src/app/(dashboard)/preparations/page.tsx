'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, Search, FlaskConical, ChevronDown, ChevronRight, 
  Clock, Euro, Edit2, Save, X, Trash2, Package 
} from 'lucide-react'

interface Preparation {
  id: string
  kitchen_id: string | null
  name: string
  category: string | null
  description: string | null
  yield_amount: number | null
  yield_unit: string | null
  shelf_life_hours: number | null
  instructions: string | null
  is_template: boolean
  created_at: string
}

interface PrepIngredient {
  id: string
  preparation_id: string
  ingredient_id: string | null
  ingredient_name: string
  quantity: number
  unit: string
  ingredient?: { id: string; name: string; current_price: number | null; unit: string | null }
}

const categoryEmojis: Record<string, string> = {
  'sauce': '🫗',
  'marinade': '🥫',
  'dressing': '🥗',
  'stock': '🍲',
  'spice_mix': '🌿',
  'compound_butter': '🧈',
  'pickle': '🥒',
  'garnish': '🌱',
  'base': '🫕',
  'paste': '🧄',
  'dessert_base': '🍮',
  'bread': '🍞',
}

export default function PreparationsPage() {
  const [preparations, setPreparations] = useState<Preparation[]>([])
  const [prepIngredients, setPrepIngredients] = useState<Record<string, PrepIngredient[]>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newPrep, setNewPrep] = useState({ name: '', category: 'sauce', description: '', yield_amount: '', yield_unit: 'L', shelf_life_hours: '', instructions: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const fetchPreparations = useCallback(async () => {
    const { data } = await supabase
      .from('preparations')
      .select('*')
      .order('name')
    setPreparations(data || [])
    setLoading(false)
  }, [])

  const fetchIngredients = useCallback(async (prepId: string) => {
    if (prepIngredients[prepId]) return
    const { data } = await supabase
      .from('preparation_ingredients')
      .select('*, ingredient:ingredients(id, name, current_price, unit)')
      .eq('preparation_id', prepId)
    setPrepIngredients(prev => ({ ...prev, [prepId]: data || [] }))
  }, [prepIngredients])

  useEffect(() => { fetchPreparations() }, [fetchPreparations])

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      fetchIngredients(id)
    }
  }

  const categories = useMemo(() => {
    const cats = [...new Set(preparations.map(p => p.category).filter(Boolean))] as string[]
    return cats.sort()
  }, [preparations])

  const filtered = useMemo(() => {
    return preparations.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase())
      const matchCategory = selectedCategory === 'all' || p.category === selectedCategory
      return matchSearch && matchCategory
    })
  }, [preparations, search, selectedCategory])

  const templates = filtered.filter(p => p.is_template)
  const custom = filtered.filter(p => !p.is_template)

  const handleSaveNew = async () => {
    if (!newPrep.name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('preparations').insert({
      name: newPrep.name.trim(),
      category: newPrep.category || null,
      description: newPrep.description || null,
      yield_amount: newPrep.yield_amount ? parseFloat(newPrep.yield_amount) : null,
      yield_unit: newPrep.yield_unit || null,
      shelf_life_hours: newPrep.shelf_life_hours ? parseInt(newPrep.shelf_life_hours) : null,
      instructions: newPrep.instructions || null,
      is_template: false,
    })
    if (!error) {
      await fetchPreparations()
      setShowNew(false)
      setNewPrep({ name: '', category: 'sauce', description: '', yield_amount: '', yield_unit: 'L', shelf_life_hours: '', instructions: '' })
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Verwijder deze halffabricaat?')) return
    await supabase.from('preparations').delete().eq('id', id)
    setPreparations(prev => prev.filter(p => p.id !== id))
  }

  const getCatEmoji = (cat: string | null) => categoryEmojis[cat || ''] || '🫙'

  const PrepCard = ({ prep }: { prep: Preparation }) => {
    const isExpanded = expandedId === prep.id
    const ingredients = prepIngredients[prep.id] || []
    const estimatedCost = ingredients.reduce((sum, ing) => {
      const price = ing.ingredient?.current_price || 0
      return sum + (price * ing.quantity)
    }, 0)

    return (
      <div className="bg-stone-900/50 border border-stone-800 rounded-xl overflow-hidden hover:border-stone-700 transition-colors">
        <button
          onClick={() => toggleExpand(prep.id)}
          className="w-full px-5 py-4 flex items-center gap-4 text-left"
        >
          <span className="text-2xl">{getCatEmoji(prep.category)}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-stone-200">{prep.name}</span>
              {prep.is_template && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-brand-500/20 text-brand-400 rounded">
                  Template
                </span>
              )}
            </div>
            {prep.description && (
              <p className="text-xs text-stone-500 mt-0.5 truncate">{prep.description}</p>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-stone-500">
            {prep.yield_amount && (
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                {prep.yield_amount} {prep.yield_unit}
              </span>
            )}
            {prep.shelf_life_hours && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {prep.shelf_life_hours}u
              </span>
            )}
            <span className="capitalize text-stone-600">{(prep.category || '').replace('_', ' ')}</span>
          </div>
          {isExpanded ? <ChevronDown className="w-4 h-4 text-stone-500" /> : <ChevronRight className="w-4 h-4 text-stone-500" />}
        </button>

        {isExpanded && (
          <div className="px-5 pb-4 border-t border-stone-800 pt-3 space-y-3">
            {prep.instructions && (
              <div>
                <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Instructies</h4>
                <p className="text-sm text-stone-300 whitespace-pre-wrap">{prep.instructions}</p>
              </div>
            )}

            {ingredients.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Ingrediënten</h4>
                <div className="space-y-1">
                  {ingredients.map(ing => (
                    <div key={ing.id} className="flex items-center justify-between text-sm py-1">
                      <span className="text-stone-300">{ing.ingredient_name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-stone-500 font-mono tabular-nums">{ing.quantity} {ing.unit}</span>
                        {ing.ingredient?.current_price && (
                          <span className="text-stone-600 font-mono tabular-nums text-xs">
                            €{(ing.ingredient.current_price * ing.quantity).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {estimatedCost > 0 && (
                  <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-stone-800">
                    <Euro className="w-3 h-3 text-brand-400" />
                    <span className="text-sm font-semibold text-brand-400">€{estimatedCost.toFixed(2)} geschat</span>
                  </div>
                )}
              </div>
            )}

            {!prep.is_template && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => handleDelete(prep.id)}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Verwijder
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div><h1 className="text-2xl font-display font-bold text-stone-100">Halffabricaten</h1></div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-stone-900/50 border border-stone-800 rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="w-8 h-8 bg-stone-800 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="w-32 h-4 bg-stone-800 rounded animate-pulse" />
                <div className="w-48 h-3 bg-stone-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-100">Halffabricaten</h1>
          <p className="text-stone-400 mt-1">
            {preparations.length} preps · {templates.length} templates · {custom.length} eigen
          </p>
        </div>
        <button 
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Nieuwe Prep
        </button>
      </div>

      {/* New prep form */}
      {showNew && (
        <div className="bg-stone-900/80 border border-brand-500/30 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-stone-200">Nieuw Halffabricaat</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Naam (bv. Chimichurri)"
              value={newPrep.name}
              onChange={e => setNewPrep(p => ({ ...p, name: e.target.value }))}
              className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <select
              value={newPrep.category}
              onChange={e => setNewPrep(p => ({ ...p, category: e.target.value }))}
              className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-300 text-sm focus:ring-2 focus:ring-brand-500"
            >
              {Object.entries(categoryEmojis).map(([k, v]) => (
                <option key={k} value={k}>{v} {k.replace('_', ' ')}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Beschrijving"
              value={newPrep.description}
              onChange={e => setNewPrep(p => ({ ...p, description: e.target.value }))}
              className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent sm:col-span-2"
            />
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Opbrengst"
                value={newPrep.yield_amount}
                onChange={e => setNewPrep(p => ({ ...p, yield_amount: e.target.value }))}
                className="flex-1 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm focus:ring-2 focus:ring-brand-500"
              />
              <select
                value={newPrep.yield_unit}
                onChange={e => setNewPrep(p => ({ ...p, yield_unit: e.target.value }))}
                className="w-20 px-2 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-300 text-sm"
              >
                <option value="L">L</option>
                <option value="kg">kg</option>
                <option value="stuks">stuks</option>
              </select>
            </div>
            <input
              type="number"
              placeholder="Houdbaarheid (uren)"
              value={newPrep.shelf_life_hours}
              onChange={e => setNewPrep(p => ({ ...p, shelf_life_hours: e.target.value }))}
              className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <textarea
            placeholder="Instructies..."
            value={newPrep.instructions}
            onChange={e => setNewPrep(p => ({ ...p, instructions: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200">Annuleer</button>
            <button 
              onClick={handleSaveNew} 
              disabled={saving || !newPrep.name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm"
            >
              <Save className="w-4 h-4" /> {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            type="text"
            placeholder="Zoek halffabricaat..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-300 text-sm focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">Alle categorieën</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{getCatEmoji(cat)} {cat.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-12 text-center">
          <FlaskConical className="w-12 h-12 text-stone-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-stone-300 mb-1">Geen halffabricaten gevonden</h3>
          <p className="text-stone-500 text-sm">Maak een nieuw halffabricaat aan of pas je zoekterm aan</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Templates section */}
          {templates.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" /> Standaard Templates ({templates.length})
              </h2>
              <div className="space-y-2">
                {templates.map(prep => <PrepCard key={prep.id} prep={prep} />)}
              </div>
            </div>
          )}
          
          {/* Custom preps */}
          {custom.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FlaskConical className="w-4 h-4" /> Eigen Halffabricaten ({custom.length})
              </h2>
              <div className="space-y-2">
                {custom.map(prep => <PrepCard key={prep.id} prep={prep} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
