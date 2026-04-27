'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ChefHat, Loader2, Sparkles, Users, Euro, Calendar,
  RefreshCw, Save, ChevronRight, ChevronLeft, Check,
  Leaf, Star, Lightbulb, AlertCircle, Wand2, X
} from 'lucide-react'

const EVENT_TYPES = [
  { value: 'walking_dinner', label: 'Walking Dinner' },
  { value: 'sit_down', label: 'Sit-down' },
  { value: 'buffet', label: 'Buffet' },
  { value: 'cocktail', label: 'Cocktail' },
  { value: 'tasting', label: 'Tasting' },
  { value: 'brunch', label: 'Brunch' },
  { value: 'daily_service', label: 'Dagmenu' },
]

const ALLERGY_OPTIONS = [
  { value: 'glutenvrij', label: 'Glutenvrij' },
  { value: 'lactosevrij', label: 'Lactosevrij' },
  { value: 'vegetarisch', label: 'Vegetarisch' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'noten', label: 'Notenallergie' },
]

const COURSE_OPTIONS = [
  { value: 'AMUSE', label: 'Amuse-bouche' },
  { value: 'FINGERFOOD', label: 'Fingerfood / Fingerbites' },
  { value: 'VOORGERECHT', label: 'Voorgerecht' },
  { value: 'TUSSENGERECHT', label: 'Tussengerecht' },
  { value: 'HOOFDGERECHT', label: 'Hoofdgerecht' },
  { value: 'KAAS', label: 'Kaas' },
  { value: 'DESSERT', label: 'Dessert' },
  { value: 'MIGNARDISES', label: 'Mignardises' },
]

const STYLE_OPTIONS = ['Modern', 'Seizoensgebonden', 'Klassiek', 'Fusion']

const LOADING_MESSAGES = [
  'Seizoenskalender raadplegen...',
  'Jouw recepten analyseren...',
  'LEGENDE gerechten doorzoeken...',
  'Food cost berekenen...',
  'Menu samenstellen...',
]

const SOURCE_BADGES: Record<string, { label: string; className: string }> = {
  own_recipe: { label: 'Jouw recept', className: 'bg-brand-500/20 text-brand-300 border border-brand-500/30' },
  legende: { label: 'LEGENDE', className: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
  new: { label: 'Nieuw voorstel', className: 'bg-[#FDF8F2] text-[#5C4730] border border-[#D4B896]' },
}

interface MenuItem {
  name: string
  description: string
  source: 'own_recipe' | 'legende' | 'new'
  recipe_id: string | null
  legende_id: string | null
  classical_reference: string | null
  key_ingredients: string[]
  seasonal_highlights: string[]
  estimated_cost_pp: number
  notes: string
}

interface MenuCourse {
  course: string
  course_label: string
  items: MenuItem[]
}

interface GeneratedMenu {
  menu: MenuCourse[]
  total_estimated_cost_pp: number
  total_food_cost_pct: number
  chef_note: string
  seasonal_score?: number
  event_type: string
  num_persons: number
  price_per_person: number
  food_cost_target: number
  date: string
  courses: string[]
  allergies: string[]
  style: string
  own_recipe_count?: number
  legende_count?: number
}

// SVG icons for feedback (no emoji)
function ThumbUp({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
      />
    </svg>
  )
}

function ThumbDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.484.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
      />
    </svg>
  )
}

