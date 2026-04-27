'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
 FileDown,
 Clock,
 Users,
 MapPin,
 Calendar,
 Euro,
 Truck,
 ChefHat,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Event } from '@/types/database'
import type { MepPlanGenerated, TimingCategory } from '@/types/mep'

interface MepViewProps {
 event: Event
 mepPlan: MepPlanGenerated | null
}

const timingConfig: Record<TimingCategory, { label: string; color: string; icon: string }> = {
 advance: { label: 'Advance Prep', color: 'bg-blue-100 text-blue-800', icon: '' },
 day_of: { label: 'Day Of', color: 'bg-amber-100 text-amber-800', icon: '' },
 on_stand: { label: 'On Stand', color: 'bg-green-100 text-green-800', icon: '' },
}

export function MepView({ event, mepPlan }: MepViewProps) {
 if (!mepPlan) {
 return (
 <Card>
 <CardContent className="p-8 text-center text-muted-foreground">
 <ChefHat className="h-10 w-10 mx-auto mb-3 opacity-30" />
 <p className="font-medium">No MEP generated yet</p>
 <p className="text-sm mt-1">
 Add recipes to the menu and generate your Mise en Place plan.
 </p>
 </CardContent>
 </Card>
 )
 }

 return (
 <div className="space-y-6 print:space-y-4">
 {/* Event header — print-friendly */}
 <Card className="print:shadow-none print:border-2 print:border-black">
 <CardContent className="p-6">
 <div className="flex items-start justify-between">
 <div>
 <h1 className="text-2xl font-extrabold">{event.name}</h1>
 <p className="text-sm text-muted-foreground mt-1">
 Mise en Place — Generated {new Date(mepPlan.generated_at).toLocaleString('nl-BE')}
 </p>
 </div>
 <Button
 variant="outline"
 className="gap-2 print:hidden"
 onClick={() => window.print()}
 >
 <FileDown className="h-4 w-4" />
 Export PDF
 </Button>
 </div>

 <Separator className="my-4" />

 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
 <div className="flex items-center gap-2">
 <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
 <div>
 <div className="text-xs text-muted-foreground">Date</div>
 <div className="font-medium">{formatDate(event.event_date)}</div>
 </div>
 </div>
 {event.num_persons && (
 <div className="flex items-center gap-2">
 <Users className="h-4 w-4 text-muted-foreground shrink-0" />
 <div>
 <div className="text-xs text-muted-foreground">Persons</div>
 <div className="font-medium">{event.num_persons} pax</div>
 </div>
 </div>
 )}
 {event.location && (
 <div className="flex items-center gap-2">
 <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
 <div>
 <div className="text-xs text-muted-foreground">Location</div>
 <div className="font-medium">{event.location}</div>
 </div>
 </div>
 )}
 {event.departure_time && (
 <div className="flex items-center gap-2">
 <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
 <div>
 <div className="text-xs text-muted-foreground">Departure</div>
 <div className="font-medium">{event.departure_time}</div>
 </div>
 </div>
 )}
 {event.arrival_time && (
 <div className="flex items-center gap-2">
 <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
 <div>
 <div className="text-xs text-muted-foreground">Kitchen Arrival</div>
 <div className="font-medium">{event.arrival_time}</div>
 </div>
 </div>
 )}
 {event.price_per_person && (
 <div className="flex items-center gap-2">
 <Euro className="h-4 w-4 text-muted-foreground shrink-0" />
 <div>
 <div className="text-xs text-muted-foreground">Price/pp</div>
 <div className="font-medium">{formatCurrency(event.price_per_person)}</div>
 </div>
 </div>
 )}
 </div>

 <div className="mt-3 flex items-center gap-2">
 <Badge variant="outline" className="capitalize">
 {event.event_type.replace(/_/g, ' ')}
 </Badge>
 <Badge variant={event.status === 'confirmed' ? 'success' : 'warning'} className="capitalize">
 {event.status}
 </Badge>
 </div>
 </CardContent>
 </Card>

 {/* Timing legend */}
 <div className="flex items-center gap-4 text-xs print:text-[10px]">
 <span className="font-semibold text-muted-foreground">Timing:</span>
 {Object.entries(timingConfig).map(([key, cfg]) => (
 <span key={key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${cfg.color}`}>
 {cfg.icon} {cfg.label}
 </span>
 ))}
 </div>

 {/* Course sections */}
 {mepPlan.sections.map((section, sIdx) => (
 <Card key={sIdx} className="print:break-inside-avoid print:shadow-none print:border">
 <CardHeader className="pb-2 bg-muted/30 print:bg-gray-100">
 <CardTitle className="text-base flex items-center gap-2">
 <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">
 {sIdx + 1}
 </span>
 {section.course_category}
 <span className="text-xs font-normal text-muted-foreground ml-auto">
 {section.items.length} {section.items.length === 1 ? 'dish' : 'dishes'}
 </span>
 </CardTitle>
 </CardHeader>
 <CardContent className="pt-4 space-y-6">
 {section.items.map((item, iIdx) => (
 <div key={iIdx} className="space-y-3">
 {iIdx > 0 && <Separator />}
 <div className="flex items-center gap-2">
 <h4 className="font-semibold text-sm">{item.recipe_name}</h4>
 {item.total_grams_per_person > 0 && (
 <Badge variant="outline" className="text-xs">
 {item.total_grams_per_person}g/pp
 </Badge>
 )}
 </div>

 {item.components.map((comp, cIdx) => (
 <div key={cIdx} className="ml-2">
 <div className="flex items-center gap-2 mb-1.5">
 <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
 {comp.component_name}
 </h5>
 <span
 className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
 timingConfig[comp.timing].color
 }`}
 >
 {timingConfig[comp.timing].icon} {timingConfig[comp.timing].label}
 </span>
 </div>

 <table className="w-full text-sm">
 <thead>
 <tr className="border-b text-left text-muted-foreground text-xs">
 <th className="pb-1 font-medium">Ingredient</th>
 <th className="pb-1 font-medium text-right">Per person</th>
 <th className="pb-1 font-medium text-right">
 Total ({event.num_persons || '?'} pp)
 </th>
 <th className="pb-1 font-medium text-right">Unit</th>
 <th className="pb-1 font-medium text-right print:hidden">Cost</th>
 </tr>
 </thead>
 <tbody>
 {comp.ingredients.map((ing, ingIdx) => (
 <tr key={ingIdx} className="border-b last:border-0">
 <td className="py-1">{ing.name}</td>
 <td className="py-1 text-right tabular-nums">
 {ing.quantity_per_person}
 </td>
 <td className="py-1 text-right font-medium tabular-nums">
 {ing.quantity_total}
 </td>
 <td className="py-1 text-right text-muted-foreground">{ing.unit}</td>
 <td className="py-1 text-right text-muted-foreground print:hidden">
 {ing.total_cost > 0 ? formatCurrency(ing.total_cost) : '—'}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 ))}
 </div>
 ))}
 </CardContent>
 </Card>
 ))}

 {/* Cost summary */}
 <Card className="print:break-inside-avoid">
 <CardHeader>
 <CardTitle className="text-base">Cost Summary</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="bg-muted/50 rounded-lg p-3 text-center">
 <div className="text-xs text-muted-foreground">Total Food Cost</div>
 <div className="text-lg font-bold">{formatCurrency(mepPlan.total_cost)}</div>
 </div>
 <div className="bg-muted/50 rounded-lg p-3 text-center">
 <div className="text-xs text-muted-foreground">Cost per Person</div>
 <div className="text-lg font-bold">{formatCurrency(mepPlan.cost_per_person)}</div>
 </div>
 {event.price_per_person && event.price_per_person > 0 && (
 <>
 <div className="bg-muted/50 rounded-lg p-3 text-center">
 <div className="text-xs text-muted-foreground">Selling Price/pp</div>
 <div className="text-lg font-bold">{formatCurrency(event.price_per_person)}</div>
 </div>
 <div className="bg-muted/50 rounded-lg p-3 text-center">
 <div className="text-xs text-muted-foreground">Food Cost %</div>
 <div
 className={`text-lg font-bold ${
 (mepPlan.cost_per_person / event.price_per_person) * 100 > 35
 ? 'text-red-600'
 : 'text-green-600'
 }`}
 >
 {((mepPlan.cost_per_person / event.price_per_person) * 100).toFixed(1)}%
 </div>
 </div>
 </>
 )}
 </div>

 {/* Per-section cost breakdown */}
 <div className="mt-4 pt-4 border-t">
 <h4 className="text-sm font-semibold mb-2">Cost by Course</h4>
 <div className="space-y-1">
 {mepPlan.sections.map((section) => {
 const sectionCost = section.items.reduce(
 (sum, item) =>
 sum +
 item.components.reduce(
 (cSum, comp) =>
 cSum + comp.ingredients.reduce((iSum, ing) => iSum + ing.total_cost, 0),
 0
 ),
 0
 )
 return (
 <div key={section.course_category} className="flex items-center justify-between text-sm">
 <span>{section.course_category}</span>
 <span className="font-medium tabular-nums">{formatCurrency(sectionCost)}</span>
 </div>
 )
 })}
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 )
}
