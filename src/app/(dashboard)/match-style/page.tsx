'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, ChevronDown, ChevronUp, ArrowUpRight } from 'lucide-react'

interface MatchData {
  match_score: number
  match_type: string
  shared_ingredients: string[]
  shared_techniques: string[]
  style_notes: string
  suggestion: string
  recipe_name: string
  recipe_id: string
}

interface LegendeDish {
  id: string
  name: string
  category_name: string
  elements: { name: string; quantity_grams: number | null; quantity_text: string | null }[]
  matches: MatchData[]
  best_score: number
}

interface Recipe {
  id: string
  name: string
  description: string
}

function ScoreBadge({ score }: { score: number }) {
  const bg = score >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : score >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-stone-50 text-stone-500 border-stone-200'
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${bg}`}>
      {score}%
    </span>
  )
}

function MatchTypeTag({ type }: { type: string }) {
  const labels: Record<string, string> = {
    ingredient: 'Ingrediënt',
    technique: 'Techniek',
    style: 'Stijl',
    composite: 'Samengesteld'
  }
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 border border-violet-100">
      {labels[type] || type}
    </span>
  )
}

export default function MatchMyStylePage() {
  const [dishes, setDishes] = useState<LegendeDish[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedDish, setExpandedDish] = useState<string | null>(null)
  const [aiDish, setAiDish] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'matched' | 'unmatched'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'score'>('score')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: d }, { data: r }, { data: elements }, { data: cats }, { data: matches }] = await Promise.all([
        supabase.from('legende_dishes').select('id, name, category_id').order('name'),
        supabase.from('recipes').select('id, name, description').order('name'),
        supabase.from('legende_dish_elements').select('dish_id, name, quantity_grams, quantity_text'),
        supabase.from('legende_categories').select('id, name'),
        supabase.from('legende_recipe_matches').select(`
          legende_dish_id, recipe_id, match_score, match_type, 
          shared_ingredients, shared_techniques, style_notes, suggestion,
          recipes:recipe_id(name)
        `)
      ])

      const catMap = Object.fromEntries((cats || []).map(c => [c.id, c.name]))

      const dishesWithData = (d || []).map((dish: any) => {
        const dishMatches = (matches || [])
          .filter((m: any) => m.legende_dish_id === dish.id)
          .map((m: any) => ({
            match_score: Number(m.match_score),
            match_type: m.match_type,
            shared_ingredients: m.shared_ingredients || [],
            shared_techniques: m.shared_techniques || [],
            style_notes: m.style_notes || '',
            suggestion: m.suggestion || '',
            recipe_name: (m.recipes as any)?.name || 'Onbekend',
            recipe_id: m.recipe_id
          }))
          .sort((a: MatchData, b: MatchData) => b.match_score - a.match_score)

        return {
          id: dish.id,
          name: dish.name,
          category_name: catMap[dish.category_id] || 'Onbekend',
          elements: (elements || []).filter((e: any) => e.dish_id === dish.id),
          matches: dishMatches,
          best_score: dishMatches.length > 0 ? dishMatches[0].match_score : 0
        }
      })

      setDishes(dishesWithData)
      setRecipes((r || []) as Recipe[])
      setLoading(false)
    }
    load()
  }, [])

  const matchDishAI = async (dish: LegendeDish) => {
    setAiDish(dish.id)
    setAiLoading(true)
    setAiResult(null)

    try {
      const elementsText = dish.elements
        .map(e => `${e.name}${e.quantity_grams ? ` (${e.quantity_grams}g)` : ''}`)
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

  const filteredDishes = dishes
    .filter(d => {
      if (filter === 'matched') return d.matches.length > 0
      if (filter === 'unmatched') return d.matches.length === 0
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'score') return b.best_score - a.best_score
      return a.name.localeCompare(b.name)
    })

  const totalMatched = dishes.filter(d => d.matches.length > 0).length
  const strongMatches = dishes.filter(d => d.best_score >= 70).length
  const totalMatchCount = dishes.reduce((sum, d) => sum + d.matches.length, 0)

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
          <p className="text-stone-400 text-sm mt-1">LEGENDE gerechten gematcht met jouw recepten en kookstijl</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <div className="text-2xl font-display font-bold text-stone-900">{dishes.length}</div>
          <div className="text-xs text-stone-400">LEGENDE gerechten</div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <div className="text-2xl font-display font-bold text-emerald-600">{totalMatched}</div>
          <div className="text-xs text-stone-400">Gematcht</div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <div className="text-2xl font-display font-bold text-violet-600">{strongMatches}</div>
          <div className="text-xs text-stone-400">Sterke matches (70%+)</div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <div className="text-2xl font-display font-bold text-brand-600">{totalMatchCount}</div>
          <div className="text-xs text-stone-400">Totaal koppelingen</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border border-stone-200 overflow-hidden text-sm">
          {(['all', 'matched', 'unmatched'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 font-medium transition-colors ${filter === f ? 'bg-brand-600 text-white' : 'bg-white text-stone-600 hover:bg-stone-50'}`}>
              {f === 'all' ? 'Alles' : f === 'matched' ? 'Gematcht' : 'Geen match'}
            </button>
          ))}
        </div>
        <button onClick={() => setSortBy(s => s === 'score' ? 'name' : 'score')}
          className="px-4 py-2 text-sm font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors">
          Sorteer: {sortBy === 'score' ? 'Score' : 'Naam'}
        </button>
        <span className="text-xs text-stone-400 ml-auto">{filteredDishes.length} gerechten</span>
      </div>

      {/* Dish list */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="divide-y divide-stone-50 max-h-[600px] overflow-y-auto">
          {filteredDishes.map(dish => (
            <div key={dish.id} className="group">
              <div className="px-6 py-3 hover:bg-stone-50/50 transition-colors cursor-pointer"
                onClick={() => setExpandedDish(expandedDish === dish.id ? null : dish.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {dish.best_score > 0 && <ScoreBadge score={dish.best_score} />}
                      <span className="font-medium text-stone-900 text-sm truncate">{dish.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 uppercase tracking-wider shrink-0">
                        {dish.category_name}
                      </span>
                    </div>
                    {dish.matches.length > 0 && (
                      <p className="text-xs text-stone-400 mt-0.5">
                        {dish.matches.length} match{dish.matches.length !== 1 ? 'es' : ''} — 
                        Best: <span className="text-stone-600 font-medium">{dish.matches[0].recipe_name}</span>
                      </p>
                    )}
                    {dish.matches.length === 0 && dish.elements.length > 0 && (
                      <p className="text-xs text-stone-400 mt-0.5 truncate">
                        {dish.elements.slice(0, 5).map(e => e.name).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); matchDishAI(dish); }}
                      disabled={aiLoading && aiDish === dish.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
                    >
                      {aiLoading && aiDish === dish.id ? (
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      AI Match
                    </button>
                    {dish.matches.length > 0 && (
                      expandedDish === dish.id 
                        ? <ChevronUp className="w-4 h-4 text-stone-400" />
                        : <ChevronDown className="w-4 h-4 text-stone-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded match details */}
              {expandedDish === dish.id && dish.matches.length > 0 && (
                <div className="px-6 pb-4 space-y-2">
                  {dish.matches.map((match, i) => (
                    <div key={i} className="p-3 rounded-xl bg-gradient-to-br from-violet-50/30 to-orange-50/30 border border-violet-100/30">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <ScoreBadge score={match.match_score} />
                          <span className="text-sm font-medium text-stone-800">{match.recipe_name}</span>
                          <MatchTypeTag type={match.match_type} />
                        </div>
                        <a href={`/recipes/${match.recipe_id}`} className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-0.5">
                          Bekijk <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                      {match.suggestion && (
                        <p className="text-xs text-stone-600 leading-relaxed">{match.suggestion}</p>
                      )}
                      {match.shared_ingredients.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {match.shared_ingredients.map((ing, j) => (
                            <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
                              {ing}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* AI result */}
              {aiDish === dish.id && aiResult && (
                <div className="px-6 pb-4">
                  <div className="p-4 bg-gradient-to-br from-violet-50/50 to-orange-50/50 rounded-xl border border-violet-100/50">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                      <span className="text-xs font-semibold text-violet-600 uppercase tracking-wider">AI Analyse</span>
                    </div>
                    <div className="whitespace-pre-wrap text-sm text-stone-700 leading-relaxed">{aiResult}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
