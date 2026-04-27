'use client'

import { RecipeForm } from '@/components/recipes/recipe-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewRecipePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/recipes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold">Nieuw Recept</h1>
          <p className="text-muted-foreground text-sm mt-1">Maak een nieuw recept met componenten en ingredienten</p>
        </div>
      </div>
      <RecipeForm />
    </div>
  )
}
