'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Loader2, BookOpen, Lightbulb, ChefHat, Flame } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface StyleAnalysis {
  style_tags: string[]
  top_techniques: string[]
  signature_elements: string[]
  flavor_profile: string
  protein_preferences: string[]
  sauce_families: string[]
  garnish_patterns: string[]
  style_description: string
  suggested_classical_recipes: Array<{ name: string; reason: string }>
  growth_areas: string[]
}

const loadingMessages = [
  'Je recepten bestuderen...',
  'Patronen herkennen...',
  'Technieken analyseren...',
  'Smaakprofiel opbouwen...',
  'Stijl identificeren...',
]

export function MatchStyleButton() {
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState(0)
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null)
  const [error, setError] = useState('')
  const supabase = createClient()

  // Load existing analysis on mount
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('chef_profiles')
        .select('style_analysis')
        .eq('auth_user_id', user.id)
        .single()
      if (data?.style_analysis) {
        setAnalysis(data.style_analysis as StyleAnalysis)
      }
    }
    load()
  }, [])

  // Rotate loading messages
  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setLoadingMsg(prev => (prev + 1) % loadingMessages.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [loading])

  const handleAnalyze = async () => {
    setLoading(true)
    setError('')
    setLoadingMsg(0)
    try {
      const res = await fetch('/api/match-style', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Analyse mislukt')
      }
      const data = await res.json()
      setAnalysis(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Trigger Button */}
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="btn-primary w-full justify-center"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {loadingMessages[loadingMsg]}
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            {analysis ? 'Opnieuw analyseren' : 'Analyseer mijn stijl'}
          </>
        )}
      </button>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {analysis && !loading && (
        <div className="space-y-6 animate-fade-in">
          {/* Style Description */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
            <div className="flex items-start gap-3">
              <ChefHat className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-display font-semibold text-stone-900 mb-2">Jouw kookstijl</h4>
                <p className="text-sm text-stone-600 leading-relaxed">{analysis.style_description}</p>
              </div>
            </div>
          </div>

          {/* Style Tags */}
          <div>
            <h4 className="text-sm font-semibold text-stone-700 mb-2">Stijltags</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.style_tags.map(tag => (
                <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Techniques + Flavor Profile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-4 h-4 text-orange-500" />
                <h4 className="text-sm font-semibold text-stone-700">Top technieken</h4>
              </div>
              <div className="space-y-1.5">
                {analysis.top_techniques.map(t => (
                  <div key={t} className="text-sm text-stone-600 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-semibold text-stone-700">Smaakprofiel</h4>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">{analysis.flavor_profile}</p>
            </div>
          </div>

          {/* Signature Elements */}
          {analysis.signature_elements.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-stone-700 mb-2">Kenmerkende elementen</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.signature_elements.map(el => (
                  <span key={el} className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {el}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Recipes */}
          {analysis.suggested_classical_recipes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <h4 className="text-sm font-semibold text-stone-700">Ontdek recepten die bij je passen</h4>
              </div>
              <div className="space-y-2">
                {analysis.suggested_classical_recipes.map((rec, i) => (
                  <div key={i} className="p-3 rounded-xl border border-stone-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all">
                    <p className="font-medium text-stone-900 text-sm">{rec.name}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{rec.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Growth Areas */}
          {analysis.growth_areas.length > 0 && (
            <div className="p-4 rounded-xl bg-violet-50 border border-violet-100">
              <h4 className="text-sm font-semibold text-violet-800 mb-2">Groeimogelijkheden</h4>
              <div className="space-y-1">
                {analysis.growth_areas.map((area, i) => (
                  <p key={i} className="text-sm text-violet-700 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    {area}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
