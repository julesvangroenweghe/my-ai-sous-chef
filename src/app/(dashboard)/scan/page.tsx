'use client'

import { useState, useCallback, useRef } from 'react'
import { Camera, Upload, FileText, Loader2, Check, AlertCircle, Clock, ChevronDown, ChevronRight, X, ScanLine, Tag } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

type ScanState = 'idle' | 'uploading' | 'processing' | 'results' | 'saved' | 'error'
type DocumentType = 'invoice' | 'mep' | 'recipe' | 'pricelist'

interface ScanResultData {
  type: DocumentType
  data: Record<string, unknown>
  confidence: number
}

interface ScanHistoryItem {
  id: string
  type: DocumentType
  title: string
  date: string
  confidence: number
}

const typeLabels: Record<DocumentType, string> = {
  invoice: 'Factuur',
  mep: 'MEP Lijst',
  recipe: 'Recept',
  pricelist: 'Prijslijst',
}

const typeColors: Record<DocumentType, string> = {
  invoice: 'bg-blue-50 text-blue-700',
  mep: 'bg-emerald-50 text-emerald-700',
  recipe: 'bg-amber-50 text-amber-700',
  pricelist: 'bg-violet-50 text-violet-700',
}

const docTypeOptions: { value: DocumentType | 'auto'; label: string }[] = [
  { value: 'auto', label: 'Automatisch detecteren' },
  { value: 'pricelist', label: 'Prijslijst' },
  { value: 'invoice', label: 'Factuur' },
  { value: 'mep', label: 'MEP Lijst' },
  { value: 'recipe', label: 'Recept' },
]

