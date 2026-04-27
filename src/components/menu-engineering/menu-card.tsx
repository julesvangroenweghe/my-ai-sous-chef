'use client'

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

interface MenuCardProps {
  menu: SavedMenu
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}

const TYPE_LABELS: Record<string, string> = {
  event: 'Event',
  a_la_carte: 'A la carte',
  daily: 'Dagmenu',
  tasting: 'Tasting',
  fixed: 'Vast menu',
  foodtruck: 'Foodtruck',
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  draft: { label: 'Concept', className: 'bg-[#FDF8F2] text-[#5C4730]' },
  active: { label: 'Actief', className: 'bg-emerald-500/20 text-emerald-400' },
  archived: { label: 'Gearchiveerd', className: 'bg-white text-[#B8997A]' },
}

export default function MenuCard({ menu, onArchive, onDelete, onDuplicate }: MenuCardProps) {
  const status = STATUS_STYLES[menu.status] || STATUS_STYLES.draft
  const dishCount = menu.saved_menu_items?.length || 0

  return (
    <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-xl p-5 hover:border-[#E8D5B5] transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-semibold text-[#2C1810] truncate">{menu.name}</h3>
            <span className={`px-2 py-0.5 text-xs rounded-full ${status.className}`}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#B8997A]">
            <span>{TYPE_LABELS[menu.menu_type] || menu.menu_type}</span>
            {menu.num_persons && <span>{menu.num_persons} personen</span>}
            <span>{new Date(menu.created_at).toLocaleDateString('nl-BE')}</span>
          </div>
        </div>
        {menu.audit_score !== null && (
          <div
            className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono"
            style={{
              color: menu.audit_score >= 7.5 ? '#4ade80' : menu.audit_score >= 6 ? '#E8A040' : '#f87171',
              backgroundColor: menu.audit_score >= 7.5 ? 'rgba(74,222,128,0.1)' : menu.audit_score >= 6 ? 'rgba(232,160,64,0.1)' : 'rgba(248,113,113,0.1)',
            }}
          >
            {Number(menu.audit_score).toFixed(1)}
          </div>
        )}
      </div>

      {/* Dish summary */}
      {dishCount > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {(menu.saved_menu_items || []).slice(0, 5).map(item => (
            <span key={item.id} className="px-2 py-0.5 bg-white text-[#9E7E60] text-xs rounded-full truncate max-w-[160px]">
              {item.custom_name || item.course}
            </span>
          ))}
          {dishCount > 5 && (
            <span className="px-2 py-0.5 text-xs text-[#B8997A]">+{dishCount - 5}</span>
          )}
        </div>
      )}

      {/* Cost info */}
      <div className="flex items-center gap-4 text-xs text-[#B8997A] mb-3">
        {menu.price_per_person && (
          <span>EUR {Number(menu.price_per_person).toFixed(0)}/p</span>
        )}
        {menu.target_food_cost_pct && (
          <span>Target: {Number(menu.target_food_cost_pct).toFixed(0)}%</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onDuplicate(menu.id)}
          className="px-2.5 py-1 text-xs bg-white hover:bg-[#FDF8F2] text-[#9E7E60] rounded-lg border border-[#E8D5B5] transition-all"
        >
          Dupliceren
        </button>
        <button
          onClick={() => onArchive(menu.id)}
          className="px-2.5 py-1 text-xs bg-white hover:bg-[#FDF8F2] text-[#9E7E60] rounded-lg border border-[#E8D5B5] transition-all"
        >
          Archiveren
        </button>
        <button
          onClick={() => onDelete(menu.id)}
          className="px-2.5 py-1 text-xs bg-white hover:bg-red-900/30 text-[#B8997A] hover:text-red-400 rounded-lg border border-[#E8D5B5] hover:border-red-800 transition-all"
        >
          Verwijderen
        </button>
      </div>
    </div>
  )
}
