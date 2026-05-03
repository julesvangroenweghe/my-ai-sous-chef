'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Link2, X, Package, ChevronDown, ChevronUp } from 'lucide-react'

interface SupplierProduct {
  id: string
  article_name: string
  article_code: string | null
  fixed_price: number | null
  price_unit: string | null
  unit: string | null
  score?: number
}

interface ProductMatcherProps {
  supplier: string
  componentName: string
  matchedProductId: string | null
  onMatch: (productId: string | null, suggestedUnit?: string) => void
}

function fuzzyScore(query: string, target: string): number {
  const qWords = query
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1)
  const tLower = target.toLowerCase()
  let score = 0
  for (const w of qWords) {
    if (tLower.includes(w)) score += w.length
  }
  if (tLower.startsWith(qWords[0] || '')) score += 5
  return score
}

export function ProductMatcher({
  supplier,
  componentName,
  matchedProductId,
  onMatch,
}: ProductMatcherProps) {
  const [products, setProducts] = useState<SupplierProduct[]>([])
  const [matched, setMatched] = useState<SupplierProduct | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchText, setSearchText] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!supplier || supplier === 'Halfabricaat') {
      setProducts([])
      setMatched(null)
      return
    }
    const load = async () => {
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('id')
        .ilike('name', supplier)
        .single()
      if (!supplierData) return setProducts([])

      const { data } = await supabase
        .from('supplier_products')
        .select('id, article_name, article_code, fixed_price, price_unit, unit')
        .eq('supplier_id', supplierData.id)
        .order('article_name')
      setProducts(data || [])
    }
    load()
  }, [supplier])

  useEffect(() => {
    if (!matchedProductId) { setMatched(null); return }
    const load = async () => {
      const { data } = await supabase
        .from('supplier_products')
        .select('id, article_name, article_code, fixed_price, price_unit, unit')
        .eq('id', matchedProductId)
        .single()
      setMatched(data || null)
    }
    load()
  }, [matchedProductId])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!supplier || supplier === 'Halfabricaat' || products.length === 0) return null

  const query = searchText || componentName
  const allScored = products
    .map((p) => ({ ...p, score: fuzzyScore(query, p.article_name) }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const topMatches = allScored.filter((p) => (p.score ?? 0) > 0)
  const scored = topMatches.length > 0 && !searchText
    ? [...topMatches, ...allScored.filter((p) => p.score === 0)]
    : allScored

  const clearMatch = () => {
    setMatched(null)
    onMatch(null)
  }

  const selectProduct = (p: SupplierProduct) => {
    setMatched(p)
    const suggestedUnit =
      p.price_unit?.toLowerCase() === 'kg' ? 'g'
      : p.price_unit?.toLowerCase() === 'st' ? 'st'
      : p.price_unit?.toLowerCase() === 'l' ? 'ml'
      : p.price_unit || undefined
    onMatch(p.id, suggestedUnit)
    setShowSuggestions(false)
    setSearchText('')
  }

  return (
    <div ref={ref} className="relative">
      {matched ? (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
          <Link2 className="w-3 h-3 text-emerald-600 shrink-0" />
          <span className="flex-1 min-w-0 truncate text-emerald-800 font-medium">
            {matched.article_name}
          </span>
          {matched.fixed_price != null && (
            <span className="text-emerald-600/70 text-[10px] shrink-0">
              €{matched.fixed_price.toFixed(2)}/{matched.price_unit ?? '?'}
            </span>
          )}
          {matched.article_code && (
            <span className="text-[10px] opacity-40 shrink-0">#{matched.article_code}</span>
          )}
          <button type="button" onClick={clearMatch} className="p-0.5 hover:text-red-500">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="w-full flex items-center gap-1.5 px-2 py-1 text-xs text-[#9E7E60]/60 hover:text-[#9E7E60] border border-dashed border-[#E8D5B5] rounded-lg transition-colors"
        >
          <Package className="w-3 h-3" />
          <span>Product matchen ({products.length} artikels)</span>
          {showSuggestions ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
        </button>
      )}

      {showSuggestions && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#E8D5B5] rounded-xl shadow-lg max-h-64 overflow-hidden flex flex-col">
          <div className="p-1.5 border-b border-[#F2E8D5]">
            <input
              className="w-full px-2.5 py-1.5 bg-[#FDF8F2] border border-[#E8D5B5] rounded-lg text-xs focus:outline-none focus:border-[#E8A040]/50"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={`Zoek in ${supplier} producten...`}
              autoFocus
            />
          </div>
          {topMatches.length > 0 && (
            <div className="px-2 py-0.5 text-[10px] font-semibold text-emerald-700/70 bg-emerald-50/60">
              Suggesties op basis van &quot;{componentName}&quot;
            </div>
          )}
          <div className="overflow-y-auto">
            {scored.map((p) => (
              <button
                key={p.id}
                type="button"
                className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-[#FDF8F2] flex items-center gap-2 border-b border-[#F2E8D5]/60"
                onMouseDown={(e) => { e.preventDefault(); selectProduct(p) }}
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-[#2C1810]">{p.article_name}</div>
                  <div className="flex gap-2 text-[10px] text-[#9E7E60]/60">
                    {p.article_code && <span>#{p.article_code}</span>}
                    {p.fixed_price != null && <span>€{p.fixed_price.toFixed(2)}/{p.price_unit ?? '?'}</span>}
                  </div>
                </div>
                {(p.score ?? 0) > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full shrink-0">match</span>
                )}
              </button>
            ))}
            {scored.length === 0 && (
              <div className="p-3 text-xs text-center text-[#9E7E60]/50">Geen producten gevonden</div>
            )}
          </div>
          {scored.length > 0 && (
            <div className="p-1.5 text-[10px] text-center text-[#9E7E60]/40 border-t border-[#F2E8D5]">
              {scored.length} van {products.length} producten
            </div>
          )}
        </div>
      )}
    </div>
  )
}
