import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: invoice } = await supabase.from('client_invoices').select('*').eq('id', id).single()
  if (!invoice) return <div style={{ padding: 40, color: '#9E7E60' }}>Factuur niet gevonden</div>

  const lineItems = (invoice.line_items || []) as Array<{
    description: string; quantity: number; unit_price: number; vat_rate: number; total: number
  }>

  const numPersons = invoice.num_persons ? Number(invoice.num_persons) : null
  const perPersonPrice = numPersons && numPersons > 0 ? Number(invoice.total_amount) / numPersons : null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        @media print {
          @page { margin: 20mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'white', minHeight: '100vh', color: '#2C1810' }}>
        {/* Print toolbar */}
        <div className="no-print" style={{ padding: '14px 24px', background: '#F2E8D5', borderBottom: '1px solid #E8D5B5', display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => window.print()}
            style={{ background: '#E8A040', color: '#2C1810', padding: '9px 22px', borderRadius: 9, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}
          >
            Afdrukken / PDF opslaan
          </button>
          <a
            href={`/facturen/${id}`}
            style={{ padding: '9px 20px', border: '1px solid #E8D5B5', borderRadius: 9, color: '#9E7E60', textDecoration: 'none', fontSize: 14 }}
          >
            Terug naar factuur
          </a>
        </div>

        {/* Invoice */}
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '52px 48px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 52 }}>
            <div>
              <h1 style={{ fontSize: 34, fontFamily: 'Georgia, serif', color: '#2C1810', fontWeight: 700 }}>
                SIR Catering
              </h1>
              <p style={{ color: '#9E7E60', marginTop: 6, fontSize: 14 }}>jules@sircatering.be</p>
              <p style={{ color: '#9E7E60', fontSize: 14 }}>Jules Vangroenweghe</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#C4703A', marginBottom: 6 }}>
                Factuur
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#2C1810', fontFamily: 'monospace' }}>
                {invoice.invoice_number}
              </div>
              <div style={{ fontSize: 13, color: '#9E7E60', marginTop: 8, lineHeight: 1.7 }}>
                <span>Datum: {new Date(invoice.invoice_date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <br />
                <span>Vervaldatum: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
                {numPersons && (
                  <>
                    <br />
                    <span>{numPersons} personen</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 2, background: 'linear-gradient(to right, #C4703A, #E8A040, #F2E8D5)', marginBottom: 40, borderRadius: 1 }} />

          {/* Client + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 44 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#C4703A', marginBottom: 12 }}>
                Factuur aan
              </div>
              <div style={{ fontWeight: 700, color: '#2C1810', fontSize: 16, marginBottom: 6 }}>
                {invoice.client_name || <span style={{ color: '#B8997A', fontStyle: 'italic' }}>Geen naam</span>}
              </div>
              {invoice.client_address && (
                <div style={{ color: '#9E7E60', fontSize: 14, whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                  {invoice.client_address}
                </div>
              )}
              {invoice.client_email && (
                <div style={{ color: '#9E7E60', fontSize: 14, marginTop: 4 }}>{invoice.client_email}</div>
              )}
              {invoice.client_vat && (
                <div style={{ color: '#9E7E60', fontSize: 14, marginTop: 4 }}>BTW: {invoice.client_vat}</div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#C4703A', marginBottom: 12 }}>
                Status
              </div>
              <span style={{
                display: 'inline-block', padding: '5px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                background: invoice.status === 'betaald' ? '#D1FAE5' : invoice.status === 'verzonden' ? '#FEF3E2' : invoice.status === 'geannuleerd' ? '#FEE2E2' : '#F3F4F6',
                color: invoice.status === 'betaald' ? '#065F46' : invoice.status === 'verzonden' ? '#92400E' : invoice.status === 'geannuleerd' ? '#991B1B' : '#6B7280',
              }}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Line items table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 36 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E8D5B5' }}>
                {['Omschrijving', 'Aantal', 'Eenheidsprijs', 'BTW %', 'Totaal'].map((h, i) => (
                  <th key={h} style={{
                    textAlign: i === 0 ? 'left' : 'right',
                    padding: '10px 10px',
                    fontSize: 11, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '1.5px',
                    color: '#9E7E60',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '20px 10px', color: '#B8997A', fontStyle: 'italic', fontSize: 14 }}>
                    Geen factuurregels
                  </td>
                </tr>
              ) : lineItems.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F2E8D5' }}>
                  <td style={{ padding: '14px 10px', color: '#2C1810', fontSize: 14 }}>{item.description}</td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', color: '#2C1810', fontSize: 14 }}>{item.quantity}</td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', color: '#2C1810', fontSize: 14 }}>
                    € {Number(item.unit_price).toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', color: '#9E7E60', fontSize: 14 }}>
                    {item.vat_rate}%
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: 700, color: '#2C1810', fontSize: 14 }}>
                    € {Number(item.total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals + per persoon */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 44 }}>
            <div style={{ width: 320 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #E8D5B5', fontSize: 14 }}>
                <span style={{ color: '#9E7E60' }}>Subtotaal (excl. BTW)</span>
                <span style={{ color: '#2C1810', fontFamily: 'monospace' }}>€ {Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #E8D5B5', fontSize: 14 }}>
                <span style={{ color: '#9E7E60' }}>BTW</span>
                <span style={{ color: '#2C1810', fontFamily: 'monospace' }}>€ {Number(invoice.vat_amount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', fontSize: 20, fontWeight: 700, borderBottom: perPersonPrice ? '1px solid #E8D5B5' : 'none' }}>
                <span style={{ color: '#2C1810' }}>Totaal (incl. BTW)</span>
                <span style={{ color: '#C4703A', fontFamily: 'monospace' }}>€ {Number(invoice.total_amount).toFixed(2)}</span>
              </div>
              {perPersonPrice && (
                <div style={{ background: '#FEF3E2', border: '1px solid #F6D860', borderRadius: 8, padding: '10px 14px', marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        Per persoon
                      </div>
                      <div style={{ fontSize: 10, color: '#B45309', marginTop: 2 }}>
                        Totaal ÷ {numPersons} personen — incl. alle forfaits &amp; vaste kosten
                      </div>
                    </div>
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#C4703A', fontFamily: 'monospace' }}>
                      € {perPersonPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment info */}
          {(invoice.bank_account || invoice.payment_terms) && (
            <div style={{ background: '#F2E8D5', borderRadius: 12, padding: '20px 26px', marginBottom: 36 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#C4703A', marginBottom: 12 }}>
                Betalingsgegevens
              </div>
              {invoice.bank_account && (
                <p style={{ margin: '0 0 6px', fontSize: 14, color: '#2C1810' }}>
                  Rekeningnummer: <strong>{invoice.bank_account}</strong>
                </p>
              )}
              {invoice.payment_terms && (
                <p style={{ margin: '0 0 6px', fontSize: 14, color: '#9E7E60' }}>
                  Betalingsvoorwaarden: {invoice.payment_terms}
                </p>
              )}
              <p style={{ margin: 0, fontSize: 13, color: '#9E7E60' }}>
                Mededeling: <strong style={{ color: '#2C1810' }}>{invoice.invoice_number}</strong>
              </p>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div style={{ borderTop: '1px solid #E8D5B5', paddingTop: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#C4703A', marginBottom: 10 }}>
                Notities
              </div>
              <p style={{ fontSize: 14, color: '#9E7E60', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                {invoice.notes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 60, paddingTop: 24, borderTop: '1px solid #F2E8D5', textAlign: 'center', color: '#B8997A', fontSize: 12 }}>
            SIR Catering — Jules Vangroenweghe — jules@sircatering.be
          </div>
        </div>
      </div>
    </>
  )
}
