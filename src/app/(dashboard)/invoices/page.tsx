'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useKitchen } from '@/providers/kitchen-provider'
import {
  FileText, Upload, Camera, Search, CheckCircle2, Clock,
  AlertCircle, Loader2, X, ChevronDown, ChevronUp, ArrowUpRight,
  ArrowDownRight, Package, Pencil, Check, RefreshCw, Eye,
  ImageIcon, FileUp, Trash2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'

// ─── Types ──────────────────────────────────────────────────────────────────

interface LineItem {
  id?: string
  product_name: string
  quantity: number
  unit: string
  unit_price: number
  total: number
  confidence?: number
  matched_ingredient_id: string | null
  matched_ingredient_name: string | null
  current_db_price?: number | null
}

interface OcrData {
  supplier_name?: string
  invoice_date?: string
  invoice_number?: string
  line_items?: LineItem[]
  total_amount?: number
  confidence?: number
  confirmed?: boolean
}

interface Factuur {
  id: string
  kitchen_id: string
  supplier_name: string | null
  invoice_date: string | null
  total_amount: number | null
  image_url: string | null
  ocr_status: 'pending' | 'processing' | 'completed' | 'failed'
  ocr_data: OcrData | null
  created_at: string
  updated_at: string
}

interface IngredientOption {
  id: string
  name: string
  category: string | null
  current_price: number | null
  unit: string | null
}

type PageState = 'list' | 'uploading' | 'processing' | 'review'

// ─── Status Badge Component ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; label: string; classes: string }> = {
    pending: {
      icon: <Clock className="w-3 h-3" />,
      label: 'Wachtend',
      classes: 'bg-stone-800/60 text-stone-300 border-stone-700',
    },
    processing: {
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      label: 'Verwerken',
      classes: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
    },
    completed: {
      icon: <CheckCircle2 className="w-3 h-3" />,
      label: 'Voltooid',
      classes: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
    },
    failed: {
      icon: <AlertCircle className="w-3 h-3" />,
      label: 'Mislukt',
      classes: 'bg-red-900/40 text-red-300 border-red-700/50',
    },
  }
  const c = config[status] || config.pending
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${c.classes}`}>
      {c.icon}
      {c.label}
    </span>
  )
}

// ─── Price Change Indicator ─────────────────────────────────────────────────

function PriceChange({ newPrice, oldPrice }: { newPrice: number; oldPrice: number | null | undefined }) {
  if (oldPrice == null || oldPrice === 0) return null
  const diff = newPrice - oldPrice
  const pct = ((diff / oldPrice) * 100)
  if (Math.abs(pct) < 0.5) return null

  const isUp = diff > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold ${
      isUp ? 'text-red-400' : 'text-emerald-400'
    }`}>
      {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {isUp ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

// ─── Upload Drop Zone ───────────────────────────────────────────────────────

function UploadZone({ onFileSelected, disabled }: { onFileSelected: (file: File) => void; disabled?: boolean }) {
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) onFileSelected(file)
  }, [onFileSelected])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelected(file)
    if (inputRef.current) inputRef.current.value = ''
  }, [onFileSelected])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 ${
        dragActive
          ? 'border-amber-500 bg-amber-950/30'
          : 'border-stone-700 bg-stone-900/30 hover:border-stone-600 hover:bg-stone-900/50'
      } ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      <div className="w-14 h-14 bg-stone-800/80 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-stone-700">
        <Upload className="w-7 h-7 text-amber-500" />
      </div>
      <p className="font-display text-base font-semibold text-stone-200 mb-1">
        Sleep een factuur hierheen
      </p>
      <p className="text-stone-500 text-sm">
        of klik om te selecteren
      </p>
      <p className="text-stone-600 text-xs mt-3">
        JPG, PNG, WEBP of PDF
      </p>
    </div>
  )
}

// ─── Ingredient Search Dropdown ─────────────────────────────────────────────

