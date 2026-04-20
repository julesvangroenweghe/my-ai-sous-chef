'use client'

import { useState, useCallback, useRef } from 'react'
import {
  Upload, Loader2, Check, X, FileText, Image,
  ChevronDown, ChevronUp, AlertCircle, FileUp, Sparkles
} from 'lucide-react'

interface ImportedComponent {
  name: string
  quantity_per_person: number
  unit: string
  group: string
}

interface ImportedDish {
  name: string
  category: string
  components: ImportedComponent[]
  matched_recipe?: { id: string; name: string; score: number } | null
  selected: boolean
  editedCategory: string
}

interface ParseResult {
  dishes: ImportedDish[]
  document_type: string
  notes: string
}

interface MepOcrImporterProps {
  eventId: string
  onImportComplete: () => void
}

const CATEGORY_OPTIONS = [
  'AMUSE', 'FINGERFOOD', 'FINGERBITES', 'HAPJES',
  'VOORGERECHT', 'TUSSENGERECHT', 'HOOFDGERECHT',
  'KAAS', 'DESSERT', 'MIGNARDISES', 'HALFABRICAAT',
]

const COURSE_ORDER: Record<string, number> = {
  AMUSE: 0, FINGERFOOD: 0, FINGERBITES: 0, HAPJES: 0,
  VOORGERECHT: 1, TUSSENGERECHT: 2, HOOFDGERECHT: 3,
  KAAS: 4, DESSERT: 5, MIGNARDISES: 6, HALFABRICAAT: 7,
}

