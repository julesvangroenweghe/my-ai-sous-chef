'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Printer, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface MepItem {
  id: string
  item_name: string
  item_type: string
  quantity_per_person: number
  total_quantity: number
  unit: string
  persons: number
  prep_day: string | null
  status: string
  notes: string | null
  sort_order: number
  recipe_name?: string | null
}

interface EventInfo {
  name: string
  event_date: string
  event_type: string
  num_persons: number | null
  location: string | null
  contact_person: string | null
  departure_time: string | null
  notes: string | null
}

const prepDayLabels: Record<string, string> = {
  'D-3': 'D-3 (3 dagen vooraf)',
  'D-2': 'D-2 (2 dagen vooraf)',
  'D-1': 'D-1 (dag ervoor)',
  'D-0': 'D-0 (dag zelf)',
  'service': 'Service',
}

const dayOrder = ['D-3', 'D-2', 'D-1', 'D-0', 'service']

export default function MepPrintPage() {
  const params = useParams()
  const eventId = params.id as string
  const supabase = createClient()

  const [event, setEvent] = useState<EventInfo | null>(null)
  const [items, setItems] = useState<MepItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const [eventRes, itemsRes] = await Promise.all([
      supabase.from('events').select('name, event_date, event_type, num_persons, location, contact_person, departure_time, notes').eq('id', eventId).single(),
      supabase.from('mep_items').select('*').eq('event_id', eventId).order('sort_order'),
    ])
    if (eventRes.data) setEvent(eventRes.data)
    if (itemsRes.data) setItems(itemsRes.data)
    setLoading(false)
  }, [eventId])

  useEffect(() => { fetchData() }, [fetchData])

  const handlePrint = () => window.print()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    )
  }

  if (!event || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-stone-400">Geen MEP data gevonden</p>
        <Link href={`/events/${eventId}`} className="text-brand-400 hover:underline text-sm">
          Terug naar event
        </Link>
      </div>
    )
  }

  // Group items by prep_day, then by component (notes field)
  const groupedByDay: Record<string, MepItem[]> = {}
  for (const item of items) {
    const day = item.prep_day || 'D-0'
    if (!groupedByDay[day]) groupedByDay[day] = []
    groupedByDay[day].push(item)
  }
  const sortedDays = Object.keys(groupedByDay).sort(
    (a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b)
  )

  const numPersons = event.num_persons || 1
  // Determine column layout: 3 columns ≤50 pax, 4 columns 60+ pax
  const useWideLayout = numPersons >= 60

  const formatDate = (d: string) => {
    try {
      return new Date(d + 'T12:00:00').toLocaleDateString('nl-BE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      })
    } catch { return d }
  }

  return (
    <>
      {/* Print button - hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex items-center gap-2">
        <Link href={`/events/${eventId}`} className="flex items-center gap-1.5 px-3 py-2 bg-[#FAF6EF] text-[#2C1810] rounded-lg hover:bg-[#F2E8D5] transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Terug
        </Link>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-[#2C1810] rounded-lg transition-colors text-sm font-medium shadow-lg"
        >
          <Printer className="w-4 h-4" /> Afdrukken / PDF
        </button>
      </div>

      {/* Print-optimized layout */}
      <div className="mep-print-layout p-4 sm:p-8 print:p-0 max-w-[210mm] mx-auto">
        {/* Header */}
        <div className="border-b-2 border-[#2C1810] pb-3 mb-4 print:pb-2 print:mb-3">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-stone-900 print:text-black">{event.name}</h1>
              <p className="text-sm text-stone-600 mt-1">{formatDate(event.event_date)}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold text-stone-900 print:text-black">{numPersons} pax</div>
              {event.location && <p className="text-xs text-stone-500">{event.location}</p>}
              {event.departure_time && <p className="text-xs text-stone-500">Vertrek: {event.departure_time}</p>}
            </div>
          </div>
          {event.contact_person && (
            <p className="text-xs text-stone-500 mt-1">Contact: {event.contact_person}</p>
          )}
        </div>

        {/* MEP Sections by prep day */}
        <div className="space-y-4 print:space-y-3">
          {sortedDays.map(day => {
            const dayItems = groupedByDay[day]
            const dayLabel = prepDayLabels[day] || day

            // Group by component (notes)
            const byComponent: Record<string, MepItem[]> = {}
            for (const item of dayItems) {
              const key = item.notes || 'Overig'
              if (!byComponent[key]) byComponent[key] = []
              byComponent[key].push(item)
            }

            return (
              <div key={day} className="break-inside-avoid">
                <div className="bg-[#2C1810] text-[#F2E8D5] px-3 py-1.5 rounded-t print:bg-black print:rounded-none">
                  <span className="text-sm font-bold uppercase tracking-wider">{dayLabel}</span>
                  <span className="text-xs ml-2 opacity-70">{dayItems.length} items</span>
                </div>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-100 print:bg-gray-100">
                      <th className="text-left py-1 px-2 font-semibold border border-stone-300 w-[40%]">Ingrediënt</th>
                      <th className="text-left py-1 px-2 font-semibold border border-stone-300 w-[20%]">Component</th>
                      <th className="text-right py-1 px-2 font-semibold border border-stone-300 w-[12%]">Per pers.</th>
                      <th className="text-right py-1 px-2 font-semibold border border-stone-300 w-[16%] font-bold">Totaal</th>
                      <th className="text-center py-1 px-2 font-semibold border border-stone-300 w-[8%]">Eenheid</th>
                      <th className="text-center py-1 px-2 font-semibold border border-stone-300 w-[4%] print:block">V</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayItems.map((item, i) => (
                      <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50 print:bg-gray-50'}>
                        <td className="py-1 px-2 border border-stone-200 text-stone-800 font-medium">{item.item_name}</td>
                        <td className="py-1 px-2 border border-stone-200 text-stone-500">{item.notes || ''}</td>
                        <td className="py-1 px-2 border border-stone-200 text-right font-mono text-stone-600">
                          {item.quantity_per_person}
                        </td>
                        <td className="py-1 px-2 border border-stone-200 text-right font-mono font-bold text-stone-900">
                          {item.total_quantity}
                        </td>
                        <td className="py-1 px-2 border border-stone-200 text-center text-stone-500">{item.unit}</td>
                        <td className="py-1 px-2 border border-stone-200 text-center">
                          <div className="w-3 h-3 border border-stone-400 mx-auto" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-stone-300 flex items-center justify-between text-xs text-stone-400 print:mt-4">
          <span>My AI Sous Chef — MEP Plan</span>
          <span>Gegenereerd: {new Date().toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {/* Notes section */}
        {event.notes && (
          <div className="mt-4 p-3 bg-stone-50 border border-stone-200 rounded print:bg-gray-50">
            <h3 className="text-xs font-semibold text-stone-600 mb-1">Notities</h3>
            <p className="text-xs text-stone-500 whitespace-pre-wrap">{event.notes}</p>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-size: 10pt !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .mep-print-layout {
            max-width: none !important;
            padding: 10mm !important;
          }
          nav, header, aside, footer, .print\\:hidden {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
          .break-inside-avoid { page-break-inside: avoid; }
        }
      `}</style>
    </>
  )
}
