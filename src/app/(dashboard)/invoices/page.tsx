'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, FileText, Check, AlertCircle, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { Invoice } from '@/types/database'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setInvoices(data as Invoice[])
        setLoading(false)
      })
  }, [])

  const statusIcon = {
    pending: <Clock className="h-4 w-4 text-orange-500" />,
    processing: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
    completed: <Check className="h-4 w-4 text-green-500" />,
    failed: <AlertCircle className="h-4 w-4 text-red-500" />,
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: membership } = await supabase
        .from('kitchen_members')
        .select('kitchen_id')
        .limit(1)
        .single()

      const fileName = `${Date.now()}_${file.name}`
      const { data: upload } = await supabase.storage
        .from('invoices')
        .upload(fileName, file)

      if (upload) {
        const { data: { publicUrl } } = supabase.storage.from('invoices').getPublicUrl(fileName)
        await supabase.from('invoices').insert({
          kitchen_id: membership?.kitchen_id,
          image_url: publicUrl,
          ocr_status: 'pending',
        })
      }
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">{invoices.length} invoices</p>
        </div>
      </div>

      {/* Upload area */}
      <Card className="border-dashed border-2">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center">
          <Upload className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="font-semibold">Upload Invoice</h3>
          <p className="text-sm text-muted-foreground mt-1">Drag and drop or click to upload an invoice image</p>
          <label className="mt-4">
            <input type="file" accept="image/*,.pdf" onChange={handleUpload} className="hidden" />
            <Button variant="outline" className="gap-2" disabled={uploading} asChild>
              <span>{uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : 'Choose File'}</span>
            </Button>
          </label>
        </CardContent>
      </Card>

      {/* Invoice list */}
      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No invoices yet. Upload your first invoice!</div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 bg-muted rounded-lg"><FileText className="h-5 w-5 text-muted-foreground" /></div>
                <div className="flex-1">
                  <h3 className="font-medium">{inv.supplier_name || 'Unknown supplier'}</h3>
                  <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground">
                    {inv.invoice_date && <span>{formatDate(inv.invoice_date)}</span>}
                    {inv.total_amount && <span className="font-medium text-foreground">{formatCurrency(inv.total_amount)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusIcon[inv.ocr_status]}
                  <Badge variant={inv.ocr_status === 'completed' ? 'success' : inv.ocr_status === 'failed' ? 'destructive' : 'warning'}>
                    {inv.ocr_status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
