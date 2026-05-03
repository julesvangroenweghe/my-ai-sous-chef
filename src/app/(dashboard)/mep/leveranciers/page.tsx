'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Supplier {
  id: string
  name: string
  category: string | null
  contact_email: string | null
  contact_phone: string | null
  website: string | null
  order_days: string[] | null
  delivery_days: string[] | null
  min_order_amount: number | null
  discount_percentage: number | null
  notes: string | null
  is_active: boolean
  product_count?: number
}

interface SupplierProduct {
  id: string
  product_name: string
  product_code: string | null
  price: number | null
  unit: string | null
  pack_size: string | null
  category: string | null
  is_order_item: boolean
  is_promo: boolean
  is_new: boolean
  is_bio: boolean
  last_updated: string | null
}

interface EditingState {
  supplierId: string
  field: 'discount_percentage' | 'min_order_amount'
  value: string
}

export default function MEPLeveranciersPage() {
  const supabase = createClient()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null)
  const [products, setProducts] = useState<Record<string, SupplierProduct[]>>({})
  const [loadingProducts, setLoadingProducts] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [saving, setSaving] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadSuppliers()
  }, [])

  useEffect(() => {
    if (editing && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editing])

  async function loadSuppliers() {
    setLoading(true)

    // Load suppliers
    const { data: supplierData, error } = await supabase
      .from('suppliers')
      .select('id, name, category, contact_email, contact_phone, website, order_days, delivery_days, min_order_amount, discount_percentage, notes, is_active')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error loading suppliers:', error)
      setLoading(false)
      return
    }

    // Load product counts per supplier
    const { data: productCounts } = await supabase
      .from('supplier_products')
      .select('supplier_id')

    const countMap = new Map<string, number>()
    for (const row of productCounts || []) {
      countMap.set(row.supplier_id, (countMap.get(row.supplier_id) || 0) + 1)
    }

    const enriched: Supplier[] = (supplierData || []).map(s => ({
      ...s,
      product_count: countMap.get(s.id) || 0,
    }))

    setSuppliers(enriched)
    setLoading(false)
  }

  async function loadProducts(supplierId: string) {
    if (products[supplierId]) return
    setLoadingProducts(supplierId)

    const { data, error } = await supabase
      .from('supplier_products')
      .select('id, product_name, product_code, price, unit, pack_size, category, is_order_item, is_promo, is_new, is_bio, last_updated')
      .eq('supplier_id', supplierId)
      .eq('is_active', true)
      .order('product_name', { ascending: true })

    if (!error && data) {
      setProducts(prev => ({ ...prev, [supplierId]: data }))
    }
    setLoadingProducts(null)
  }

  function toggleSupplier(supplierId: string) {
    if (expandedSupplier === supplierId) {
      setExpandedSupplier(null)
    } else {
      setExpandedSupplier(supplierId)
      loadProducts(supplierId)
    }
  }

  function startEdit(supplierId: string, field: 'discount_percentage' | 'min_order_amount', currentValue: number | null) {
    setEditing({
      supplierId,
      field,
      value: currentValue !== null ? String(currentValue) : '',
    })
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)

    const numVal = editing.value.trim() === '' ? null : parseFloat(editing.value.replace(',', '.'))

    const { error } = await supabase
      .from('suppliers')
      .update({ [editing.field]: numVal })
      .eq('id', editing.supplierId)

    if (!error) {
      setSuppliers(prev =>
        prev.map(s =>
          s.id === editing.supplierId
            ? { ...s, [editing.field]: numVal }
            : s
        )
      )
    }

    setSaving(false)
    setEditing(null)
  }

  function cancelEdit() {
    setEditing(null)
  }

  function getFilteredProducts(supplierId: string): SupplierProduct[] {
    const all = products[supplierId] || []
    const search = (productSearch[supplierId] || '').toLowerCase()
    if (!search) return all
    return all.filter(p =>
      p.product_name.toLowerCase().includes(search) ||
      (p.product_code || '').toLowerCase().includes(search) ||
      (p.category || '').toLowerCase().includes(search)
    )
  }

  function formatPrice(price: number | null): string {
    if (price === null) return '—'
    return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(price)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FDF8F2', padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontSize: 26,
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontWeight: 700,
          color: '#2C1810',
          margin: '0 0 6px',
        }}>
          🏪 Leveranciers
        </h1>
        <p style={{ fontSize: 14, color: '#7A5C3A', margin: 0 }}>
          Beheer leveranciers, kortingen en productcatalogi.
        </p>
      </div>

      {/* Stats bar */}
      {!loading && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{
            padding: '10px 16px',
            border: '1px solid #DDD0B8',
            borderRadius: 8,
            backgroundColor: '#FFFCF7',
            fontSize: 13,
          }}>
            <span style={{ color: '#9C8060' }}>Totaal: </span>
            <span style={{ fontWeight: 600, color: '#2C1810' }}>{suppliers.length} leveranciers</span>
          </div>
          <div style={{
            padding: '10px 16px',
            border: '1px solid #DDD0B8',
            borderRadius: 8,
            backgroundColor: '#FFFCF7',
            fontSize: 13,
          }}>
            <span style={{ color: '#9C8060' }}>Actief: </span>
            <span style={{ fontWeight: 600, color: '#2C1810' }}>
              {suppliers.filter(s => s.is_active).length}
            </span>
          </div>
          <div style={{
            padding: '10px 16px',
            border: '1px solid #DDD0B8',
            borderRadius: 8,
            backgroundColor: '#FFFCF7',
            fontSize: 13,
          }}>
            <span style={{ color: '#9C8060' }}>Producten totaal: </span>
            <span style={{ fontWeight: 600, color: '#2C1810' }}>
              {suppliers.reduce((sum, s) => sum + (s.product_count || 0), 0)}
            </span>
          </div>
        </div>
      )}

      {/* Supplier list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              height: 72,
              borderRadius: 10,
              backgroundColor: '#F2E8D5',
              animation: 'pulse 1.5s infinite',
            }} />
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
        </div>
      ) : suppliers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9C8060' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏪</div>
          <p style={{ fontSize: 16, fontFamily: 'Georgia, serif' }}>Nog geen leveranciers gevonden.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {suppliers.map(supplier => {
            const isExpanded = expandedSupplier === supplier.id
            const filteredProducts = getFilteredProducts(supplier.id)
            const isEditingDiscount = editing?.supplierId === supplier.id && editing.field === 'discount_percentage'
            const isEditingMinOrder = editing?.supplierId === supplier.id && editing.field === 'min_order_amount'
            const lastUpdated = (products[supplier.id] || [])
              .map(p => p.last_updated)
              .filter(Boolean)
              .sort()
              .reverse()[0]

            return (
              <div
                key={supplier.id}
                style={{
                  border: `1px solid ${isExpanded ? '#E8A040' : '#E5D8C0'}`,
                  borderRadius: 10,
                  backgroundColor: '#FDFAF5',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}
              >
                {/* Supplier header row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleSupplier(supplier.id)}
                >
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="#9C8060" strokeWidth="2"
                    style={{
                      flexShrink: 0,
                      transform: isExpanded ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.15s',
                    }}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>

                  {/* Name & category */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: '#2C1810',
                        fontFamily: 'Georgia, serif',
                      }}>
                        {supplier.name}
                      </span>
                      {!supplier.is_active && (
                        <span style={{
                          fontSize: 10,
                          color: '#9C8060',
                          backgroundColor: '#F2E8D5',
                          borderRadius: 10,
                          padding: '1px 7px',
                          border: '1px solid #DDD0B8',
                        }}>
                          Inactief
                        </span>
                      )}
                      {supplier.category && (
                        <span style={{
                          fontSize: 11,
                          color: '#7A5C3A',
                          backgroundColor: '#F2E8D5',
                          borderRadius: 10,
                          padding: '1px 8px',
                        }}>
                          {supplier.category}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 3, flexWrap: 'wrap' }}>
                      {supplier.contact_email && (
                        <span style={{ fontSize: 12, color: '#9C8060' }}>✉ {supplier.contact_email}</span>
                      )}
                      {supplier.contact_phone && (
                        <span style={{ fontSize: 12, color: '#9C8060' }}>☎ {supplier.contact_phone}</span>
                      )}
                      {supplier.order_days && supplier.order_days.length > 0 && (
                        <span style={{ fontSize: 12, color: '#9C8060' }}>
                          Besteldagen: {supplier.order_days.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Korting (inline edit) */}
                  <div
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 90 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <span style={{ fontSize: 10, color: '#9C8060', marginBottom: 2 }}>Korting</span>
                    {isEditingDiscount ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editing!.value}
                          onChange={e => setEditing(prev => prev ? { ...prev, value: e.target.value } : null)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                          style={{
                            width: 56,
                            padding: '3px 6px',
                            border: '1px solid #E8A040',
                            borderRadius: 5,
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#2C1810',
                            textAlign: 'right',
                            outline: 'none',
                          }}
                        />
                        <span style={{ fontSize: 12, color: '#7A5C3A' }}>%</span>
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          style={{
                            padding: '3px 7px',
                            backgroundColor: '#E8A040',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 5,
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelEdit}
                          style={{
                            padding: '3px 7px',
                            backgroundColor: '#F2E8D5',
                            color: '#7A5C3A',
                            border: '1px solid #DDD0B8',
                            borderRadius: 5,
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(supplier.id, 'discount_percentage', supplier.discount_percentage)}
                        title="Klik om te bewerken"
                        style={{
                          background: 'none',
                          border: '1px dashed #DDD0B8',
                          borderRadius: 5,
                          padding: '3px 8px',
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: 700,
                          color: supplier.discount_percentage ? '#E8A040' : '#9C8060',
                        }}
                      >
                        {supplier.discount_percentage !== null ? `${supplier.discount_percentage}%` : '—'}
                      </button>
                    )}
                  </div>

                  {/* Min bestelling (inline edit) */}
                  <div
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 110 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <span style={{ fontSize: 10, color: '#9C8060', marginBottom: 2 }}>Min. bestelling</span>
                    {isEditingMinOrder ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, color: '#7A5C3A' }}>€</span>
                        <input
                          ref={isEditingMinOrder ? editInputRef : undefined}
                          type="text"
                          value={editing!.value}
                          onChange={e => setEditing(prev => prev ? { ...prev, value: e.target.value } : null)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                          style={{
                            width: 60,
                            padding: '3px 6px',
                            border: '1px solid #E8A040',
                            borderRadius: 5,
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#2C1810',
                            textAlign: 'right',
                            outline: 'none',
                          }}
                        />
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          style={{
                            padding: '3px 7px',
                            backgroundColor: '#E8A040',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 5,
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelEdit}
                          style={{
                            padding: '3px 7px',
                            backgroundColor: '#F2E8D5',
                            color: '#7A5C3A',
                            border: '1px solid #DDD0B8',
                            borderRadius: 5,
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(supplier.id, 'min_order_amount', supplier.min_order_amount)}
                        title="Klik om te bewerken"
                        style={{
                          background: 'none',
                          border: '1px dashed #DDD0B8',
                          borderRadius: 5,
                          padding: '3px 8px',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 600,
                          color: supplier.min_order_amount ? '#2C1810' : '#9C8060',
                        }}
                      >
                        {supplier.min_order_amount !== null ? formatPrice(supplier.min_order_amount) : '—'}
                      </button>
                    )}
                  </div>

                  {/* Product count badge */}
                  <span style={{
                    flexShrink: 0,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#B5631A',
                    backgroundColor: '#FEF3E2',
                    borderRadius: 10,
                    padding: '3px 10px',
                    border: '1px solid #F0C070',
                    minWidth: 32,
                    textAlign: 'center',
                  }}>
                    {supplier.product_count || 0}
                  </span>
                </div>

                {/* Expanded product catalog */}
                {isExpanded && (
                  <div style={{
                    borderTop: '1px solid #EDE3D0',
                    padding: '16px',
                  }}>
                    {/* Catalog header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: '#9C8060', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Productcatalogus
                      </span>
                      {lastUpdated && (
                        <span style={{ fontSize: 11, color: '#9C8060' }}>
                          Bijgewerkt: {new Date(lastUpdated).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      {supplier.delivery_days && supplier.delivery_days.length > 0 && (
                        <span style={{ fontSize: 11, color: '#7A5C3A', backgroundColor: '#F2E8D5', borderRadius: 6, padding: '2px 8px' }}>
                          Leverdagen: {supplier.delivery_days.join(', ')}
                        </span>
                      )}
                      {supplier.website && (
                        <a
                          href={supplier.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ fontSize: 12, color: '#B5631A', textDecoration: 'none' }}
                        >
                          🌐 Website
                        </a>
                      )}

                      {/* Search */}
                      <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 280, marginLeft: 'auto' }}>
                        <svg
                          width="13" height="13" viewBox="0 0 24 24" fill="none"
                          stroke="#9C8060" strokeWidth="2" strokeLinecap="round"
                          style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }}
                        >
                          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Zoek product..."
                          value={productSearch[supplier.id] || ''}
                          onChange={e => setProductSearch(prev => ({ ...prev, [supplier.id]: e.target.value }))}
                          onClick={e => e.stopPropagation()}
                          style={{
                            width: '100%',
                            paddingLeft: 28,
                            paddingRight: 10,
                            paddingTop: 6,
                            paddingBottom: 6,
                            border: '1px solid #DDD0B8',
                            borderRadius: 6,
                            backgroundColor: '#FFFCF7',
                            fontSize: 13,
                            color: '#2C1810',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>

                    {loadingProducts === supplier.id ? (
                      <p style={{ fontSize: 13, color: '#9C8060' }}>Producten laden...</p>
                    ) : filteredProducts.length === 0 ? (
                      <p style={{ fontSize: 13, color: '#9C8060', fontStyle: 'italic' }}>
                        {(products[supplier.id] || []).length === 0
                          ? 'Geen actieve producten gevonden.'
                          : 'Geen producten gevonden voor deze zoekopdracht.'}
                      </p>
                    ) : (
                      <div style={{
                        border: '1px solid #E5D8C0',
                        borderRadius: 8,
                        overflow: 'hidden',
                      }}>
                        {/* Table header */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 100px 80px 80px 80px 80px',
                          gap: 8,
                          padding: '8px 12px',
                          backgroundColor: '#F2E8D5',
                          borderBottom: '1px solid #E5D8C0',
                        }}>
                          {['Product', 'Code', 'Prijs', 'Eenheid', 'Verpakking', 'Badges'].map(h => (
                            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#7A5C3A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                              {h}
                            </span>
                          ))}
                        </div>

                        {/* Product rows */}
                        {filteredProducts.map((product, idx) => (
                          <div
                            key={product.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '2fr 100px 80px 80px 80px 80px',
                              gap: 8,
                              padding: '8px 12px',
                              backgroundColor: idx % 2 === 0 ? '#FFFCF7' : '#FAF5EE',
                              borderBottom: idx < filteredProducts.length - 1 ? '1px solid #EDE3D0' : 'none',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <span style={{ fontSize: 13, color: '#2C1810', display: 'block' }}>
                                {product.product_name}
                              </span>
                              {product.category && (
                                <span style={{ fontSize: 10, color: '#9C8060' }}>{product.category}</span>
                              )}
                            </div>
                            <span style={{ fontSize: 12, color: '#7A5C3A', fontFamily: 'monospace' }}>
                              {product.product_code || '—'}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#2C1810' }}>
                              {formatPrice(product.price)}
                            </span>
                            <span style={{ fontSize: 12, color: '#5C4730' }}>
                              {product.unit || '—'}
                            </span>
                            <span style={{ fontSize: 12, color: '#7A5C3A' }}>
                              {product.pack_size || '—'}
                            </span>
                            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                              {product.is_order_item && (
                                <span style={{ fontSize: 9, backgroundColor: '#FEF3E2', color: '#B5631A', borderRadius: 4, padding: '1px 4px', border: '1px solid #F0C070' }}>
                                  BESTEL
                                </span>
                              )}
                              {product.is_promo && (
                                <span style={{ fontSize: 9, backgroundColor: '#FFF3CD', color: '#856404', borderRadius: 4, padding: '1px 4px', border: '1px solid #FFEEBA' }}>
                                  PROMO
                                </span>
                              )}
                              {product.is_new && (
                                <span style={{ fontSize: 9, backgroundColor: '#D4EDDA', color: '#155724', borderRadius: 4, padding: '1px 4px', border: '1px solid #C3E6CB' }}>
                                  NIEUW
                                </span>
                              )}
                              {product.is_bio && (
                                <span style={{ fontSize: 9, backgroundColor: '#D4EDDA', color: '#155724', borderRadius: 4, padding: '1px 4px', border: '1px solid #C3E6CB' }}>
                                  BIO
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Notes */}
                    {supplier.notes && (
                      <div style={{
                        marginTop: 12,
                        padding: '10px 12px',
                        backgroundColor: '#FEF3E2',
                        borderRadius: 6,
                        border: '1px solid #F0C070',
                        fontSize: 13,
                        color: '#7A5C3A',
                        fontStyle: 'italic',
                      }}>
                        📝 {supplier.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
