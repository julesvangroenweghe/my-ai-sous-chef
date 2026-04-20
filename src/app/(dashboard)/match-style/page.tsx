'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sparkles } from 'lucide-react'

interface LegendeDish {
  id: string
  name: string
  category_name: string
  elements: { name: string; quantity_grams: number | null; quantity_text: string | null }[]
}

interface Recipe {
  id: string
  name: string
  description: string
}

export default function MatchMyStylePage() {
  const [dishes, setDishes] = useState<LegendeDish[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDish, setSelectedDish] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: d }, { data: r }, { data: elements }, { data: cats }] = await Promise.all([
        supabase.from('legende_dishes').select('id, name, category_id').order('name'),
        supabase.from('recipes').select('id, name, description').order('name'),
        supabase.from('legende_dish_elements').select('dish_id, name, quantity_grams, quantity_text'),
        supabase.from('legende_categories').select('id, name')
      ])

      const catMap = Object.fromEntries((cats || []).map(c => [c.id, c.name]))

      const dishesWithElements = (d || []).map((dish: any) => ({
        id: dish.id,
        name: dish.name,
        category_name: catMap[dish.category_id] || 'Onbekend',
        elements: (elements || []).filter((e: any) => e.dish_id === dish.id)
      }))

      setDishes(dishesWithElements)
      setRecipes((r || []) as Recipe[])
      setLoading(false)
    }
    load()
  }, [])

  const matchDish = async (dish: LegendeDish) => {
    setSelectedDish(dish.id)
    setAiLoading(true)
    setAiResult(null)

    try {
      const elementsText = dish.elements
        .map(e => `${e.name}${e.quantity_grams ? ` (${e.quantity_grams}g)` : ''}${e.quantity_text ? ` ${e.quantity_text}` : ''}`)
        .join(', ')

      const recipeNames = recipes.map(r => `- ${r.name}: ${r.description || ''}`).join('\n')

      const res = await fetch('/api/jules-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Analyseer dit LEGENDE gerecht en match het met bestaande recepten. Geef ook suggesties hoe dit gerecht past in mijn stijl.

LEGENDE GERECHT: ${dish.name}
CATEGORIE: ${dish.category_name}
ELEMENTEN: ${elementsText}

MIJN BESTAANDE RECEPTEN:
${recipeNames}

Geef:
1. Welke bestaande recepten het dichtst aansluiten (qua techniek, ingredienten, stijl)
2. Welke elementen/technieken ik kan overnemen
3. Hoe ik dit gerecht kan aanpassen aan mijn stijl
4. Geschatte food cost range gebaseerd op mijn bestaande ingredientprijzen

Antwoord in het Nederlands, beknopt en professioneel.`,
          context: 'match_style'
        })
      })

      const data = await res.json()
      setAiResult(data.response || data.message || 'Geen analyse beschikbaar.')
    } catch {
      setAiResult('Fout bij het analyseren. Probeer opnieuw.')
    }
    setAiLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/10 to-brand-500/10 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-brand-600" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-stone-900">Match My Style</h1>
          <p className="text-stone-400 text-sm mt-1">Match LEGENDE gerechten met je bestaande recepten en stijl</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <div className="text-2xl font-display font-bold text-stone-900">{dishes.length}</div>
          <div className="text-xs text-stone-400">LEGENDE gerechten</div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <div className="text-2xl font-display font-bold text-stone-900">{recipes.length}</div>
          <div className="text-xs text-stone-400">Jouw recepten</div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <div className="text-2xl font-display font-bold text-brand-600">{dishes.length > 0 ? Math.round((recipes.length / dishes.length) * 100) : 0}%</div>
          <div className="text-xs text-stone-400">Dekking</div>
        </div>
      </div>

      {/* Dish list */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="font-display font-semibold text-stone-900">Selecteer een gerecht om te matchen</h2>
          <p className="text-xs text-stone-400 mt-1">AI analyseert je stijl en geeft gepersonaliseerde suggesties</p>
        </div>

        <div className="divide-y divide-stone-50 max-h-[500px] overflow-y-auto">
          {dishes.map(dish => (
            <div key={dish.id} className="px-6 py-3 hover:bg-stone-50/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-900 text-sm truncate">{dish.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 uppercase tracking-wider shrink-0">{dish.category_name}</span>
                  </div>
                  {dish.elements.length > 0 && (
                    <p className="text-xs text-stone-400 mt-0.5 truncate">
                      {dish.elements.map(e => e.name).join(' \u00b7 ')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => matchDish(dish)}
                  disabled={aiLoading && selectedDish === dish.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50 shrink-0 ml-3"
                >
                  {aiLoading && selectedDish === dish.id ? (
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  Match
                </button>
              </div>

              {selectedDish === dish.id && aiResult && (
                <div className="mt-3 p-4 bg-gradient-to-br from-violet-50/50 to-orange-50/50 rounded-xl border border-violet-100/50">
                  <div className="whitespace-pre-wrap text-sm text-stone-700 leading-relaxed">{aiResult}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
