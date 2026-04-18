'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Edit, Calendar, Clock, Users } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Recipe, RecipeComponent } from '@/types/database'
import Link from 'next/link'

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('recipes')
        .select(`
          *,
          category:recipe_categories(*),
          subcategory:recipe_subcategories(*),
          components:recipe_components(
            *,
            ingredients:recipe_component_ingredients(
              *,
              ingredient:ingredients(*)
            )
          )
        `)
        .eq('id', id)
        .single()

      if (data) setRecipe(data as unknown as Recipe)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Recipe not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/recipes')}>
          Back to Recipes
        </Button>
      </div>
    )
  }

  const totalCost = recipe.components?.reduce((sum, comp) => {
    return sum + (comp.ingredients?.reduce((cSum, ci) => {
      const price = ci.ingredient?.default_unit_price || 0
      return cSum + price * ci.quantity_per_person
    }, 0) || 0)
  }, 0) || 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/recipes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{recipe.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {recipe.category && <Badge variant="secondary">{recipe.category.name}</Badge>}
            {recipe.subcategory && <Badge variant="outline">{recipe.subcategory.name}</Badge>}
            <Badge variant={recipe.status === 'active' ? 'success' : 'warning'}>
              {recipe.status}
            </Badge>
          </div>
        </div>
        <Button variant="outline" className="gap-2">
          <Edit className="h-4 w-4" /> Edit
        </Button>
        <Link href="/events/new">
          <Button className="gap-2">
            <Calendar className="h-4 w-4" /> Add to Event
          </Button>
        </Link>
      </div>

      {recipe.description && (
        <p className="text-muted-foreground">{recipe.description}</p>
      )}

      <div className="flex gap-4 flex-wrap">
        {recipe.prep_time_minutes && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" /> {recipe.prep_time_minutes} min
          </div>
        )}
        {recipe.serving_size_grams && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" /> {recipe.serving_size_grams}g/pp
          </div>
        )}
        <div className="text-sm font-medium text-primary">
          Cost/pp: {formatCurrency(totalCost)}
        </div>
      </div>

      {recipe.dietary_flags && recipe.dietary_flags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {recipe.dietary_flags.map((flag) => (
            <Badge key={flag} variant="outline">{flag}</Badge>
          ))}
        </div>
      )}

      {/* Components */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Components</h2>
        {recipe.components?.sort((a, b) => a.sort_order - b.sort_order).map((component) => (
          <Card key={component.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{component.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Ingredient</th>
                    <th className="pb-2 font-medium text-right">Qty/pp</th>
                    <th className="pb-2 font-medium text-right">Unit</th>
                    <th className="pb-2 font-medium text-right">Cost/pp</th>
                    <th className="pb-2 font-medium">Prep</th>
                  </tr>
                </thead>
                <tbody>
                  {component.ingredients?.map((ci) => (
                    <tr key={ci.id} className="border-b last:border-0">
                      <td className="py-2 font-medium">{ci.ingredient?.name || '—'}</td>
                      <td className="py-2 text-right">{ci.quantity_per_person}</td>
                      <td className="py-2 text-right">{ci.unit}</td>
                      <td className="py-2 text-right">
                        {formatCurrency((ci.ingredient?.default_unit_price || 0) * ci.quantity_per_person)}
                      </td>
                      <td className="py-2 text-muted-foreground">{ci.prep_instruction || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
