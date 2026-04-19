'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
 Check,
 AlertTriangle,
 AlertCircle,
 Loader2,
 FileText,
 Link2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface OcrLineItem {
 id: string
 product_name: string
 quantity: number
 unit: string
 unit_price: number
 total: number
 confidence: number
 matched_ingredient_id?: string | null
 matched_ingredient_name?: string | null
}

interface OcrData {
 supplier_name: string
 invoice_date: string
 invoice_number: string
 line_items: OcrLineItem[]
 total_amount: number
 confidence: number
}

interface InvoiceReviewProps {
 invoiceId: string
 ocrData: OcrData
 onConfirm: (
 invoiceId: string,
 data: {
 supplier_name: string
 invoice_date: string
 line_items: OcrLineItem[]
 }
 ) => Promise<void>
 onCancel: () => void
 confirming: boolean
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
 if (confidence >= 0.9) {
 return (
 <Badge variant="success" className="text-xs gap-1">
 <Check className="h-3 w-3" /> High
 </Badge>
 )
 }
 if (confidence >= 0.7) {
 return (
 <Badge variant="warning" className="text-xs gap-1">
 <AlertTriangle className="h-3 w-3" /> Medium
 </Badge>
 )
 }
 return (
 <Badge variant="destructive" className="text-xs gap-1">
 <AlertCircle className="h-3 w-3" /> Low
 </Badge>
 )
}

export function InvoiceReview({
 invoiceId,
 ocrData,
 onConfirm,
 onCancel,
 confirming,
}: InvoiceReviewProps) {
 const [supplier, setSupplier] = useState(ocrData.supplier_name)
 const [invoiceDate, setInvoiceDate] = useState(ocrData.invoice_date)
 const [lineItems, setLineItems] = useState<OcrLineItem[]>(ocrData.line_items)

 const updateLineItem = (index: number, field: keyof OcrLineItem, value: string | number) => {
 setLineItems((prev) => {
 const updated = [...prev]
 updated[index] = { ...updated[index], [field]: value }
 // Recalculate total
 if (field === 'quantity' || field === 'unit_price') {
 updated[index].total = Number(updated[index].quantity) * Number(updated[index].unit_price)
 }
 return updated
 })
 }

 const calculatedTotal = lineItems.reduce((sum, item) => sum + item.total, 0)

 return (
 <div className="space-y-6">
 {/* Header info */}
 <Card>
 <CardHeader>
 <CardTitle className="text-base flex items-center gap-2">
 <FileText className="h-5 w-5" />
 Invoice Details
 <ConfidenceBadge confidence={ocrData.confidence} />
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <Label className="text-xs text-muted-foreground">Supplier</Label>
 <Input
 value={supplier}
 onChange={(e) => setSupplier(e.target.value)}
 className="mt-1"
 />
 </div>
 <div>
 <Label className="text-xs text-muted-foreground">Invoice Date</Label>
 <Input
 type="date"
 value={invoiceDate}
 onChange={(e) => setInvoiceDate(e.target.value)}
 className="mt-1"
 />
 </div>
 <div>
 <Label className="text-xs text-muted-foreground">Invoice Number</Label>
 <Input value={ocrData.invoice_number} readOnly className="mt-1 bg-muted" />
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Line items table */}
 <Card>
 <CardHeader>
 <CardTitle className="text-base">
 Line Items ({lineItems.length})
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b">
 <th className="text-left py-2 px-2 font-medium text-muted-foreground">Product</th>
 <th className="text-right py-2 px-2 font-medium text-muted-foreground">Qty</th>
 <th className="text-left py-2 px-2 font-medium text-muted-foreground">Unit</th>
 <th className="text-right py-2 px-2 font-medium text-muted-foreground">Price</th>
 <th className="text-right py-2 px-2 font-medium text-muted-foreground">Total</th>
 <th className="text-center py-2 px-2 font-medium text-muted-foreground">Confidence</th>
 <th className="text-left py-2 px-2 font-medium text-muted-foreground">Match</th>
 </tr>
 </thead>
 <tbody>
 {lineItems.map((item, index) => (
 <tr key={item.id} className="border-b last:border-0">
 <td className="py-2 px-2">
 <Input
 value={item.product_name}
 onChange={(e) => updateLineItem(index, 'product_name', e.target.value)}
 className="h-8 text-sm"
 />
 </td>
 <td className="py-2 px-2">
 <Input
 type="number"
 value={item.quantity}
 onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))}
 className="h-8 text-sm text-right w-20"
 />
 </td>
 <td className="py-2 px-2">
 <Input
 value={item.unit}
 onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
 className="h-8 text-sm w-16"
 />
 </td>
 <td className="py-2 px-2">
 <Input
 type="number"
 step="0.01"
 value={item.unit_price}
 onChange={(e) => updateLineItem(index, 'unit_price', Number(e.target.value))}
 className="h-8 text-sm text-right w-24"
 />
 </td>
 <td className="py-2 px-2 text-right font-medium">
 {formatCurrency(item.total)}
 </td>
 <td className="py-2 px-2 text-center">
 <ConfidenceBadge confidence={item.confidence} />
 </td>
 <td className="py-2 px-2">
 {item.matched_ingredient_name ? (
 <Badge variant="secondary" className="text-xs gap-1">
 <Link2 className="h-3 w-3" />
 {item.matched_ingredient_name}
 </Badge>
 ) : (
 <Badge variant="outline" className="text-xs text-muted-foreground">
 No match
 </Badge>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 <tfoot>
 <tr className="border-t-2">
 <td colSpan={4} className="py-3 px-2 text-right font-semibold">
 Total
 </td>
 <td className="py-3 px-2 text-right font-bold">
 {formatCurrency(calculatedTotal)}
 </td>
 <td colSpan={2} />
 </tr>
 </tfoot>
 </table>
 </div>
 </CardContent>
 </Card>

 {/* Actions */}
 <div className="flex items-center justify-between">
 <Button variant="outline" onClick={onCancel}>
 Cancel
 </Button>
 <Button
 onClick={() =>
 onConfirm(invoiceId, {
 supplier_name: supplier,
 invoice_date: invoiceDate,
 line_items: lineItems,
 })
 }
 disabled={confirming}
 className="gap-2"
 >
 {confirming ? (
 <>
 <Loader2 className="h-4 w-4 animate-spin" /> Confirming...
 </>
 ) : (
 <>
 <Check className="h-4 w-4" /> Confirm & Update Prices
 </>
 )}
 </Button>
 </div>
 </div>
 )
}
