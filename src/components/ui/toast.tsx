'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

interface Toast {
 id: string
 title: string
 description?: string
 variant?: 'default' | 'success' | 'destructive'
}

interface ToastContextType {
 toasts: Toast[]
 addToast: (toast: Omit<Toast, 'id'>) => void
 removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
 const [toasts, setToasts] = React.useState<Toast[]>([])

 const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
 const id = Math.random().toString(36).slice(2)
 setToasts((prev) => [...prev, { ...toast, id }])
 setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000)
 }, [])

 const removeToast = React.useCallback((id: string) => {
 setToasts((prev) => prev.filter((t) => t.id !== id))
 }, [])

 return (
 <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
 {children}
 <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
 {toasts.map((toast) => (
 <div
 key={toast.id}
 className={cn(
 'flex items-start gap-3 rounded-lg border p-4 shadow-lg bg-white min-w-[320px] max-w-[420px]',
 toast.variant === 'destructive' && 'border-destructive/50',
 toast.variant === 'success' && 'border-green-500/50'
 )}
 >
 {toast.variant === 'success' && <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />}
 {toast.variant === 'destructive' && <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />}
 {(!toast.variant || toast.variant === 'default') && <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />}
 <div className="flex-1">
 <p className="text-sm font-semibold">{toast.title}</p>
 {toast.description && <p className="text-sm text-muted-foreground mt-1">{toast.description}</p>}
 </div>
 <button onClick={() => removeToast(toast.id)} className="shrink-0">
 <X className="h-4 w-4 text-muted-foreground" />
 </button>
 </div>
 ))}
 </div>
 </ToastContext.Provider>
 )
}

export function useToast() {
 const context = React.useContext(ToastContext)
 if (!context) throw new Error('useToast must be used within a ToastProvider')
 return context
}
