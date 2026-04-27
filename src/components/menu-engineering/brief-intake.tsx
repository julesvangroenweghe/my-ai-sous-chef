'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface ParsedBrief {
  menu_type: string
  num_persons: number | null
  budget_total: number | null
  budget_pp: number | null
  date_hint: string | null
  location: string | null
  event_name: string | null
  style: string | null
  courses: string[]
  restrictions: string[]
  special_requests: string | null
  summary: string
}

interface BriefIntakeProps {
  onParsed: (brief: ParsedBrief, rawText: string) => void
  onSkip: () => void
}

type InputMode = 'text' | 'upload'
type Step = 'input' | 'preview'

const COURSE_OPTIONS = [
  { id: 'amuse', label: 'Amuse' },
  { id: 'voorgerecht', label: 'Voorgerecht' },
  { id: 'tussengerecht', label: 'Tussengerecht' },
  { id: 'hoofdgerecht', label: 'Hoofdgerecht' },
  { id: 'dessert', label: 'Dessert' },
  { id: 'fingerfood', label: 'Fingerfood' },
  { id: 'fingerbites', label: 'Fingerbites' },
  { id: 'hapjes', label: 'Hapjes' },
  { id: 'kaas', label: 'Kaas' },
  { id: 'mignardises', label: 'Mignardises' },
]

const COMMON_RESTRICTIONS = ['Glutenvrij', 'Lactosevrij', 'Vegetarisch', 'Vegan', 'Halal', 'Kosher', 'Notenallergie', 'Schaaldierenallergie']