export default function MenuBuilderPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)

  // Step 1 state
  const [eventType, setEventType] = useState('walking_dinner')
  const [numPersons, setNumPersons] = useState(50)
  const [eventDate, setEventDate] = useState('')
  const [pricePerPerson, setPricePerPerson] = useState(65)
  const [foodCostTarget, setFoodCostTarget] = useState(30)
  const [allergies, setAllergies] = useState<string[]>([])
  const [clientNotes, setClientNotes] = useState('')

  // Step 2 state
  const [selectedCourses, setSelectedCourses] = useState<string[]>(['AMUSE', 'HOOFDGERECHT', 'DESSERT'])
  const [menuStyle, setMenuStyle] = useState('Modern')
  const [hint, setHint] = useState('')

  // Step 3 state
  const [generating, setGenerating] = useState(false)
  const [generatedMenu, setGeneratedMenu] = useState<GeneratedMenu | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Hertaal state
  const [hertaalItem, setHertaalItem] = useState<string | null>(null)
  const [hertaalResult, setHertaalResult] = useState<Record<string, string>>({})
  const [hertaalLoading, setHertaalLoading] = useState<string | null>(null)

  const hertaalGerecht = async (item: MenuItem, key: string) => {
    if (hertaalResult[key]) { setHertaalItem(k => k === key ? null : key); return }
    setHertaalItem(key)
    setHertaalLoading(key)
    try {
      const res = await fetch('/api/jules/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Hertaal dit gerecht in mijn stijl (Belgisch-Frans + Japans umami, comfort-elegantie):\n\nGerecht: \${item.name}\nBeschrijving: \${item.description}\nHoofdbestanddelen: \${(item.key_ingredients || []).join(', ')}\n\nGeef een concrete hertaling in 2-3 zinnen: upgrade het hoofdingrediënt, moderniseer de saus/techniek, voeg een umami-laag toe en balanceer met een zuur-accent. Eindig met een korte MEP-tip.`
          }]
        })
      })
      const data = await res.json()
      const result = data.response || data.content || data.message || ''
      setHertaalResult(prev => ({ ...prev, [key]: result }))
    } catch { setHertaalResult(prev => ({ ...prev, [key]: 'Kon niet hertalen. Probeer opnieuw.' })) }
    setHertaalLoading(null)
  }

  // Feedback state: key = `\${courseIdx}-\${itemIdx}`, value = 'liked' | 'disliked'
  const [feedback, setFeedback] = useState<Record<string, 'liked' | 'disliked'>>({})

  const toggleAllergy = (val: string) => {
    setAllergies(prev => prev.includes(val) ? prev.filter(a => a !== val) : [...prev, val])
  }

  const toggleCourse = (val: string) => {
    setSelectedCourses(prev => prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val])
  }

  const generateMenu = async () => {
    setGenerating(true)
    setGenError(null)
    setGeneratedMenu(null)
    setFeedback({})

    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length
      setLoadingMsgIdx(idx)
    }, 1800)

    try {
      const res = await fetch('/api/menu-builder/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          num_persons: numPersons,
          price_per_person: pricePerPerson,
          food_cost_target: foodCostTarget,
          date: eventDate || undefined,
          allergies,
          courses: selectedCourses,
          style: menuStyle,
          hint: clientNotes ? `${hint} | Klantnotities: ${clientNotes}` : hint,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Onbekende fout')
      }

      const data = await res.json()
      setGeneratedMenu(data)
      setStep(3)
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Fout bij genereren')
    } finally {
      clearInterval(interval)
      setGenerating(false)
    }
  }

  const trackFeedback = async (
    dishName: string,
    eventType: 'suggestion_liked' | 'suggestion_disliked',
    key: string,
  ) => {
    const newFeedbackVal = eventType === 'suggestion_liked' ? 'liked' : 'disliked'
    setFeedback((prev) => ({ ...prev, [key]: newFeedbackVal }))

    try {
      await fetch('/api/profile/track-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          entity_name: dishName,
          metadata: { source: 'menu_builder' },
        }),
      })
    } catch {
      // Silently ignore tracking errors
    }
  }

  const saveAsEvent = async () => {
    if (!generatedMenu) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Niet ingelogd')

      const { data: memberData } = await supabase
        .from('kitchen_members')
        .select('kitchen_id')
        .eq('user_id', user.id)
        .single()

      const kitchenId = memberData?.kitchen_id

      const eventName = `Menu ${generatedMenu.date || new Date().toISOString().slice(0, 10)} - ${generatedMenu.num_persons}p`

      const { data: newEvent, error: eventError } = await supabase
        .from('events')
        .insert({
          kitchen_id: kitchenId,
          name: eventName,
          event_date: generatedMenu.date || new Date().toISOString().slice(0, 10),
          event_type: generatedMenu.event_type,
          num_persons: generatedMenu.num_persons,
          price_per_person: generatedMenu.price_per_person,
          status: 'draft',
          notes: `Gegenereerd door AI Menu Builder\nStijl: ${generatedMenu.style}\nFood cost target: ${generatedMenu.food_cost_target}%`,
        })
        .select('id')
        .single()

      if (eventError || !newEvent) throw new Error('Kon event niet aanmaken')

      const courseOrder: Record<string, number> = {
        AMUSE: 0, FINGERFOOD: 0, VOORGERECHT: 1, TUSSENGERECHT: 2,
        HOOFDGERECHT: 3, KAAS: 4, DESSERT: 5, MIGNARDISES: 6,
      }

      const menuItemsToInsert = generatedMenu.menu.flatMap(course =>
        course.items
          .filter(item => item.recipe_id)
          .map(item => ({
            event_id: newEvent.id,
            recipe_id: item.recipe_id,
            course_order: courseOrder[course.course] ?? 3,
            course: course.course_label,
          }))
      )

      if (menuItemsToInsert.length > 0) {
        await supabase.from('event_menu_items').insert(menuItemsToInsert)
      }

      router.push(`/events/${newEvent.id}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fout bij opslaan')
    } finally {
      setSaving(false)
    }
  }

  const maxFoodCost = ((pricePerPerson * foodCostTarget) / 100).toFixed(2)

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-[#2C1810]" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-extrabold text-[#2C1810]">AI Menu Builder</h1>
          <p className="text-[#9E7E60] text-sm">Stel een gepersonaliseerd menu samen met AI</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-3">
        {[
          { n: 1, label: 'Klantinfo' },
          { n: 2, label: 'Menustructuur' },
          { n: 3, label: 'Resultaat' },
        ].map(({ n, label }) => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              step === n ? 'bg-brand-600 text-[#2C1810]'
              : step > n ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-white text-[#B8997A]'
            }`}>
              {step > n ? <Check className="w-4 h-4" /> : n}
            </div>
            <span className={`text-sm font-medium ${step === n ? 'text-[#2C1810]' : 'text-[#B8997A]'}`}>{label}</span>
            {n < 3 && <ChevronRight className="w-4 h-4 text-[#5C4730]" />}
          </div>
        ))}
      </div>

      {/* STEP 1: Klantinfo */}
      {step === 1 && (
        <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-display font-semibold text-[#2C1810]">Klant & Event informatie</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-[#9E7E60] font-medium">Evenementtype</label>
              <select
                value={eventType}
                onChange={e => setEventType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E8D5B5] rounded-lg text-[#3D2810] text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#9E7E60] font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Datum evenement
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E8D5B5] rounded-lg text-[#3D2810] text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#9E7E60] font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Aantal personen
              </label>
              <input
                type="number"
                min={1}
                value={numPersons}
                onChange={e => setNumPersons(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-[#E8D5B5] rounded-lg text-[#3D2810] text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#9E7E60] font-medium flex items-center gap-1.5">
                <Euro className="w-3.5 h-3.5" /> Verkoopprijs per persoon
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={pricePerPerson}
                onChange={e => setPricePerPerson(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-[#E8D5B5] rounded-lg text-[#3D2810] text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Food cost slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-[#9E7E60] font-medium">Target food cost %</label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-bold text-brand-400">{foodCostTarget}%</span>
                <span className="text-xs text-[#B8997A]">= max €{maxFoodCost}/p</span>
              </div>
            </div>
            <input
              type="range"
              min={20}
              max={40}
              value={foodCostTarget}
              onChange={e => setFoodCostTarget(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-xs text-[#5C4730]">
              <span>20%</span>
              <span>30%</span>
              <span>40%</span>
            </div>
          </div>

          {/* Allergies */}
          <div className="space-y-2">
            <label className="text-xs text-[#9E7E60] font-medium">Allergieën / dieetwensen</label>
            <div className="flex flex-wrap gap-2">
              {ALLERGY_OPTIONS.map(a => (
                <button
                  key={a.value}
                  onClick={() => toggleAllergy(a.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    allergies.includes(a.value)
                      ? 'bg-red-500/20 text-red-300 border-red-500/40'
                      : 'bg-white text-[#9E7E60] border-[#E8D5B5] hover:border-[#D4B896]'
                  }`}
                >
                  {allergies.includes(a.value) && <Check className="w-3 h-3 inline mr-1" />}
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Client notes */}
          <div className="space-y-1.5">
            <label className="text-xs text-[#9E7E60] font-medium">Klantnotities (optioneel)</label>
            <textarea
              value={clientNotes}
              onChange={e => setClientNotes(e.target.value)}
              rows={3}
              placeholder="Speciale wensen, thema, budget opmerkingen..."
              className="w-full px-3 py-2 bg-white border border-[#E8D5B5] rounded-lg text-[#3D2810] text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-[#2C1810] font-medium rounded-xl transition-all"
            >
              Volgende <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Menu structuur */}
      {step === 2 && (
        <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-display font-semibold text-[#2C1810]">Menustructuur</h2>

          <div className="space-y-2">
            <label className="text-xs text-[#9E7E60] font-medium">Verloop avond — selecteer gangen</label>
            <div className="grid grid-cols-2 gap-2">
              {COURSE_OPTIONS.map(c => (
                <button
                  key={c.value}
                  onClick={() => toggleCourse(c.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left ${
                    selectedCourses.includes(c.value)
                      ? 'bg-brand-600/20 text-brand-300 border-brand-500/40'
                      : 'bg-white text-[#9E7E60] border-[#E8D5B5] hover:border-[#D4B896]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    selectedCourses.includes(c.value)
                      ? 'bg-brand-500 border-brand-400'
                      : 'border-[#D4B896]'
                  }`}>
                    {selectedCourses.includes(c.value) && <Check className="w-2.5 h-2.5 text-[#2C1810]" />}
                  </div>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div className="space-y-2">
            <label className="text-xs text-[#9E7E60] font-medium">Stijl</label>
            <div className="flex gap-2 flex-wrap">
              {STYLE_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setMenuStyle(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    menuStyle === s
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-white text-[#9E7E60] border-[#E8D5B5] hover:border-[#D4B896]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Hint */}
          <div className="space-y-1.5">
            <label className="text-xs text-[#9E7E60] font-medium flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" /> AI-hint (optioneel)
            </label>
            <input
              type="text"
              value={hint}
              onChange={e => setHint(e.target.value)}
              placeholder="Wat wil je uitdrukken met dit menu?"
              className="w-full px-3 py-2 bg-white border border-[#E8D5B5] rounded-lg text-[#3D2810] text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-[#FDF8F2] text-[#5C4730] font-medium rounded-xl transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Terug
            </button>
            <button
              onClick={generateMenu}
              disabled={selectedCourses.length === 0 || generating}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-[#2C1810] font-medium rounded-xl transition-all disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {LOADING_MESSAGES[loadingMsgIdx]}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Menu Genereren
                </>
              )}
            </button>
          </div>

          {genError && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {genError}
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Generated Menu */}
      {step === 3 && generatedMenu && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-xl p-4">
              <div className="text-xs text-[#B8997A] mb-1">Food cost/p</div>
              <div className="text-lg font-mono font-bold text-[#3D2810]">
                €{generatedMenu.total_estimated_cost_pp?.toFixed(2) || '—'}
              </div>
            </div>
            <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-xl p-4">
              <div className="text-xs text-[#B8997A] mb-1">Food cost %</div>
              <div className={`text-lg font-mono font-bold ${
                (generatedMenu.total_food_cost_pct || 0) <= generatedMenu.food_cost_target
                  ? 'text-emerald-400' : 'text-amber-700'
              }`}>
                {generatedMenu.total_food_cost_pct?.toFixed(1) || '—'}%
              </div>
            </div>
            <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-xl p-4">
              <div className="text-xs text-[#B8997A] mb-1">Target</div>
              <div className="text-lg font-mono font-bold text-[#9E7E60]">{generatedMenu.food_cost_target}%</div>
            </div>
          </div>

          {/* Library context */}
          {(generatedMenu.own_recipe_count !== undefined || generatedMenu.legende_count !== undefined) && (
            <div className="flex flex-wrap gap-2 text-xs text-[#B8997A]">
              {generatedMenu.own_recipe_count !== undefined && (
                <span className="flex items-center gap-1 px-2 py-1 bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400 inline-block"></span>
                  {generatedMenu.own_recipe_count} eigen recepten geanalyseerd
                </span>
              )}
              {generatedMenu.legende_count !== undefined && (
                <span className="flex items-center gap-1 px-2 py-1 bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                  {generatedMenu.legende_count} LEGENDE gerechten geanalyseerd
                </span>
              )}
              {generatedMenu.seasonal_score !== undefined && (
                <span className="flex items-center gap-1 px-2 py-1 bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                  Seizoensscore: {generatedMenu.seasonal_score}%
                </span>
              )}
            </div>
          )}

          {/* Chef note */}
          {generatedMenu.chef_note && (
            <div className="flex gap-3 p-4 bg-brand-500/10 border border-brand-500/20 rounded-xl">
              <ChefHat className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
              <p className="text-brand-300 text-sm">{generatedMenu.chef_note}</p>
            </div>
          )}

          {/* Menu courses */}
          <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E8D5B5]">
              <h2 className="text-lg font-display font-semibold text-[#2C1810]">Gegenereerd menu</h2>
            </div>
            <div className="divide-y divide-[#E8D5B5]/50">
              {generatedMenu.menu?.map((course, ci) => (
                <div key={ci}>
                  <div className="px-6 py-3 bg-white/30">
                    <span className="text-xs font-medium text-[#9E7E60] uppercase tracking-wider">
                      {course.course_label}
                    </span>
                  </div>
                  {course.items?.map((item, ii) => {
                    const fbKey = `${ci}-${ii}`
                    const fb = feedback[fbKey]
                    return (
                      <div key={ii} className="px-6 py-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-[#2C1810]">{item.name}</span>
                              {item.source && SOURCE_BADGES[item.source] && (
                                <span className={`px-2 py-0.5 text-xs rounded-full ${SOURCE_BADGES[item.source].className}`}>
                                  {SOURCE_BADGES[item.source].label}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-[#9E7E60] mt-1">{item.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-mono font-bold text-[#5C4730]">
                              €{Number(item.estimated_cost_pp || 0).toFixed(2)}/p
                            </span>
                            {/* Feedback buttons */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  trackFeedback(item.name, 'suggestion_liked', fbKey)
                                }
                                title="Vind ik goed"
                                className={`p-1.5 rounded-lg border transition-all duration-150 ${
                                  fb === 'liked'
                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                    : 'bg-white border-[#E8D5B5] text-[#B8997A] hover:border-emerald-500/40 hover:text-emerald-400'
                                }`}
                              >
                                <ThumbUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  trackFeedback(item.name, 'suggestion_disliked', fbKey)
                                }
                                title="Vind ik niet goed"
                                className={`p-1.5 rounded-lg border transition-all duration-150 ${
                                  fb === 'disliked'
                                    ? 'bg-red-500/20 border-red-500/40 text-red-400'
                                    : 'bg-white border-[#E8D5B5] text-[#B8997A] hover:border-red-500/40 hover:text-red-400'
                                }`}
                              >
                                <ThumbDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                        {item.key_ingredients && item.key_ingredients.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.key_ingredients.map((ing, i) => (
                              <span key={i} className="px-2 py-0.5 bg-white text-[#9E7E60] text-xs rounded-full">
                                {ing}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.seasonal_highlights && item.seasonal_highlights.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-emerald-400">
                            <Leaf className="w-3 h-3" />
                            {item.seasonal_highlights.join(', ')}
                          </div>
                        )}
                        {item.classical_reference && (
                          <div className="flex items-center gap-1 text-xs text-[#B8997A]">
                            <Star className="w-3 h-3 text-[#5C4730]" />
                            <span>Gebaseerd op: <span className="italic">{item.classical_reference}</span></span>
                          </div>
                        )}
                        {item.notes && (
                          <p className="text-xs text-[#B8997A] italic">{item.notes}</p>
                        )}
                        {/* Hertaal knop */}
                        <div>
                          <button
                            onClick={() => hertaalGerecht(item, fbKey)}
                            className={`flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                              hertaalItem === fbKey
                                ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                                : 'bg-white text-[#B8997A] border-[#E8D5B5] hover:text-violet-300 hover:border-violet-500/30'
                            }`}
                          >
                            {hertaalLoading === fbKey
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Wand2 className="w-3 h-3" />
                            }
                            Hertaal in mijn stijl
                          </button>
                          {hertaalItem === fbKey && hertaalResult[fbKey] && (
                            <div className="mt-2 p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl relative">
                              <button
                                onClick={() => setHertaalItem(null)}
                                className="absolute top-2 right-2 text-[#5C4730] hover:text-[#9E7E60]"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <p className="text-xs text-violet-200 leading-relaxed pr-4">{hertaalResult[fbKey]}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => { setStep(2); setGeneratedMenu(null) }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-[#FDF8F2] text-[#5C4730] font-medium rounded-xl transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Aanpassen
            </button>
            <button
              onClick={generateMenu}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-[#FDF8F2] text-[#5C4730] font-medium rounded-xl transition-all disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" /> Opnieuw genereren
            </button>
            <button
              onClick={saveAsEvent}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-[#2C1810] font-medium rounded-xl transition-all ml-auto disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Opslaan als Event
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
