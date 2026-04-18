import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import type { Event } from '@/types/database'

interface MepViewProps {
  event: Event
}

export function MepView({ event }: MepViewProps) {
  if (!event.menu_items || event.menu_items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No menu items added. Edit the event to build a menu.
        </CardContent>
      </Card>
    )
  }

  const sortedItems = [...event.menu_items].sort((a, b) => a.course_order - b.course_order)

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Mise en Place</h2>
      {sortedItems.map((item) => {
        const recipe = item.recipe
        if (!recipe) return null

        return (
          <Card key={item.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">Gang {item.course_order}</Badge>
                  <CardTitle className="text-base">{recipe.name}</CardTitle>
                </div>
                {recipe.dietary_flags?.map((flag) => (
                  <Badge key={flag} variant="outline" className="text-xs">{flag}</Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {recipe.components?.sort((a, b) => a.sort_order - b.sort_order).map((comp) => (
                <div key={comp.id} className="mb-4 last:mb-0">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">{comp.name}</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground text-xs">
                        <th className="pb-1.5 font-medium">Ingredient</th>
                        <th className="pb-1.5 font-medium text-right">Per person</th>
                        <th className="pb-1.5 font-medium text-right">Total ({event.num_persons || '?'}pp)</th>
                        <th className="pb-1.5 font-medium text-right">Unit</th>
                        <th className="pb-1.5 font-medium">Prep</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comp.ingredients?.map((ci) => (
                        <tr key={ci.id} className="border-b last:border-0">
                          <td className="py-1.5">{ci.ingredient?.name || '—'}</td>
                          <td className="py-1.5 text-right">{ci.quantity_per_person}</td>
                          <td className="py-1.5 text-right font-medium">
                            {event.num_persons ? (ci.quantity_per_person * event.num_persons).toFixed(1) : '—'}
                          </td>
                          <td className="py-1.5 text-right">{ci.unit}</td>
                          <td className="py-1.5 text-muted-foreground">{ci.prep_instruction || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
