'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Upload, Camera, Search, ArrowUpDown, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

interface Invoice {
  id: string
  supplier_name: string | null
  invoice_number: string | null
  invoice_date: string | null
  total_amount: number | null
  status: string
  created_at: string
}

function EmptyInvoices() {
  return (
    <div className="card p-12 text-center animate-scale-in">
      <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <FileText className="w-8 h-8 text-amber-400" />
      </div>
      <h3 className="font-display text-xl font-semibold text-stone-900 mb-2">No invoices scanned yet</h3>
      <p className="text-stone-500 text-sm max-w-[45ch] mx-auto mb-8 leading-relaxed">
        Upload a supplier invoice and our OCR will extract prices, products, and quantities. Updated prices cascade to all your recipes.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button className="btn-primary">
          <Upload className="w-4 h-4" />
          Upload Invoice
        </button>
        <button className="btn-secondary">
          <Camera className="w-4 h-4" />
          Scan with Camera
        </button>
      </div>
    </div>
  )
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('invoices').select('*').order('created_at', { ascending: false })
      setInvoices(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const statusIcons: Record<string, React.ReactNode> = {
    processed: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    pending: <Clock className="w-4 h-4 text-amber-500" />,
    error: <AlertCircle className="w-4 h-4 text-red-500" />,
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">Invoices</h1>
          <p className="text-stone-500 mt-1">Scan invoices to auto-update ingredient prices</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary shrink-0">
            <Camera className="w-4 h-4" />
            Scan
          </button>
          <button className="btn-primary shrink-0">
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 flex items-center gap-4">
              <div className="skeleton w-10 h-10 rounded-xl" />
              <div className="flex-1 space-y-2"><div className="skeleton w-40 h-4 rounded" /><div className="skeleton w-24 h-3 rounded" /></div>
              <div className="skeleton w-20 h-4 rounded" />
            </div>
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <EmptyInvoices />
      ) : (
        <div className="card divide-y divide-stone-100 overflow-hidden">
          {invoices.map((inv, i) => (
            <div
              key={inv.id}
              className="p-5 flex items-center gap-4 hover:bg-stone-50/50 transition-colors cursor-pointer animate-slide-up opacity-0"
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}
            >
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-900 text-sm truncate">{inv.supplier_name || 'Unknown Supplier'}</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {inv.invoice_number && `#${inv.invoice_number} · `}
                  {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : 'No date'}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {inv.total_amount && (
                  <span className="font-mono text-sm font-semibold text-stone-900 tabular-nums">
                    &euro;{Number(inv.total_amount).toFixed(2)}
                  </span>
                )}
                {statusIcons[inv.status] || statusIcons.pending}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
