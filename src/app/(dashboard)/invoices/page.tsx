'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Upload,
  FileText,
  Check,
  AlertCircle,
  Clock,
  Loader2,
  Search,
  TrendingUp,
  ScanLine,
  BarChart3,
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { InvoiceUpload } from '@/components/invoices/invoice-upload'
import { InvoiceReview } from '@/components/invoices/invoice-review'
import { useInvoices } from '@/hooks/use-invoices'
import type { Invoice } from '@/types/database'

const statusConfig = {
  pending: { icon: <Clock className="h-4 w-4 text-orange-500" />, variant: 'warning' as const },
  processing: { icon: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />, variant: 'secondary' as const },
  completed: { icon: <Check className="h-4 w-4 text-green-500" />, variant: 'success' as const },
  failed: { icon: <AlertCircle className="h-4 w-4 text-red-500" />, variant: 'destructive' as const },
}

export default function InvoicesPage() {
  const { getInvoices, uploadInvoice, scanInvoice, loading } = useInvoices()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewData, setReviewData] = useState<any>(null)
  const [confirming, setConfirming] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    const data = await getInvoices()
    setInvoices(data)
    setPageLoading(false)
  }

  const handleUpload = async (file: File): Promise<string | null> => {
    setUploading(true)
    try {
      const id = await uploadInvoice(file)
      if (id) {
        // Auto-trigger scan
        const scanResult = await scanInvoice(id)
        if (scanResult?.ocr_data) {
          setReviewingId(id)
          setReviewData(scanResult.ocr_data)
        }
        await loadInvoices()
      }
      return id
    } finally {
      setUploading(false)
    }
  }

  const handleConfirm = async (
    invoiceId: string,
    data: { supplier_name: string; invoice_date: string; line_items: any[] }
  ) => {
    setConfirming(true)
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (response.ok) {
        setReviewingId(null)
        setReviewData(null)
        await loadInvoices()
      }
    } finally {
      setConfirming(false)
    }
  }

  const filteredInvoices = invoices.filter((inv) => {
    if (search) {
      const term = search.toLowerCase()
      if (!(inv.supplier_name?.toLowerCase().includes(term))) return false
    }
    if (statusFilter && inv.ocr_status !== statusFilter) return false
    return true
  })

  // Stats
  const completedCount = invoices.filter((i) => i.ocr_status === 'completed').length
  const pendingCount = invoices.filter((i) => i.ocr_status === 'pending' || i.ocr_status === 'processing').length

  // If reviewing an invoice, show the review UI
  if (reviewingId && reviewData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Review Invoice</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Verify the scanned data and match items to your ingredients
          </p>
        </div>
        <InvoiceReview
          invoiceId={reviewingId}
          ocrData={reviewData}
          onConfirm={handleConfirm}
          onCancel={() => {
            setReviewingId(null)
            setReviewData(null)
          }}
          confirming={confirming}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Upload, scan, and track supplier invoices
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{invoices.length}</p>
              <p className="text-xs text-muted-foreground">Total Invoices</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Confirmed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload area */}
      <InvoiceUpload
        onUploadComplete={(id) => {
          // Could navigate to review
        }}
        uploading={uploading}
        onUpload={handleUpload}
      />

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {['', 'pending', 'completed', 'failed'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status || 'All'}
            </Button>
          ))}
        </div>
      </div>

      {/* Invoice list */}
      {pageLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>{search || statusFilter ? 'No matching invoices found' : 'No invoices yet. Upload your first invoice!'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredInvoices.map((inv) => {
            const config = statusConfig[inv.ocr_status]
            return (
              <Card key={inv.id} className="hover:shadow-sm transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 bg-muted rounded-lg">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{inv.supplier_name || 'Unknown supplier'}</h3>
                    <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground">
                      {inv.invoice_date && <span>{formatDate(inv.invoice_date)}</span>}
                      {inv.total_amount != null && (
                        <span className="font-medium text-foreground">
                          {formatCurrency(inv.total_amount)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {config.icon}
                    <Badge variant={config.variant}>{inv.ocr_status}</Badge>
                  </div>
                  {inv.ocr_status === 'completed' && inv.ocr_data && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        setReviewingId(inv.id)
                        setReviewData(inv.ocr_data)
                      }}
                    >
                      <ScanLine className="h-3 w-3" /> Review
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
