'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Users,
  MapPin,
  Calendar,
  Euro,
  AlertTriangle,
  Upload,
  File,
} from 'lucide-react'
import GoogleCalendarPicker from './google-calendar-picker'

interface CalendarEvent {
  id: string
  summary: string
  start: string
  end: string
  location?: string
  description?: string
  htmlLink: string
}

interface ParsedDish {
  name: string
  description?: string
  client_notes?: string
  is_open_question?: boolean
  dietary_flags?: string[]
}

interface ParsedCourse {
  course_name: string
  dishes: ParsedDish[]
}

interface ParsedMoment {
  time: string
  type: string
  format: string
  description: string
  courses: ParsedCourse[]
}

interface ParsedDay {
  day_label: string
  date: string
  moments: ParsedMoment[]
  budget_items: Array<{ label: string; price_pp: number; notes?: string }>
  open_questions: string[]
}

interface ParsedBrief {
  event: {
    name: string
    start_date: string
    end_date: string
    num_persons: number
    num_children?: number
    location: string
    contact_name: string
    contact_email?: string
    contact_phone?: string
  }
  dietary_restrictions: string[]
  dietary_notes: string
  days: ParsedDay[]
  budget_summary: string
  global_open_questions: string[]
}

const dietaryColors: Record<string, string> = {
  veggie: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  noten_allergie: 'bg-amber-50 text-amber-700 border-amber-200',
  vis_allergie: 'bg-blue-50 text-blue-700 border-blue-200',
  vegan: 'bg-green-50 text-green-700 border-green-200',
  gluten: 'bg-orange-50 text-orange-700 border-orange-200',
  lactose: 'bg-yellow-50 text-yellow-700 border-yellow-200',
}

const dietaryLabels: Record<string, string> = {
  veggie: 'Veggie',
  noten_allergie: 'Noten allergie',
  vis_allergie: 'Vis allergie',
  vegan: 'Vegan',
  gluten: 'Gluten',
  lactose: 'Lactose',
}

interface Props {
  onClose: () => void
}

