'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Image from 'next/image'

interface Group {
  id: string
  name: string
  logo_url: string | null
  role: string
  kitchens: Kitchen[]
}

interface Kitchen {
  id: string
  name: string
  type: string
  department: string
  logo_url: string | null
  member_count: number
}

const DEPARTMENT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  kitchen: { label: 'Keuken', icon: '🍳', color: 'bg-amber-50 border-amber-200 text-amber-800' },
  sales: { label: 'Sales', icon: '📋', color: 'bg-blue-50 border-blue-200 text-blue-800' },
  logistics: { label: 'Logistiek', icon: '📦', color: 'bg-green-50 border-green-200 text-green-800' },
  all: { label: 'Volledig', icon: '⚡', color: 'bg-purple-50 border-purple-200 text-purple-800' },
}

export default function WorkspacePicker() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [groups, setGroups] = useState<Group[]>([])
  const [standaloneKitchens, setStandaloneKitchens] = useState<Kitchen[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    loadWorkspaces()
  }, [])

  async function loadWorkspaces() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Haal gebruikersnaam op
      const { data: profile } = await supabase
        .from('chef_profiles')
        .select('full_name')
        .eq('auth_user_id', user.id)
        .single()
      setUserName(profile?.full_name?.split(' ')[0] || 'Chef')

      // Haal groepen op waar user lid van is
      const { data: groupMemberships } = await supabase
        .from('group_members')
        .select(`
          role,
          groups (
            id, name, logo_url, shared_kitchen
          )
        `)
        .eq('user_id', user.id)

      // Haal kitchens op
      const { data: kitchenMemberships } = await supabase
        .from('kitchen_members')
        .select(`
          department,
          kitchens (
            id, name, type, department, logo_url, group_id
          )
        `)
        .eq('user_id', user.id)

      const allKitchens: Kitchen[] = (kitchenMemberships || []).map((km: any) => ({
        id: km.kitchens.id,
        name: km.kitchens.name,
        type: km.kitchens.type,
        department: km.department || km.kitchens.department || 'all',
        logo_url: km.kitchens.logo_url,
        member_count: 0,
        group_id: km.kitchens.group_id,
      }))

      // Bouw groepen op met hun kitchens
      const builtGroups: Group[] = (groupMemberships || []).map((gm: any) => ({
        id: gm.groups.id,
        name: gm.groups.name,
        logo_url: gm.groups.logo_url,
        role: gm.role,
        kitchens: allKitchens.filter((k: any) => k.group_id === gm.groups.id),
      }))

      // Standalone kitchens (geen groep)
      const standalone = allKitchens.filter((k: any) => !k.group_id)

      setGroups(builtGroups)
      setStandaloneKitchens(standalone)

      // Als er maar 1 kitchen is en geen groepen → direct door
      if (builtGroups.length === 0 && standalone.length === 1) {
        selectKitchen(standalone[0].id, standalone[0].department)
        return
      }
    } finally {
      setLoading(false)
    }
  }

  function selectGroup(groupId: string) {
    localStorage.setItem('active_group_id', groupId)
    router.push(`/groep/${groupId}`)
  }

  function selectKitchen(kitchenId: string, department: string) {
    localStorage.setItem('active_kitchen_id', kitchenId)
    localStorage.setItem('active_department', department)
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF8F2] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E8A040] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const hasMultipleWorkspaces = groups.length > 0 || standaloneKitchens.length > 1

  return (
    <div className="min-h-screen bg-[#FDF8F2] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <img src="/logo-icon.png" alt="Logo" className="w-10 h-10 object-contain" />
          <span className="font-serif text-2xl text-[#2C1810]">My AI Sous Chef</span>
        </div>
        <p className="text-[#9E7E60] text-sm">
          Goedemorgen, <strong className="text-[#2C1810]">{userName}</strong> — kies jouw werkruimte
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-6">

        {/* GROEPEN */}
        {groups.map(group => (
          <div key={group.id} className="bg-white rounded-2xl border border-[#E8D5B5] overflow-hidden shadow-sm">
            {/* Groep header */}
            <div className="px-6 py-4 bg-[#F2E8D5] border-b border-[#E8D5B5] flex items-center justify-between">
              <div className="flex items-center gap-3">
                {group.logo_url ? (
                  <img src={group.logo_url} alt={group.name} className="w-8 h-8 rounded-lg object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-[#E8A040] flex items-center justify-center text-white font-bold text-sm">
                    {group.name[0]}
                  </div>
                )}
                <div>
                  <h2 className="font-semibold text-[#2C1810] text-sm">{group.name}</h2>
                  <p className="text-xs text-[#9E7E60] capitalize">{group.role === 'owner' ? 'Groepsbeheerder' : group.role === 'admin' ? 'Beheerder' : 'Lid'}</p>
                </div>
              </div>
              {/* Groepsoverzicht knop (alleen voor owner/admin) */}
              {(group.role === 'owner' || group.role === 'admin') && (
                <button
                  onClick={() => selectGroup(group.id)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#2C1810] text-white hover:bg-[#3d2418] transition-colors"
                >
                  Groepsoverzicht
                </button>
              )}
            </div>

            {/* Bedrijven binnen groep */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.kitchens.map(kitchen => {
                const dept = DEPARTMENT_LABELS[kitchen.department] || DEPARTMENT_LABELS.all
                return (
                  <button
                    key={kitchen.id}
                    onClick={() => selectKitchen(kitchen.id, kitchen.department)}
                    className="text-left p-4 rounded-xl border border-[#E8D5B5] hover:border-[#E8A040] hover:bg-[#FEF3E2] transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-medium text-[#2C1810] text-sm leading-tight">{kitchen.name}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${dept.color} ml-2 shrink-0`}>
                        {dept.label}
                      </span>
                    </div>
                    <p className="text-xs text-[#9E7E60]">{kitchen.type}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-[#9E7E60]">{kitchen.member_count} leden</span>
                      <span className="text-xs text-[#E8A040] opacity-0 group-hover:opacity-100 transition-opacity">
                        Open →
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {/* STANDALONE KITCHENS (geen groep) */}
        {standaloneKitchens.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E8D5B5] overflow-hidden shadow-sm">
            {groups.length > 0 && (
              <div className="px-6 py-3 bg-[#F2E8D5] border-b border-[#E8D5B5]">
                <h2 className="text-xs font-medium text-[#9E7E60] uppercase tracking-wide">Andere werkruimtes</h2>
              </div>
            )}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {standaloneKitchens.map(kitchen => {
                const dept = DEPARTMENT_LABELS[kitchen.department] || DEPARTMENT_LABELS.all
                return (
                  <button
                    key={kitchen.id}
                    onClick={() => selectKitchen(kitchen.id, kitchen.department)}
                    className="text-left p-4 rounded-xl border border-[#E8D5B5] hover:border-[#E8A040] hover:bg-[#FEF3E2] transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-medium text-[#2C1810] text-sm">{kitchen.name}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${dept.color} ml-2`}>
                        {dept.label}
                      </span>
                    </div>
                    <p className="text-xs text-[#9E7E60]">{kitchen.type}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* LEEG STATE */}
        {groups.length === 0 && standaloneKitchens.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">👋</div>
            <h2 className="text-[#2C1810] font-semibold mb-2">Welkom!</h2>
            <p className="text-[#9E7E60] text-sm mb-6">Je bent nog aan geen enkele werkruimte gekoppeld.</p>
            <button
              onClick={() => router.push('/onboarding')}
              className="px-6 py-3 bg-[#E8A040] text-white rounded-xl font-medium hover:bg-[#C4703A] transition-colors"
            >
              Werkruimte aanmaken
            </button>
          </div>
        )}
      </div>

      {/* Wissel van account */}
      <button
        onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
        className="mt-8 text-xs text-[#9E7E60] hover:text-[#2C1810] transition-colors"
      >
        Uitloggen
      </button>
    </div>
  )
}
