'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Truck, Search, ChevronDown, ChevronRight, Phone, Mail,
  MapPin, Clock, ArrowUpDown, Package
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface SupplierProduct {
  id: string
  product_name: string
  unit: string | null
  price: number | null
  category: string | null
  updated_at: string
}

interface Supplier {
  id: string
  name: string
  contact_email: string | null
  contact_phone: string | null
  website: string | null
  category: string | null
  delivery_days: string | null
  min_order_amount: number | null
  notes: string | null
  products: SupplierProduct[]
  expanded: boolean
  updated_at: string
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
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
      setSuppliers(data.map((s: Record<string, unknown>) => ({
        ...s,
        products: ((s.products || []) as SupplierProduct[])
          .sort((a, b) => a.product_name.localeCompare(b.product_name)),
        expanded: false,
      })) as Supplier[])
    }
    setLoading(false)
  }

  const toggleSupplier = (id: string) => {
    setSuppliers(prev => prev.map(s =>
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
    'groenten': 'bg-emerald-50 text-emerald-700',
    'fruit': 'bg-lime-50 text-lime-700',
    'vlees': 'bg-red-50 text-red-700',
    'vis': 'bg-blue-50 text-blue-700',
    'zuivel': 'bg-yellow-50 text-yellow-700',
    'droog': 'bg-orange-50 text-orange-700',
    'dranken': 'bg-sky-50 text-sky-700',
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-stone-100 animate-pulse" />
          <div className="space-y-2">
            <div className="w-48 h-6 bg-stone-100 rounded animate-pulse" />
            <div className="w-32 h-4 bg-stone-100 rounded animate-pulse" />
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="h-6 bg-stone-100 rounded w-48 mb-2" />
            <div className="h-4 bg-stone-50 rounded w-32" />
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
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
            <Truck className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">Leveranciers</h1>
            <p className="text-stone-400 text-sm mt-0.5">{suppliers.length} leveranciers geregistreerd</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Zoek leverancier..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <div className="relative">
          <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
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
          <div className="px-4 py-3 bg-stone-50 border-b border-stone-100">
            <h3 className="text-sm font-semibold text-stone-700">
              Prijsvergelijking: &ldquo;{productSearch}&rdquo; ({allProducts.length} resultaten)
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="text-left py-2 px-4 text-[11px] text-stone-400 uppercase tracking-wider font-semibold">Product</th>
                <th className="text-left py-2 px-4 text-[11px] text-stone-400 uppercase tracking-wider font-semibold">Leverancier</th>
                <th className="text-right py-2 px-4 text-[11px] text-stone-400 uppercase tracking-wider font-semibold">Prijs</th>
                <th className="text-left py-2 px-4 text-[11px] text-stone-400 uppercase tracking-wider font-semibold">Eenheid</th>
              </tr>
            </thead>
            <tbody>
              {allProducts.map((p, i) => (
                <tr key={p.id} className={`border-b border-stone-50 ${i === 0 ? 'bg-emerald-50/30' : ''}`}>
                  <td className="py-2 px-4 font-medium text-stone-900">{p.product_name}</td>
                  <td className="py-2 px-4 text-stone-600">{p.supplier_name}</td>
                  <td className="py-2 px-4 text-right font-mono font-semibold text-stone-900">
                    {p.price != null ? formatCurrency(p.price) : '-'}
                  </td>
                  <td className="py-2 px-4 text-stone-500">{p.unit || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Suppliers List */}
      <div className="space-y-3 animate-slide-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <Truck className="w-12 h-12 text-stone-200 mx-auto mb-4" />
            <p className="font-display font-semibold text-stone-900">Geen leveranciers gevonden</p>
          </div>
        ) : (
          filtered.map(supplier => (
            <div key={supplier.id} className="card overflow-hidden">
              <button
                onClick={() => toggleSupplier(supplier.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-stone-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5 text-stone-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-display font-semibold text-stone-900">{supplier.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-stone-400">
                      {supplier.category && (
                        <span className={`px-2 py-0.5 rounded-full font-medium ${
                          categoryColors[supplier.category.toLowerCase()] || 'bg-stone-100 text-stone-600'
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
                  <span className="text-[10px] text-stone-300">
                    {formatDate(supplier.updated_at)}
                  </span>
                  {supplier.expanded ? <ChevronDown className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
                </div>
              </button>

              {supplier.expanded && (
                <div className="border-t border-stone-100">
                  {/* Contact Info */}
                  <div className="px-5 py-3 bg-stone-50/50 flex flex-wrap gap-4 text-xs text-stone-500">
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
                    {supplier.address && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {supplier.address}
                      </span>
                    )}
                  </div>

                  {/* Products table */}
                  {supplier.products.length > 0 && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-stone-100">
                          <th className="text-left py-2 px-5 text-[11px] text-stone-400 uppercase tracking-wider font-semibold">Product</th>
                          <th className="text-left py-2 px-3 text-[11px] text-stone-400 uppercase tracking-wider font-semibold">Categorie</th>
                          <th className="text-right py-2 px-3 text-[11px] text-stone-400 uppercase tracking-wider font-semibold">Prijs</th>
                          <th className="text-left py-2 px-3 text-[11px] text-stone-400 uppercase tracking-wider font-semibold">Eenheid</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplier.products.map(p => (
                          <tr key={p.id} className="border-b border-stone-50 hover:bg-stone-50/50">
                            <td className="py-2 px-5 font-medium text-stone-700">{p.product_name}</td>
                            <td className="py-2 px-3 text-stone-500">{p.category || '-'}</td>
                            <td className="py-2 px-3 text-right font-mono text-stone-900">
                              {p.price != null ? formatCurrency(p.price) : '-'}
                            </td>
                            <td className="py-2 px-3 text-stone-500">{p.unit || '-'}</td>
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
