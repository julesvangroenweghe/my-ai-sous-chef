'use client'

import { useEffect, useState } from 'react'
import { AllergenSummary, type AllergenLink } from '@/components/allergens/allergen-badges'
import { ShieldAlert } from 'lucide-react'

export function RecipeAllergenSection({ recipeId }: { recipeId: string }) {
  const [links, setLinks] = useState<AllergenLink[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/allergens?recipe_id=${recipeId}`)
        const data = await res.json()
        setLinks(data.recipe_allergens || [])
      } catch {
        // ignore
      }
      setLoading(false)
    }
    load()
  }, [recipeId])

  if (loading) return null
  if (links.length === 0) return null

  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-center gap-2 text-[#9E7E60] text-xs">
        <ShieldAlert className="h-3.5 w-3.5" />
        <span className="font-medium uppercase tracking-wider">Allergenen</span>
        <span className="text-[#5C4730]">({new Set(links.map(l => l.allergen.code)).size})</span>
      </div>
      <AllergenSummary links={links} grouped />
    </div>
  )
}
