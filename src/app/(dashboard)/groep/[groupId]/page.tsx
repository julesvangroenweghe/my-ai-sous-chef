'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'

interface GroupData {
  total_events: number
  events_this_month: number
  open_invoices: number
  open_invoice_total: number
  kitchens: CompanyData[]
}

interface CompanyData {
  id: string
  name: string
  department: string
  events_count: number
  open_invoices: number
  open_amount: number
}

const DEPT = {
  kitchen: { label: 'Keuken', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  sales: { label: 'Sales', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  logistics: { label: 'Logistiek', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  all: { label: 'Volledig', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
}

function formatEuro(amount: number) {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)
}

export default function GroupDashboard() {
  const router = useRouter()
  const params = useParams()
  const groupId = params.groupId as string
  const supabase = createClientComponentClient()
  const [data, setData] = useState<GroupData | null>(null)
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (groupId) loadDashboard()
  }, [groupId])

  async function loadDashboard() {
    try {
      // Groepsnaam
      const { data: group } = await supabase
        .from('groups')
        .select('name')
        .eq('id', groupId)
        .single()
      setGroupName(group?.name || 'Groepsoverzicht')

      // Geconsolideerde data via RPC
      const { data: dashboard } = await supabase
        .rpc('get_group_dashboard', { p_group_id: groupId })

      setData(dashboard)
    } finally {
      setLoading(false)
    }
  }

  function openCompany(kitchenId: string) {
    localStorage.setItem('active_kitchen_id', kitchenId)
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF8F2] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E8A040] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF8F2]">
      {/* Header */}
      <div className="bg-white border-b border-[#E8D5B5] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/werkruimte')}
            className="text-[#9E7E60] hover:text-[#2C1810] transition-colors text-sm"
          >
            ← Alle werkruimtes
          </button>
          <div className="w-px h-4 bg-[#E8D5B5]" />
          <h1 className="font-semibold text-[#2C1810]">{groupName}</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#FEF3E2] text-[#E8A040] border border-[#E8D5B5]">
            Groepsoverzicht
          </span>
        </div>
        <Link
          href="/groep/instellingen"
          className="text-xs text-[#9E7E60] hover:text-[#2C1810] transition-colors"
        >
          Instellingen
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* KPI Kaarten — geconsolideerd */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Totaal events', value: data?.total_events ?? 0, sub: 'alle bedrijven' },
            { label: 'Events deze maand', value: data?.events_this_month ?? 0, sub: 'lopend' },
            { label: 'Open facturen', value: data?.open_invoices ?? 0, sub: 'niet betaald' },
            { label: 'Open bedrag', value: formatEuro(data?.open_invoice_total ?? 0), sub: 'te ontvangen' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border border-[#E8D5B5] p-4">
              <div className="text-2xl font-bold text-[#2C1810]">{kpi.value}</div>
              <div className="text-sm font-medium text-[#2C1810] mt-1">{kpi.label}</div>
              <div className="text-xs text-[#9E7E60]">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Bedrijven overzicht */}
        <h2 className="text-sm font-semibold text-[#9E7E60] uppercase tracking-wide mb-4">Bedrijven</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(data?.kitchens || []).map(company => {
            const dept = DEPT[company.department as keyof typeof DEPT] || DEPT.all
            return (
              <button
                key={company.id}
                onClick={() => openCompany(company.id)}
                className="text-left bg-white rounded-xl border border-[#E8D5B5] p-5 hover:border-[#E8A040] hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-[#2C1810]">{company.name}</h3>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border ${dept.bg} ${dept.text} ${dept.border}`}>
                      {dept.label}
                    </span>
                  </div>
                  <span className="text-[#9E7E60] group-hover:text-[#E8A040] transition-colors text-lg">→</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-lg font-bold text-[#2C1810]">{company.events_count}</div>
                    <div className="text-xs text-[#9E7E60]">Events</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-[#2C1810]">{company.open_invoices}</div>
                    <div className="text-xs text-[#9E7E60]">Open facturen</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-[#2C1810]">{formatEuro(company.open_amount)}</div>
                    <div className="text-xs text-[#9E7E60]">Te ontvangen</div>
                  </div>
                </div>

                {company.open_amount > 0 && (
                  <div className="mt-3 h-1.5 bg-[#F2E8D5] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E8A040] rounded-full"
                      style={{
                        width: `${Math.min(100, (company.open_amount / (data?.open_invoice_total || 1)) * 100)}%`
                      }}
                    />
                  </div>
                )}
              </button>
            )
          })}

          {/* Bedrijf toevoegen knop */}
          <button
            onClick={() => router.push('/groep/bedrijf-toevoegen')}
            className="text-left bg-white rounded-xl border border-dashed border-[#E8D5B5] p-5 hover:border-[#E8A040] transition-colors flex flex-col items-center justify-center gap-2 min-h-[160px]"
          >
            <div className="w-10 h-10 rounded-full bg-[#F2E8D5] flex items-center justify-center text-[#E8A040] text-xl">
              +
            </div>
            <span className="text-sm text-[#9E7E60]">Bedrijf toevoegen</span>
          </button>
        </div>

        {/* Snelle acties */}
        <div className="mt-8 bg-white rounded-xl border border-[#E8D5B5] p-5">
          <h3 className="text-sm font-semibold text-[#2C1810] mb-4">Snelle acties</h3>
          <div className="flex flex-wrap gap-3">
            <button className="text-sm px-4 py-2 rounded-lg bg-[#F2E8D5] text-[#2C1810] hover:bg-[#E8D5B5] transition-colors">
              Alle facturen bekijken
            </button>
            <button className="text-sm px-4 py-2 rounded-lg bg-[#F2E8D5] text-[#2C1810] hover:bg-[#E8D5B5] transition-colors">
              Events kalender
            </button>
            <button className="text-sm px-4 py-2 rounded-lg bg-[#F2E8D5] text-[#2C1810] hover:bg-[#E8D5B5] transition-colors">
              Teamleden beheren
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
