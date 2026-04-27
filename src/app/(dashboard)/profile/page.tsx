'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TagInput } from '@/components/ui/tag-input'

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface StyleAnalysis {
  signature_techniques?: string[]
  preferred_ingredients?: string[]
  cuisine_influences?: string[]
  cooking_philosophy?: string
  avoid_ingredients?: string[]
  style_summary?: string
  confidence?: string
  last_updated?: string
}

interface ChefProfile {
  id: string
  display_name: string
  current_role: string
  years_experience: number | null
  kitchen_type: string
  cooking_philosophy: string
  cuisine_styles: string[]
  preferred_ingredients: string[]
  preferred_techniques: string[]
  avoided_ingredients: string[]
  style_analysis: StyleAnalysis | null
  onboarding_completed: boolean
}

interface StyleEvent {
  event_type: string
  entity_name: string | null
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const CUISINE_OPTIONS = [
  'Belgisch-Frans', 'Japans', 'Italiaans', 'Baskisch', 'Scandinavisch',
  'Aziatisch-fusie', 'Midden-Oosten', 'Spaans', 'Mexicaans', 'Nordic',
  'Klassiek Frans', 'Modern Europees',
]

const INGREDIENT_SUGGESTIONS = [
  'lavas', 'dashi', 'forelkaviaar', 'nduja', 'miso', 'truffel', 'bottarga',
  'bonito', 'yuzu', 'sumak', 'harissa', 'kampot peper',
]

const TECHNIQUE_SUGGESTIONS = [
  'à la plancha', 'conferen', 'gepekeld', 'fermenteren', 'dashi bouillon',
  'sous vide', 'roken', 'emulsie', 'braiseren', 'dehydrateren',
]

/* ------------------------------------------------------------------ */
/*  Toast                                                               */
/* ------------------------------------------------------------------ */

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-white text-[#2C1810] px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-slide-up">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {message}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Chip component                                                       */
/* ------------------------------------------------------------------ */

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150 ${
        selected
          ? 'bg-orange-50 border-orange-400 text-orange-900'
          : 'bg-stone-50 border-stone-200 text-[#5C4730] hover:border-stone-300'
      }`}
    >
      {label}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                      */
/* ------------------------------------------------------------------ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6 space-y-5">
      <h2 className="font-display font-semibold text-stone-900 text-lg">{title}</h2>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                           */
/* ------------------------------------------------------------------ */

export default function ProfilePage() {
  const supabase = createClient()

  const [profile, setProfile] = useState<ChefProfile | null>(null)
  const [events, setEvents] = useState<StyleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [recipeCount, setRecipeCount] = useState(0)
  const [menuCount, setMenuCount] = useState(0)

  // Load everything
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, recipeRes, eventRes] = await Promise.all([
        supabase.from('chef_profiles').select('*').eq('auth_user_id', user.id).single(),
        supabase.from('recipes').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('chef_style_events').select('event_type, entity_name').limit(100),
      ])

      if (profileRes.data) {
        setProfile(profileRes.data as ChefProfile)
      }
      setRecipeCount(recipeRes.count || 0)
      setEvents((eventRes.data || []) as StyleEvent[])
      setLoading(false)
    }
    load()
  }, [supabase])

  const save = useCallback(async (patch: Partial<ChefProfile>) => {
    if (!profile) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('chef_profiles')
        .update({
          ...patch,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (!error) {
        setProfile((p) => (p ? { ...p, ...patch } : p))
        setToast('Opgeslagen')
      }
    } finally {
      setSaving(false)
    }
  }, [profile, supabase])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/profile/analyze', { method: 'POST' })
      if (!res.ok) throw new Error('Analyse mislukt')
      const data = await res.json()
      setProfile((p) => (p ? { ...p, style_analysis: data } : p))
      setToast('Stijlanalyse bijgewerkt')
    } catch {
      setToast('Analyse mislukt — probeer opnieuw')
    } finally {
      setAnalyzing(false)
    }
  }

  // Derived stats from events
  const ingredientCounts = events
    .filter((e) => e.event_type === 'ingredient_used' && e.entity_name)
    .reduce<Record<string, number>>((acc, e) => {
      const key = e.entity_name!
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  const topIngredients = Object.entries(ingredientCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name)

  const techniqueCounts = events
    .filter((e) => e.event_type === 'technique_used' && e.entity_name)
    .reduce<Record<string, number>>((acc, e) => {
      const key = e.entity_name!
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  const topTechniques = Object.entries(techniqueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name)

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="skeleton w-48 h-8 rounded-lg" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-6 space-y-4">
            <div className="skeleton w-32 h-5 rounded" />
            <div className="skeleton w-full h-12 rounded-xl" />
            <div className="skeleton w-full h-12 rounded-xl" />
          </div>
        ))}
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="card p-8 text-center text-[#B8997A]">
        Profiel niet gevonden.
      </div>
    )
  }

  const initials = (profile.display_name || 'C')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="max-w-2xl space-y-6 pb-12">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* Page heading */}
      <div className="animate-fade-in">
        <h1 className="font-display text-3xl font-extrabold text-stone-900 tracking-tight">
          Mijn Profiel
        </h1>
        <p className="text-[#B8997A] mt-1">Jouw culinaire identiteit en stijl-DNA.</p>
      </div>

      {/* ── Header card ── */}
      <div className="card p-6 flex items-center gap-5 animate-slide-up opacity-0" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
        <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-orange-700">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-bold text-stone-900 text-lg truncate">
            {profile.display_name || 'Chef'}
          </h2>
          <p className="text-sm text-[#B8997A]">
            {[profile.current_role, profile.years_experience ? `${profile.years_experience} jaar` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {profile.kitchen_type && (
            <p className="text-xs text-[#9E7E60] capitalize mt-0.5">{profile.kitchen_type}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#9E7E60]">
          {saving && (
            <svg className="w-3.5 h-3.5 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>
      </div>

      {/* ── Statistieken ── */}
      <div className="grid grid-cols-3 gap-3 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        {[
          { label: 'Recepten', value: recipeCount },
          { label: "Menu's gegenereerd", value: menuCount },
          { label: 'Stijl-events', value: events.length },
        ].map(({ label, value }) => (
          <div key={label} className="card p-4 text-center">
            <div className="text-2xl font-extrabold font-mono text-stone-900">{value}</div>
            <div className="text-xs text-[#B8997A] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Stijl DNA ── */}
      <Section title="Mijn Stijl DNA">
        {/* Kookfilosofie */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700">Kookfilosofie</label>
          <textarea
            value={profile.cooking_philosophy || ''}
            onChange={(e) => setProfile((p) => p ? { ...p, cooking_philosophy: e.target.value } : p)}
            onBlur={() => save({ cooking_philosophy: profile.cooking_philosophy })}
            rows={3}
            placeholder="Wat drijft je in de keuken?"
            className="input-premium resize-none"
          />
        </div>

        {/* Culinaire invloeden */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-stone-700">Culinaire invloeden</label>
          <div className="flex flex-wrap gap-2">
            {CUISINE_OPTIONS.map((c) => (
              <Chip
                key={c}
                label={c}
                selected={(profile.cuisine_styles || []).includes(c)}
                onClick={() => {
                  const current = profile.cuisine_styles || []
                  const next = current.includes(c)
                    ? current.filter((x) => x !== c)
                    : [...current, c]
                  setProfile((p) => p ? { ...p, cuisine_styles: next } : p)
                  save({ cuisine_styles: (profile.cuisine_styles || []).includes(c)
                    ? (profile.cuisine_styles || []).filter((x) => x !== c)
                    : [...(profile.cuisine_styles || []), c]
                  })
                }}
              />
            ))}
          </div>
        </div>

        {/* Signature ingrediënten */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700">Signature ingrediënten</label>
          <TagInput
            value={profile.preferred_ingredients || []}
            onChange={(tags) => {
              setProfile((p) => p ? { ...p, preferred_ingredients: tags } : p)
              save({ preferred_ingredients: tags })
            }}
            suggestions={INGREDIENT_SUGGESTIONS}
            placeholder="bv. lavas, dashi, forelkaviaar..."
          />
        </div>

        {/* Favoriete technieken */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700">Favoriete technieken</label>
          <TagInput
            value={profile.preferred_techniques || []}
            onChange={(tags) => {
              setProfile((p) => p ? { ...p, preferred_techniques: tags } : p)
              save({ preferred_techniques: tags })
            }}
            suggestions={TECHNIQUE_SUGGESTIONS}
            placeholder="bv. à la plancha, conferen, fermenteren..."
          />
        </div>

        {/* Te vermijden */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700">Te vermijden ingrediënten</label>
          <TagInput
            value={profile.avoided_ingredients || []}
            onChange={(tags) => {
              setProfile((p) => p ? { ...p, avoided_ingredients: tags } : p)
              save({ avoided_ingredients: tags })
            }}
            placeholder="Ingrediënten die je vermijdt..."
          />
        </div>

        <button
          type="button"
          onClick={() => save({
            cooking_philosophy: profile.cooking_philosophy,
            cuisine_styles: profile.cuisine_styles,
            preferred_ingredients: profile.preferred_ingredients,
            preferred_techniques: profile.preferred_techniques,
            avoided_ingredients: profile.avoided_ingredients,
          })}
          disabled={saving}
          className="btn-primary w-full justify-center"
        >
          {saving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Opslaan...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Opslaan
            </>
          )}
        </button>
      </Section>

      {/* ── Stijlanalyse ── */}
      <div className="card p-6 space-y-5 animate-slide-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-semibold text-stone-900 text-lg">Stijlanalyse</h2>
            <p className="text-xs text-[#9E7E60] mt-0.5">AI-analyse op basis van jouw activiteit</p>
          </div>
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-medium rounded-xl transition-all disabled:opacity-50 border border-orange-200"
          >
            {analyzing ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {analyzing ? 'Analyseren...' : 'Heranalyseer mijn stijl'}
          </button>
        </div>

        {profile.style_analysis ? (
          <div className="space-y-4">
            {profile.style_analysis.style_summary && (
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                <p className="text-sm text-stone-700 italic leading-relaxed">
                  &ldquo;{profile.style_analysis.style_summary}&rdquo;
                </p>
              </div>
            )}

            {topIngredients.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[#B8997A] uppercase tracking-wide mb-2">
                  Meest gebruikt
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {topIngredients.map((i) => (
                    <span key={i} className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 text-xs font-medium">
                      {i}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {topTechniques.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[#B8997A] uppercase tracking-wide mb-2">
                  Top technieken
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {topTechniques.map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded-md bg-stone-200 text-stone-700 text-xs font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.style_analysis.last_updated && (
              <p className="text-xs text-[#9E7E60]">
                Laatste update:{' '}
                {new Date(profile.style_analysis.last_updated).toLocaleDateString('nl-BE', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-[#9E7E60] text-sm">
            <p>Nog geen stijlanalyse beschikbaar.</p>
            <p className="mt-1 text-xs">
              Klik op &ldquo;Heranalyseer mijn stijl&rdquo; om te beginnen.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