export function MepOcrImporter({ eventId, onImportComplete }: MepOcrImporterProps) {
  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedDishes, setExpandedDishes] = useState<Set<number>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseFile = async (file: File) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      setError('Ongeldig bestandstype. Upload een PDF, JPG of PNG.')
      return
    }

    setParsing(true)
    setError(null)
    setParseResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/events/${eventId}/import-mep`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Fout bij verwerken')
      }

      const data = await res.json()
      const dishes: ImportedDish[] = (data.dishes || []).map((d: Omit<ImportedDish, 'selected' | 'editedCategory'>) => ({
        ...d,
        selected: true,
        editedCategory: d.category,
      }))

      setParseResult({ ...data, dishes })
      setExpandedDishes(new Set(dishes.map((_: ImportedDish, i: number) => i)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setParsing(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }, [eventId])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragging(false), [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  const toggleDish = (index: number) => {
    if (!parseResult) return
    const newDishes = [...parseResult.dishes]
    newDishes[index] = { ...newDishes[index], selected: !newDishes[index].selected }
    setParseResult({ ...parseResult, dishes: newDishes })
  }

  const updateCategory = (index: number, category: string) => {
    if (!parseResult) return
    const newDishes = [...parseResult.dishes]
    newDishes[index] = { ...newDishes[index], editedCategory: category }
    setParseResult({ ...parseResult, dishes: newDishes })
  }

  const toggleExpanded = (index: number) => {
    const next = new Set(expandedDishes)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setExpandedDishes(next)
  }

  const saveToEvent = async () => {
    if (!parseResult) return
    setSaving(true)
    try {
      const selectedDishes = parseResult.dishes.filter(d => d.selected)

      // Only add dishes that have a matched recipe_id
      const menuItems = selectedDishes
        .filter(d => d.matched_recipe?.id)
        .map(d => ({
          event_id: eventId,
          recipe_id: d.matched_recipe!.id,
          course_order: COURSE_ORDER[d.editedCategory] ?? 3,
          course: d.editedCategory,
        }))

      if (menuItems.length > 0) {
        const res = await fetch(`/api/events/${eventId}/import-mep`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ menu_items: menuItems }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Fout bij opslaan')
        }
      }

      onImportComplete()
      setParseResult(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij opslaan')
    } finally {
      setSaving(false)
    }
  }

  const selectedCount = parseResult?.dishes.filter(d => d.selected).length || 0
  const matchedCount = parseResult?.dishes.filter(d => d.selected && d.matched_recipe).length || 0

  return (
    <div className="bg-stone-900/50 border border-stone-800 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-800 flex items-center gap-2">
        <FileUp className="w-5 h-5 text-brand-400" />
        <h3 className="text-base font-display font-semibold text-stone-100">MEP importeren uit document</h3>
      </div>

      <div className="p-6 space-y-4">
        {/* Drop zone */}
        {!parseResult && !parsing && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
              dragging
                ? 'border-brand-400 bg-brand-500/10'
                : 'border-stone-700 hover:border-stone-600 hover:bg-stone-800/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={handleFileInput}
            />
            <div className="flex flex-col items-center gap-3">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                dragging ? 'bg-brand-500/20' : 'bg-stone-800'
              }`}>
                <Upload className={`w-7 h-7 ${dragging ? 'text-brand-400' : 'text-stone-500'}`} />
              </div>
              <div>
                <p className="text-stone-300 font-medium">
                  {dragging ? 'Loslaten om te uploaden' : 'Sleep een document hierheen'}
                </p>
                <p className="text-stone-500 text-sm mt-1">
                  of klik om te bladeren — PDF, JPG, PNG
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-stone-600">
                <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Menu</span>
                <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Offerte</span>
                <span className="flex items-center gap-1"><Image className="w-3.5 h-3.5" /> MEP lijst</span>
              </div>
            </div>
          </div>
        )}

        {/* Parsing state */}
        {parsing && (
          <div className="flex flex-col items-center gap-4 py-10">
            <div className="relative">
              <div className="w-16 h-16 bg-brand-500/20 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-brand-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-stone-900 rounded-full flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-stone-200 font-medium">Document analyseren...</p>
              <p className="text-stone-500 text-sm mt-1">AI leest uw document en extraheert gerechten</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Fout bij verwerken</p>
              <p className="text-xs mt-0.5 text-red-400/70">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-500/20 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Parse result */}
        {parseResult && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-3 p-3 bg-stone-800/50 rounded-xl">
              <Check className="w-4 h-4 text-emerald-400" />
              <div className="flex-1 text-sm text-stone-300">
                <span className="font-medium">{parseResult.dishes.length} gerechten</span> geëxtraheerd
                {parseResult.document_type && (
                  <span className="text-stone-500"> uit {parseResult.document_type}</span>
                )}
              </div>
              <button
                onClick={() => { setParseResult(null); setError(null) }}
                className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
              >
                Opnieuw uploaden
              </button>
            </div>

            {parseResult.notes && (
              <p className="text-xs text-stone-500 italic">{parseResult.notes}</p>
            )}

            {/* Dishes list */}
            <div className="space-y-2">
              {parseResult.dishes.map((dish, i) => (
                <div key={i} className={`border rounded-xl overflow-hidden transition-all ${
                  dish.selected ? 'border-stone-700' : 'border-stone-800 opacity-50'
                }`}>
                  <div className="flex items-center gap-3 px-4 py-3 bg-stone-800/30">
                    <button
                      onClick={() => toggleDish(i)}
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all ${
                        dish.selected
                          ? 'bg-brand-500 border-brand-400'
                          : 'border-stone-600 hover:border-stone-500'
                      }`}
                    >
                      {dish.selected && <Check className="w-3 h-3 text-white" />}
                    </button>

                    <span className="text-sm font-medium text-stone-200 flex-1">{dish.name}</span>

                    {dish.matched_recipe && (
                      <span className="px-2 py-0.5 bg-brand-500/20 text-brand-300 text-xs rounded-full border border-brand-500/30">
                        Match: {dish.matched_recipe.name} ({Math.round(dish.matched_recipe.score * 100)}%)
                      </span>
                    )}

                    <select
                      value={dish.editedCategory}
                      onChange={e => updateCategory(i, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="px-2 py-1 bg-stone-800 border border-stone-700 rounded-lg text-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <button
                      onClick={() => toggleExpanded(i)}
                      className="p-1 text-stone-500 hover:text-stone-300 transition-colors"
                    >
                      {expandedDishes.has(i)
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />
                      }
                    </button>
                  </div>

                  {expandedDishes.has(i) && dish.components && dish.components.length > 0 && (
                    <div className="px-4 py-3 border-t border-stone-800">
                      <div className="space-y-1">
                        {dish.components.map((comp, ci) => (
                          <div key={ci} className="flex items-center gap-3 text-xs">
                            <span className="text-stone-500 w-24 shrink-0">{comp.group}</span>
                            <span className="text-stone-300 flex-1">{comp.name}</span>
                            <span className="text-stone-400 font-mono">
                              {comp.quantity_per_person} {comp.unit}/p
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Save button */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-stone-500">
                {selectedCount} geselecteerd · {matchedCount} met receptkoppeling
              </p>
              <button
                onClick={saveToEvent}
                disabled={saving || selectedCount === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-all disabled:opacity-50"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Opslaan...</>
                ) : (
                  <><Check className="w-4 h-4" /> MEP aanmaken ({selectedCount})</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