export default function BriefIntake({ onParsed, onSkip }: BriefIntakeProps) {
  const [mode, setMode] = useState<InputMode>('text')
  const [step, setStep] = useState<Step>('input')
  const [text, setText] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rawInput, setRawInput] = useState('')

  // Editable parsed brief state
  const [parsed, setParsed] = useState<ParsedBrief | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    setUploadFile(file)
    setError(null)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setUploadPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setUploadPreview(null)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleParse = async () => {
    setParsing(true)
    setError(null)
    try {
      const body: Record<string, string> = {}
      if (mode === 'text') {
        body.text = text
      } else if (uploadFile) {
        await new Promise<void>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            const result = e.target?.result as string
            body.imageBase64 = result.split(',')[1]
            body.imageMimeType = uploadFile.type
            resolve()
          }
          reader.onerror = reject
          reader.readAsDataURL(uploadFile)
        })
      }

      const res = await fetch('/api/menu-engineering/parse-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok || !data.brief) {
        setError(data.error || 'Kon de briefing niet verwerken')
        return
      }

      const raw = mode === 'text' ? text : `[Afbeelding: ${uploadFile?.name}]`
      setRawInput(raw)
      setParsed(data.brief)
      setStep('preview')
    } catch {
      setError('Verbindingsfout — probeer opnieuw')
    } finally {
      setParsing(false)
    }
  }

  const handleConfirm = () => {
    if (parsed) onParsed(parsed, rawInput)
  }

  // ─── EDITABLE PREVIEW STEP ───────────────────────────────────────
  if (step === 'preview' && parsed) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-display font-bold text-[#2C1810]">Brief geanalyseerd</h2>
            <p className="text-sm text-[#9E7E60] mt-0.5">
              Controleer en pas aan waar nodig — daarna wordt de wizard voor je ingevuld
            </p>
          </div>
          <button
            onClick={() => { setStep('input'); setParsed(null) }}
            className="text-sm text-[#9E7E60] hover:text-[#5C4730] transition-colors flex items-center gap-1"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Opnieuw analyseren
          </button>
        </div>

        {/* Summary badge */}
        {parsed.summary && (
          <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200/60 text-sm text-[#5C4730] italic">
            &ldquo;{parsed.summary}&rdquo;
          </div>
        )}

        {/* Editable fields grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Event naam */}
          <EditField
            label="Evenementnaam"
            value={parsed.event_name || ''}
            onChange={v => setParsed(p => p ? { ...p, event_name: v || null } : p)}
            placeholder="Bv. Zomerfeest De Smet"
          />

          {/* Datum */}
          <EditField
            label="Datum"
            value={parsed.date_hint || ''}
            onChange={v => setParsed(p => p ? { ...p, date_hint: v || null } : p)}
            placeholder="Bv. 14 juni 2026"
          />

          {/* Personen */}
          <EditField
            label="Aantal personen"
            type="number"
            value={parsed.num_persons?.toString() || ''}
            onChange={v => setParsed(p => p ? { ...p, num_persons: v ? parseInt(v) : null } : p)}
            placeholder="Bv. 80"
          />

          {/* Locatie */}
          <EditField
            label="Locatie"
            value={parsed.location || ''}
            onChange={v => setParsed(p => p ? { ...p, location: v || null } : p)}
            placeholder="Bv. Feestzaal Ter Linden"
          />

          {/* Budget pp */}
          <EditField
            label="Budget per persoon (€)"
            type="number"
            value={parsed.budget_pp?.toString() || ''}
            onChange={v => setParsed(p => p ? { ...p, budget_pp: v ? parseFloat(v) : null } : p)}
            placeholder="Bv. 55"
          />

          {/* Budget totaal */}
          <EditField
            label="Totaalbudget (€)"
            type="number"
            value={parsed.budget_total?.toString() || ''}
            onChange={v => setParsed(p => p ? { ...p, budget_total: v ? parseFloat(v) : null } : p)}
            placeholder="Bv. 4400"
          />

          {/* Stijl */}
          <EditField
            label="Stijl / sfeer"
            value={parsed.style || ''}
            onChange={v => setParsed(p => p ? { ...p, style: v || null } : p)}
            placeholder="Bv. Elegant, zomers, informeel"
            className="sm:col-span-2"
          />

          {/* Menu type */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#9E7E60] mb-2">Menu type</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'event', label: 'Event' },
                { id: 'a_la_carte', label: 'À la carte' },
                { id: 'tasting', label: 'Degustatie' },
                { id: 'fixed', label: 'Vast menu' },
                { id: 'daily', label: 'Dagmenu' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setParsed(p => p ? { ...p, menu_type: opt.id } : p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    parsed.menu_type === opt.id
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-[#5C4730] border-[#E8D5B5] hover:border-amber-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gangen */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#9E7E60] mb-2">Gangen</label>
            <div className="flex flex-wrap gap-2">
              {COURSE_OPTIONS.map(opt => {
                const active = parsed.courses.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    onClick={() => setParsed(p => {
                      if (!p) return p
                      const courses = active
                        ? p.courses.filter(c => c !== opt.id)
                        : [...p.courses, opt.id]
                      return { ...p, courses }
                    })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      active
                        ? 'bg-[#2C1810] text-white border-[#2C1810]'
                        : 'bg-white text-[#5C4730] border-[#E8D5B5] hover:border-[#9E7E60]'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Dieetwensen */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#9E7E60] mb-2">Dieetwensen / allergenen</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_RESTRICTIONS.map(r => {
                const active = parsed.restrictions.includes(r)
                return (
                  <button
                    key={r}
                    onClick={() => setParsed(p => {
                      if (!p) return p
                      const restrictions = active
                        ? p.restrictions.filter(x => x !== r)
                        : [...p.restrictions, r]
                      return { ...p, restrictions }
                    })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      active
                        ? 'bg-red-100 text-red-700 border-red-200'
                        : 'bg-white text-[#5C4730] border-[#E8D5B5] hover:border-red-200'
                    }`}
                  >
                    {active ? '✕ ' : ''}{r}
                  </button>
                )
              })}
            </div>
            {/* Custom restriction */}
            <input
              type="text"
              placeholder="Andere wens toevoegen + Enter"
              className="mt-2 w-full px-3 py-2 rounded-xl border border-[#E8D5B5] bg-white text-[#2C1810] text-sm placeholder-[#B8997A] focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/60"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim()
                  if (val) {
                    setParsed(p => p ? { ...p, restrictions: [...p.restrictions, val] } : p)
                    ;(e.target as HTMLInputElement).value = ''
                  }
                }
              }}
            />
          </div>

          {/* Speciale wensen */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#9E7E60] mb-1.5">Speciale wensen / opmerkingen</label>
            <textarea
              value={parsed.special_requests || ''}
              onChange={e => setParsed(p => p ? { ...p, special_requests: e.target.value || null } : p)}
              placeholder="Bv. geen varkensvlees, dessertbuffet ipv bord, ..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-[#E8D5B5] bg-white text-[#2C1810] text-sm placeholder-[#B8997A] resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/60"
            />
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all text-white"
            style={{ backgroundColor: '#E8A040' }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Bevestigen &amp; wizard starten
          </button>
          <button
            onClick={() => { setStep('input'); setParsed(null) }}
            className="px-4 py-3 rounded-xl text-sm font-medium text-[#9E7E60] hover:text-[#5C4730] transition-colors"
          >
            Terug
          </button>
        </div>
      </div>
    )
  }

  // ─── INPUT STEP ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-[#2C1810]">Klantbrief importeren</h2>
          <p className="text-sm text-[#9E7E60] mt-0.5">
            Plak een mail, typ de opdracht of upload een screenshot — de AI vult de wizard voor je in
          </p>
        </div>
        <button
          onClick={onSkip}
          className="text-sm text-[#9E7E60] hover:text-[#5C4730] transition-colors"
        >
          Overslaan
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-[#F2E8D5] rounded-xl w-fit">
        {([
          { id: 'text' as InputMode, label: 'Tekst invoeren', icon: (
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          )},
          { id: 'upload' as InputMode, label: 'Screenshot / PDF', icon: (
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          )},
        ] as Array<{ id: InputMode; label: string; icon: React.ReactNode }>).map(tab => (
          <button
            key={tab.id}
            onClick={() => { setMode(tab.id); setError(null) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === tab.id
                ? 'bg-white text-[#2C1810] shadow-sm'
                : 'text-[#9E7E60] hover:text-[#5C4730]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <AnimatePresence mode="wait">
        {mode === 'text' && (
          <motion.div
            key="text"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <div className="relative">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={`Voorbeelden:\n\n"We zoeken een menu voor 80 personen op 14 juni, walking dinner stijl, budget €55pp, geen gluten aub. Thema: zomerfeest in de tuin."\n\n– of plak gewoon een mail van je klant –`}
                rows={10}
                className="w-full px-4 py-3 rounded-xl border border-[#E8D5B5] bg-white text-[#2C1810] text-sm placeholder-[#B8997A] resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/60 transition-all leading-relaxed"
              />
              {text && (
                <button
                  onClick={() => setText('')}
                  className="absolute top-3 right-3 text-[#B8997A] hover:text-[#9E7E60] transition-colors"
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            <p className="text-xs text-[#B8997A] mt-2">
              Tip: je kan ook een volledige e-mail plakken — de AI filtert de relevante info eruit
            </p>
          </motion.div>
        )}

        {mode === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-amber-400 bg-amber-50/50'
                  : uploadFile
                  ? 'border-green-400/60 bg-green-50/30'
                  : 'border-[#E8D5B5] bg-[#FDFAF6]/60 hover:border-amber-300 hover:bg-amber-50/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />

              {uploadPreview ? (
                <div className="space-y-3">
                  <img src={uploadPreview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-contain shadow-sm" />
                  <p className="text-sm text-[#5C4730] font-medium">{uploadFile?.name}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setUploadFile(null); setUploadPreview(null) }}
                    className="text-xs text-[#9E7E60] hover:text-[#5C4730] underline"
                  >
                    Ander bestand kiezen
                  </button>
                </div>
              ) : uploadFile ? (
                <div className="space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-green-100 flex items-center justify-center">
                    <svg width="22" height="22" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className="text-sm text-[#5C4730] font-medium">{uploadFile.name}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setUploadFile(null) }}
                    className="text-xs text-[#9E7E60] hover:text-[#5C4730] underline"
                  >
                    Ander bestand kiezen
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-[#F2E8D5] flex items-center justify-center">
                    <svg width="22" height="22" fill="none" stroke="#9E7E60" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#5C4730]">Sleep een afbeelding of PDF hierheen</p>
                  <p className="text-xs text-[#9E7E60]">of klik om een bestand te kiezen</p>
                </div>
              )}
            </div>

            {uploadFile && (
              <div>
                <label className="block text-xs font-medium text-[#9E7E60] mb-1.5">Extra context (optioneel)</label>
                <input
                  type="text"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Bijv. 'Dit is een offerte die ik ontvangen heb, budget is exclusief dranken'"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8D5B5] bg-white text-[#2C1810] text-sm placeholder-[#B8997A] focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/60 transition-all"
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleParse}
          disabled={parsing || (mode === 'text' ? !text.trim() : !uploadFile)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#E8A040', color: '#fff' }}
        >
          {parsing ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 2v4m0 12v4m-8-10H2m20 0h-4" />
              </svg>
              Brief analyseren...
            </>
          ) : (
            <>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              Brief analyseren
            </>
          )}
        </button>
        <button
          onClick={onSkip}
          className="px-4 py-3 rounded-xl text-sm font-medium text-[#9E7E60] hover:text-[#5C4730] transition-colors"
        >
          Leeg starten
        </button>
      </div>
    </div>
  )
}

// ─── REUSABLE EDIT FIELD ──────────────────────────────────────────
function EditField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  className = '',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'number'
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-[#9E7E60] mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl border border-[#E8D5B5] bg-white text-[#2C1810] text-sm placeholder-[#B8997A] focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/60 transition-all"
      />
    </div>
  )
}
