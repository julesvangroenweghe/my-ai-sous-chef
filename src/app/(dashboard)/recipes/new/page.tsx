'use client'

import { RecipeForm } from '@/components/recipes/recipe-form'

export default function NewRecipePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Recipe</h1>
        <p className="text-muted-foreground text-sm mt-1">Create a new recipe with components and ingredients</p>
      </div>
      <RecipeForm />
    </div>
  )
}