export default function ImportBriefModal({ onClose }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'paste' | 'preview' | 'creating' | 'done'>('paste')
  const [briefText, setBriefText] = useState('')
  const [parsedBrief, setParsedBrief] = useState<ParsedBrief | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([0]))
  const [createdEventId, setCreatedEventId] = useState<string | null>(null)

  // New state for tabs, drag & drop, and calendar
  const [activeTab, setActiveTab] = useState<'paste' | 'calendar'>('paste')
  const [isDragging, setIsDragging] = useState(false)
  const [isExtractingFile, setIsExtractingFile] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleDay = (idx: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const processFile = useCallback(async (file: File) => {
    const isText = file.type === 'text/plain' || file.type === 'text/markdown' || file.name.endsWith('.txt') || file.name.endsWith('.md')

    if (isText) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        setBriefText(text)
        setUploadedFileName(file.name)
      }
      reader.readAsText(file)
    } else {
      // PDF or DOCX — send to extraction API
      setIsExtractingFile(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/briefs/extract-file', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (data.text) {
          setBriefText(data.text)
          setUploadedFileName(file.name)
        } else {
          setError(data.error || 'Bestand kon niet worden gelezen')
        }
      } catch {
        setError('Bestand uploaden mislukt')
      } finally {
        setIsExtractingFile(false)
      }
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) await processFile(file)
    },
    [processFile]
  )

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) await processFile(file)
    },
    [processFile]
  )

  const parseBrief = async () => {
    const hasText = briefText.trim()
    const hasCalendarEvent = selectedCalendarEvent !== null

    if (!hasText && !hasCalendarEvent) return

    setIsLoading(true)
    setError(null)
    try {
      const combinedText = briefText + (selectedCalendarEvent
        ? `\n\nEvent details: ${selectedCalendarEvent.summary} op ${selectedCalendarEvent.start} te ${selectedCalendarEvent.location || ''}`
        : '')

      const res = await fetch('/api/proposals/parse-multi-day-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefText: combinedText,
          calendarEventId: selectedCalendarEvent?.id,
          calendarEventSummary: selectedCalendarEvent?.summary,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Parsing mislukt')
      const data = await res.json()
      setParsedBrief(data)
      setStep('preview')
      setExpandedDays(new Set([0]))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setIsLoading(false)
    }
  }

  const createFromBrief = async () => {
    if (!parsedBrief) return
    setStep('creating')
    setError(null)
    try {
      const res = await fetch('/api/proposals/create-from-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsedBrief }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Aanmaken mislukt')
      const data = await res.json()
      setCreatedEventId(data.event_id)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
      setStep('preview')
    }
  }

  const goToEvent = () => {
    if (createdEventId) router.push(`/events/${createdEventId}`)
    onClose()
  }

  const totalDishes =
    parsedBrief?.days.reduce(
      (sum, day) =>
        sum +
        day.moments.reduce(
          (ms, m) => ms + m.courses.reduce((cs, c) => cs + c.dishes.length, 0),
          0
        ),
      0
    ) || 0

  const allOpenQuestions = parsedBrief
    ? [
        ...(parsedBrief.global_open_questions || []),
        ...parsedBrief.days.flatMap((d) => d.open_questions || []),
      ]
    : []

  const canAnalyze = briefText.trim() || selectedCalendarEvent !== null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#FDF8F2] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-[#E8D5B5] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E8D5B5] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[#2C1810]">
                Brief importeren
              </h2>
              <p className="text-xs text-[#9E7E60]">
                {step === 'paste'
                  ? 'Plak de volledige aanvraag — AI herkent alles'
                  : step === 'preview'
                  ? 'Controleer de geëxtraheerde informatie'
                  : step === 'creating'
                  ? 'Event en voorstellen aanmaken...'
                  : 'Klaar!'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-[#F2E8D5] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-[#9E7E60]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* STEP 1: Paste */}
          {step === 'paste' && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#5C4730] leading-relaxed">
                Kopieer de volledige brief — met verloop, menu per dag, dieetwensen en budget.
                De AI herkent alles: meerdere dagen, allergieën, open vragen, prijzen per moment.
              </p>

              {/* Tab bar */}
              <div className="flex gap-1 p-1 bg-[#F2E8D5] rounded-2xl">
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'paste'
                      ? 'bg-white text-[#2C1810] shadow-sm'
                      : 'text-[#9E7E60] hover:text-[#5C4730]'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Tekst plakken / slepen
                </button>
                <button
                  onClick={() => setActiveTab('calendar')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'calendar'
                      ? 'bg-white text-[#2C1810] shadow-sm'
                      : 'text-[#9E7E60] hover:text-[#5C4730]'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Google Agenda
                </button>
              </div>

              {/* Tab: Paste / Drag & Drop */}
              {activeTab === 'paste' && (
                <div className="space-y-3">
                  {/* Drag & Drop zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                      isDragging
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-amber-200 hover:border-amber-400 hover:bg-amber-50/50 bg-white'
                    }`}
                  >
                    {isExtractingFile ? (
                      <>
                        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                        <p className="text-sm text-[#9E7E60]">Bestand verwerken...</p>
                      </>
                    ) : uploadedFileName ? (
                      <>
                        <File className="w-8 h-8 text-amber-500" />
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full">
                            {uploadedFileName}
                          </span>
                        </div>
                        <p className="text-xs text-[#9E7E60]">Klik om een ander bestand te kiezen</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-amber-300" />
                        <p className="text-sm font-medium text-[#5C4730]">
                          Sleep een bestand hierheen
                        </p>
                        <p className="text-xs text-[#9E7E60]">.txt, .pdf, .docx</p>
                        <p className="text-xs text-[#C4A882]">Of klik om te bladeren</p>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.pdf,.docx,text/plain,application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Textarea */}
                  <textarea
                    value={briefText}
                    onChange={(e) => setBriefText(e.target.value)}
                    placeholder="Plak hier de volledige aanvraagbrief... (datum, locatie, verloop, menu, budget)"
                    className="w-full h-48 p-4 rounded-2xl border border-[#E8D5B5] bg-white text-[#2C1810] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-[#C4A882] font-mono leading-relaxed"
                    autoFocus
                  />
                </div>
              )}

              {/* Tab: Google Calendar */}
              {activeTab === 'calendar' && (
                <div className="space-y-3">
                  <GoogleCalendarPicker
                    onSelect={(event) => setSelectedCalendarEvent(event)}
                    selectedId={selectedCalendarEvent?.id}
                  />

                  {selectedCalendarEvent && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                      <p className="text-xs font-semibold text-amber-700">Geselecteerd event</p>
                      <p className="text-sm font-medium text-[#2C1810]">{selectedCalendarEvent.summary}</p>
                      {selectedCalendarEvent.location && (
                        <p className="text-xs text-[#9E7E60]">{selectedCalendarEvent.location}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#9E7E60] uppercase tracking-wide">
                      Extra briefdetails (optioneel)
                    </label>
                    <textarea
                      value={briefText}
                      onChange={(e) => setBriefText(e.target.value)}
                      placeholder="Voeg menu details, dieetwensen, budget... toe"
                      className="w-full h-32 p-4 rounded-2xl border border-[#E8D5B5] bg-white text-[#2C1810] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-[#C4A882] font-mono leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#E8D5B5] text-[#9E7E60] text-sm font-medium hover:bg-[#F2E8D5] transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={parseBrief}
                  disabled={!canAnalyze || isLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Brief analyseren...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Analyseren
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Preview */}
          {step === 'preview' && parsedBrief && (
            <div className="divide-y divide-[#E8D5B5]">
              {/* Event summary card */}
              <div className="p-6 space-y-4">
                <div className="bg-white border border-[#E8D5B5] rounded-2xl p-4 space-y-3">
                  <h3 className="font-display font-bold text-[#2C1810] text-lg">
                    {parsedBrief.event.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-[#5C4730]">
                      <Calendar className="w-3.5 h-3.5 text-[#9E7E60]" />
                      {new Date(parsedBrief.event.start_date).toLocaleDateString('nl-BE', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {parsedBrief.event.start_date !== parsedBrief.event.end_date && (
                        <> — {new Date(parsedBrief.event.end_date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long' })}</>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[#5C4730]">
                      <Users className="w-3.5 h-3.5 text-[#9E7E60]" />
                      {parsedBrief.event.num_persons} pers.
                      {parsedBrief.event.num_children ? ` + ${parsedBrief.event.num_children} kids` : ''}
                    </div>
                    {parsedBrief.event.location && (
                      <div className="flex items-center gap-2 text-[#5C4730] col-span-2">
                        <MapPin className="w-3.5 h-3.5 text-[#9E7E60]" />
                        {parsedBrief.event.location}
                      </div>
                    )}
                  </div>

                  {/* Dietary restrictions */}
                  {parsedBrief.dietary_restrictions?.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1.5">
                        {parsedBrief.dietary_restrictions.map((r) => (
                          <span
                            key={r}
                            className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                              dietaryColors[r] || 'bg-stone-50 text-stone-600 border-stone-200'
                            }`}
                          >
                            {dietaryLabels[r] || r}
                          </span>
                        ))}
                      </div>
                      {parsedBrief.dietary_notes && (
                        <p className="text-xs text-[#9E7E60] italic">{parsedBrief.dietary_notes}</p>
                      )}
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="flex items-center gap-4 pt-1 border-t border-[#F2E8D5]">
                    <div className="text-xs text-[#9E7E60]">
                      <span className="font-semibold text-[#2C1810]">{parsedBrief.days.length}</span> dagen
                    </div>
                    <div className="text-xs text-[#9E7E60]">
                      <span className="font-semibold text-[#2C1810]">{totalDishes}</span> gerechten herkend
                    </div>
                    {allOpenQuestions.length > 0 && (
                      <div className="text-xs text-amber-600">
                        <span className="font-semibold">{allOpenQuestions.length}</span> open vragen
                      </div>
                    )}
                  </div>
                </div>

                {/* Open questions */}
                {allOpenQuestions.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold uppercase tracking-wide">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Open vragen — actie vereist
                    </div>
                    {allOpenQuestions.slice(0, 5).map((q, i) => (
                      <p key={i} className="text-xs text-amber-700 flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">•</span>
                        {q}
                      </p>
                    ))}
                    {allOpenQuestions.length > 5 && (
                      <p className="text-xs text-amber-500">+{allOpenQuestions.length - 5} meer</p>
                    )}
                  </div>
                )}
              </div>

              {/* Per day breakdown */}
              <div className="p-6 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9E7E60]">
                  Per dag — {parsedBrief.days.length} voorstel{parsedBrief.days.length > 1 ? 'len' : ''} worden aangemaakt
                </h3>

                {parsedBrief.days.map((day, dayIdx) => {
                  const isExpanded = expandedDays.has(dayIdx)
                  const dayDishes = day.moments.reduce(
                    (ms, m) => ms + m.courses.reduce((cs, c) => cs + c.dishes.length, 0),
                    0
                  )
                  const dayBudget = (day.budget_items || []).reduce(
                    (sum, b) => sum + (b.price_pp || 0),
                    0
                  )

                  return (
                    <div
                      key={dayIdx}
                      className="bg-white border border-[#E8D5B5] rounded-2xl overflow-hidden"
                    >
                      <button
                        onClick={() => toggleDay(dayIdx)}
                        className="w-full flex items-center gap-3 p-4 hover:bg-[#FDF8F2] transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-amber-700">{dayIdx + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#2C1810] text-sm">{day.day_label}</div>
                          <div className="text-xs text-[#9E7E60]">
                            {day.moments.length} momenten · {dayDishes} gerechten
                            {dayBudget > 0 && ` · €${dayBudget.toFixed(0)}/pp`}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[#9E7E60] shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[#9E7E60] shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-[#F2E8D5] divide-y divide-[#F2E8D5]">
                          {day.moments.map((moment, mIdx) => (
                            <div key={mIdx} className="p-4 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-[#9E7E60] w-12 shrink-0">
                                  {moment.time}
                                </span>
                                <span className="text-xs font-semibold text-[#2C1810]">
                                  {moment.type}
                                </span>
                                {moment.description && (
                                  <span className="text-xs text-[#9E7E60] truncate">
                                    — {moment.description}
                                  </span>
                                )}
                              </div>
                              {moment.courses.map((course, cIdx) => (
                                <div key={cIdx} className="ml-14 space-y-1">
                                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#C4A882]">
                                    {course.course_name}
                                  </div>
                                  {course.dishes.map((dish, dIdx) => (
                                    <div key={dIdx} className="flex items-start gap-2">
                                      {dish.is_open_question ? (
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                      ) : (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs text-[#2C1810] leading-relaxed">
                                          {dish.name}
                                        </p>
                                        {dish.client_notes && (
                                          <p className="text-[10px] text-amber-600 italic mt-0.5">
                                            Klant: {dish.client_notes}
                                          </p>
                                        )}
                                        {(dish.dietary_flags || []).length > 0 && (
                                          <div className="flex gap-1 mt-0.5">
                                            {dish.dietary_flags!.map((f) => (
                                              <span
                                                key={f}
                                                className="text-[9px] px-1.5 py-0 rounded-full bg-stone-100 text-stone-500"
                                              >
                                                {f}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          ))}

                          {/* Budget items */}
                          {(day.budget_items || []).length > 0 && (
                            <div className="p-4 bg-[#FDF8F2]">
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#C4A882] mb-2 flex items-center gap-1">
                                <Euro className="w-3 h-3" /> Budget
                              </div>
                              {day.budget_items.map((b, bIdx) => (
                                <div key={bIdx} className="flex items-center justify-between text-xs py-0.5">
                                  <span className="text-[#5C4730]">{b.label}</span>
                                  <span className="font-mono font-semibold text-[#2C1810]">
                                    €{b.price_pp.toFixed(2)}/pp
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Error */}
              {error && (
                <div className="px-6 pb-4">
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Creating */}
          {step === 'creating' && (
            <div className="p-12 flex flex-col items-center justify-center gap-4 text-center">
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
              <div>
                <p className="font-semibold text-[#2C1810]">Event aanmaken...</p>
                <p className="text-sm text-[#9E7E60] mt-1">
                  Voorstellen per dag genereren met alle gerechten
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: Done */}
          {step === 'done' && parsedBrief && (
            <div className="p-12 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-[#2C1810]">
                  {parsedBrief.event.name}
                </p>
                <p className="text-sm text-[#9E7E60] mt-1">
                  Event aangemaakt · {parsedBrief.days.length} dag{parsedBrief.days.length > 1 ? 'en' : ''} · {totalDishes} gerechten geïmporteerd
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {(step === 'preview' || step === 'done') && (
          <div className="p-6 border-t border-[#E8D5B5] shrink-0 flex gap-3">
            {step === 'preview' && (
              <>
                <button
                  onClick={() => setStep('paste')}
                  className="px-4 py-2.5 rounded-xl border border-[#E8D5B5] text-[#9E7E60] text-sm font-medium hover:bg-[#F2E8D5] transition-colors"
                >
                  Terug
                </button>
                <button
                  onClick={createFromBrief}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  Event + voorstellen aanmaken
                </button>
              </>
            )}
            {step === 'done' && (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-[#E8D5B5] text-[#9E7E60] text-sm font-medium hover:bg-[#F2E8D5] transition-colors"
                >
                  Sluiten
                </button>
                <button
                  onClick={goToEvent}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  Event openen
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
