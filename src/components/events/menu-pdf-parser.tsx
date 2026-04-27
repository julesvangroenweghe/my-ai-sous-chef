'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Upload, FileUp, Loader2, Check, X, AlertTriangle,
  ChefHat, Sparkles, BookOpen, ArrowRight
} from 'lucide-react'

interface ParsedDish {
  name: string
  category: string
  description: string
  matched_recipe_id: string | null
  matched_recipe_name: string | null
  matched_legende_id: string | null
  matched_legende_name: string | null
  confidence: number
  approved: boolean
}

interface ParsedEventInfo {
  name: string | null
  date: string | null
  num_persons: number | null
  event_type: string | null
  location: string | null
  contact_person: string | null
  price_per_person: number | null
  notes: string | null
}

interface ParseResult {
  event_info: ParsedEventInfo
  dishes: ParsedDish[]
}

const COURSE_LABELS: Record<string, string> = {
  'AMUSE': 'Amuse',
  'FINGERFOOD': 'Fingerfood',
  'FINGERBITES': 'Fingerbites',
  'HAPJES': 'Hapjes',
  'VOORGERECHT': 'Voorgerecht',
  'TUSSENGERECHT': 'Tussengerecht',
  'WALKING DINNER': 'Walking Dinner',
  'HOOFDGERECHT': 'Hoofdgerecht',
  'KAAS': 'Kaas',
  'DESSERT': 'Dessert',
  'MIGNARDISES': 'Mignardises',
  'HALFABRICAAT': 'Halfabricaat',
}

interface MenuPdfParserProps {
  onEventInfoParsed?: (info: ParsedEventInfo) => void
  onDishesApproved?: (dishes: ParsedDish[]) => void
  compact?: boolean
}