function IngredientDropdown({
  ingredients,
  currentId,
  onSelect,
  onClose,
}: {
  ingredients: IngredientOption[]
  currentId: string | null
  onSelect: (ing: IngredientOption | null) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const filtered = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 15)

  return (
    <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-stone-800 border border-stone-700 rounded-xl shadow-xl overflow-hidden">
      <div className="p-2 border-b border-stone-700">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500" />
          <input
            autoFocus
            type="text"
            placeholder="Zoek ingrediënt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-sm text-stone-200 placeholder:text-stone-500 focus:outline-none focus:border-amber-600"
          />
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto">
        <button
          onClick={() => { onSelect(null); onClose() }}
          className="w-full text-left px-3 py-2 text-sm text-stone-400 hover:bg-stone-700/50 flex items-center gap-2"
        >
          <X className="w-3 h-3" />
          Geen match
        </button>
        {filtered.map((ing) => (
          <button
            key={ing.id}
            onClick={() => { onSelect(ing); onClose() }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-stone-700/50 flex items-center justify-between ${
              ing.id === currentId ? 'bg-amber-900/20 text-amber-300' : 'text-stone-200'
            }`}
          >
            <span className="truncate">{ing.name}</span>
            {ing.current_price != null && (
              <span className="text-xs font-mono text-stone-500 shrink-0 ml-2">
                &euro;{ing.current_price.toFixed(2)}/{ing.unit || 'st'}
              </span>
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="px-3 py-4 text-xs text-stone-500 text-center">Geen ingrediënten gevonden</p>
        )}
      </div>
    </div>
  )
}

// ─── Review Panel ───────────────────────────────────────────────────────────

function ReviewPanel({
  invoice,
  ingredients,
  onConfirm,
  onClose,
  confirming,
}: {
  invoice: Factuur
  ingredients: IngredientOption[]
  onConfirm: (invoice: Factuur, lineItems: LineItem[]) => void
  onClose: () => void
  confirming: boolean
}) {
  const ocr = invoice.ocr_data as OcrData | null
  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    return (ocr?.line_items || []).map((item, idx) => ({
      ...item,
      id: item.id || `line_${idx}`,
      current_db_price: item.matched_ingredient_id
        ? ingredients.find((i) => i.id === item.matched_ingredient_id)?.current_price ?? null
        : null,
    }))
  })
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [dropdownIdx, setDropdownIdx] = useState<number | null>(null)

  const [supplierName, setLeverancierName] = useState(ocr?.supplier_name || invoice.supplier_name || '')
  const [invoiceDate, setFactuurDate] = useState(ocr?.invoice_date || invoice.invoice_date || '')

  const matchedCount = lineItems.filter((i) => i.matched_ingredient_id).length
  const totalBedrag = lineItems.reduce((sum, i) => sum + i.total, 0)

  function startEdit(key: string, value: string | number) {
    setEditingCell(key)
    setEditValue(String(value))
  }

  function commitEdit(idx: number, field: 'quantity' | 'unit_price' | 'product_name') {
    setLineItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item }
      if (field === 'quantity') {
        updated.quantity = parseFloat(editValue) || item.quantity
        updated.total = updated.quantity * updated.unit_price
      } else if (field === 'unit_price') {
        updated.unit_price = parseFloat(editValue) || item.unit_price
        updated.total = updated.quantity * updated.unit_price
      } else if (field === 'product_name') {
        updated.product_name = editValue || item.product_name
      }
      return updated
    }))
    setEditingCell(null)
  }

  function handleIngredientMatch(idx: number, ing: IngredientOption | null) {
    setLineItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item
      return {
        ...item,
        matched_ingredient_id: ing?.id || null,
        matched_ingredient_name: ing?.name || null,
        current_db_price: ing?.current_price ?? null,
      }
    }))
  }

  function handleKeyDown(e: React.KeyboardEvent, idx: number, field: 'quantity' | 'unit_price' | 'product_name') {
    if (e.key === 'Enter') {
      commitEdit(idx, field)
    } else if (e.key === 'Escape') {
      setEditingCell(null)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      commitEdit(idx, field)
      // Move to next editable cell
      const fields: Array<'quantity' | 'unit_price' | 'product_name'> = ['product_name', 'quantity', 'unit_price']
      const currentFieldIdx = fields.indexOf(field)
      if (currentFieldIdx < fields.length - 1) {
        const nextField = fields[currentFieldIdx + 1]
        const item = lineItems[idx]
        const val = nextField === 'product_name' ? item.product_name : nextField === 'quantity' ? item.quantity : item.unit_price
        setTimeout(() => startEdit(`${idx}-${nextField}`, val), 50)
      } else if (idx < lineItems.length - 1) {
        const nextItem = lineItems[idx + 1]
        setTimeout(() => startEdit(`${idx + 1}-product_name`, nextItem.product_name), 50)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-medium text-stone-400 mb-1.5 block">Leverancier</label>
          <input
            type="text"
            value={supplierName}
            onChange={(e) => setLeverancierName(e.target.value)}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-amber-600"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-400 mb-1.5 block">Factuurdatum</label>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setFactuurDate(e.target.value)}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-amber-600"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-400 mb-1.5 block">Totaal</label>
          <div className="px-3 py-2 bg-stone-800/50 border border-stone-700 rounded-lg text-sm font-mono font-semibold text-stone-200">
            &euro;{totalBedrag.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Match summary */}
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
          matchedCount === lineItems.length
            ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50'
            : 'bg-amber-900/40 text-amber-300 border-amber-700/50'
        }`}>
          <Package className="w-3 h-3" />
          {matchedCount}/{lineItems.length} gematcht
        </span>
        {ocr?.confidence != null && (
          <span className="text-xs text-stone-500">
            OCR zekerheid: {(ocr.confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {/* Line items table */}
      <div className="overflow-x-auto -mx-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-700/50">
              <th className="text-left text-xs font-medium text-stone-500 px-6 py-2">Product</th>
              <th className="text-right text-xs font-medium text-stone-500 px-3 py-2 w-20">Aantal</th>
              <th className="text-center text-xs font-medium text-stone-500 px-3 py-2 w-16">Eenheid</th>
              <th className="text-right text-xs font-medium text-stone-500 px-3 py-2 w-24">Prijs/eenheid</th>
              <th className="text-right text-xs font-medium text-stone-500 px-3 py-2 w-24">Totaal</th>
              <th className="text-left text-xs font-medium text-stone-500 px-3 py-2 w-48">Match</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/50">
            {lineItems.map((item, idx) => (
              <tr key={item.id || idx} className="hover:bg-stone-800/30 group">
                {/* Product name */}
                <td className="px-6 py-2.5">
                  {editingCell === `${idx}-product_name` ? (
                    <input
                      autoFocus
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitEdit(idx, 'product_name')}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'product_name')}
                      className="w-full px-2 py-0.5 bg-stone-900 border border-amber-600 rounded text-sm text-stone-200 focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => startEdit(`${idx}-product_name`, item.product_name)}
                      className="text-left text-stone-200 hover:text-amber-400 transition-colors flex items-center gap-1.5 group/edit"
                    >
                      <span>{item.product_name}</span>
                      <Pencil className="w-3 h-3 text-stone-600 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
                    </button>
                  )}
                </td>

                {/* Hoeveelheid */}
                <td className="text-right px-3 py-2.5 font-mono">
                  {editingCell === `${idx}-quantity` ? (
                    <input
                      autoFocus
                      type="number"
                      step="0.01"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitEdit(idx, 'quantity')}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'quantity')}
                      className="w-full px-2 py-0.5 bg-stone-900 border border-amber-600 rounded text-sm text-right text-stone-200 focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => startEdit(`${idx}-quantity`, item.quantity)}
                      className="font-mono text-stone-200 hover:text-amber-400 transition-colors"
                    >
                      {item.quantity}
                    </button>
                  )}
                </td>

                {/* Unit */}
                <td className="text-center px-3 py-2.5 text-stone-400 text-xs">
                  {item.unit}
                </td>

                {/* Unit price */}
                <td className="text-right px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    {editingCell === `${idx}-unit_price` ? (
                      <input
                        autoFocus
                        type="number"
                        step="0.01"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => commitEdit(idx, 'unit_price')}
                        onKeyDown={(e) => handleKeyDown(e, idx, 'unit_price')}
                        className="w-full px-2 py-0.5 bg-stone-900 border border-amber-600 rounded text-sm text-right text-stone-200 focus:outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => startEdit(`${idx}-unit_price`, item.unit_price)}
                        className="font-mono text-stone-200 hover:text-amber-400 transition-colors"
                      >
                        &euro;{item.unit_price.toFixed(2)}
                      </button>
                    )}
                    <PriceChange newPrice={item.unit_price} oldPrice={item.current_db_price} />
                  </div>
                </td>

                {/* Total */}
                <td className="text-right px-3 py-2.5 font-mono font-semibold text-stone-200">
                  &euro;{item.total.toFixed(2)}
                </td>

                {/* Match */}
                <td className="px-3 py-2.5 relative">
                  {dropdownIdx === idx ? (
                    <IngredientDropdown
                      ingredients={ingredients}
                      currentId={item.matched_ingredient_id}
                      onSelect={(ing) => handleIngredientMatch(idx, ing)}
                      onClose={() => setDropdownIdx(null)}
                    />
                  ) : null}
                  <button
                    onClick={() => setDropdownIdx(dropdownIdx === idx ? null : idx)}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border transition-colors ${
                      item.matched_ingredient_id
                        ? 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40 hover:border-emerald-600'
                        : 'bg-amber-900/30 text-amber-300 border-amber-700/40 hover:border-amber-600'
                    }`}
                  >
                    {item.matched_ingredient_id ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{item.matched_ingredient_name}</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        Geen match
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-2 border-t border-stone-800">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200 transition-colors"
        >
          Annuleren
        </button>
        <button
          onClick={() => {
            const updatedFactuur = {
              ...invoice,
              supplier_name: supplierName,
              invoice_date: invoiceDate,
            }
            onConfirm(updatedFactuur, lineItems)
          }}
          disabled={confirming || matchedCount === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 text-white font-medium text-sm rounded-xl transition-colors"
        >
          {confirming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Bevestigen ({matchedCount} prijzen bijwerken)
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function FactuursPage() {
  const supabase = createClient()
  const { kitchenId } = useKitchen()

  // State
  const [invoices, setFactuurs] = useState<Factuur[]>([])
  const [ingredients, setIngredients] = useState<IngredientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [pageState, setPageState] = useState<PageState>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  // Upload / scan
  const [uploadingFile, setUploadingFile] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  // Review
  const [reviewFactuur, setReviewFactuur] = useState<Factuur | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmResult, setConfirmResult] = useState<{ prices: number; recipes: number } | null>(null)

  // ─── Load Data ──────────────────────────────────────────────────────────

  const loadFactuurs = useCallback(async () => {
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })
    setFactuurs((data || []) as Factuur[])
  }, [])

  const loadIngredients = useCallback(async () => {
    const { data } = await supabase
      .from('ingredients')
      .select('id, name, category, current_price, unit')
      .order('name')
    setIngredients((data || []) as IngredientOption[])
  }, [])

  useEffect(() => {
    Promise.all([loadFactuurs(), loadIngredients()]).then(() => setLoading(false))
  }, [loadFactuurs, loadIngredients])

  // ─── Upload + Scan Flow ─────────────────────────────────────────────────

  const handleFileUpload = useCallback(async (file: File) => {
    setScanError(null)
    setUploadingFile(file.name)
    setPageState('uploading')

    try {
      // 1. Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          const base64Data = result.split(',')[1]
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // 2. Determine media type
      const mediaTypeMap: Record<string, string> = {
        'image/jpeg': 'image/jpeg',
        'image/png': 'image/png',
        'image/webp': 'image/webp',
        'application/pdf': 'application/pdf',
      }
      const mediaType = mediaTypeMap[file.type] || 'image/jpeg'

      // 3. Create invoice record
      const { data: invoice, error: insertErr } = await supabase
        .from('invoices')
        .insert({
          kitchen_id: kitchenId,
          ocr_status: 'pending',
          image_url: null,
        })
        .select()
        .single()

      if (insertErr || !invoice) throw new Error(insertErr?.message || 'Kon factuur niet aanmaken')

      const invoiceId = invoice.id
      setProcessingId(invoiceId)
      setPageState('processing')

      // 4. Upload to storage (best effort, don't block scan)
      const fileName = `${Date.now()}_${file.name}`
      supabase.storage.from('invoices').upload(fileName, file).then(({ data: uploaded }) => {
        if (uploaded) {
          const { data: { publicUrl } } = supabase.storage.from('invoices').getPublicUrl(fileName)
          supabase.from('invoices').update({ image_url: publicUrl }).eq('id', invoiceId)
        }
      })

      // 5. Send to scan API
      const scanRes = await fetch('/api/invoices/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoiceId,
          base64,
          media_type: mediaType,
        }),
      })

      if (!scanRes.ok) throw new Error('Scan mislukt')

      const scanResult = await scanRes.json()

      // 6. Reload invoice with OCR data
      const { data: updatedFactuur } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()

      if (updatedFactuur) {
        setFactuurs((prev) => [updatedFactuur as Factuur, ...prev.filter((i) => i.id !== invoiceId)])
        setReviewFactuur(updatedFactuur as Factuur)
        setPageState('review')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Er ging iets mis'
      setScanError(msg)
      setPageState('list')
      await loadFactuurs()
    } finally {
      setUploadingFile(null)
      setProcessingId(null)
    }
  }, [kitchenId, loadFactuurs])

  // ─── Confirm Flow ───────────────────────────────────────────────────────

  const handleConfirm = useCallback(async (inv: Factuur, lineItems: LineItem[]) => {
    setConfirming(true)
    try {
      const res = await fetch(`/api/invoices/${inv.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_name: inv.supplier_name,
          invoice_date: inv.invoice_date,
          line_items: lineItems.filter((i) => i.matched_ingredient_id).map((i) => ({
            product_name: i.product_name,
            quantity: i.quantity,
            unit: i.unit,
            unit_price: i.unit_price,
            total: i.total,
            matched_ingredient_id: i.matched_ingredient_id,
            matched_ingredient_name: i.matched_ingredient_name,
          })),
        }),
      })

      if (!res.ok) throw new Error('Bevestiging mislukt')

      const result = await res.json()
      const pricesUpdated = result.prices_updated || lineItems.filter((i) => i.matched_ingredient_id).length
      setConfirmResult({ prices: pricesUpdated, recipes: 0 })

      // Reload
      await loadFactuurs()
      await loadIngredients()

      // Show success briefly, then go back to list
      setTimeout(() => {
        setReviewFactuur(null)
        setConfirmResult(null)
        setPageState('list')
      }, 3000)
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Er ging iets mis')
    } finally {
      setConfirming(false)
    }
  }, [loadFactuurs, loadIngredients])

  // ─── Filtered List ──────────────────────────────────────────────────────

  const filteredFactuurs = invoices.filter((inv) => {
    if (statusFilter && inv.ocr_status !== statusFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        (inv.supplier_name || '').toLowerCase().includes(q) ||
        (inv.ocr_data as OcrData)?.invoice_number?.toLowerCase().includes(q)
      )
    }
    return true
  })

  // ─── Render ─────────────────────────────────────────────────────────────

  // Review dialog
  if (pageState === 'review' && reviewFactuur) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setReviewFactuur(null); setPageState('list') }}
            className="p-2 rounded-xl hover:bg-stone-800 transition-colors text-stone-400 hover:text-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-stone-100 tracking-tight">Factuur controleren</h1>
            <p className="text-stone-500 text-sm mt-0.5">Controleer de gescande gegevens en bevestig de prijzen</p>
          </div>
        </div>

        {confirmResult && (
          <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-200">
                {confirmResult.prices} prijzen bijgewerkt
              </p>
              <p className="text-xs text-emerald-400/70 mt-0.5">
                Receptkosten worden automatisch herberekend
              </p>
            </div>
          </div>
        )}

        <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-6">
          <ReviewPanel
            invoice={reviewFactuur}
            ingredients={ingredients}
            onConfirm={handleConfirm}
            onClose={() => { setReviewFactuur(null); setPageState('list') }}
            confirming={confirming}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-stone-100 tracking-tight">Facturen</h1>
          <p className="text-stone-500 mt-1">Scan facturen om ingrediëntprijzen automatisch bij te werken</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = 'image/jpeg,image/png,image/webp,application/pdf'
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (file) handleFileUpload(file)
              }
              // Camera capture on mobile
              input.setAttribute('capture', 'environment')
              input.click()
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-medium text-sm rounded-xl transition-colors"
          >
            <Camera className="w-4 h-4" />
            Scannen
          </button>
          <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm rounded-xl transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            Uploaden
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(file)
              }}
            />
          </label>
        </div>
      </div>

      {/* Upload / Processing states */}
      {(pageState === 'uploading' || pageState === 'processing') && (
        <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-8 text-center animate-fade-in">
          <div className="w-16 h-16 bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-700/30">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
          <h3 className="font-display text-lg font-semibold text-stone-200 mb-1">
            {pageState === 'uploading' ? 'Bestand uploaden...' : 'Factuur analyseren...'}
          </h3>
          <p className="text-stone-500 text-sm">
            {pageState === 'uploading'
              ? `${uploadingFile} wordt geüpload`
              : 'Even geduld, we extracten alle gegevens met OCR'}
          </p>
        </div>
      )}

      {/* Scan error */}
      {scanError && (
        <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-300 flex-1">{scanError}</p>
          <button onClick={() => setScanError(null)} className="p-1 hover:bg-red-900/30 rounded-lg">
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )}

      {/* Upload zone (show only in list state when no invoices or always at top) */}
      {pageState === 'list' && invoices.length === 0 && !loading && (
        <UploadZone onFileSelected={handleFileUpload} />
      )}

      {/* Search + filter */}
      {invoices.length > 0 && pageState === 'list' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              type="text"
              placeholder="Zoek op leverancier of factuurnummer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-900/50 border border-stone-800 rounded-xl text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-stone-600"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'pending', 'processing', 'completed', 'failed'] as const).map((s) => {
              const active = s === 'all' ? !statusFilter : statusFilter === s
              const labels: Record<string, string> = { all: 'Alle', pending: 'Wachtend', processing: 'Bezig', completed: 'Voltooid', failed: 'Mislukt' }
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s === 'all' ? null : s)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    active
                      ? 'bg-stone-800 border-stone-600 text-stone-200'
                      : 'bg-transparent border-stone-800 text-stone-500 hover:text-stone-300 hover:border-stone-700'
                  }`}
                >
                  {labels[s]}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-stone-800 rounded-xl animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="w-40 h-4 bg-stone-800 rounded animate-pulse" />
                <div className="w-24 h-3 bg-stone-800/60 rounded animate-pulse" />
              </div>
              <div className="w-20 h-4 bg-stone-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Factuur list */}
      {!loading && filteredFactuurs.length > 0 && pageState === 'list' && (
        <>
          {/* Upload zone inline (compact) */}
          <UploadZone onFileSelected={handleFileUpload} />

          <div className="bg-stone-900/50 border border-stone-800 rounded-2xl divide-y divide-stone-800/50 overflow-hidden">
            {filteredFactuurs.map((inv, i) => {
              const ocr = inv.ocr_data as OcrData | null
              const matchedCount = ocr?.line_items?.filter((i) => i.matched_ingredient_id).length || 0
              const totalItems = ocr?.line_items?.length || 0
              const canReview = inv.ocr_status === 'completed' && !ocr?.confirmed

              return (
                <div
                  key={inv.id}
                  className="p-5 flex items-center gap-4 hover:bg-stone-800/30 transition-colors group"
                >
                  <div className="w-10 h-10 bg-stone-800/80 rounded-xl flex items-center justify-center shrink-0 border border-stone-700/50">
                    <FileText className="w-5 h-5 text-amber-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-200 text-sm truncate">
                      {inv.supplier_name || 'Onbekende leverancier'}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {ocr?.invoice_number ? `#${ocr.invoice_number} · ` : ''}
                      {inv.invoice_date
                        ? new Date(inv.invoice_date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })
                        : new Date(inv.created_at).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  {totalItems > 0 && (
                    <span className="text-xs text-stone-500 hidden sm:block">
                      {matchedCount}/{totalItems} items
                    </span>
                  )}

                  <StatusBadge status={inv.ocr_status} />

                  {inv.total_amount != null && (
                    <span className="font-mono text-sm font-semibold text-stone-200 tabular-nums w-24 text-right">
                      &euro;{Number(inv.total_amount).toFixed(2)}
                    </span>
                  )}

                  {canReview ? (
                    <button
                      onClick={() => {
                        setReviewFactuur(inv)
                        setPageState('review')
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      Controleren
                    </button>
                  ) : ocr?.confirmed ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  ) : inv.ocr_status === 'processing' ? (
                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  ) : (
                    <div className="w-20" />
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && filteredFactuurs.length === 0 && invoices.length > 0 && pageState === 'list' && (
        <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-12 text-center">
          <Search className="w-8 h-8 text-stone-600 mx-auto mb-4" />
          <p className="text-stone-400 text-sm">Geen facturen gevonden voor deze zoekopdracht</p>
        </div>
      )}
    </div>
  )
}
