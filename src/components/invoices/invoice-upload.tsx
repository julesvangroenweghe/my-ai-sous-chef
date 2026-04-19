'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Camera, FileImage, X, Loader2, ScanLine } from 'lucide-react'

interface InvoiceUploadProps {
 onUploadComplete: (invoiceId: string) => void
 uploading: boolean
 onUpload: (file: File) => Promise<string | null>
}

export function InvoiceUpload({ onUploadComplete, uploading, onUpload }: InvoiceUploadProps) {
 const [dragActive, setDragActive] = useState(false)
 const [preview, setPreview] = useState<string | null>(null)
 const [selectedFile, setSelectedFile] = useState<File | null>(null)
 const fileInputRef = useRef<HTMLInputElement>(null)

 const handleDrag = useCallback((e: React.DragEvent) => {
 e.preventDefault()
 e.stopPropagation()
 if (e.type === 'dragenter' || e.type === 'dragover') {
 setDragActive(true)
 } else if (e.type === 'dragleave') {
 setDragActive(false)
 }
 }, [])

 const processFile = (file: File) => {
 setSelectedFile(file)
 if (file.type.startsWith('image/')) {
 const reader = new FileReader()
 reader.onload = (e) => setPreview(e.target?.result as string)
 reader.readAsDataURL(file)
 } else {
 setPreview(null)
 }
 }

 const handleDrop = useCallback((e: React.DragEvent) => {
 e.preventDefault()
 e.stopPropagation()
 setDragActive(false)
 const file = e.dataTransfer.files?.[0]
 if (file) processFile(file)
 }, [])

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0]
 if (file) processFile(file)
 }

 const handleUpload = async () => {
 if (!selectedFile) return
 const invoiceId = await onUpload(selectedFile)
 if (invoiceId) {
 onUploadComplete(invoiceId)
 setSelectedFile(null)
 setPreview(null)
 }
 }

 const clearSelection = () => {
 setSelectedFile(null)
 setPreview(null)
 if (fileInputRef.current) fileInputRef.current.value = ''
 }

 return (
 <Card
 className={`border-2 border-dashed transition-colors ${
 dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
 }`}
 onDragEnter={handleDrag}
 onDragLeave={handleDrag}
 onDragOver={handleDrag}
 onDrop={handleDrop}
 >
 <CardContent className="p-8">
 {selectedFile ? (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <FileImage className="h-8 w-8 text-muted-foreground" />
 <div>
 <p className="font-medium">{selectedFile.name}</p>
 <p className="text-sm text-muted-foreground">
 {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
 </p>
 </div>
 </div>
 <Button variant="ghost" size="sm" onClick={clearSelection}>
 <X className="h-4 w-4" />
 </Button>
 </div>

 {preview && (
 <div className="relative w-full max-h-64 overflow-hidden rounded-lg">
 <img src={preview} alt="Invoice preview" className="w-full object-contain" />
 </div>
 )}

 <Button onClick={handleUpload} disabled={uploading} className="w-full gap-2">
 {uploading ? (
 <>
 <Loader2 className="h-4 w-4 animate-spin" /> Processing...
 </>
 ) : (
 <>
 <ScanLine className="h-4 w-4" /> Scan Invoice
 </>
 )}
 </Button>
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center text-center">
 <Upload className="h-10 w-10 text-muted-foreground mb-4" />
 <h3 className="font-semibold">Upload Invoice</h3>
 <p className="text-sm text-muted-foreground mt-1">
 Drag and drop a PDF or image, or click to browse
 </p>
 <div className="flex gap-2 mt-4">
 <label>
 <input
 ref={fileInputRef}
 type="file"
 accept="image/*,.pdf"
 onChange={handleFileChange}
 className="hidden"
 />
 <Button variant="outline" className="gap-2" asChild>
 <span>
 <Upload className="h-4 w-4" /> Choose File
 </span>
 </Button>
 </label>
 <label>
 <input
 type="file"
 accept="image/*"
 capture="environment"
 onChange={handleFileChange}
 className="hidden"
 />
 <Button variant="outline" className="gap-2" asChild>
 <span>
 <Camera className="h-4 w-4" /> Camera
 </span>
 </Button>
 </label>
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 )
}
