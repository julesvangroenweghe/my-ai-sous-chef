'use client'

import { cn } from '@/lib/utils'

export interface AllergenLink {
  id: string
  allergen_id: number
  severity: 'contains' | 'may_contain' | 'trace'
  allergen: {
    id: number
    code: string
    name_nl: string
    eu_number: number
  }
}

const severityStyles: Record<string, string> = {
  contains: 'bg-amber-100 text-amber-800 border-amber-200',
  may_contain: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  trace: 'bg-stone-100 text-[#B8997A] border-stone-200',
}

const severityLabel: Record<string, string> = {
  contains: 'Bevat',
  may_contain: 'Kan bevatten',
  trace: 'Sporen',
}

export function AllergenBadge({
  allergen,
  severity = 'contains',
  size = 'sm',
  showSeverity = false,
}: {
  allergen: { code: string; name_nl: string; eu_number: number }
  severity?: string
  size?: 'xs' | 'sm'
  showSeverity?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        severityStyles[severity] || severityStyles.contains,
        size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      )}
      title={`${allergen.name_nl}${showSeverity ? ` (${severityLabel[severity] || severity})` : ''}`}
    >
      <span className="font-semibold">{allergen.eu_number}</span>
      <span>{allergen.name_nl}</span>
    </span>
  )
}

export function AllergenBadgeList({
  links,
  maxVisible = 5,
  size = 'sm',
}: {
  links: AllergenLink[]
  maxVisible?: number
  size?: 'xs' | 'sm'
}) {
  if (!links || links.length === 0) return null

  const sorted = [...links].sort((a, b) => a.allergen.eu_number - b.allergen.eu_number)
  const visible = sorted.slice(0, maxVisible)
  const remaining = sorted.length - maxVisible

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((link) => (
        <AllergenBadge
          key={link.id}
          allergen={link.allergen}
          severity={link.severity}
          size={size}
        />
      ))}
      {remaining > 0 && (
        <span className={cn(
          'inline-flex items-center rounded-full bg-stone-100 text-[#B8997A] border border-stone-200 font-medium',
          size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
        )}>
          +{remaining}
        </span>
      )}
    </div>
  )
}

export function AllergenSummary({
  links,
  grouped = false,
}: {
  links: AllergenLink[]
  grouped?: boolean
}) {
  if (!links || links.length === 0) return null

  if (!grouped) {
    // Deduplicate by allergen code
    const unique = new Map<string, AllergenLink>()
    links.forEach((l) => {
      const key = l.allergen.code
      if (!unique.has(key) || severityPriority(l.severity) < severityPriority(unique.get(key)!.severity)) {
        unique.set(key, l)
      }
    })
    const sorted = [...unique.values()].sort((a, b) => a.allergen.eu_number - b.allergen.eu_number)

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#B8997A] uppercase tracking-wider">
            Allergenen
          </span>
          <span className="text-xs text-[#9E7E60]">({sorted.length})</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {sorted.map((link) => (
            <AllergenBadge
              key={link.allergen.code}
              allergen={link.allergen}
              severity={link.severity}
              showSeverity
            />
          ))}
        </div>
      </div>
    )
  }

  // Grouped by severity
  const groups: Record<string, AllergenLink[]> = { contains: [], may_contain: [], trace: [] }
  const seen = new Set<string>()
  links.forEach((l) => {
    const key = `${l.allergen.code}-${l.severity}`
    if (!seen.has(key)) {
      seen.add(key)
      groups[l.severity]?.push(l)
    }
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-[#B8997A] uppercase tracking-wider">
          Allergenen
        </span>
      </div>
      {groups.contains.length > 0 && (
        <div>
          <span className="text-[10px] font-medium text-amber-700 uppercase tracking-wider">Bevat</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {groups.contains.sort((a, b) => a.allergen.eu_number - b.allergen.eu_number).map((l) => (
              <AllergenBadge key={l.allergen.code} allergen={l.allergen} severity="contains" />
            ))}
          </div>
        </div>
      )}
      {groups.may_contain.length > 0 && (
        <div>
          <span className="text-[10px] font-medium text-yellow-700 uppercase tracking-wider">Kan bevatten</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {groups.may_contain.sort((a, b) => a.allergen.eu_number - b.allergen.eu_number).map((l) => (
              <AllergenBadge key={l.allergen.code} allergen={l.allergen} severity="may_contain" />
            ))}
          </div>
        </div>
      )}
      {groups.trace.length > 0 && (
        <div>
          <span className="text-[10px] font-medium text-[#B8997A] uppercase tracking-wider">Sporen</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {groups.trace.sort((a, b) => a.allergen.eu_number - b.allergen.eu_number).map((l) => (
              <AllergenBadge key={l.allergen.code} allergen={l.allergen} severity="trace" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function severityPriority(s: string): number {
  if (s === 'contains') return 0
  if (s === 'may_contain') return 1
  return 2
}
