'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChefHat,
  ArrowRight,
  ArrowLeft,
  Check,
  UtensilsCrossed,
  Coffee,
  CalendarDays,
  Truck,
  Sparkles,
  User,
  MapPin,
  Clock,
  Flame,
  BookOpen,
  Home,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const EXPERIENCE_LEVELS = [
  'Commis',
  'Demi-chef',
  'Chef de partie',
  'Sous-chef',
  'Chef-kok',
  'Executive chef',
  'Eigen zaak',
] as const

const CUISINES = [
  'Frans', 'Belgisch', 'Italiaans', 'Aziatisch', 'Nordisch', 'Modern',
  'Moleculair', 'Mediterraan', 'Japans', 'Mexicaans', 'Midden-Oosters', 'Plant-based',
] as const

const TECHNIQUES = [
  'Sous vide', 'Braiseren', 'Fermentatie', 'Patisserie', 'Grillen', 'Confijten',
  'Roken', 'Dehydrateren', 'Ceviche', 'Tempura', 'Emulsies', 'Gelificatie',
  'Garde manger', 'Boulangerie',
] as const

const KITCHEN_TYPES = [
  { value: 'restaurant', label: 'Restaurant', description: 'Vaste kaart, weekplanning', Icon: UtensilsCrossed },
  { value: 'brasserie', label: 'Brasserie', description: 'Mix vast + wisselend', Icon: Coffee },
  { value: 'catering', label: 'Catering', description: 'Event-driven, variabele volumes', Icon: CalendarDays },
  { value: 'foodtruck', label: 'Foodtruck', description: 'Klein menu, hoge turnover', Icon: Truck },
] as const

const kitchenDefaults: Record<string, object> = {
  restaurant: {
    mode: 'restaurant',
    food_cost_target_min: 28,
    food_cost_target_max: 32,
    default_portion_style: 'fixed',
    mep_style: 'weekly_planning',
    menu_structure: 'fixed_carte',
    features: ['dashboard', 'recipes', 'menu', 'ingredients', 'preparations', 'seasonal', 'mep', 'invoices', 'food_cost', 'jules_ai'],
    workflow: { primary_planning: 'weekly_menu', scaling: 'fixed_covers', invoice_cycle: 'weekly' },
  },
  brasserie: {
    mode: 'brasserie',
    food_cost_target_min: 26,
    food_cost_target_max: 30,
    default_portion_style: 'mixed',
    mep_style: 'weekly_planning',
    menu_structure: 'mixed_carte',
    features: ['dashboard', 'recipes', 'suggestions', 'ingredients', 'mep', 'invoices', 'food_cost', 'jules_ai'],
    workflow: { primary_planning: 'daily_suggestions', scaling: 'estimated_covers', invoice_cycle: 'weekly' },
  },
  catering: {
    mode: 'catering',
    food_cost_target_min: 25,
    food_cost_target_max: 30,
    default_portion_style: 'per_person',
    mep_style: 'per_event',
    menu_structure: 'per_event',
    features: ['dashboard', 'recipes', 'events', 'ingredients', 'preparations', 'seasonal', 'scan', 'suppliers', 'legende', 'mep', 'invoices', 'food_cost', 'jules_ai'],
    workflow: { primary_planning: 'event_based', scaling: 'per_event_pax', invoice_cycle: 'per_event' },
  },
  foodtruck: {
    mode: 'foodtruck',
    food_cost_target_min: 20,
    food_cost_target_max: 25,
    default_portion_style: 'fixed',
    mep_style: 'daily_planning',
    menu_structure: 'compact_carte',
    features: ['dashboard', 'recipes', 'ingredients', 'daily_prep', 'invoices', 'food_cost'],
    workflow: { primary_planning: 'daily_prep', scaling: 'estimated_sales', invoice_cycle: 'weekly' },
  },
}

const TOTAL_STEPS = 5

