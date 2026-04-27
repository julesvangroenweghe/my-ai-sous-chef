'use client'

import { useState, useCallback, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const ROLES = [
  'Commis',
  'Chef de Partie',
  'Sous Chef',
  'Head Chef',
  'Executive Chef',
  'Zelfstandig Chef',
  'Student',
] as const

const KITCHEN_TYPES = [
  'Restaurant',
  'Brasserie',
  'Catering',
  'Foodtruck',
  'Hotel',
  'Andere',
] as const

const CUISINE_OPTIONS = [
  'Belgisch-Frans',
  'Japans',
  'Italiaans',
  'Baskisch',
  'Scandinavisch',
  'Aziatisch-fusie',
  'Midden-Oosten',
  'Spaans',
  'Mexicaans',
  'Nordic',
  'Klassiek Frans',
  'Modern Europees',
] as const

const INGREDIENT_SUGGESTIONS = [
  'lavas', 'dashi', 'forelkaviaar', 'nduja', 'miso', 'truffel',
  'bottarga', 'bonito', 'yuzu', 'sumak', 'harissa', 'kampot peper',
]

const TECHNIQUE_SUGGESTIONS = [
  'à la plancha', 'conferen', 'gepekeld', 'fermenteren',
  'dashi bouillon', 'sous vide', 'roken', 'emulsie', 'braiseren', 'dehydrateren',
]

const TOTAL_STEPS = 5

/* ------------------------------------------------------------------ */
/*  Reusable components                                                 */
/* ------------------------------------------------------------------ */

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="w-full max-w-lg mx-auto mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#9E7E60] font-medium">
          Stap {current} van {total}
        </span>
        <span className="text-xs text-[#9E7E60]">
          {Math.round((current / total) * 100)}%
        </span>
      </div>
      <div className="h-1 bg-stone-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-500"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  )
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
        selected
          ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-sm'
          : 'bg-stone-50 border-stone-200 text-[#5C4730] hover:border-stone-300 hover:bg-stone-100'
      }`}
    >
      {label}
    </button>
  )
}

function TagEditor({
  tags,
  onAdd,
  onRemove,
  placeholder,
  suggestions,
  max,
}: {
  tags: string[]
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
  placeholder: string
  suggestions?: string[]
  max: number
}) {
  const [input, setInput] = useState('')

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault()
      if (tags.length < max && !tags.includes(input.trim())) {
        onAdd(input.trim())
        setInput('')
      }
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onRemove(tags[tags.length - 1])
    }
  }

  return (
    <div className="space-y-2">
      <div
        className="flex flex-wrap gap-1.5 min-h-[44px] w-full rounded-xl border border-stone-200 bg-white px-3 py-2"
        onClick={(e) => {
          const input = (e.currentTarget as HTMLDivElement).querySelector('input')
          input?.focus()
        }}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(tag)
              }}
              className="hover:text-amber-950 transition-colors leading-none"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </span>
        ))}
        {tags.length < max && (
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-stone-800 placeholder:text-[#9E7E60]"
          />
        )}
      </div>
      {suggestions && suggestions.length > 0 && (
        <p className="text-xs text-[#9E7E60]">
          Suggesties: {suggestions.slice(0, 5).join(', ')}...
        </p>
      )}
      <p className="text-xs text-[#9E7E60]">
        {tags.length}/{max} toegevoegd — druk Enter om toe te voegen
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Steps                                                               */
/* ------------------------------------------------------------------ */

function StepWelkom({
  displayName,
  yearsExperience,
  currentRole,
  onDisplayName,
  onYears,
  onRole,
  onNext,
}: {
  displayName: string
  yearsExperience: string
  currentRole: string
  onDisplayName: (v: string) => void
  onYears: (v: string) => void
  onRole: (v: string) => void
  onNext: () => void
}) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-3">
        <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center mb-6">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-stone-800 tracking-tight">
          Welkom bij My AI Sous Chef
        </h1>
        <p className="text-[#B8997A] leading-relaxed">
          Laten we jouw kookstijl leren kennen zodat de AI echt voor{' '}
          <em>jóu</em> werkt.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700">
            Hoe wil je aangesproken worden?
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => onDisplayName(e.target.value)}
            placeholder="Chef Jules..."
            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder:text-[#9E7E60] focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700">
            Hoeveel jaar ervaring?
          </label>
          <input
            type="number"
            min={0}
            max={50}
            value={yearsExperience}
            onChange={(e) => onYears(e.target.value)}
            placeholder="0"
            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder:text-[#9E7E60] focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700">
            Jouw rol
          </label>
          <select
            value={currentRole}
            onChange={(e) => onRole(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all appearance-none"
          >
            <option value="">Selecteer je rol...</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          type="button"
          onClick={onNext}
          disabled={!displayName.trim() || !currentRole}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-semibold transition-colors shadow-md shadow-amber-500/20"
        >
          Volgende
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

function StepKeukenFilosofie({
  kitchenType,
  philosophy,
  onKitchenType,
  onPhilosophy,
  onBack,
  onNext,
}: {
  kitchenType: string
  philosophy: string
  onKitchenType: (v: string) => void
  onPhilosophy: (v: string) => void
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-stone-800 tracking-tight">
          Jouw keuken
        </h2>
        <p className="text-[#B8997A] text-sm mt-1">
          Wat is jouw werkomgeving?
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-stone-700">
          Wat voor keuken werk je in?
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {KITCHEN_TYPES.map((kt) => (
            <button
              key={kt}
              type="button"
              onClick={() => onKitchenType(kt.toLowerCase())}
              className={`px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-all duration-150 ${
                kitchenType === kt.toLowerCase()
                  ? 'border-amber-400 bg-amber-50 text-amber-900 shadow-sm'
                  : 'border-stone-200 bg-white text-[#5C4730] hover:border-stone-300'
              }`}
            >
              {kt}
              {kitchenType === kt.toLowerCase() && (
                <svg
                  className="w-4 h-4 text-amber-500 inline ml-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-stone-700">
          Jouw kookfilosofie in één zin
        </label>
        <textarea
          value={philosophy}
          onChange={(e) => {
            if (e.target.value.length <= 150) onPhilosophy(e.target.value)
          }}
          placeholder="Wat drijft je in de keuken? Hoe kijk jij naar voedsel?"
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder:text-[#9E7E60] focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all resize-none"
        />
        <p className="text-xs text-[#9E7E60] text-right">
          {philosophy.length}/150
        </p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-stone-100">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-[#B8997A] hover:text-stone-700 transition-colors font-medium"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Terug
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors shadow-md shadow-amber-500/20"
        >
          Volgende
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

function StepCulinaire({
  selected,
  onToggle,
  onBack,
  onNext,
}: {
  selected: string[]
  onToggle: (c: string) => void
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-stone-800 tracking-tight">
          Culinaire invloeden
        </h2>
        <p className="text-[#B8997A] text-sm mt-1">
          Welke keukens inspireren je? Kies maximaal 5.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CUISINE_OPTIONS.map((c) => (
          <Chip
            key={c}
            label={c}
            selected={selected.includes(c)}
            onClick={() => {
              if (!selected.includes(c) && selected.length >= 5) return
              onToggle(c)
            }}
          />
        ))}
      </div>
      {selected.length >= 5 && (
        <p className="text-xs text-amber-600">
          Maximum van 5 keukens bereikt.
        </p>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-stone-100">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-[#B8997A] hover:text-stone-700 transition-colors font-medium"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Terug
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors shadow-md shadow-amber-500/20"
        >
          Volgende
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

function StepIngredientenTechnieken({
  ingredients,
  techniques,
  onAddIngredient,
  onRemoveIngredient,
  onAddTechnique,
  onRemoveTechnique,
  onBack,
  onNext,
}: {
  ingredients: string[]
  techniques: string[]
  onAddIngredient: (v: string) => void
  onRemoveIngredient: (v: string) => void
  onAddTechnique: (v: string) => void
  onRemoveTechnique: (v: string) => void
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-stone-800 tracking-tight">
          Jouw signatuur
        </h2>
        <p className="text-[#B8997A] text-sm mt-1">
          Wat zijn jouw go-to ingrediënten en technieken?
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-stone-700">
          Jouw go-to ingrediënten
        </label>
        <TagEditor
          tags={ingredients}
          onAdd={onAddIngredient}
          onRemove={onRemoveIngredient}
          placeholder="Type en druk Enter..."
          suggestions={INGREDIENT_SUGGESTIONS}
          max={10}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-stone-700">
          Technieken die je het meest gebruikt
        </label>
        <TagEditor
          tags={techniques}
          onAdd={onAddTechnique}
          onRemove={onRemoveTechnique}
          placeholder="Type en druk Enter..."
          suggestions={TECHNIQUE_SUGGESTIONS}
          max={10}
        />
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-stone-100">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-[#B8997A] hover:text-stone-700 transition-colors font-medium"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Terug
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors shadow-md shadow-amber-500/20"
        >
          Bijna klaar
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

function StepKlaar({
  displayName,
  yearsExperience,
  currentRole,
  kitchenType,
  philosophy,
  cuisines,
  ingredients,
  techniques,
  onBack,
  onFinish,
  loading,
  error,
}: {
  displayName: string
  yearsExperience: string
  currentRole: string
  kitchenType: string
  philosophy: string
  cuisines: string[]
  ingredients: string[]
  techniques: string[]
  onBack: () => void
  onFinish: () => void
  loading: boolean
  error: string | null
}) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-stone-800 tracking-tight">
          Jouw profiel is klaar.
        </h2>
        <p className="text-[#B8997A] text-sm">
          Hier is een overzicht van wat je hebt ingevuld.
        </p>
      </div>

      <div className="space-y-3 text-sm">
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-100 space-y-1">
          <p className="font-semibold text-stone-700 text-xs uppercase tracking-wide mb-2">
            Profiel
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-[#B8997A]">Naam</span>
            <span className="text-stone-800 font-medium">{displayName}</span>
            <span className="text-[#B8997A]">Rol</span>
            <span className="text-stone-800 font-medium">{currentRole}</span>
            {yearsExperience && (
              <>
                <span className="text-[#B8997A]">Ervaring</span>
                <span className="text-stone-800 font-medium">
                  {yearsExperience} jaar
                </span>
              </>
            )}
            {kitchenType && (
              <>
                <span className="text-[#B8997A]">Keukentype</span>
                <span className="text-stone-800 font-medium capitalize">
                  {kitchenType}
                </span>
              </>
            )}
          </div>
        </div>

        {philosophy && (
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
            <p className="font-semibold text-stone-700 text-xs uppercase tracking-wide mb-2">
              Filosofie
            </p>
            <p className="text-stone-700 italic">&ldquo;{philosophy}&rdquo;</p>
          </div>
        )}

        {cuisines.length > 0 && (
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
            <p className="font-semibold text-stone-700 text-xs uppercase tracking-wide mb-2">
              Culinaire invloeden
            </p>
            <div className="flex flex-wrap gap-1.5">
              {cuisines.map((c) => (
                <span
                  key={c}
                  className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 text-xs font-medium"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {(ingredients.length > 0 || techniques.length > 0) && (
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100 space-y-3">
            {ingredients.length > 0 && (
              <div>
                <p className="font-semibold text-stone-700 text-xs uppercase tracking-wide mb-2">
                  Ingrediënten
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ingredients.map((i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 text-xs font-medium"
                    >
                      {i}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {techniques.length > 0 && (
              <div>
                <p className="font-semibold text-stone-700 text-xs uppercase tracking-wide mb-2">
                  Technieken
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {techniques.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-md bg-stone-200 text-stone-700 text-xs font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-stone-100">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex items-center gap-2 text-[#B8997A] hover:text-stone-700 transition-colors font-medium disabled:opacity-40"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Terug
        </button>
        <button
          type="button"
          onClick={onFinish}
          disabled={loading}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-semibold transition-colors shadow-md shadow-amber-500/20"
        >
          {loading ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Opslaan...
            </>
          ) : (
            <>
              Start met koken
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                           */
/* ------------------------------------------------------------------ */

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 0
  const [displayName, setDisplayName] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')
  const [currentRole, setCurrentRole] = useState('')

  // Step 1
  const [kitchenType, setKitchenType] = useState('')
  const [philosophy, setPhilosophy] = useState('')

  // Step 2
  const [cuisines, setCuisines] = useState<string[]>([])

  // Step 3
  const [ingredients, setIngredients] = useState<string[]>([])
  const [techniques, setTechniques] = useState<string[]>([])

  const toggleCuisine = useCallback((c: string) => {
    setCuisines((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    )
  }, [])

  const handleFinish = useCallback(async () => {
    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Niet ingelogd')

      // Build style_analysis
      const styleAnalysis = {
        signature_techniques: techniques,
        preferred_ingredients: ingredients,
        cuisine_influences: cuisines,
        cooking_philosophy: philosophy,
        avoid_ingredients: [] as string[],
        style_summary:
          `${displayName} is een ${currentRole}${yearsExperience ? ` met ${yearsExperience} jaar ervaring` : ''}, ` +
          `gespecialiseerd in ${cuisines.length > 0 ? cuisines.slice(0, 2).join(' en ') : 'diverse keukens'}` +
          `${techniques.length > 0 ? ` met focus op ${techniques.slice(0, 2).join(' en ')}` : ''}.`,
        confidence: 'onboarding',
        last_updated: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('chef_profiles')
        .upsert(
          {
            auth_user_id: user.id,
            display_name: displayName,
            years_experience: yearsExperience
              ? parseInt(yearsExperience, 10)
              : null,
            current_role: currentRole,
            kitchen_type: kitchenType || null,
            cooking_philosophy: philosophy || null,
            cuisine_styles: cuisines,
            preferred_ingredients: ingredients,
            preferred_techniques: techniques,
            style_analysis: styleAnalysis,
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'auth_user_id' },
        )

      if (updateError) throw updateError

      router.push('/dashboard')
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Er ging iets mis bij het opslaan.'
      setError(msg)
      setSaving(false)
    }
  }, [
    displayName,
    yearsExperience,
    currentRole,
    kitchenType,
    philosophy,
    cuisines,
    ingredients,
    techniques,
    router,
  ])

  const stepContent = [
    <StepWelkom
      key="welkom"
      displayName={displayName}
      yearsExperience={yearsExperience}
      currentRole={currentRole}
      onDisplayName={setDisplayName}
      onYears={setYearsExperience}
      onRole={setCurrentRole}
      onNext={() => setStep(1)}
    />,
    <StepKeukenFilosofie
      key="keuken"
      kitchenType={kitchenType}
      philosophy={philosophy}
      onKitchenType={setKitchenType}
      onPhilosophy={setPhilosophy}
      onBack={() => setStep(0)}
      onNext={() => setStep(2)}
    />,
    <StepCulinaire
      key="culinaire"
      selected={cuisines}
      onToggle={toggleCuisine}
      onBack={() => setStep(1)}
      onNext={() => setStep(3)}
    />,
    <StepIngredientenTechnieken
      key="ingredienten"
      ingredients={ingredients}
      techniques={techniques}
      onAddIngredient={(v) => setIngredients((p) => [...p, v])}
      onRemoveIngredient={(v) =>
        setIngredients((p) => p.filter((x) => x !== v))
      }
      onAddTechnique={(v) => setTechniques((p) => [...p, v])}
      onRemoveTechnique={(v) =>
        setTechniques((p) => p.filter((x) => x !== v))
      }
      onBack={() => setStep(2)}
      onNext={() => setStep(4)}
    />,
    <StepKlaar
      key="klaar"
      displayName={displayName}
      yearsExperience={yearsExperience}
      currentRole={currentRole}
      kitchenType={kitchenType}
      philosophy={philosophy}
      cuisines={cuisines}
      ingredients={ingredients}
      techniques={techniques}
      onBack={() => setStep(3)}
      onFinish={handleFinish}
      loading={saving}
      error={error}
    />,
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {step > 0 && step < TOTAL_STEPS && (
          <ProgressBar current={step} total={TOTAL_STEPS - 1} />
        )}

        <div className="bg-white rounded-2xl shadow-xl shadow-stone-900/5 border border-stone-100 p-8">
          {stepContent[step]}
        </div>
      </div>
    </div>
  )
}
