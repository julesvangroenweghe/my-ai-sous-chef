import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'

interface MenuItem {
  id: string
  course: string
  dish_name: string
  dish_description: string | null
  source_type: string
  cost_per_person: number | null
  sort_order: number
}

const COURSE_ORDER = [
  'Amuse', 'Fingerbites', 'Fingerfood', 'Hapjes', 'Appetizers',
  'Voorgerecht', 'Tussengerecht', 'Vis', 'Hoofdgerecht',
  'Kaas', 'Pre-dessert', 'Dessert', 'Mignardises'
]

const MENU_TYPE_LABELS: Record<string, string> = {
  walking_dinner: 'Walking Dinner',
  cocktail_dinatoire: 'Cocktail Dînatoire',
  sit_down: 'Zit Diner',
  buffet: 'Buffet',
  cocktail: 'Cocktail Aperitief',
  aperitief: 'Vin d\'Honneur',
  brunch: 'Brunch',
  bbq: 'BBQ',
  event: 'Event',
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('nl-BE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
  } catch { return dateStr }
}

export default async function ProposalPrintPage({
  params,
}: {
  params: Promise<{ id: string; proposalId: string }>
}) {
  const { id: eventId, proposalId } = await params
  const supabase = await createClient()

  const [{ data: proposal }, { data: event }] = await Promise.all([
    supabase
      .from('saved_menus')
      .select('*, items:saved_menu_items(*)')
      .eq('id', proposalId)
      .single(),
    supabase
      .from('events')
      .select('name, event_date, num_persons, location, contact_person, event_type, price_per_person')
      .eq('id', eventId)
      .single(),
  ])

  if (!proposal || !event) notFound()

  const items: MenuItem[] = (proposal.items || []).sort(
    (a: MenuItem, b: MenuItem) => a.sort_order - b.sort_order
  )

  const courses = [...new Set(items.map((i: MenuItem) => i.course))].sort((a, b) => {
    const ai = COURSE_ORDER.indexOf(a)
    const bi = COURSE_ORDER.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  const reqs = proposal.event_requirements || {}
  const conceptNote = reqs.concept_note
  const chefNote = reqs.chef_note
  const contactPerson = reqs.contact_person || event.contact_person
  const menuTypeLabel = MENU_TYPE_LABELS[proposal.menu_type] || proposal.menu_type?.replace(/_/g, ' ')
  const totalCost = items.reduce((s: number, i: MenuItem) => s + (Number(i.cost_per_person) || 0), 0)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: #FDF8F2;
          color: #2C1810;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .page {
          max-width: 210mm;
          margin: 0 auto;
          padding: 16mm 18mm;
          min-height: 297mm;
          background: #FDF8F2;
          position: relative;
        }

        /* Header */
        .header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 10mm;
          padding-bottom: 8mm;
          border-bottom: 2px solid #E8A040;
        }
        .header-left { flex: 1; }
        .logo-wrap { margin-bottom: 5mm; }
        .logo-wrap img { height: 40px; width: auto; }
        .event-title {
          font-size: 22pt;
          font-weight: 800;
          color: #2C1810;
          letter-spacing: -0.5px;
          line-height: 1.15;
          margin-bottom: 3mm;
        }
        .event-subtitle {
          font-size: 11pt;
          color: #C4703A;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .header-right {
          text-align: right;
          min-width: 50mm;
        }
        .meta-label {
          font-size: 7.5pt;
          color: #9E7E60;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 1mm;
        }
        .meta-value {
          font-size: 10pt;
          color: #2C1810;
          font-weight: 500;
          margin-bottom: 3mm;
        }
        .version-badge {
          display: inline-block;
          padding: 2px 8px;
          background: #FEF3E2;
          border: 1px solid #E8A040;
          border-radius: 20px;
          font-size: 8pt;
          color: #C4703A;
          font-weight: 700;
          margin-top: 2mm;
        }

        /* Concept note */
        .concept-block {
          background: #FAF2E5;
          border-left: 3px solid #E8A040;
          padding: 5mm 6mm;
          margin-bottom: 8mm;
          border-radius: 0 6px 6px 0;
        }
        .concept-text {
          font-size: 10.5pt;
          font-style: italic;
          color: #5C4730;
          line-height: 1.6;
        }
        .chef-note {
          font-size: 9pt;
          color: #9E7E60;
          margin-top: 2mm;
          padding-top: 2mm;
          border-top: 1px solid #E8D5B5;
        }

        /* Menu courses */
        .courses-section { margin-bottom: 8mm; }
        .course-block { margin-bottom: 6mm; }
        .course-header {
          display: flex;
          align-items: center;
          gap: 3mm;
          margin-bottom: 3mm;
        }
        .course-label {
          font-size: 7.5pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #9E7E60;
        }
        .course-line {
          flex: 1;
          height: 1px;
          background: #E8D5B5;
        }
        .dish-row {
          padding: 3mm 0;
          border-bottom: 1px solid #F5EDE0;
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 4mm;
        }
        .dish-row:last-child { border-bottom: none; }
        .dish-content { flex: 1; }
        .dish-name {
          font-size: 11.5pt;
          font-weight: 600;
          color: #2C1810;
          line-height: 1.3;
          margin-bottom: 1mm;
        }
        .dish-desc {
          font-size: 9pt;
          color: #9E7E60;
          font-style: italic;
          line-height: 1.5;
        }
        .dish-cost {
          font-size: 9pt;
          color: #B8997A;
          font-weight: 500;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
          min-width: 15mm;
          text-align: right;
        }

        /* Summary row */
        .summary-block {
          margin-top: 6mm;
          padding-top: 5mm;
          border-top: 2px solid #E8A040;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .summary-info { font-size: 9.5pt; color: #9E7E60; }
        .summary-info span { color: #2C1810; font-weight: 600; }
        .summary-total {
          text-align: right;
        }
        .summary-total-label {
          font-size: 8pt;
          color: #9E7E60;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        .summary-total-value {
          font-size: 16pt;
          font-weight: 800;
          color: #C4703A;
        }

        /* Footer */
        .footer {
          position: absolute;
          bottom: 12mm;
          left: 18mm;
          right: 18mm;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 4mm;
          border-top: 1px solid #E8D5B5;
        }
        .footer-left {
          font-size: 8pt;
          color: #B8997A;
        }
        .footer-brand {
          font-size: 8.5pt;
          color: #9E7E60;
          font-weight: 600;
        }
        .footer-brand span { color: #E8A040; }

        /* Print button — hidden on print */
        .print-btn-bar {
          position: fixed;
          top: 0; left: 0; right: 0;
          background: #2C1810;
          padding: 10px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 1000;
        }
        .print-btn {
          padding: 8px 20px;
          background: #E8A040;
          color: #2C1810;
          font-weight: 700;
          font-size: 14px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
        }
        .print-btn:hover { background: #d4912c; }
        .print-btn-bar-hint {
          color: #9E7E60;
          font-size: 13px;
        }
        @media print {
          .print-btn-bar { display: none !important; }
          .page { padding: 14mm 16mm; }
          html, body { background: white; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>

      {/* Print bar */}
      <div className="print-btn-bar">
        <span className="print-btn-bar-hint">Voorstel V{proposal.revision_number} — {event.name}</span>
        <button className="print-btn" onClick={undefined}>
          Afdrukken / PDF
        </button>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        document.querySelector('.print-btn').addEventListener('click', function() { window.print(); });
      `}} />

      <div className="page" style={{ marginTop: '50px' }}>

        {/* Header */}
        <div className="header">
          <div className="header-left">
            <div className="logo-wrap">
              <img src="/logo-full-light.png" alt="Food by Jules" style={{ height: '36px', width: 'auto' }} />
            </div>
            <div className="event-title">{event.name}</div>
            <div className="event-subtitle">{menuTypeLabel}</div>
          </div>
          <div className="header-right">
            {event.event_date && (
              <>
                <div className="meta-label">Datum</div>
                <div className="meta-value">{formatDate(event.event_date)}</div>
              </>
            )}
            {contactPerson && (
              <>
                <div className="meta-label">Klant</div>
                <div className="meta-value">{contactPerson}</div>
              </>
            )}
            {event.location && (
              <>
                <div className="meta-label">Locatie</div>
                <div className="meta-value">{event.location}</div>
              </>
            )}
            {event.num_persons && (
              <>
                <div className="meta-label">Personen</div>
                <div className="meta-value">{event.num_persons} personen</div>
              </>
            )}
            <div className="version-badge">V{proposal.revision_number}</div>
          </div>
        </div>

        {/* Concept note */}
        {conceptNote && (
          <div className="concept-block">
            <div className="concept-text">&ldquo;{conceptNote}&rdquo;</div>
            {chefNote && (
              <div className="chef-note">{chefNote}</div>
            )}
          </div>
        )}

        {/* Menu courses */}
        <div className="courses-section">
          {courses.map(course => {
            const courseItems = items
              .filter((i: MenuItem) => i.course === course)
              .sort((a: MenuItem, b: MenuItem) => a.sort_order - b.sort_order)
            return (
              <div key={course} className="course-block">
                <div className="course-header">
                  <span className="course-label">{course}</span>
                  <div className="course-line" />
                </div>
                {courseItems.map((item: MenuItem) => (
                  <div key={item.id} className="dish-row">
                    <div className="dish-content">
                      <div className="dish-name">{item.dish_name}</div>
                      {item.dish_description && (
                        <div className="dish-desc">{item.dish_description}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div className="summary-block">
          <div className="summary-info">
            {event.num_persons && (
              <div>{event.num_persons} personen</div>
            )}
            {event.price_per_person && (
              <div>Prijs per persoon: <span>€{Number(event.price_per_person).toFixed(2)}</span></div>
            )}
          </div>
          {event.price_per_person && (
            <div className="summary-total">
              <div className="summary-total-label">Totaal</div>
              <div className="summary-total-value">
                €{(Number(event.price_per_person) * (event.num_persons || 1)).toFixed(0)}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="footer">
          <div className="footer-left">
            Opgesteld met My AI Sous Chef &mdash; jules@sircatering.be<br />
            +32 xxx xx xx xx &mdash; www.sircatering.be
          </div>
          <div className="footer-brand">
            <span>Food by Jules</span> &mdash; SIR Catering
          </div>
        </div>

      </div>
    </>
  )
}