/* ------------------------------------------------------------------ */
/*  Reusable tiny components                                          */
/* ------------------------------------------------------------------ */

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 w-full max-w-xs mx-auto">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex-1 flex items-center gap-2">
          <div
            className={`h-2 rounded-full flex-1 transition-colors duration-300 ${
              i < current ? 'bg-amber-500' : i === current ? 'bg-amber-300' : 'bg-stone-200'
            }`}
          />
        </div>
      ))}
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
      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
        selected
          ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm'
          : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-100'
      }`}
    >
      {label}
    </button>
  )
}

function NavButtons({
  step,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  loading,
}: {
  step: number
  onBack: () => void
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
  loading?: boolean
}) {
  return (
    <div className="flex items-center justify-between pt-6 border-t border-stone-100 mt-6">
      {step > 0 ? (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-stone-500 hover:text-stone-700 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || loading}
        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-semibold transition-colors shadow-md shadow-orange-500/20"
      >
        {loading ? 'Opslaan...' : nextLabel ?? 'Volgende'}
        {!loading && <ArrowRight className="w-4 h-4" />}
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step components                                                   */
/* ------------------------------------------------------------------ */

function StepWelkom({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center space-y-6 py-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
        <ChefHat className="w-8 h-8 text-white" />
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-stone-800 font-[family-name:var(--font-outfit)]">
          Welkom bij My AI Sous Chef
        </h1>
        <p className="text-stone-500 max-w-md leading-relaxed">
          Jouw slimme keukenassistent die je helpt met receptontwikkeling,
          mise-en-place planning, food cost berekeningen en meer. Laten we
          eerst je profiel instellen zodat alles perfect op jou is afgestemd.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg pt-2">
        {[
          { Icon: BookOpen, text: 'Recepten beheren' },
          { Icon: Flame, text: 'Slimme suggesties' },
          { Icon: Sparkles, text: 'AI-gestuurde hulp' },
        ].map(({ Icon, text }) => (
          <div
            key={text}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-stone-50 border border-stone-100"
          >
            <Icon className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-medium text-stone-700">{text}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onNext}
        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-md shadow-orange-500/20 mt-2"
      >
        Laten we je profiel opzetten
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

function StepBasisgegevens({
  data,
  onChange,
  onBack,
  onNext,
}: {
  data: {
    displayName: string
    experienceLevel: string
    location: string
    yearsExperience: string
  }
  onChange: (field: string, value: string) => void
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-stone-800 font-[family-name:var(--font-outfit)]">
          Basisgegevens
        </h2>
        <p className="text-stone-500 text-sm">Vertel ons meer over jezelf als chef.</p>
      </div>

      <div className="space-y-4">
        {/* Display name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
            <User className="w-4 h-4 text-amber-600" />
            Weergavenaam
          </label>
          <input
            type="text"
            placeholder="Hoe wil je genoemd worden?"
            value={data.displayName}
            onChange={(e) => onChange('displayName', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
          />
        </div>

        {/* Experience level */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-amber-600" />
            Ervaringsniveau
          </label>
          <select
            value={data.experienceLevel}
            onChange={(e) => onChange('experienceLevel', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all appearance-none"
          >
            <option value="">Selecteer je niveau</option>
            {EXPERIENCE_LEVELS.map((level) => (
              <option key={level} value={level.toLowerCase()}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-600" />
            Locatie
            <span className="text-stone-400 font-normal">(optioneel)</span>
          </label>
          <input
            type="text"
            placeholder="bv. Amsterdam, Antwerpen, Gent..."
            value={data.location}
            onChange={(e) => onChange('location', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
          />
        </div>

        {/* Years of experience */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            Jaren ervaring
          </label>
          <input
            type="number"
            min={0}
            max={50}
            placeholder="0"
            value={data.yearsExperience}
            onChange={(e) => onChange('yearsExperience', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
          />
        </div>
      </div>

      <NavButtons
        step={1}
        onBack={onBack}
        onNext={onNext}
        nextDisabled={!data.displayName || !data.experienceLevel}
      />
    </div>
  )
}

function StepCulinaireStijl({
  cuisines,
  techniques,
  philosophy,
  onToggleCuisine,
  onToggleTechnique,
  onPhilosophyChange,
  onBack,
  onNext,
}: {
  cuisines: string[]
  techniques: string[]
  philosophy: string
  onToggleCuisine: (c: string) => void
  onToggleTechnique: (t: string) => void
  onPhilosophyChange: (v: string) => void
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-stone-800 font-[family-name:var(--font-outfit)]">
          Culinaire Stijl
        </h2>
        <p className="text-stone-500 text-sm">Wat definieert jou als chef?</p>
      </div>

      {/* Cuisines */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-stone-700">Keukenspecialiteiten</label>
        <div className="flex flex-wrap gap-2">
          {CUISINES.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={cuisines.includes(c)}
              onClick={() => onToggleCuisine(c)}
            />
          ))}
        </div>
      </div>

      {/* Techniques */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-stone-700">Signatuurtechnieken</label>
        <div className="flex flex-wrap gap-2">
          {TECHNIQUES.map((t) => (
            <Chip
              key={t}
              label={t}
              selected={techniques.includes(t)}
              onClick={() => onToggleTechnique(t)}
            />
          ))}
        </div>
      </div>

      {/* Philosophy */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-stone-700">Kookfilosofie</label>
        <textarea
          rows={3}
          placeholder="Beschrijf in 2-3 zinnen je culinaire visie..."
          value={philosophy}
          onChange={(e) => onPhilosophyChange(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all resize-none"
        />
      </div>

      <NavButtons step={2} onBack={onBack} onNext={onNext} />
    </div>
  )
}

function StepKeukenSetup({
  kitchenName,
  kitchenType,
  onNameChange,
  onTypeChange,
  onBack,
  onNext,
}: {
  kitchenName: string
  kitchenType: string
  onNameChange: (v: string) => void
  onTypeChange: (v: string) => void
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-stone-800 font-[family-name:var(--font-outfit)]">
          Keuken Setup
        </h2>
        <p className="text-stone-500 text-sm">Stel je eerste keuken in.</p>
      </div>

      {/* Kitchen name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
          <Home className="w-4 h-4 text-amber-600" />
          Keukennaam
        </label>
        <input
          type="text"
          placeholder="bv. Bistro de Markt, Mijn Keuken..."
          value={kitchenName}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
        />
      </div>

      {/* Kitchen type */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-stone-700">Type keuken</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {KITCHEN_TYPES.map(({ value, label, description, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onTypeChange(value)}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                kitchenType === value
                  ? 'border-amber-400 bg-amber-50 shadow-sm'
                  : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  kitchenType === value
                    ? 'bg-amber-500 text-white'
                    : 'bg-stone-100 text-stone-500'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-stone-800">{label}</p>
                <p className="text-xs text-stone-500 mt-0.5">{description}</p>
              </div>
              {kitchenType === value && (
                <Check className="w-5 h-5 text-amber-600 ml-auto shrink-0 mt-0.5" />
              )}
            </button>
          ))}
        </div>
      </div>

      <NavButtons
        step={3}
        onBack={onBack}
        onNext={onNext}
        nextDisabled={!kitchenName || !kitchenType}
      />
    </div>
  )
}

function StepKlaar({
  data,
  onBack,
  onFinish,
  loading,
}: {
  data: {
    displayName: string
    experienceLevel: string
    cuisines: string[]
    techniques: string[]
    kitchenName: string
    kitchenType: string
  }
  onBack: () => void
  onFinish: () => void
  loading: boolean
}) {
  const typeLabel = KITCHEN_TYPES.find((k) => k.value === data.kitchenType)?.label ?? data.kitchenType

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Check className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-stone-800 font-[family-name:var(--font-outfit)]">
          Alles klaar!
        </h2>
        <p className="text-stone-500 text-sm max-w-md">
          Hier is een overzicht van je profiel. Je kunt dit later altijd aanpassen.
        </p>
      </div>

      <div className="space-y-3">
        {/* Profile summary */}
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-100 space-y-2">
          <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
            <User className="w-4 h-4 text-amber-600" />
            Profiel
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-stone-500">Naam</span>
            <span className="text-stone-800 font-medium">{data.displayName}</span>
            <span className="text-stone-500">Niveau</span>
            <span className="text-stone-800 font-medium capitalize">{data.experienceLevel}</span>
          </div>
        </div>

        {/* Culinary summary */}
        {(data.cuisines.length > 0 || data.techniques.length > 0) && (
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100 space-y-2">
            <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-600" />
              Culinaire Stijl
            </h3>
            {data.cuisines.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {data.cuisines.map((c) => (
                  <span
                    key={c}
                    className="text-xs px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 font-medium"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
            {data.techniques.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {data.techniques.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2.5 py-1 rounded-md bg-orange-100 text-orange-800 font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Kitchen summary */}
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-100 space-y-2">
          <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
            <Home className="w-4 h-4 text-amber-600" />
            Keuken
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-stone-500">Naam</span>
            <span className="text-stone-800 font-medium">{data.kitchenName}</span>
            <span className="text-stone-500">Type</span>
            <span className="text-stone-800 font-medium">{typeLabel}</span>
          </div>
        </div>
      </div>

      <NavButtons
        step={4}
        onBack={onBack}
        onNext={onFinish}
        nextLabel="Ga naar je dashboard"
        loading={loading}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 2 — Basisgegevens
  const [displayName, setDisplayName] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [location, setLocation] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')

  // Step 3 — Culinaire Stijl
  const [cuisines, setCuisines] = useState<string[]>([])
  const [techniques, setTechniques] = useState<string[]>([])
  const [philosophy, setPhilosophy] = useState('')

  // Step 4 — Keuken Setup
  const [kitchenName, setKitchenName] = useState('')
  const [kitchenType, setKitchenType] = useState('')

  const toggleItem = useCallback(
    (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
      setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item])
    },
    [],
  )

  const handleBasisChange = useCallback((field: string, value: string) => {
    switch (field) {
      case 'displayName':
        setDisplayName(value)
        break
      case 'experienceLevel':
        setExperienceLevel(value)
        break
      case 'location':
        setLocation(value)
        break
      case 'yearsExperience':
        setYearsExperience(value)
        break
    }
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

      // Upsert chef profile
      const { data: profileData, error: profileError } = await supabase
        .from('chef_profiles')
        .upsert(
          {
            auth_user_id: user.id,
            display_name: displayName,
            experience_level: experienceLevel,
            location: location || null,
            years_experience: yearsExperience ? parseInt(yearsExperience, 10) : null,
            cuisine_specialties: cuisines,
            signature_techniques: techniques,
            cooking_philosophy: philosophy || null,
          },
          { onConflict: 'auth_user_id' },
        )
        .select('id')
        .single()

      if (profileError) throw profileError

      // Create kitchen
      const { data: kitchenData, error: kitchenError } = await supabase
        .from('kitchens')
        .insert({
          name: kitchenName,
          type: kitchenType,
          settings: kitchenDefaults[kitchenType] ?? {},
        })
        .select('id')
        .single()

      if (kitchenError) throw kitchenError

      // Link chef to kitchen as owner
      const { error: memberError } = await supabase.from('kitchen_members').insert({
        chef_id: profileData.id,
        kitchen_id: kitchenData.id,
        role: 'owner',
      })

      if (memberError) throw memberError

      router.push('/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Er ging iets mis bij het opslaan.'
      setError(message)
      setSaving(false)
    }
  }, [
    displayName,
    experienceLevel,
    location,
    yearsExperience,
    cuisines,
    techniques,
    philosophy,
    kitchenName,
    kitchenType,
    router,
  ])

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6">
        {/* Progress */}
        {step > 0 && step < TOTAL_STEPS - 1 && (
          <ProgressBar current={step} total={TOTAL_STEPS} />
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-stone-900/5 border border-stone-100 p-8 transition-all duration-300">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {step === 0 && <StepWelkom onNext={() => setStep(1)} />}

          {step === 1 && (
            <StepBasisgegevens
              data={{ displayName, experienceLevel, location, yearsExperience }}
              onChange={handleBasisChange}
              onBack={() => setStep(0)}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <StepCulinaireStijl
              cuisines={cuisines}
              techniques={techniques}
              philosophy={philosophy}
              onToggleCuisine={(c) => toggleItem(cuisines, setCuisines, c)}
              onToggleTechnique={(t) => toggleItem(techniques, setTechniques, t)}
              onPhilosophyChange={setPhilosophy}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <StepKeukenSetup
              kitchenName={kitchenName}
              kitchenType={kitchenType}
              onNameChange={setKitchenName}
              onTypeChange={setKitchenType}
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
            />
          )}

          {step === 4 && (
            <StepKlaar
              data={{
                displayName,
                experienceLevel,
                cuisines,
                techniques,
                kitchenName,
                kitchenType,
              }}
              onBack={() => setStep(3)}
              onFinish={handleFinish}
              loading={saving}
            />
          )}
        </div>

        {/* Step label */}
        {step > 0 && step < TOTAL_STEPS - 1 && (
          <p className="text-center text-xs text-stone-400">
            Stap {step} van {TOTAL_STEPS - 2}
          </p>
        )}
      </div>
    </div>
  )
}
