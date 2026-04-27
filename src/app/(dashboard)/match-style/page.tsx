'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, ChevronDown, ChevronUp, ArrowUpRight, BookOpen, Utensils, FlaskConical, TrendingUp } from 'lucide-react'

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

interface AIAnalysis {
  eigen_recepten_match: { naam: string; overeenkomst: string; score: number; transfereerbare_elementen: string[] }[]
  klassieke_variaties: { naam: string; bron: string; techniek: string; hertaling: string }[]
  toe_te_passen_halffabricaten: { naam: string; toepassing: string }[]
  stijl_aanpassing: { klassiek_concept: string; moderne_uitvoering: string; stappen: string[]; mise_en_place_tip: string }
  food_cost_inschatting: { range: string; food_cost_pct: string; toelichting: string }
}

function ScoreBadge({ score }: { score: number }) {
  const bg = score >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : score >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-stone-50 text-[#B8997A] border-stone-200'
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${bg}`}>
      {score}%
    </span>
  )
}

function MatchTypeTag({ type }: { type: string }) {
  const labels: Record<string, string> = {
    ingredient: 'Ingrediënt', technique: 'Techniek', style: 'Stijl', composite: 'Samengesteld'
  }
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 border border-violet-100">
      {labels[type] || type}
    </span>
  )
}

function AIResultCards({ analysis, meta }: { analysis: AIAnalysis; meta: { classical_count: number; preps_count: number; main_ingredient: string } }) {
  return (
    <div className="space-y-4 mt-4">
      {/* Meta info */}
      <div className="flex items-center gap-3 text-xs text-[#9E7E60]">
        <span>Doorzocht: {meta.classical_count} klassieke recepten voor &ldquo;{meta.main_ingredient}&rdquo;</span>
        <span>·</span>
        <span>{meta.preps_count} halffabricaten gecontroleerd</span>
      </div>

      {/* Eigen recepten matches */}
      {analysis.eigen_recepten_match?.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-50 bg-stone-50/50">
            <Utensils className="w-3.5 h-3.5 text-brand-600" />
            <span className="text-xs font-semibold text-[#5C4730] uppercase tracking-wider">Eigen recepten die matchen</span>
          </div>
          <div className="divide-y divide-stone-50">
            {analysis.eigen_recepten_match.map((m, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <ScoreBadge score={m.score} />
                  <span className="text-sm font-medium text-stone-800">{m.naam}</span>
                </div>
                <p className="text-xs text-[#B8997A] leading-relaxed">{m.overeenkomst}</p>
                {m.transfereerbare_elementen?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {m.transfereerbare_elementen.map((el, j) => (
                      <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">{el}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Klassieke variaties */}
      {analysis.klassieke_variaties?.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-50 bg-stone-50/50">
            <BookOpen className="w-3.5 h-3.5 text-violet-600" />
            <span className="text-xs font-semibold text-[#5C4730] uppercase tracking-wider">Klassieke variaties uit de kennisbank</span>
          </div>
          <div className="divide-y divide-stone-50">
            {analysis.klassieke_variaties.map((v, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-stone-800">{v.naam}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-[#B8997A]">{v.bron}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 border border-violet-100">{v.techniek}</span>
                </div>
                <p className="text-xs text-[#B8997A] leading-relaxed italic">&ldquo;{v.hertaling}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Halffabricaten */}
      {analysis.toe_te_passen_halffabricaten?.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-50 bg-stone-50/50">
            <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-[#5C4730] uppercase tracking-wider">Toe te passen halffabricaten</span>
          </div>
          <div className="divide-y divide-stone-50">
            {analysis.toe_te_passen_halffabricaten.map((h, i) => (
              <div key={i} className="px-4 py-3">
                <span className="text-sm font-medium text-stone-800">{h.naam}</span>
                <p className="text-xs text-[#B8997A] mt-0.5">{h.toepassing}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stijl aanpassing */}
      {analysis.stijl_aanpassing && (
        <div className="bg-gradient-to-br from-brand-50/50 to-violet-50/30 rounded-xl border border-brand-100/50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-brand-100/30">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span className="text-xs font-semibold text-brand-700 uppercase tracking-wider">Aanpassing aan jouw stijl</span>
          </div>
          <div className="px-4 py-3 space-y-3">
            <div>
              <span className="text-[10px] text-[#9E7E60] uppercase tracking-wider">Klassiek concept</span>
              <p className="text-sm text-stone-700 font-medium mt-0.5">{analysis.stijl_aanpassing.klassiek_concept}</p>
            </div>
            <div>
              <span className="text-[10px] text-[#9E7E60] uppercase tracking-wider">Moderne hertaling</span>
              <p className="text-sm text-stone-800 font-medium mt-0.5">{analysis.stijl_aanpassing.moderne_uitvoering}</p>
            </div>
            {analysis.stijl_aanpassing.stappen?.length > 0 && (
              <div className="space-y-1">
                {analysis.stijl_aanpassing.stappen.map((stap, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-brand-600 text-[#2C1810] text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-xs text-[#5C4730]">{stap}</span>
                  </div>
                ))}
              </div>
            )}
            {analysis.stijl_aanpassing.mise_en_place_tip && (
              <div className="mt-2 p-2 bg-white/60 rounded-lg border border-brand-100/30">
                <span className="text-[10px] text-[#9E7E60] uppercase tracking-wider">MEP tip</span>
                <p className="text-xs text-[#5C4730] mt-0.5">{analysis.stijl_aanpassing.mise_en_place_tip}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Food cost */}
      {analysis.food_cost_inschatting && (
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-50 bg-stone-50/50">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-[#5C4730] uppercase tracking-wider">Geschatte food cost</span>
          </div>
          <div className="px-4 py-3 flex items-center gap-6">
            <div>
              <div className="text-xl font-display font-bold text-stone-900">{analysis.food_cost_inschatting.range}</div>
              <div className="text-xs text-[#9E7E60]">per persoon</div>
            </div>
            <div>
              <div className="text-xl font-display font-bold text-emerald-600">{analysis.food_cost_inschatting.food_cost_pct}</div>
              <div className="text-xs text-[#9E7E60]">food cost %</div>
            </div>
            {analysis.food_cost_inschatting.toelichting && (
              <p className="text-xs text-[#B8997A] flex-1">{analysis.food_cost_inschatting.toelichting}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MatchMyStylePage() {
  const [dishes, setDishes] = useState<LegendeDish[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedDish, setExpandedDish] = useState<string | null>(null)
  const [aiDish, setAiDish] = useState<string | null>(null)
  const [aiResults, setAiResults] = useState<Record<string, AIAnalysis & { meta: { classical_count: number; preps_count: number; main_ingredient: string } }>>(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem('match_ai_results') || '{}') } catch { return {} }
  })
  const [aiLoading, setAiLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'matched' | 'unmatched'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'score'>('score')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: d }, { data: elements }, { data: cats }, { data: matches }] = await Promise.all([
        supabase.from('legende_dishes').select('id, name, category_id').order('name'),
        supabase.from('legende_dish_elements').select('dish_id, name, quantity_grams, quantity_text'),
        supabase.from('legende_categories').select('id, name'),
        supabase.from('legende_recipe_matches').select(`
          legende_dish_id, recipe_id, match_score, match_type,
          shared_ingredients, shared_techniques, style_notes, suggestion,
          recipes:recipe_id(name)
        `)
      ])

      const catMap = Object.fromEntries((cats || []).map(c => [c.id, c.name]))

      const dishesWithData = (d || []).map((dish: { id: string; name: string; category_id: string }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dishMatches = (matches || []).filter((m: any) => m.legende_dish_id === dish.id).map((m: any) => ({
          match_score: Number(m.match_score),
          match_type: m.match_type,
          shared_ingredients: m.shared_ingredients || [],
          shared_techniques: m.shared_techniques || [],
          style_notes: m.style_notes || '',
          suggestion: m.suggestion || '',
          recipe_name: (m.recipes as { name: string })?.name || 'Onbekend',
          recipe_id: m.recipe_id
        })).sort((a: MatchData, b: MatchData) => b.match_score - a.match_score)

        return {
          id: dish.id,
          name: dish.name,
          category_name: catMap[dish.category_id] || 'Onbekend',
          elements: (elements || []).filter((e: { dish_id: string }) => e.dish_id === dish.id),
          matches: dishMatches,
          best_score: dishMatches.length > 0 ? dishMatches[0].match_score : 0
        }
      })

      setDishes(dishesWithData)
      setLoading(false)
    }
    load()
  }, [supabase])

  const matchDishAI = async (dish: LegendeDish) => {
    // Use cached result if available
    if (aiResults[dish.id]) {
      setAiDish(dish.id)
      return
    }

    setAiDish(dish.id)
    setAiLoading(true)

    try {
      const res = await fetch('/api/match-style/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dishId: dish.id,
          dishName: dish.name,
          categoryName: dish.category_name,
          elements: dish.elements
        })
      })

      const data = await res.json()
      if (data.analysis) {
        setAiResults(prev => ({ ...prev, [dish.id]: { ...data.analysis, meta: data.meta } }))
      }
    } catch {
      console.error('AI match fout')
    }
    setAiLoading(false)
  }

  const filteredDishes = dishes
    .filter(d => {
      if (filter === 'matched') return d.matches.length > 0
      if (filter === 'unmatched') return d.matches.length === 0
      return true
    })
    .sort((a, b) => sortBy === 'score' ? b.best_score - a.best_score : a.name.localeCompare(b.name))

  const totalGekoppeld = dishes.filter(d => d.matches.length > 0).length
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
          <h1 className="text-3xl font-display font-extrabold text-stone-900">Match My Style</h1>
          <p className="text-[#9E7E60] text-sm mt-1">LEGENDE gerechten gematcht met jouw recepten en kookstijl</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { val: dishes.length, label: 'LEGENDE gerechten', color: 'text-stone-900' },
          { val: totalGekoppeld, label: 'Gematcht', color: 'text-emerald-600' },
          { val: strongMatches, label: 'Sterke matches (70%+)', color: 'text-violet-600' },
          { val: totalMatchCount, label: 'Totaal koppelingen', color: 'text-brand-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-stone-100 p-5">
            <div className={`text-2xl font-display font-extrabold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-[#9E7E60]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border border-stone-200 overflow-hidden text-sm">
          {(['all', 'matched', 'unmatched'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 font-medium transition-colors ${filter === f ? 'bg-brand-600 text-[#2C1810]' : 'bg-white text-[#5C4730] hover:bg-stone-50'}`}>
              {f === 'all' ? 'Alles' : f === 'matched' ? 'Gematcht' : 'Geen match'}
            </button>
          ))}
        </div>
        <button onClick={() => setSortBy(s => s === 'score' ? 'name' : 'score')}
          className="px-4 py-2 text-sm font-medium text-[#5C4730] bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors">
          Sorteer: {sortBy === 'score' ? 'Score' : 'Naam'}
        </button>
        <span className="text-xs text-[#9E7E60] ml-auto">{filteredDishes.length} gerechten</span>
      </div>

      {/* Dish list */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="divide-y divide-stone-50 max-h-[700px] overflow-y-auto">
          {filteredDishes.map(dish => (
            <div key={dish.id} className="group">
              <div className="px-6 py-3 hover:bg-stone-50/50 transition-colors cursor-pointer"
                onClick={() => setExpandedDish(expandedDish === dish.id ? null : dish.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {dish.best_score > 0 && <ScoreBadge score={dish.best_score} />}
                      <span className="font-medium text-stone-900 text-sm truncate">{dish.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-[#B8997A] uppercase tracking-wider shrink-0">
                        {dish.category_name}
                      </span>
                    </div>
                    {dish.matches.length > 0 ? (
                      <p className="text-xs text-[#9E7E60] mt-0.5">
                        {dish.matches.length} match{dish.matches.length !== 1 ? 'es' : ''} —{' '}
                        Best: <span className="text-[#5C4730] font-medium">{dish.matches[0].recipe_name}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-[#9E7E60] mt-0.5 truncate">
                        {dish.elements.slice(0, 5).map(e => e.name).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); matchDishAI(dish) }}
                      disabled={aiLoading && aiDish === dish.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-600 text-[#2C1810] hover:bg-brand-700 transition-colors disabled:opacity-50"
                    >
                      {aiLoading && aiDish === dish.id ? (
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                      ) : aiResults[dish.id] ? (
                        <Sparkles className="w-3 h-3 text-amber-300" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      {aiResults[dish.id] ? 'Geanalyseerd' : 'AI Match'}
                    </button>
                    {dish.matches.length > 0 && (
                      expandedDish === dish.id
                        ? <ChevronUp className="w-4 h-4 text-[#9E7E60]" />
                        : <ChevronDown className="w-4 h-4 text-[#9E7E60]" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded static matches */}
              {expandedDish === dish.id && dish.matches.length > 0 && !aiResults[dish.id] && (
                <div className="px-6 pb-4 space-y-2">
                  {dish.matches.map((match, i) => (
                    <div key={i} className="p-3 rounded-xl bg-gradient-to-br from-violet-50/30 to-stone-50/30 border border-violet-100/30">
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
                      {match.suggestion && <p className="text-xs text-[#5C4730] leading-relaxed">{match.suggestion}</p>}
                      {match.shared_ingredients.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {match.shared_ingredients.map((ing, j) => (
                            <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">{ing}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* AI result cards */}
              {aiDish === dish.id && aiResults[dish.id] && (
                <div className="px-6 pb-6">
                  <AIResultCards analysis={aiResults[dish.id]} meta={aiResults[dish.id].meta} />
                </div>
              )}

              {/* Loading state */}
              {aiDish === dish.id && aiLoading && !aiResults[dish.id] && (
                <div className="px-6 pb-4">
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                    <div className="space-y-1">
                      <span className="text-sm text-[#5C4730]">Klassieke recepten doorzoeken...</span>
                      <div className="w-48 h-1 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full animate-[progress_3s_ease-in-out_infinite]" style={{width: '60%'}} />
                      </div>
                      <span className="text-xs text-[#9E7E60]">Duurt 5–10 seconden — resultaten worden bewaard</span>
                    </div>
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
