'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Truck, Search, ChevronDown, ChevronRight, Phone, Mail,
  MapPin, Clock, ArrowUpDown, Package
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface LeverancierProduct {
  id: string
  product_name: string
  unit: string | null
  price: number | null
  category: string | null
  last_updated: string
}

interface Leverancier {
  id: string
  name: string
  contact_email: string | null
  contact_phone: string | null
  website: string | null
  category: string | null
  delivery_days: string | null
  min_order_amount: number | null
  notes: string | null
  products: LeverancierProduct[]
  expanded: boolean
  last_updated: string
}

export default function LeveranciersPage() {
  const [suppliers, setLeveranciers] = useState<Leverancier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select(`
        id, name, contact_email, contact_phone, website, category,
        delivery_days, min_order_amount, notes, updated_at,
        products:supplier_products(id, product_name, unit, price, category, last_updated)
      `)
      .order('name')

    if (data) {
      setLeveranciers(data.map((s: Record<string, unknown>) => ({
        ...s,
        products: ((s.products || []) as LeverancierProduct[])
          .sort((a, b) => a.product_name.localeCompare(b.product_name)),
        expanded: false,
      })) as Leverancier[])
    }
    setLoading(false)
  }

  const toggleLeverancier = (id: string) => {
    setLeveranciers(prev => prev.map(s =>
      s.id === id ? { ...s, expanded: !s.expanded } : s
    ))
  }

  const filtered = suppliers.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Cross-supplier product search
  const allProducts = productSearch
    ? suppliers.flatMap(s =>
        s.products
          .filter(p => p.product_name.toLowerCase().includes(productSearch.toLowerCase()))
          .map(p => ({ ...p, supplier_name: s.name }))
      ).sort((a, b) => (a.price || 0) - (b.price || 0))
    : []

  const categoryColors: Record<string, string> = {
    'groenten': 'bg-emerald-900/30 text-emerald-400',
    'fruit': 'bg-lime-900/30 text-lime-400',
    'vlees': 'bg-red-900/30 text-red-400',
    'vis': 'bg-blue-900/30 text-blue-400',
    'zuivel': 'bg-yellow-900/30 text-yellow-400',
    'droog': 'bg-orange-900/30 text-orange-400',
    'dranken': 'bg-sky-900/30 text-sky-400',
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-800 animate-pulse" />
          <div className="space-y-2">
            <div className="w-48 h-6 bg-zinc-800 rounded animate-pulse" />
            <div className="w-32 h-4 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-5 animate-pulse">
            <div className="h-6 bg-zinc-800 rounded w-48 mb-2" />
            <div className="h-4 bg-zinc-800/50 rounded w-32" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-600/20 flex items-center justify-center">
            <Truck className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-white tracking-tight">Leveranciers</h1>
            <p className="text-zinc-500 text-sm mt-0.5">{suppliers.length} leveranciers geregistreerd</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Zoek leverancier..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <div className="relative">
          <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Zoek product over alle leveranciers..."
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
      </div>

      {/* Cross-supplier product search results */}
      {allProducts.length > 0 && (
        <div className="card overflow-hidden animate-slide-up">
          <div className="px-4 py-3 bg-zinc-900/60 border-b border-zinc-700/50">
            <h3 className="text-sm font-semibold text-zinc-300">
              Prijsvergelijking: &ldquo;{productSearch}&rdquo; ({allProducts.length} resultaten)
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700/50">
                <th className="text-left py-2 px-4 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Product</th>
                <th className="text-left py-2 px-4 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Leverancier</th>
                <th className="text-right py-2 px-4 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Prijs</th>
                <th className="text-left py-2 px-4 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Eenheid</th>
              </tr>
            </thead>
            <tbody>
              {allProducts.map((p, i) => (
                <tr key={p.id} className={`border-b border-zinc-800 ${i === 0 ? 'bg-emerald-900/20' : ''}`}>
                  <td className="py-2 px-4 font-medium text-white">{p.product_name}</td>
                  <td className="py-2 px-4 text-zinc-400">{p.supplier_name}</td>
                  <td className="py-2 px-4 text-right font-mono font-semibold text-white">
                    {p.price != null ? formatCurrency(p.price) : '-'}
                  </td>
                  <td className="py-2 px-4 text-zinc-500">{p.unit || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leveranciers List */}
      <div className="space-y-3 animate-slide-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        {filtered.length === 0 ? (
          <div className="bg-zinc-900/80 border border-zinc-700/50 rounded-lg p-12 text-center">
            <Truck className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="font-display font-semibold text-white">Geen leveranciers gevonden</p>
          </div>
        ) : (
          filtered.map(supplier => (
            <div key={supplier.id} className="bg-zinc-900/80 border border-zinc-700/50 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleLeverancier(supplier.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-zinc-800/50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-display font-semibold text-white">{supplier.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                      {supplier.category && (
                        <span className={`px-2 py-0.5 rounded-full font-medium ${
                          categoryColors[supplier.category.toLowerCase()] || 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {supplier.category}
                        </span>
                      )}
                      <span>{supplier.products.length} producten</span>
                      {supplier.delivery_days && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {supplier.delivery_days}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-zinc-600">
                    {formatDate(supplier.updated_at)}
                  </span>
                  {supplier.expanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
                </div>
              </button>

              {supplier.expanded && (
                <div className="border-t border-zinc-700/50">
                  {/* Contact Info */}
                  <div className="px-5 py-3 bg-zinc-800/50/50 flex flex-wrap gap-4 text-xs text-zinc-500">
                    {supplier.contact_email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        {supplier.contact_email}
                      </span>
                    )}
                    {supplier.contact_phone && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        {supplier.contact_phone}
                      </span>
                    )}
                    {supplier.website && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {supplier.website}
                      </span>
                    )}
                  </div>

                  {/* Products table */}
                  {supplier.products.length > 0 && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-700/50">
                          <th className="text-left py-2 px-5 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Product</th>
                          <th className="text-left py-2 px-3 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Categorie</th>
                          <th className="text-right py-2 px-3 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Prijs</th>
                          <th className="text-left py-2 px-3 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Eenheid</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplier.products.map(p => (
                          <tr key={p.id} className="border-b border-zinc-800 hover:bg-zinc-800/50/50">
                            <td className="py-2 px-5 font-medium text-zinc-300">{p.product_name}</td>
                            <td className="py-2 px-3 text-zinc-500">{p.category || '-'}</td>
                            <td className="py-2 px-3 text-right font-mono text-white">
                              {p.price != null ? formatCurrency(p.price) : '-'}
                            </td>
                            <td className="py-2 px-3 text-zinc-500">{p.unit || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
