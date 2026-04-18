import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Utensils, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Recipe } from '@/types/database'

interface RecipeCardProps {
  recipe: Recipe
  viewMode: 'grid' | 'list'
}

export function RecipeCard({ recipe, viewMode }: RecipeCardProps) {
  const statusColor = {
    active: 'success' as const,
    draft: 'warning' as const,
    archived: 'secondary' as const,
  }

  if (viewMode === 'list') {
    return (
      <Link href={`/recipes/${recipe.id}`}>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Utensils className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{recipe.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{recipe.description || 'No description'}</p>
            </div>
            <div className="flex items-center gap-2">
              {recipe.category && <Badge variant="secondary">{recipe.category.name}</Badge>}
              <Badge variant={statusColor[recipe.status]}>{recipe.status}</Badge>
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <Link href={`/recipes/${recipe.id}`}>
      <Card className="hover:shadow-md transition-shadow h-full">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Utensils className="h-5 w-5 text-primary" />
            </div>
            <Badge variant={statusColor[recipe.status]}>{recipe.status}</Badge>
          </div>
          <div>
            <h3 className="font-semibold">{recipe.name}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {recipe.description || 'No description'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {recipe.category && <Badge variant="secondary" className="text-xs">{recipe.category.name}</Badge>}
            {recipe.dietary_flags?.slice(0, 3).map((flag) => (
              <Badge key={flag} variant="outline" className="text-xs">{flag}</Badge>
            ))}
          </div>
          {recipe.season_tags && recipe.season_tags.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Layers className="h-3 w-3" />
              {recipe.season_tags.join(', ')}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
