'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SupplierInputProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  className?: string
}

const FIXED_OPTIONS = ['Halfabricaat']

export function SupplierInput({
  value,
  onChange,
  placeholder = 'Leverancier (optioneel)',
  className = '',
}: SupplierInputProps) {
  const [open, setOpen] = useState(false)
  const [savedSuppliers, setSavedSuppliers] = useState<string[]>([])
  const ref = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchSuppliers = async () => {
      // Get distinct suppliers from mep_components
      const { data } = await supabase
        .from('mep_components')
        .select('supplier')
        .not('supplier', 'is', null)
        .neq('supplier', '')
      const names: string[] = []
      const seen = new Set<string>()
      ;(data || []).forEach((row: any) => {
        const s = row.supplier as string
        if (s && !seen.has(s) && !FIXED_OPTIONS.includes(s)) {
          seen.add(s)
          names.push(s)
        }
      })
      names.sort()
      setSavedSuppliers(names)
    }
    fetchSuppliers()
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const allOptions = [
    ...FIXED_OPTIONS,
    ...savedSuppliers.filter((s) => !FIXED_OPTIONS.includes(s)),
  ]
  const filtered = value
    ? allOptions.filter((s) => s.toLowerCase().includes(value.toLowerCase()))
    : allOptions

  const select = (s: string) => {
    onChange(s)
    setOpen(false)
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <input
        className="w-full px-2.5 py-1.5 bg-white border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:border-[#E8A040]/50 focus:outline-none"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white border border-[#E8D5B5] rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#FDF8F2] flex items-center gap-2 ${
                s === 'Halfabricaat'
                  ? 'font-semibold text-amber-700 border-b border-[#F2E8D5]'
                  : 'text-[#2C1810]'
              }`}
              onMouseDown={(e) => { e.preventDefault(); select(s) }}
            >
              {s === 'Halfabricaat' && <span>🏠</span>}
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
