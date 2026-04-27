'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AllergenSummary, type AllergenLink } from '@/components/allergens/allergen-badges'
import { ShieldAlert } from 'lucide-react'

export function EventAllergenSection({ eventId }: { eventId: string }) {
  const [links, setLinks] = useState<AllergenLink[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        // Get all recipe_ids from event_menu_items
        const { data: menuItems } = await supabase
          .from('event_menu_items')
          .select('recipe_id')
          .eq('event_id', eventId)

        const recipeIds = [...new Set((menuItems || []).map(m => m.recipe_id).filter(Boolean))]

        if (recipeIds.length === 0) {
          setLoading(false)
          return
        }

        // Get all ingredient_ids from those recipes
        const { data: components } = await supabase
          .from('recipe_component_ingredients')
          .select('ingredient_id, component:recipe_components!inner(recipe_id)')
          .in('component.recipe_id', recipeIds)

        const ingredientIds = [...new Set((components || []).map((c: any) => c.ingredient_id).filter(Boolean))]

        if (ingredientIds.length === 0) {
          setLoading(false)
          return
        }

        // Get allergen links for those ingredients
        const { data: allergenData } = await supabase
          .from('ingredient_allergens')
          .select('*, allergen:allergens(*)')
          .in('ingredient_id', ingredientIds)

        setLinks((allergenData || []) as AllergenLink[])
      } catch {
        // ignore
      }
      setLoading(false)
    }
    load()
  }, [eventId])

  if (loading) return null
  if (links.length === 0) return null

  // Deduplicate by allergen code, keeping highest severity
  const unique = new Map<string, AllergenLink>()
  links.forEach(l => {
    const key = l.allergen.code
    const existing = unique.get(key)
    if (!existing || severityPriority(l.severity) < severityPriority(existing.severity)) {
      unique.set(key, l)
    }
  })
  const uniqueLinks = [...unique.values()]

  return (
    <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-[#3D2810]">
          Allergenen in dit menu ({uniqueLinks.length})
        </h3>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {uniqueLinks
          .sort((a, b) => a.allergen.eu_number - b.allergen.eu_number)
          .map(link => (
          <span
            key={link.allergen.code}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
              link.severity === 'contains'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : link.severity === 'may_contain'
                ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'
                : 'bg-[#FDF8F2] text-[#9E7E60] border-[#D4B896]'
            }`}
          >
            <span className="font-bold">{link.allergen.eu_number}</span>
            {link.allergen.name_nl}
            {link.severity !== 'contains' && (
              <span className="text-[10px] opacity-70">
                ({link.severity === 'may_contain' ? 'kan bevatten' : 'sporen'})
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

function severityPriority(s: string): number {
  if (s === 'contains') return 0
  if (s === 'may_contain') return 1
  return 2
}
