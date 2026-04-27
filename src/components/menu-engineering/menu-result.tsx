'use client'

import { useState } from 'react'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import AuditRadar from './audit-radar'

interface MenuDish {
  name: string
  description?: string
  source?: string
  recipe_id?: string | null
  legende_dish_id?: string | null
  cost_pp?: number
  key_techniques?: string[]
  key_ingredients?: string[]
  seasonal_ingredients?: string[]
}

interface MenuCourse {
  name: string
  label?: string
  dishes: MenuDish[]
}

interface AuditDimension {
  score: number
  opmerking?: string
}

interface AuditData {
  overall_score: number
  dimensions: Record<string, AuditDimension>
  dish_feedback?: Array<{ dish_name: string; score: number; feedback: string; improvement?: string }>
  overall_feedback?: string
  top_improvements?: string[]
}

interface MenuResultProps {
  menu: {
    menu_name?: string
    courses?: MenuCourse[]
    total_cost_pp?: number
    total_food_cost_pct?: number
    chef_note?: string
    arbiter_notes?: string
  }
  audit: AuditData
  savedMenuId?: string
  pricePerPerson: number
  foodCostTarget: number
  onAccept: () => void
  onRegenerate: () => void
  onModify: () => void
  loading?: boolean
}

const SOURCE_LABELS: Record<string, { label: string; className: string }> = {
  own_recipe: { label: 'Eigen recept', className: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
  legende: { label: 'LEGENDE', className: 'bg-violet-500/20 text-violet-300 border border-violet-500/30' },
  classical: { label: 'Klassiek', className: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
  ai_generated: { label: 'AI voorstel', className: 'bg-[#FDF8F2] text-[#5C4730] border border-[#D4B896]' },
  new: { label: 'Nieuw', className: 'bg-[#FDF8F2] text-[#5C4730] border border-[#D4B896]' },
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 7.5 ? '#4ade80' : score >= 6 ? '#E8A040' : '#f87171'
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold"
      style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
      {score.toFixed(1)}/10
    </div>
  )
}

export default function MenuResult({
  menu,
  audit,
  pricePerPerson,
  foodCostTarget,
  onAccept,
  onRegenerate,
  onModify,
  loading,
}: MenuResultProps) {
  const [expandedDish, setExpandedDish] = useState<string | null>(null)
  const [showAuditDetail, setShowAuditDetail] = useState(false)

  const totalCostPp = menu.total_cost_pp || 0
  const totalFoodCostPct = menu.total_food_cost_pct || (pricePerPerson > 0 ? (totalCostPp / pricePerPerson) * 100 : 0)

  return (
    <div className="space-y-4">
      {/* Score + Summary Row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-xl p-4 flex flex-col items-center justify-center">
          <div className="text-xs text-[#B8997A] mb-2">Audit Score</div>
          <ScoreBadge score={audit.overall_score || 0} />
        </div>
        <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-xl p-4">
          <div className="text-xs text-[#B8997A] mb-1">Food Cost / persoon</div>
          <div className="text-lg font-mono font-bold text-[#3D2810]">
            EUR {totalCostPp.toFixed(2)}
          </div>
        </div>
        <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-xl p-4">
          <div className="text-xs text-[#B8997A] mb-1">Food Cost %</div>
          <div className={`text-lg font-mono font-bold ${totalFoodCostPct <= foodCostTarget ? 'text-emerald-400' : 'text-amber-700'}`}>
            {totalFoodCostPct.toFixed(1)}%
          </div>
        </div>
        <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-xl p-4">
          <div className="text-xs text-[#B8997A] mb-1">Target</div>
          <div className="text-lg font-mono font-bold text-[#9E7E60]">{foodCostTarget}%</div>
        </div>
      </div>

      {/* Audit Radar */}
      {audit.dimensions && Object.keys(audit.dimensions).length > 0 && (
        <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl p-6">
          <button
            onClick={() => setShowAuditDetail(!showAuditDetail)}
            className="w-full flex items-center justify-between mb-4"
          >
            <h3 className="text-sm font-semibold text-[#3D2810]">Culinaire Audit</h3>
            {showAuditDetail ? <ChevronUp className="w-4 h-4 text-[#B8997A]" /> : <ChevronDown className="w-4 h-4 text-[#B8997A]" />}
          </button>
          <AuditRadar dimensions={audit.dimensions} />
          {showAuditDetail && (
            <div className="mt-4 space-y-2">
              {Object.entries(audit.dimensions).map(([key, dim]) => (
                <div key={key} className="flex items-start gap-3 text-xs">
                  <div className="w-20 shrink-0 text-[#9E7E60] font-medium capitalize">
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="w-16 h-1.5 bg-white rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(dim.score / 10) * 100}%`,
                            backgroundColor: dim.score >= 7 ? '#4ade80' : dim.score >= 5 ? '#E8A040' : '#f87171',
                          }}
                        />
                      </div>
                      <span className="text-[#5C4730] font-mono">{dim.score}/10</span>
                    </div>
                    {dim.opmerking && <p className="text-[#B8997A]">{dim.opmerking}</p>}
                  </div>
                </div>
              ))}
              {audit.overall_feedback && (
                <div className="mt-3 pt-3 border-t border-[#E8D5B5]">
                  <p className="text-xs text-[#9E7E60] leading-relaxed">{audit.overall_feedback}</p>
                </div>
              )}
              {audit.top_improvements && audit.top_improvements.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-medium text-[#9E7E60] mb-1">Verbeterpunten:</div>
                  <ul className="space-y-1">
                    {audit.top_improvements.map((imp, i) => (
                      <li key={i} className="text-xs text-[#B8997A] flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5">--</span> {imp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Chef note */}
      {menu.chef_note && (
        <div className="flex gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <svg className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6z"/>
            <line x1="6" y1="17" x2="18" y2="17"/>
          </svg>
          <p className="text-amber-300 text-sm leading-relaxed">{menu.chef_note}</p>
        </div>
      )}

      {/* Menu Courses */}
      <div className="bg-[#FDFAF6]/80 border border-[#E8D5B5] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8D5B5] flex items-center justify-between">
          <h2 className="text-lg font-display font-semibold text-[#2C1810]">
            {menu.menu_name || 'Gegenereerd menu'}
          </h2>
        </div>
        <div className="divide-y divide-[#E8D5B5]/50">
          {(menu.courses || []).map((course, ci) => (
            <div key={ci}>
              <div className="px-6 py-3 bg-white/30">
                <span className="text-xs font-medium text-[#9E7E60] uppercase tracking-wider">
                  {course.label || course.name}
                </span>
              </div>
              {(course.dishes || []).map((dish, di) => {
                const dishKey = `${ci}-${di}`
                const isExpanded = expandedDish === dishKey
                const dishFeedback = audit.dish_feedback?.find(f => f.dish_name === dish.name)
                return (
                  <div key={di} className="px-6 py-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[#2C1810]">{dish.name}</span>
                          {dish.source && SOURCE_LABELS[dish.source] && (
                            <span className={`px-2 py-0.5 text-xs rounded-full ${SOURCE_LABELS[dish.source].className}`}>
                              {SOURCE_LABELS[dish.source].label}
                            </span>
                          )}
                          {dishFeedback && (
                            <span className={`px-1.5 py-0.5 text-xs rounded font-mono ${dishFeedback.score >= 7 ? 'text-emerald-400' : 'text-amber-700'}`}>
                              {dishFeedback.score}/10
                            </span>
                          )}
                        </div>
                        {dish.description && (
                          <p className="text-xs text-[#9E7E60] mt-1 leading-relaxed">{dish.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {dish.cost_pp !== undefined && (
                          <span className="text-sm font-mono font-bold text-[#5C4730]">
                            EUR {Number(dish.cost_pp).toFixed(2)}/p
                          </span>
                        )}
                        {dishFeedback && (
                          <button
                            onClick={() => setExpandedDish(isExpanded ? null : dishKey)}
                            className="p-1.5 rounded-lg border bg-white border-[#E8D5B5] text-[#B8997A] hover:text-[#5C4730] transition-all"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {(dish.key_ingredients || []).map((ing, i) => (
                        <span key={i} className="px-2 py-0.5 bg-white text-[#9E7E60] text-xs rounded-full">{ing}</span>
                      ))}
                      {(dish.seasonal_ingredients || []).map((s, i) => (
                        <span key={`s-${i}`} className="px-2 py-0.5 bg-emerald-900/30 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
                          </svg>
                          {s}
                        </span>
                      ))}
                    </div>

                    {/* Expanded audit feedback */}
                    {isExpanded && dishFeedback && (
                      <div className="mt-2 p-3 bg-[#FDF8F2]/80 border border-[#E8D5B5] rounded-xl space-y-1.5">
                        <p className="text-xs text-[#5C4730]">{dishFeedback.feedback}</p>
                        {dishFeedback.improvement && (
                          <p className="text-xs text-amber-700">
                            <span className="font-medium">Suggestie:</span> {dishFeedback.improvement}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Arbiter notes */}
      {menu.arbiter_notes && (
        <div className="p-3 bg-[#FDF8F2]/80 border border-[#E8D5B5] rounded-xl">
          <div className="text-xs font-medium text-[#9E7E60] mb-1">Arbiter aanpassingen</div>
          <p className="text-xs text-[#B8997A] leading-relaxed">{menu.arbiter_notes}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onModify}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-[#FDF8F2] text-[#5C4730] font-medium rounded-xl transition-all disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Aanpassen
        </button>
        <button
          onClick={onRegenerate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-[#FDF8F2] text-[#5C4730] font-medium rounded-xl transition-all disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
          )}
          Opnieuw genereren
        </button>
        <button
          onClick={onAccept}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 text-[#2C1810] font-medium rounded-xl transition-all ml-auto disabled:opacity-50"
          style={{ backgroundColor: '#E8A040' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Accepteren
        </button>
      </div>
    </div>
  )
}
