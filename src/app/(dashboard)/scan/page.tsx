'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Camera, Upload, FileText, Loader2, Check, AlertCircle, Clock, ChevronDown, ChevronRight, X, ScanLine, Tag, ArrowRight, Package, BookOpen, ClipboardList, Trash2, Calendar } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

type ScanState = 'idle' | 'uploading' | 'processing' | 'results' | 'error'
type DocumentType = 'invoice' | 'mep' | 'recipe' | 'pricelist' | 'event_brief' | 'other'

interface ScanResultData {
  type: DocumentType
  data: Record<string, unknown>
  confidence: number
  saved?: boolean
  saved_id?: string
  auto_imported?: boolean
  import_result?: Record<string, unknown>
}

interface ScannedDoc {
  id: string
  document_type: DocumentType
  title: string
  confidence: number
  auto_imported: boolean
  import_summary: Record<string, unknown> | null
  created_at: string
  linked_event_id: string | null
  extracted_date: string | null
}

interface AppEvent {
  id: string
  name: string
  event_date: string
  status: string
}

const typeLabels: Record<DocumentType, string> = {
  invoice: 'Factuur',
  mep: 'MEP Lijst',
  recipe: 'Recept',
  pricelist: 'Prijslijst',
  event_brief: 'Event Brief',
  other: 'Document',
}

const typeColors: Record<DocumentType, string> = {
  invoice: 'bg-blue-50 text-blue-700',
  mep: 'bg-emerald-50 text-emerald-700',
  recipe: 'bg-amber-50 text-amber-700',
  pricelist: 'bg-violet-50 text-violet-700',
  event_brief: 'bg-orange-50 text-orange-700',
  other: 'bg-stone-50 text-stone-600',
}

const typeIcons: Record<DocumentType, React.ReactNode> = {
  invoice: <FileText className="w-4 h-4" />,
  mep: <ClipboardList className="w-4 h-4" />,
  recipe: <BookOpen className="w-4 h-4" />,
  pricelist: <Package className="w-4 h-4" />,
  event_brief: <Calendar className="w-4 h-4" />,
  other: <FileText className="w-4 h-4" />,
}

const docTypeOptions: { value: DocumentType | 'auto'; label: string }[] = [
  { value: 'auto', label: 'Automatisch detecteren' },
  { value: 'pricelist', label: 'Prijslijst' },
  { value: 'invoice', label: 'Factuur' },
  { value: 'mep', label: 'MEP Lijst' },
  { value: 'recipe', label: 'Recept' },
  { value: 'event_brief', label: 'Event Brief' },
]

function ImportFeedback({ result }: { result: ScanResultData }) {
  if (!result.auto_imported || !result.import_result) return null
  const r = result.import_result
  if (result.type === 'pricelist') {
    return (
      <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
          <Check className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-800">Automatisch geïmporteerd</p>
          <p className="text-xs text-emerald-600 mt-0.5">
            {r.imported as number} producten bijgewerkt bij <strong>{r.supplier_name as string}</strong>
            {(r.skipped as number) > 0 && ` · ${r.skipped as number} overgeslagen`}
          </p>
          <a href="/mep/leveranciers" className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium mt-2 hover:underline">
            Bekijk leverancier <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    )
  }
  if (result.type === 'recipe' && r.recipe_id) {
    return (
      <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
          <Check className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-800">Recept opgeslagen</p>
          <p className="text-xs text-emerald-600 mt-0.5">
            <strong>{r.recipe_name as string}</strong> is toegevoegd aan je receptenbibliotheek
          </p>
          <a href="/recepten" className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium mt-2 hover:underline">
            Bekijk recepten <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    )
  }
  return null
}

function formatNLDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export default function ScanPage() {
  const [state, setState] = useState<ScanState>('idle')
  const [result, setResult] = useState<ScanResultData | null>(null)
  const [error, setError] = useState<string>('')
  const [dragOver, setDragOver] = useState(false)
  const [history, setHistory] = useState<ScannedDoc[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [expandedDishes, setExpandedDishes] = useState<Set<number>>(new Set())
  const [docType, setDocType] = useState<DocumentType | 'auto'>('auto')
  const [importing, setImporting] = useState(false)
  const [importDone, setImportDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [events, setEvents] = useState<AppEvent[]>([])
  const [linkingDoc, setLinkingDoc] = useState<string | null>(null)
  const [linkingEventId, setLinkingEventId] = useState<string>('')
  const [linkSaving, setLinkSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadHistory = () => {
    fetch('/api/scan/history')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setHistory(data) })
      .catch(() => {})
  }

  useEffect(() => {
    loadHistory()
    setHistoryLoading(false)

    // Laad toekomstige events voor koppeling
    fetch('/api/events')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const today = new Date().toISOString().split('T')[0]
          // Toon events tot 1 jaar vooruit, gesorteerd op datum
          const upcoming = data
            .filter((ev: AppEvent) => ev.event_date >= today)
            .sort((a: AppEvent, b: AppEvent) => a.event_date.localeCompare(b.event_date))
          setEvents(upcoming)
        }
      })
      .catch(() => {})
  }, [])

  const handleLinkToEvent = async (docId: string) => {
    if (!linkingEventId) return
    setLinkSaving(true)
    await fetch(`/api/scan/${docId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linked_event_id: linkingEventId }),
    })
    setLinkSaving(false)
    setLinkingDoc(null)
    setLinkingEventId('')
    loadHistory()
  }

  const handleDeleteScan = async (docId: string) => {
    if (!confirm('Scan verwijderen uit de geschiedenis?')) return
    setDeletingId(docId)
    await fetch('/api/scan/history', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: docId }),
    })
    setDeletingId(null)
    loadHistory()
  }

  const processFile = useCallback(async (file: File) => {
    setState('uploading')
    setError('')
    setResult(null)
    setImportDone(false)

    try {
      setState('processing')
      const formData = new FormData()
      formData.append('file', file)
      if (docType !== 'auto') formData.append('type', docType)

      const response = await fetch('/api/scan', { method: 'POST', body: formData })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Scan mislukt')
      }
      const data: ScanResultData = await response.json()
      setResult(data)
      setState('results')
      loadHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
      setState('error')
    }
  }, [docType])

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
      if (next.has(index)) next.delete(index); else next.add(index)
      return next
    })
  }

  const resetScan = () => {
    setState('idle')
    setResult(null)
    setError('')
    setImportDone(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
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
      if (response.ok) {
        setImportDone(true)
        loadHistory()
      }
    } catch (err) {
      console.error('Import error:', err)
    } finally {
      setImporting(false)
    }
  }

  const getImportSummary = (doc: ScannedDoc): string => {
    if (!doc.auto_imported || !doc.import_summary) return 'Opgeslagen'
    const s = doc.import_summary
    if (doc.document_type === 'pricelist') return `${s.imported} producten bij ${s.supplier_name}`
    if (doc.document_type === 'recipe') return 'Opgeslagen als recept'
    return 'Automatisch geïmporteerd'
  }

  const getLinkedEventName = (doc: ScannedDoc): string | null => {
    if (!doc.linked_event_id) return null
    const ev = events.find(e => e.id === doc.linked_event_id)
    return ev ? ev.name : 'Gekoppeld event'
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
            <p className="text-[#9E7E60] text-sm mt-0.5">Scan facturen, prijslijsten, MEP-lijsten of event briefs — automatisch verwerkt en opgeslagen</p>
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
              <p className="text-[11px] text-[#5C4730] mt-2">JPG, PNG, PDF — max 10MB · Geen HEIC</p>
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
                {state === 'processing' && 'Tekst herkennen, producten extraheren en automatisch opslaan'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {state === 'results' && result && (
        <div className="space-y-4 animate-slide-up">
          <ImportFeedback result={result} />
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${typeColors[result.type]}`}>
                  {typeLabels[result.type]}
                </span>
                <span className="text-xs text-[#9E7E60]">Betrouwbaarheid: {Math.round(result.confidence * 100)}%</span>
                {result.saved && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-500 bg-stone-50 px-2 py-0.5 rounded-full border border-stone-100">
                    <Check className="w-3 h-3" /> Opgeslagen
                  </span>
                )}
              </div>
              <button onClick={resetScan} className="text-[#9E7E60] hover:text-[#5C4730] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Prijslijst */}
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
                {!result.auto_imported && (
                  <div className="flex items-center gap-3">
                    <button onClick={handleImportPricelist} disabled={importing || importDone} className="btn-primary flex-1 justify-center">
                      {importing ? <><Loader2 className="w-4 h-4 animate-spin" /> Importeren...</> : importDone ? <><Check className="w-4 h-4" /> Prijzen geïmporteerd</> : <><Tag className="w-4 h-4" /> Prijzen importeren naar leveranciers</>}
                    </button>
                    <button onClick={resetScan} className="px-4 py-2.5 rounded-xl text-sm font-medium border border-stone-200 text-[#5C4730] hover:bg-stone-50 transition-colors">Nieuwe scan</button>
                  </div>
                )}
                {result.auto_imported && (
                  <button onClick={resetScan} className="w-full px-4 py-2.5 rounded-xl text-sm font-medium border border-stone-200 text-[#5C4730] hover:bg-stone-50 transition-colors">Nieuwe scan</button>
                )}
              </div>
            )}

            {/* Factuur */}
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
                                <Check className="w-3 h-3" />{item.matched_ingredient_name as string}
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
                <p className="text-xs text-[#9E7E60] text-center">Factuur opgeslagen in scanhistorie</p>
              </div>
            )}

            {/* MEP */}
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
                <a href="/mep" className="btn-primary w-full justify-center flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Bekijk MEP module
                </a>
              </div>
            )}

            {/* Recipe */}
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
                {result.auto_imported ? (
                  <a href="/recepten" className="btn-primary w-full justify-center flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Bekijk in receptenbibliotheek
                  </a>
                ) : (
                  <p className="text-xs text-[#9E7E60] text-center">Opgeslagen in scanhistorie</p>
                )}
              </div>
            )}

            {/* Event Brief */}
            {result.type === 'event_brief' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-orange-50 rounded-xl">
                  {result.data.client_name && <div>
                    <p className="text-[11px] text-orange-600 uppercase tracking-wider">Klant</p>
                    <p className="font-medium text-stone-900">{result.data.client_name as string}</p>
                  </div>}
                  {result.data.event_date && <div>
                    <p className="text-[11px] text-orange-600 uppercase tracking-wider">Datum</p>
                    <p className="font-medium text-stone-900">{result.data.event_date as string}</p>
                  </div>}
                  {result.data.num_persons && <div>
                    <p className="text-[11px] text-orange-600 uppercase tracking-wider">Personen</p>
                    <p className="font-medium text-stone-900">{result.data.num_persons as number}</p>
                  </div>}
                  {result.data.location && <div>
                    <p className="text-[11px] text-orange-600 uppercase tracking-wider">Locatie</p>
                    <p className="font-medium text-stone-900">{result.data.location as string}</p>
                  </div>}
                  {result.data.price_per_person && <div>
                    <p className="text-[11px] text-orange-600 uppercase tracking-wider">Budget p.p.</p>
                    <p className="font-medium text-stone-900">{formatCurrency(result.data.price_per_person as number)}</p>
                  </div>}
                </div>
                <p className="text-xs text-[#9E7E60] text-center">Brief opgeslagen — koppel hieronder aan een bestaand event of maak een nieuw event aan</p>
                <a href="/events" className="btn-primary w-full justify-center flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Naar events
                </a>
              </div>
            )}
          </div>

          <button onClick={resetScan} className="w-full px-4 py-3 rounded-xl text-sm font-medium border border-stone-200 text-[#5C4730] hover:bg-stone-50 transition-colors flex items-center justify-center gap-2">
            <ScanLine className="w-4 h-4" />
            Nieuw document scannen
          </button>
        </div>
      )}

      {/* Scanhistorie */}
      <div className="animate-fade-in">
        <h2 className="font-display font-semibold text-stone-900 mb-4">Scanhistorie</h2>
        {historyLoading ? (
          <div className="flex items-center justify-center py-8 text-[#9E7E60]">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Laden...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-3">
              <ScanLine className="w-6 h-6 text-[#9E7E60]" />
            </div>
            <p className="text-sm font-medium text-stone-700">Nog geen documenten gescand</p>
            <p className="text-xs text-[#9E7E60] mt-1">Gescande documenten verschijnen hier en blijven bewaard</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(item => (
              <div key={item.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${typeColors[item.document_type as DocumentType] || 'bg-stone-50 text-stone-600'}`}>
                      {typeIcons[item.document_type as DocumentType]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{item.title}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <span className="text-xs text-[#9E7E60] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(item.created_at)}
                        </span>
                        <span className="text-xs text-[#9E7E60]">{Math.round(item.confidence * 100)}%</span>
                        {item.auto_imported && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                            <Check className="w-3 h-3" />
                            {getImportSummary(item)}
                          </span>
                        )}
                        {/* Geëxtraheerde datum suggestie */}
                        {item.extracted_date && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                            <Calendar className="w-3 h-3" />
                            {formatNLDate(item.extracted_date)}
                          </span>
                        )}
                        {/* Gekoppeld event badge */}
                        {item.linked_event_id && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <ArrowRight className="w-3 h-3" />
                            {getLinkedEventName(item)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acties rechts */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Event koppelen */}
                    {linkingDoc === item.id ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={linkingEventId}
                          onChange={e => setLinkingEventId(e.target.value)}
                          className="text-xs border border-[#E8D5B5] rounded-lg px-2 py-1.5 bg-white text-[#2C1810] focus:outline-none focus:ring-1 focus:ring-amber-400 max-w-[160px]"
                        >
                          <option value="">Kies event...</option>
                          {events.map(ev => (
                            <option key={ev.id} value={ev.id}>
                              {ev.name} · {new Date(ev.event_date + 'T12:00:00').toLocaleDateString('nl-BE', {day:'numeric', month:'short'})}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleLinkToEvent(item.id)}
                          disabled={!linkingEventId || linkSaving}
                          className="px-2 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg transition-all disabled:opacity-50"
                        >
                          {linkSaving ? '...' : 'OK'}
                        </button>
                        <button onClick={() => { setLinkingDoc(null); setLinkingEventId('') }} className="p-1.5 text-[#9E7E60] hover:text-[#5C4730]">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setLinkingDoc(item.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E8D5B5] bg-white hover:bg-amber-50 hover:border-amber-300 text-[#9E7E60] hover:text-amber-700 transition-all text-xs"
                        title="Koppel aan event"
                      >
                        <Calendar className="w-3 h-3" />
                        {item.linked_event_id ? 'Wijzig' : 'Event'}
                      </button>
                    )}

                    {/* Verwijder knop */}
                    <button
                      onClick={() => handleDeleteScan(item.id)}
                      disabled={deletingId === item.id}
                      className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-red-50 hover:border-red-200 text-[#9E7E60] hover:text-red-500 transition-all"
                      title="Verwijder scan"
                    >
                      {deletingId === item.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
