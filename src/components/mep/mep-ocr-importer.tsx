'use client'

import { useState, useCallback, useRef } from 'react'
import {
  Upload, Loader2, Check, X, FileText,
  ChevronDown, ChevronUp, AlertCircle, FileUp, Sparkles
} from 'lucide-react'

interface ImportedComponent {
  component_name: string
  quantity: number | null
  unit: string | null
  preparation: string | null
  component_group: string | null
  sort_order: number
}

interface ImportedDish {
  title: string
  category: string
  sort_order: number
  notes: string | null
  components: ImportedComponent[]
  // UI state
  selected: boolean
  editedCategory: string
}

interface MepOcrImporterProps {
  eventId: string
  onImportComplete: () => void
}

const CATEGORY_OPTIONS = [
  'DRANKEN', 'LUNCH', 'FINGERFOOD', 'FINGERBITES', 'HAPJES', 'APPETIZERS',
  'AMUSE', 'VOORGERECHT', 'TUSSENGERECHT', 'HOOFDGERECHT', 'HOOFDGERECHT PREMIUM',
  'ON THE SIDE', 'KAAS', 'DESSERT', 'MIGNARDISES', 'LATE NIGHT SNACK', 'KIDS',
  'BROOD & BOTER', 'WALKING VOORGERECHT', 'WALKING DINNER', 'SHARING VOORGERECHT',
]

export function MepOcrImporter({ eventId, onImportComplete }: MepOcrImporterProps) {
  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parsedDishes, setParsedDishes] = useState<ImportedDish[] | null>(null)
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
    setParsedDishes(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/mep/${eventId}/import-dishes`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Fout bij verwerken')
      }

      const data = await res.json()
      const dishes: ImportedDish[] = (data.dishes || []).map((d: any) => ({
        ...d,
        selected: true,
        editedCategory: d.category || 'FINGERFOOD',
      }))

      setParsedDishes(dishes)
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
    if (!parsedDishes) return
    const newDishes = [...parsedDishes]
    newDishes[index] = { ...newDishes[index], selected: !newDishes[index].selected }
    setParsedDishes(newDishes)
  }

  const updateCategory = (index: number, category: string) => {
    if (!parsedDishes) return
    const newDishes = [...parsedDishes]
    newDishes[index] = { ...newDishes[index], editedCategory: category }
    setParsedDishes(newDishes)
  }

  const toggleExpanded = (index: number) => {
    const next = new Set(expandedDishes)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setExpandedDishes(next)
  }

  const saveToEvent = async () => {
    if (!parsedDishes) return
    setSaving(true)
    try {
      const selectedDishes = parsedDishes
        .filter(d => d.selected)
        .map(d => ({ ...d, category: d.editedCategory }))

      if (selectedDishes.length === 0) {
        setError('Selecteer minstens één gerecht')
        setSaving(false)
        return
      }

      const res = await fetch(`/api/mep/${eventId}/import-dishes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishes: selectedDishes }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Fout bij opslaan')
      }

      onImportComplete()
      setParsedDishes(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij opslaan')
    } finally {
      setSaving(false)
    }
  }

  const selectedCount = parsedDishes?.filter(d => d.selected).length || 0

  return (
    <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E8D5B5] flex items-center gap-2">
        <FileUp className="w-5 h-5 text-brand-400" />
        <h3 className="text-base font-display font-semibold text-[#2C1810]">Gerechten importeren uit document</h3>
      </div>

      <div className="p-6 space-y-4">
        {/* Drop zone */}
        {!parsedDishes && !parsing && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
              dragging
                ? 'border-brand-400 bg-brand-500/10'
                : 'border-[#E8D5B5] hover:border-[#D4B896] hover:bg-white/30'
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
                dragging ? 'bg-brand-500/20' : 'bg-white'
              }`}>
                <Upload className={`w-7 h-7 ${dragging ? 'text-brand-400' : 'text-[#B8997A]'}`} />
              </div>
              <div>
                <p className="text-[#5C4730] font-medium">
                  {dragging ? 'Loslaten om te uploaden' : 'Sleep een document hierheen'}
                </p>
                <p className="text-[#B8997A] text-sm mt-1">
                  of klik om te bladeren — PDF, JPG, PNG
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#5C4730]">
                <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Menu PDF</span>
                <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> MEP lijst</span>
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
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-[#3D2810] font-medium">Document analyseren...</p>
              <p className="text-[#B8997A] text-sm mt-1">AI extraheert gerechten en ingrediënten</p>
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
        {parsedDishes && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-3 p-3 bg-[#FDF8F2]/80 rounded-xl">
              <Check className="w-4 h-4 text-emerald-400" />
              <div className="flex-1 text-sm text-[#5C4730]">
                <span className="font-medium">{parsedDishes.length} gerechten</span> geëxtraheerd — selecteer welke je wil toevoegen
              </div>
              <button
                onClick={() => { setParsedDishes(null); setError(null) }}
                className="text-xs text-[#B8997A] hover:text-[#5C4730] transition-colors"
              >
                Opnieuw uploaden
              </button>
            </div>

            {/* Dishes list */}
            <div className="space-y-2">
              {parsedDishes.map((dish, i) => (
                <div key={i} className={`border rounded-xl overflow-hidden transition-all ${
                  dish.selected ? 'border-[#E8D5B5]' : 'border-[#E8D5B5] opacity-50'
                }`}>
                  <div className="flex items-center gap-3 px-4 py-3 bg-white/30">
                    <button
                      onClick={() => toggleDish(i)}
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all ${
                        dish.selected
                          ? 'bg-brand-500 border-brand-400'
                          : 'border-[#D4B896] hover:border-stone-500'
                      }`}
                    >
                      {dish.selected && <Check className="w-3 h-3 text-[#2C1810]" />}
                    </button>

                    <span className="text-sm font-medium text-[#3D2810] flex-1">{dish.title}</span>

                    <select
                      value={dish.editedCategory}
                      onChange={e => updateCategory(i, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="px-2 py-1 bg-white border border-[#E8D5B5] rounded-lg text-[#5C4730] text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <button
                      onClick={() => toggleExpanded(i)}
                      className="p-1 text-[#B8997A] hover:text-[#5C4730] transition-colors"
                    >
                      {expandedDishes.has(i)
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />
                      }
                    </button>
                  </div>

                  {expandedDishes.has(i) && dish.components && dish.components.length > 0 && (
                    <div className="px-4 py-3 border-t border-[#E8D5B5]">
                      <div className="space-y-1">
                        {dish.components.map((comp, ci) => (
                          <div key={ci} className="flex items-center gap-3 text-xs">
                            {comp.component_group && (
                              <span className="text-[#B8997A] w-20 shrink-0 italic">{comp.component_group}</span>
                            )}
                            <span className="text-[#5C4730] flex-1">{comp.component_name}</span>
                            {comp.quantity != null && (
                              <span className="text-[#9E7E60] font-mono">
                                {comp.quantity}{comp.unit ? ` ${comp.unit}` : ''}
                              </span>
                            )}
                            {comp.preparation && (
                              <span className="text-[#B8997A] italic">{comp.preparation}</span>
                            )}
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
              <p className="text-xs text-[#B8997A]">
                {selectedCount} van {parsedDishes.length} gerechten geselecteerd
              </p>
              <button
                onClick={saveToEvent}
                disabled={saving || selectedCount === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-[#2C1810] font-medium rounded-xl transition-all disabled:opacity-50"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Opslaan...</>
                ) : (
                  <><Check className="w-4 h-4" /> Toevoegen aan MEP ({selectedCount})</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
