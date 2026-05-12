'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface LineItem {
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
  total: number
}

interface ClientInvoice {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string | null
  status: 'concept' | 'verzonden' | 'betaald' | 'geannuleerd'
  client_name: string
  client_email: string | null
  client_address: string | null
  client_vat: string | null
  line_items: LineItem[]
  subtotal: number
  vat_amount: number
  total_amount: number
  payment_terms: string | null
  bank_account: string | null
  notes: string | null
  event_id: string | null
  num_persons: number | null
}

const statusConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
  concept:     { label: 'Concept',     bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
  verzonden:   { label: 'Verzonden',   bg: '#FEF3E2', color: '#92400E', border: '#F6D860' },
  betaald:     { label: 'Betaald',     bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
  geannuleerd: { label: 'Geannuleerd', bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: '#FAF6EF', border: '1px solid #E8D5B5',
  borderRadius: 8, color: '#2C1810', fontSize: 14,
  outline: 'none', fontFamily: 'inherit',
}

function LabeledInput({
  label, value, onChange, type = 'text', placeholder = '', multiline = false
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  multiline?: boolean
}) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#9E7E60', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
          style={{ ...inputStyle, resize: 'vertical' }} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={inputStyle} />
      )}
    </div>
  )
}

export default function FactuurDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [invoice, setInvoice] = useState<ClientInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Editable state
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [numPersons, setNumPersons] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [clientVat, setClientVat] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [notes, setNotes] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [status, setStatus] = useState<ClientInvoice['status']>('concept')
  const [paymentTerms, setPaymentTerms] = useState('30 dagen netto')

  useEffect(() => {
    fetch(`/api/client-invoices/${id}`)
      .then(r => r.json())
      .then((data: ClientInvoice) => {
        setInvoice(data)
        setInvoiceNumber(data.invoice_number || '')
        setInvoiceDate(data.invoice_date ? data.invoice_date.substring(0, 10) : '')
        setDueDate(data.due_date ? data.due_date.substring(0, 10) : '')
        setNumPersons(data.num_persons != null ? String(data.num_persons) : '')
        setClientName(data.client_name || '')
        setClientEmail(data.client_email || '')
        setClientAddress(data.client_address || '')
        setClientVat(data.client_vat || '')
        setLineItems(data.line_items || [])
        setNotes(data.notes || '')
        setBankAccount(data.bank_account || '')
        setStatus(data.status || 'concept')
        setPaymentTerms(data.payment_terms || '30 dagen netto')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const computeTotals = (items: LineItem[]) => {
    const subtotal = items.reduce((s, i) => s + i.total, 0)
    const vat_amount = items.reduce((s, i) => s + (i.total * i.vat_rate / 100), 0)
    return { subtotal, vat_amount, total_amount: subtotal + vat_amount }
  }

  const debouncedSave = useCallback((patch: Record<string, unknown>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaving(true)
      const res = await fetch(`/api/client-invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        const updated = await res.json()
        setInvoice(updated)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
      setSaving(false)
    }, 1500)
  }, [id])

  const handleLineItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = lineItems.map((item, i) => {
      if (i !== index) return item
      const newItem = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        newItem.total = Number(newItem.quantity) * Number(newItem.unit_price)
      }
      return newItem
    })
    setLineItems(updated)
    const totals = computeTotals(updated)
    debouncedSave({ line_items: updated, ...totals })
  }

  const addLineItem = () => {
    const newItem: LineItem = { description: '', quantity: 1, unit_price: 0, vat_rate: 6, total: 0 }
    const updated = [...lineItems, newItem]
    setLineItems(updated)
    debouncedSave({ line_items: updated, ...computeTotals(updated) })
  }

  const removeLineItem = (index: number) => {
    const updated = lineItems.filter((_, i) => i !== index)
    setLineItems(updated)
    debouncedSave({ line_items: updated, ...computeTotals(updated) })
  }

  const handleStatusChange = async (newStatus: ClientInvoice['status']) => {
    setStatus(newStatus)
    setSaving(true)
    const res = await fetch(`/api/client-invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      const updated = await res.json()
      setInvoice(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    await fetch(`/api/client-invoices/${id}`, { method: 'DELETE' })
    router.push('/facturen')
  }

  const totals = computeTotals(lineItems)

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#9E7E60' }}>Laden...</div>

  if (!invoice) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <p style={{ color: '#9E7E60' }}>Factuur niet gevonden</p>
        <Link href="/facturen" style={{ color: '#C4703A', textDecoration: 'none', fontSize: 14 }}>Terug naar overzicht</Link>
      </div>
    )
  }

  const sc = statusConfig[status] || statusConfig.concept

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 28 }}>
        <Link href="/facturen" style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: 8, border: '1px solid #E8D5B5',
          background: 'white', color: '#9E7E60', textDecoration: 'none', marginTop: 4,
        }}>
          <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 700, color: '#2C1810', margin: 0 }}>
              {invoiceNumber || 'Nieuwe factuur'}
            </h1>
            <span style={{
              padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
            }}>
              {sc.label}
            </span>
            {saving && <span style={{ fontSize: 12, color: '#9E7E60' }}>Opslaan...</span>}
            {saved && !saving && (
              <span style={{ fontSize: 12, color: '#065F46', display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width={12} height={12} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Opgeslagen
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <a
            href={`/facturen/${id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 18px', background: '#E8A040', color: '#2C1810',
              borderRadius: 9, fontWeight: 700, fontSize: 14, textDecoration: 'none',
            }}
          >
            <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            PDF bekijken
          </a>
          <button
            onClick={() => setShowDelete(true)}
            style={{ padding: '9px 14px', background: 'white', border: '1px solid #E8D5B5', borderRadius: 9, color: '#9E7E60', cursor: 'pointer' }}
          >
            <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Delete confirm */}
      {showDelete && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <p style={{ flex: 1, color: '#991B1B', fontSize: 14, fontWeight: 600 }}>Factuur definitief verwijderen?</p>
          <button onClick={handleDelete} disabled={deleting} style={{ padding: '7px 18px', background: '#EF4444', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            {deleting ? 'Verwijderen...' : 'Ja, verwijder'}
          </button>
          <button onClick={() => setShowDelete(false)} style={{ padding: '7px 18px', background: 'white', border: '1px solid #FCA5A5', borderRadius: 8, color: '#9E7E60', cursor: 'pointer', fontSize: 13 }}>
            Annuleren
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: 20 }}>
        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Factuurgegevens (bewerkbaar) */}
          <div style={{ background: 'white', border: '1px solid #E8D5B5', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E8D5B5', background: '#F5EDE0' }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 700, color: '#2C1810', margin: 0 }}>
                Factuurgegevens
              </h2>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <LabeledInput
                  label="Factuurnummer"
                  value={invoiceNumber}
                  placeholder="SIR-2026-0001"
                  onChange={v => { setInvoiceNumber(v); debouncedSave({ invoice_number: v }) }}
                />
              </div>
              <div>
                <LabeledInput
                  label="Factuurdatum"
                  type="date"
                  value={invoiceDate}
                  onChange={v => { setInvoiceDate(v); debouncedSave({ invoice_date: v || null }) }}
                />
              </div>
              <div>
                <LabeledInput
                  label="Vervaldatum"
                  type="date"
                  value={dueDate}
                  onChange={v => { setDueDate(v); debouncedSave({ due_date: v || null }) }}
                />
              </div>
              <div>
                <LabeledInput
                  label="Aantal personen"
                  type="number"
                  value={numPersons}
                  placeholder="bv. 80"
                  onChange={v => {
                    setNumPersons(v)
                    debouncedSave({ num_persons: v ? parseInt(v) : null })
                  }}
                />
              </div>
            </div>
          </div>

          {/* Klantgegevens */}
          <div style={{ background: 'white', border: '1px solid #E8D5B5', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E8D5B5', background: '#F5EDE0' }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 700, color: '#2C1810', margin: 0 }}>
                Klantgegevens
              </h2>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <LabeledInput label="Naam / Bedrijf" value={clientName} placeholder="Naam klant of bedrijf"
                  onChange={v => { setClientName(v); debouncedSave({ client_name: v }) }} />
              </div>
              <LabeledInput label="E-mailadres" value={clientEmail} placeholder="email@bedrijf.be"
                onChange={v => { setClientEmail(v); debouncedSave({ client_email: v }) }} />
              <LabeledInput label="BTW-nummer" value={clientVat} placeholder="BE0xxx.xxx.xxx"
                onChange={v => { setClientVat(v); debouncedSave({ client_vat: v }) }} />
              <div style={{ gridColumn: 'span 2' }}>
                <LabeledInput label="Adres" value={clientAddress} placeholder="Straat nr, Postcode Gemeente" multiline
                  onChange={v => { setClientAddress(v); debouncedSave({ client_address: v }) }} />
              </div>
            </div>
          </div>

          {/* Factuurregels */}
          <div style={{ background: 'white', border: '1px solid #E8D5B5', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E8D5B5', background: '#F5EDE0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 700, color: '#2C1810', margin: 0 }}>
                Factuurregels
              </h2>
              <button onClick={addLineItem} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', background: '#E8A040', color: '#2C1810',
                border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}>
                <svg width={12} height={12} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Regel toevoegen
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FAF6EF', borderBottom: '1px solid #E8D5B5' }}>
                    {['Omschrijving', 'Aantal', 'Prijs/stuk', 'BTW %', 'Totaal', ''].map((h, i) => (
                      <th key={i} style={{
                        padding: '9px 10px', textAlign: i === 0 ? 'left' : i === 5 ? 'center' : 'right',
                        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9E7E60',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lineItems.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px 10px', textAlign: 'center', color: '#B8997A', fontStyle: 'italic', fontSize: 14 }}>
                        Nog geen regels — klik op &ldquo;Regel toevoegen&rdquo;
                      </td>
                    </tr>
                  )}
                  {lineItems.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F2E8D5' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <input
                          value={item.description}
                          onChange={e => handleLineItemChange(i, 'description', e.target.value)}
                          placeholder="Omschrijving..."
                          style={{ width: '100%', padding: '6px 8px', background: '#FAF6EF', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 13, color: '#2C1810', outline: 'none' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <input
                          type="number" min="0" step="1"
                          value={item.quantity}
                          onChange={e => handleLineItemChange(i, 'quantity', parseFloat(e.target.value) || 0)}
                          style={{ width: 70, padding: '6px 8px', background: '#FAF6EF', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 13, color: '#2C1810', textAlign: 'right', outline: 'none' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <input
                          type="number" min="0" step="0.01"
                          value={item.unit_price}
                          onChange={e => handleLineItemChange(i, 'unit_price', parseFloat(e.target.value) || 0)}
                          style={{ width: 90, padding: '6px 8px', background: '#FAF6EF', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 13, color: '#2C1810', textAlign: 'right', outline: 'none' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <select
                          value={item.vat_rate}
                          onChange={e => handleLineItemChange(i, 'vat_rate', parseFloat(e.target.value))}
                          style={{ width: 68, padding: '6px 8px', background: '#FAF6EF', border: '1px solid #E8D5B5', borderRadius: 6, fontSize: 13, color: '#2C1810', outline: 'none' }}
                        >
                          <option value={0}>0%</option>
                          <option value={6}>6%</option>
                          <option value={12}>12%</option>
                          <option value={21}>21%</option>
                        </select>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#2C1810', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        € {Number(item.total).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                        <button onClick={() => removeLineItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B8997A', padding: 4, borderRadius: 4 }}>
                          <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Totals */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #E8D5B5', background: '#FAF6EF' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: 280 }}>
                  {[
                    { label: 'Subtotaal', value: totals.subtotal },
                    { label: 'BTW', value: totals.vat_amount },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderBottom: '1px solid #E8D5B5' }}>
                      <span style={{ color: '#9E7E60' }}>{row.label}</span>
                      <span style={{ color: '#2C1810', fontFamily: 'monospace' }}>€ {row.value.toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 18, fontWeight: 700 }}>
                    <span style={{ color: '#2C1810' }}>Totaal</span>
                    <span style={{ color: '#C4703A', fontFamily: 'monospace' }}>€ {totals.total_amount.toFixed(2)}</span>
                  </div>
                  {numPersons && parseInt(numPersons) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, borderTop: '1px dashed #E8D5B5', marginTop: 4 }}>
                      <span style={{ color: '#9E7E60' }}>Per persoon ({numPersons}p)</span>
                      <span style={{ color: '#9E7E60', fontFamily: 'monospace' }}>
                        € {(totals.total_amount / parseInt(numPersons)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Betalingsinfo & notities */}
          <div style={{ background: 'white', border: '1px solid #E8D5B5', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E8D5B5', background: '#F5EDE0' }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 700, color: '#2C1810', margin: 0 }}>
                Betalingsinfo &amp; Notities
              </h2>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <LabeledInput label="Rekeningnummer" value={bankAccount} placeholder="BE00 0000 0000 0000"
                  onChange={v => { setBankAccount(v); debouncedSave({ bank_account: v }) }} />
                <LabeledInput label="Betalingsvoorwaarden" value={paymentTerms} placeholder="30 dagen netto"
                  onChange={v => { setPaymentTerms(v); debouncedSave({ payment_terms: v }) }} />
              </div>
              <LabeledInput label="Notities" value={notes} multiline placeholder="Extra informatie voor de klant..."
                onChange={v => { setNotes(v); debouncedSave({ notes: v }) }} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Status */}
          <div style={{ background: 'white', border: '1px solid #E8D5B5', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #E8D5B5', background: '#F5EDE0' }}>
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 700, color: '#2C1810', margin: 0 }}>Status</h3>
            </div>
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(Object.keys(statusConfig) as Array<ClientInvoice['status']>).map(s => {
                const cfg = statusConfig[s]
                const isActive = status === s
                return (
                  <button key={s} onClick={() => handleStatusChange(s)} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 8,
                    background: isActive ? cfg.bg : 'transparent',
                    border: `1px solid ${isActive ? cfg.border : '#E8D5B5'}`,
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    fontWeight: isActive ? 700 : 400, color: isActive ? cfg.color : '#9E7E60',
                    fontSize: 13, transition: 'all 0.15s',
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                    {cfg.label}
                    {isActive && (
                      <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginLeft: 'auto' }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Samenvatting (live berekend) */}
          <div style={{ background: 'white', border: '1px solid #E8D5B5', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #E8D5B5', background: '#F5EDE0' }}>
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 700, color: '#2C1810', margin: 0 }}>Samenvatting</h3>
            </div>
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Nummer', value: invoiceNumber || '—' },
                { label: 'Datum', value: invoiceDate ? new Date(invoiceDate).toLocaleDateString('nl-BE') : '—' },
                { label: 'Vervaldatum', value: dueDate ? new Date(dueDate).toLocaleDateString('nl-BE') : '—' },
                { label: 'Personen', value: numPersons ? `${numPersons} personen` : '—' },
                { label: 'Subtotaal', value: `€ ${totals.subtotal.toFixed(2)}` },
                { label: 'BTW', value: `€ ${totals.vat_amount.toFixed(2)}` },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#9E7E60', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                    {row.label}
                  </span>
                  <span style={{ fontSize: 13, color: '#2C1810', fontFamily: row.label === 'Nummer' || row.label.includes('€') || row.label === 'Subtotaal' || row.label === 'BTW' ? 'monospace' : 'inherit' }}>
                    {row.value}
                  </span>
                </div>
              ))}
              <div style={{ borderTop: '2px solid #E8D5B5', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#2C1810' }}>Totaal</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#C4703A', fontFamily: 'monospace' }}>
                  € {totals.total_amount.toFixed(2)}
                </span>
              </div>
              {numPersons && parseInt(numPersons) > 0 && (
                <div style={{ background: '#FEF3E2', border: '1px solid #F6D860', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#92400E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 2 }}>
                    Per persoon
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#C4703A', fontFamily: 'monospace' }}>
                    € {(totals.total_amount / parseInt(numPersons)).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Acties */}
          <a
            href={`/facturen/${id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '12px 18px', background: '#F2E8D5', border: '1px solid #E8D5B5',
              borderRadius: 12, color: '#C4703A', fontWeight: 700, fontSize: 14,
              textDecoration: 'none', textAlign: 'center',
            }}
          >
            <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/>
              <line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/>
              <line x1="8" y1="16" x2="12" y2="16"/>
            </svg>
            Afdrukken / PDF
          </a>

          {invoice.event_id && (
            <Link href={`/events/${invoice.event_id}`} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '10px 18px', background: 'white', border: '1px solid #E8D5B5',
              borderRadius: 12, color: '#9E7E60', fontWeight: 600, fontSize: 13,
              textDecoration: 'none',
            }}>
              <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Terug naar event
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