export function MenuPdfParser({ onEventInfoParsed, onDishesApproved, compact = false }: MenuPdfParserProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ParseResult | null>(null)
  const [dishes, setDishes] = useState<ParsedDish[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((selectedFile: File) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Upload een PDF of afbeelding (JPG, PNG, WebP)')
      return
    }
    setFile(selectedFile)
    setError('')
    setResult(null)
    setDishes([])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFileSelect(droppedFile)
  }, [handleFileSelect])

  const handleParse = async () => {
    if (!file) return
    setParsing(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/events/parse-menu', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Fout bij het parsen')
        setParsing(false)
        return
      }

      const parsedDishes = (data.dishes || []).map((d: ParsedDish) => ({
        ...d,
        approved: d.confidence >= 0.6,
      }))

      setResult(data)
      setDishes(parsedDishes)

      if (data.event_info && onEventInfoParsed) {
        onEventInfoParsed(data.event_info)
      }
    } catch (err) {
      setError('Netwerkfout bij het uploaden')
    } finally {
      setParsing(false)
    }
  }

  const toggleDishApproval = (index: number) => {
    setDishes(prev => prev.map((d, i) => i === index ? { ...d, approved: !d.approved } : d))
  }

  const removeDish = (index: number) => {
    setDishes(prev => prev.filter((_, i) => i !== index))
  }

  const handleApproveAll = () => {
    const approvedDishes = dishes.filter(d => d.approved)
    if (onDishesApproved) {
      onDishesApproved(approvedDishes)
    }
  }

  const approvedCount = dishes.filter(d => d.approved).length

  // Group dishes by category
  const dishesByCategory: Record<string, ParsedDish[]> = {}
  for (const dish of dishes) {
    const cat = dish.category || 'OVERIG'
    if (!dishesByCategory[cat]) dishesByCategory[cat] = []
    dishesByCategory[cat].push(dish)
  }

  const reset = () => {
    setFile(null)
    setResult(null)
    setDishes([])
    setError('')
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {!result && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl transition-all ${
            file
              ? 'border-brand-500/50 bg-brand-500/5'
              : 'border-[#E8D5B5] bg-[#FDF8F2]/60 hover:border-[#D4B896] hover:bg-[#FDFAF6]/80'
          } ${compact ? 'p-4' : 'p-8'}`}
        >
          <div className="text-center">
            {!file ? (
              <>
                <Upload className={`mx-auto text-[#B8997A] mb-3 ${compact ? 'w-8 h-8' : 'w-12 h-12'}`} />
                <p className="text-[#5C4730] font-medium text-sm mb-1">
                  Upload menu PDF of foto
                </p>
                <p className="text-[#B8997A] text-xs mb-4">
                  Sleep een bestand hierheen of klik om te kiezen
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white border border-[#E8D5B5] text-[#5C4730] hover:text-[#2C1810] rounded-xl text-sm transition-all hover:bg-[#FDF8F2]"
                >
                  <FileUp className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                  Bestand Kiezen
                </button>
              </>
            ) : (
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <FileUp className="w-4 h-4 text-brand-400" />
                  <span className="text-[#5C4730] font-medium">{file.name}</span>
                  <span className="text-[#B8997A] font-mono text-xs">
                    ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleParse}
                  disabled={parsing}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-[#2C1810] text-sm font-medium rounded-xl transition-all disabled:opacity-50"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menu analyseren...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Analyseer Menu
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="p-1.5 text-[#B8997A] hover:text-[#5C4730] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFileSelect(f)
            }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Parsed Results */}
      {result && dishes.length > 0 && (
        <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E8D5B5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-400" />
              <h3 className="text-sm font-display font-semibold text-[#2C1810]">
                Geparsed Menu
              </h3>
              <span className="text-xs text-[#B8997A] font-mono">
                {dishes.length} gerechten gevonden
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={reset}
                className="px-3 py-1.5 text-[#9E7E60] hover:text-[#2C1810] text-xs transition-colors"
              >
                Opnieuw
              </button>
              <button
                type="button"
                onClick={handleApproveAll}
                disabled={approvedCount === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-[#2C1810] text-xs font-medium rounded-lg transition-all disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                {approvedCount} gerechten overnemen
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-[#E8D5B5]/50">
            {Object.entries(dishesByCategory).map(([category, catDishes]) => (
              <div key={category}>
                <div className="px-6 py-2 bg-white/30">
                  <span className="text-xs font-medium text-[#9E7E60] uppercase tracking-wider">
                    {COURSE_LABELS[category] || category}
                  </span>
                </div>
                {catDishes.map((dish) => {
                  const globalIndex = dishes.indexOf(dish)
                  return (
                    <div
                      key={globalIndex}
                      className={`px-6 py-3 flex items-center gap-4 transition-colors ${
                        dish.approved ? 'bg-white/20' : 'bg-white/5 opacity-60'
                      }`}
                    >
                      {/* Approval toggle */}
                      <button
                        type="button"
                        onClick={() => toggleDishApproval(globalIndex)}
                        className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all ${
                          dish.approved
                            ? 'bg-brand-600 border-brand-500 text-[#2C1810]'
                            : 'border-[#D4B896] text-transparent hover:border-stone-500'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                      </button>

                      {/* Dish info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[#3D2810] truncate">
                            {dish.name}
                          </span>
                          {dish.confidence >= 0.7 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/20 text-emerald-400 rounded">
                              match
                            </span>
                          )}
                          {dish.confidence > 0.4 && dish.confidence < 0.7 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-700 rounded">
                              mogelijk
                            </span>
                          )}
                        </div>
                        {dish.description && (
                          <p className="text-xs text-[#B8997A] mt-0.5 truncate">{dish.description}</p>
                        )}
                      </div>

                      {/* Match indicator */}
                      <div className="shrink-0 text-right">
                        {dish.matched_recipe_name ? (
                          <div className="flex items-center gap-1.5">
                            <ChefHat className="w-3.5 h-3.5 text-brand-400" />
                            <span className="text-xs text-[#9E7E60] max-w-[160px] truncate">
                              {dish.matched_recipe_name}
                            </span>
                          </div>
                        ) : dish.matched_legende_name ? (
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                            <span className="text-xs text-[#9E7E60] max-w-[160px] truncate">
                              {dish.matched_legende_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#5C4730]">Geen match</span>
                        )}
                        <span className="text-[10px] font-mono text-[#5C4730]">
                          {(dish.confidence * 100).toFixed(0)}%
                        </span>
                      </div>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeDish(globalIndex)}
                        className="p-1 text-[#5C4730] hover:text-red-400 transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