export default function ScanPage() {
  const [state, setState] = useState<ScanState>('idle')
  const [result, setResult] = useState<ScanResultData | null>(null)
  const [error, setError] = useState<string>('')
  const [dragOver, setDragOver] = useState(false)
  const [history, setHistory] = useState<ScanHistoryItem[]>([])
  const [expandedDishes, setExpandedDishes] = useState<Set<number>>(new Set())
  const [docType, setDocType] = useState<DocumentType | 'auto'>('auto')
  const [importing, setImporting] = useState(false)
  const [importDone, setImportDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    setState('uploading')
    setError('')
    setResult(null)
    setImportDone(false)

    try {
      setState('processing')

      // Use FormData - works in browser without Buffer polyfill
      const formData = new FormData()
      formData.append('file', file)
      if (docType !== 'auto') {
        formData.append('type', docType)
      }

      const response = await fetch('/api/scan', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Scan mislukt')
      }

      const data: ScanResultData = await response.json()
      setResult(data)
      setState('results')

      const historyItem: ScanHistoryItem = {
        id: Date.now().toString(),
        type: data.type,
        title: getResultTitle(data),
        date: new Date().toISOString(),
        confidence: data.confidence,
      }
      setHistory(prev => [historyItem, ...prev].slice(0, 10))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
      setState('error')
    }
  }, [docType])

  const getResultTitle = (data: ScanResultData): string => {
    if (data.type === 'invoice') return (data.data.supplier_name as string) || 'Factuur'
    if (data.type === 'mep') return (data.data.title as string) || 'MEP Lijst'
    if (data.type === 'recipe') return (data.data.name as string) || 'Recept'
    if (data.type === 'pricelist') return (data.data.supplier_name as string) || 'Prijslijst'
    return 'Document'
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const toggleDish = (index: number) => {
    setExpandedDishes(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const resetScan = () => {
    setState('idle')
    setResult(null)
    setError('')
    setImportDone(false)
  }

  const handleImportPricelist = async () => {
    if (!result || result.type !== 'pricelist') return
    setImporting(true)
    try {
      const response = await fetch('/api/scan/import-pricelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      })
      if (response.ok) setImportDone(true)
    } catch (err) {
      console.error('Import error:', err)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-extrabold text-stone-900 tracking-tight">Scanner</h1>
            <p className="text-[#9E7E60] text-sm mt-0.5">Scan facturen, prijslijsten, MEP-lijsten of recepten met AI-herkenning</p>
          </div>
        </div>
      </div>

      {/* Document type selector */}
      {(state === 'idle' || state === 'error') && (
        <div className="animate-fade-in">
          <p className="text-xs font-semibold text-[#9E7E60] uppercase tracking-wider mb-3">Document type</p>
          <div className="flex flex-wrap gap-2">
            {docTypeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDocType(opt.value as DocumentType | 'auto')}
                className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                  docType === opt.value
                    ? 'border-amber-400 bg-amber-50 text-amber-700'
                    : 'border-stone-200 bg-white text-[#5C4730] hover:border-amber-200 hover:bg-amber-50/30'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload Zone */}
      {(state === 'idle' || state === 'error') && (
        <div className="animate-slide-up">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            className={`
              relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300
              ${dragOver
                ? 'border-amber-400 bg-amber-50/50 scale-[1.01]'
                : 'border-stone-200 bg-white hover:border-amber-300 hover:bg-amber-50/20'
              }
            `}
          >
            <div className="flex flex-col items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                dragOver ? 'bg-amber-100' : 'bg-stone-100'
              }`}>
                <Upload className={`w-8 h-8 ${dragOver ? 'text-amber-600' : 'text-[#9E7E60]'}`} />
              </div>
              <div>
                <p className="font-display font-semibold text-stone-900 text-lg">Sleep een document hierheen</p>
                <p className="text-[#9E7E60] text-sm mt-1">Of klik om een bestand te selecteren</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => fileInputRef.current?.click()} className="btn-primary">
                  <FileText className="w-4 h-4" />
                  Bestand kiezen
                </button>
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium border border-stone-200 text-[#5C4730] hover:bg-stone-50 flex items-center gap-2 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Camera
                </button>
              </div>
              <p className="text-[11px] text-[#5C4730] mt-2">JPG, PNG, HEIC, PDF - max 10MB</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="hidden" />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
          </div>

          {state === 'error' && (
            <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">{error}</p>
                <button onClick={resetScan} className="text-xs text-red-600 hover:text-red-700 mt-1 font-medium">Opnieuw proberen</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Processing State */}
      {(state === 'uploading' || state === 'processing') && (
        <div className="card p-12 text-center animate-scale-in">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
            </div>
            <div>
              <p className="font-display font-semibold text-stone-900">
                {state === 'uploading' ? 'Document uploaden...' : 'AI analyseert je document...'}
              </p>
              <p className="text-[#9E7E60] text-sm mt-1">
                {state === 'processing' && 'Tekst herkennen, producten extraheren en prijzen matchen'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {state === 'results' && result && (
        <div className="space-y-6 animate-slide-up">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${typeColors[result.type]}`}>
                  {typeLabels[result.type]}
                </span>
                <span className="text-xs text-[#9E7E60]">Betrouwbaarheid: {Math.round(result.confidence * 100)}%</span>
              </div>
              <button onClick={resetScan} className="text-[#9E7E60] hover:text-[#5C4730] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Prijslijst Results */}
            {result.type === 'pricelist' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-stone-50 rounded-xl">
                  <div>
                    <p className="text-[11px] text-[#9E7E60] uppercase tracking-wider">Leverancier</p>
                    <p className="font-medium text-stone-900">{result.data.supplier_name as string || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#9E7E60] uppercase tracking-wider">Datum</p>
                    <p className="font-medium text-stone-900">{result.data.price_date as string || '-'}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-100">
                        <th className="text-left py-2 px-3 text-[11px] text-[#9E7E60] uppercase tracking-wider font-semibold">Product</th>
                        <th className="text-left py-2 px-3 text-[11px] text-[#9E7E60] uppercase tracking-wider font-semibold">Eenheid</th>
                        <th className="text-right py-2 px-3 text-[11px] text-[#9E7E60] uppercase tracking-wider font-semibold">Prijs</th>
                        <th className="text-right py-2 px-3 text-[11px] text-[#9E7E60] uppercase tracking-wider font-semibold">Prijs/kg</th>
                        <th className="text-center py-2 px-3 text-[11px] text-[#9E7E60] uppercase tracking-wider font-semibold">Match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(result.data.products as Array<Record<string, unknown>> || []).map((item, i) => (
                        <tr key={i} className="border-b border-stone-50 hover:bg-stone-50/50">
                          <td className="py-2.5 px-3 font-medium text-stone-900">{item.product_name as string}</td>
                          <td className="py-2.5 px-3 text-[#B8997A]">{item.unit as string}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#5C4730]">{formatCurrency(item.price as number)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#5C4730]">{item.price_per_kg ? formatCurrency(item.price_per_kg as number) : '-'}</td>
                          <td className="py-2.5 px-3 text-center">
                            {item.matched_ingredient_name ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <Check className="w-3 h-3" />
                                {item.matched_ingredient_name as string}
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#5C4730]">Geen match</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleImportPricelist}
                    disabled={importing || importDone}
                    className="btn-primary flex-1 justify-center"
                  >
                    {importing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Importeren...</>
                    ) : importDone ? (
                      <><Check className="w-4 h-4" /> Prijzen geïmporteerd</>
                    ) : (
                      <><Tag className="w-4 h-4" /> Prijzen importeren naar leveranciers</>
                    )}
                  </button>
                  <button onClick={resetScan} className="px-4 py-2.5 rounded-xl text-sm font-medium border border-stone-200 text-[#5C4730] hover:bg-stone-50 transition-colors">
                    Nieuwe scan
                  </button>
                </div>
                {importDone && (
                  <p className="text-xs text-emerald-600 text-center">Prijzen zijn bijgewerkt in de leveranciersmodule</p>
                )}
              </div>
            )}

            {/* Factuur Results */}
            {result.type === 'invoice' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 p-4 bg-stone-50 rounded-xl">
                  <div>
                    <p className="text-[11px] text-[#9E7E60] uppercase tracking-wider">Leverancier</p>
                    <p className="font-medium text-stone-900">{result.data.supplier_name as string || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#9E7E60] uppercase tracking-wider">Factuurdatum</p>
                    <p className="font-medium text-stone-900">{result.data.invoice_date as string || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#9E7E60] uppercase tracking-wider">Factuurnummer</p>
                    <p className="font-medium text-stone-900">{result.data.invoice_number as string || '-'}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-100">
                        <th className="text-left py-2 px-3 text-[11px] text-[#9E7E60] uppercase tracking-wider font-semibold">Product</th>
                        <th className="text-right py-2 px-3 text-[11px] text-[#9E7E60] uppercase tracking-wider font-semibold">Aantal</th>
                        <th className="text-left py-2 px-3 text-[11px] text-[#9E7E60] uppercase tracking-wider font-semibold">Eenheid</th>
                        <th className="text-right py-2 px-3 text-[11px] text-[#9E7E60] uppercase tracking-wider font-semibold">Stukprijs</th>
                        <th className="text-right py-2 px-3 text-[11px] text-[#9E7E60] uppercase tracking-wider font-semibold">Totaal</th>
                        <th className="text-center py-2 px-3 text-[11px] text-[#9E7E60] uppercase tracking-wider font-semibold">Match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(result.data.line_items as Array<Record<string, unknown>> || []).map((item, i) => (
                        <tr key={i} className="border-b border-stone-50 hover:bg-stone-50/50">
                          <td className="py-2.5 px-3 font-medium text-stone-900">{item.product_name as string}</td>
                          <td className="py-2.5 px-3 text-right text-[#5C4730]">{item.quantity as number}</td>
                          <td className="py-2.5 px-3 text-[#B8997A]">{item.unit as string}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#5C4730]">{formatCurrency(item.unit_price as number)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-stone-900">{formatCurrency(item.total as number)}</td>
                          <td className="py-2.5 px-3 text-center">
                            {item.matched_ingredient_name ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <Check className="w-3 h-3" />
                                {item.matched_ingredient_name as string}
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#5C4730]">Geen match</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-stone-200">
                        <td colSpan={4} className="py-3 px-3 font-semibold text-stone-900">Totaal</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-stone-900">{formatCurrency(result.data.total_amount as number)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <button className="btn-primary w-full justify-center">
                  <FileText className="w-4 h-4" />
                  Import prijzen
                </button>
              </div>
            )}

            {/* MEP Results */}
            {result.type === 'mep' && (
              <div className="space-y-4">
                <h3 className="font-display font-semibold text-stone-900">{result.data.title as string}</h3>
                {(result.data.dishes as Array<Record<string, unknown>> || []).map((dish, i) => (
                  <div key={i} className="border border-stone-100 rounded-xl overflow-hidden">
                    <button onClick={() => toggleDish(i)} className="w-full flex items-center justify-between p-4 hover:bg-stone-50 transition-colors">
                      <span className="font-medium text-stone-900">{dish.name as string}</span>
                      {expandedDishes.has(i) ? <ChevronDown className="w-4 h-4 text-[#9E7E60]" /> : <ChevronRight className="w-4 h-4 text-[#9E7E60]" />}
                    </button>
                    {expandedDishes.has(i) && (
                      <div className="px-4 pb-4 space-y-3">
                        {(dish.components as Array<Record<string, unknown>> || []).map((comp, j) => (
                          <div key={j}>
                            <p className="text-xs font-semibold text-[#B8997A] uppercase tracking-wider mb-1">{comp.name as string}</p>
                            <div className="space-y-1">
                              {(comp.ingredients as Array<Record<string, unknown>> || []).map((ing, k) => (
                                <div key={k} className="flex items-center justify-between text-sm py-1">
                                  <span className="text-stone-700">{ing.name as string}</span>
                                  <span className="font-mono text-[#B8997A]">{ing.quantity as string}{ing.unit as string}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <button className="btn-primary w-full justify-center">
                  <FileText className="w-4 h-4" />
                  Import naar MEP
                </button>
              </div>
            )}

            {/* Recipe Results */}
            {result.type === 'recipe' && (
              <div className="space-y-4">
                <h3 className="font-display text-xl font-bold text-stone-900">{result.data.name as string}</h3>
                <div className="flex gap-4 text-sm text-[#B8997A]">
                  {result.data.servings && <span>{result.data.servings as number} personen</span>}
                  {result.data.prep_time_minutes && <span>{result.data.prep_time_minutes as number} min</span>}
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-stone-700 mb-3 uppercase tracking-wider">Ingrediënten</h4>
                    <div className="space-y-1.5">
                      {(result.data.ingredients as Array<Record<string, unknown>> || []).map((ing, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-stone-50">
                          <span className="text-stone-700">{ing.name as string}</span>
                          <span className="font-mono text-[#B8997A]">{ing.quantity as string} {ing.unit as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-700 mb-3 uppercase tracking-wider">Bereiding</h4>
                    <ol className="space-y-2">
                      {(result.data.method as string[] || []).map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm">
                          <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 text-xs font-semibold">{i + 1}</span>
                          <span className="text-[#5C4730] leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
                <button className="btn-primary w-full justify-center">
                  <Check className="w-4 h-4" />
                  Opslaan als recept
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scan Geschiedenis */}
      {history.length > 0 && (
        <div className="animate-fade-in">
          <h2 className="font-display font-semibold text-stone-900 mb-4">Recente scans</h2>
          <div className="space-y-2">
            {history.map(item => (
              <div key={item.id} className="card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${typeColors[item.type]}`}>
                    {typeLabels[item.type]}
                  </span>
                  <span className="text-sm font-medium text-stone-900">{item.title}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#9E7E60]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(item.date)}
                  </span>
                  <span>{Math.round(item.confidence * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
