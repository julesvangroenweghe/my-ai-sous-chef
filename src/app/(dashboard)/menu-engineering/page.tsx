'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import MenuWizard from '@/components/menu-engineering/menu-wizard'
import MenuCard from '@/components/menu-engineering/menu-card'

type TabId = 'nieuw' | 'menus' | 'analyse'

interface SavedMenu {
  id: string
  name: string
  menu_type: string
  num_persons: number | null
  price_per_person: number | null
  target_food_cost_pct: number | null
  audit_score: number | null
  status: string
  created_at: string
  saved_menu_items?: Array<{ id: string; custom_name: string | null; course: string }>
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'nieuw', label: 'Nieuw Menu' },
  { id: 'menus', label: 'Mijn Menu\'s' },
  { id: 'analyse', label: 'Menu Analyse' },
]

export default function MenuEngineeringPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<TabId>('nieuw')
  const [menus, setMenus] = useState<SavedMenu[]>([])
  const [loadingMenus, setLoadingMenus] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('')

  const fetchMenus = useCallback(async () => {
    setLoadingMenus(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      const res = await fetch(`/api/menu-engineering/saved?${params}`)
      if (res.ok) {
        const data = await res.json()
        setMenus(data.menus || [])
      }
    } catch { /* silent */ }
    setLoadingMenus(false)
  }, [filterStatus])

  useEffect(() => {
    if (activeTab === 'menus') fetchMenus()
  }, [activeTab, fetchMenus])

  const handleArchive = async (id: string) => {
    await fetch('/api/menu-engineering/saved', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menu_id: id, status: 'archived' }),
    })
    fetchMenus()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/menu-engineering/saved?menu_id=${id}`, { method: 'DELETE' })
    fetchMenus()
  }

  const handleDuplicate = async (id: string) => {
    // For now just refetch — full duplicate would copy menu items
    fetchMenus()
  }

  const handleMenuSaved = (menuId: string) => {
    setActiveTab('menus')
    fetchMenus()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'rgba(232,160,64,0.15)', border: '1px solid rgba(232,160,64,0.3)' }}
        >
          <svg width="20" height="20" fill="none" stroke="#E8A040" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-100">Menu Engineering</h1>
          <p className="text-stone-400 text-sm">AI-gestuurd menuontwerp met culinaire audit</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-stone-900/50 border border-stone-800 rounded-xl">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'text-white'
                : 'text-stone-400 hover:text-stone-300'
            }`}
            style={activeTab === tab.id ? { backgroundColor: 'rgba(232,160,64,0.15)', color: '#E8A040' } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'nieuw' && (
        <MenuWizard onMenuSaved={handleMenuSaved} />
      )}

      {activeTab === 'menus' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2">
            {[
              { value: '', label: 'Alle' },
              { value: 'draft', label: 'Concept' },
              { value: 'active', label: 'Actief' },
              { value: 'archived', label: 'Gearchiveerd' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilterStatus(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  filterStatus === f.value
                    ? 'border-amber-500/40 text-amber-300'
                    : 'bg-stone-800 text-stone-400 border-stone-700 hover:border-stone-600'
                }`}
                style={filterStatus === f.value ? { backgroundColor: 'rgba(232,160,64,0.12)' } : {}}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Menu list */}
          {loadingMenus ? (
            <div className="flex items-center justify-center py-12 text-stone-500 text-sm">
              <svg className="w-5 h-5 animate-spin mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 2v4m0 12v4m-8-10H2m20 0h-4m-2.343-5.657L14.243 4.929m-4.486 14.142L8.343 20.485m9.314-1.414l1.414-1.414m-14.142-9.314L3.515 7.343" />
              </svg>
              Menus laden...
            </div>
          ) : menus.length === 0 ? (
            <div className="text-center py-16 bg-stone-900/50 border border-stone-800 rounded-2xl">
              <svg className="w-10 h-10 mx-auto mb-3 text-stone-600" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                <path d="M4 6h16M4 12h16M4 18h10" />
              </svg>
              <p className="text-stone-400 text-sm">Nog geen opgeslagen menus</p>
              <button
                onClick={() => setActiveTab('nieuw')}
                className="mt-3 px-4 py-2 text-sm font-medium rounded-xl transition-all"
                style={{ backgroundColor: 'rgba(232,160,64,0.15)', color: '#E8A040' }}
              >
                Eerste menu maken
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {menus.map(menu => (
                <MenuCard
                  key={menu.id}
                  menu={menu}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'analyse' && (
        <div className="text-center py-16 bg-stone-900/50 border border-stone-800 rounded-2xl">
          <svg className="w-12 h-12 mx-auto mb-4 text-stone-600" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <h3 className="text-lg font-display font-semibold text-stone-300 mb-2">Menu Analyse</h3>
          <p className="text-stone-500 text-sm max-w-md mx-auto leading-relaxed">
            BCG-matrix, variatie-score, populariteitsanalyse en menu-optimalisatie.
            Binnenkort beschikbaar.
          </p>
          <div
            className="inline-block mt-4 px-3 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'rgba(232,160,64,0.1)', color: '#E8A040', border: '1px solid rgba(232,160,64,0.2)' }}
          >
            Komt binnenkort
          </div>
        </div>
      )}
    </div>
  )
}
