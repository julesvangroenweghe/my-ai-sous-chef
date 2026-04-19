'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Sparkles, ChevronRight, Star } from 'lucide-react'

interface ClassicalRecipe {
  id: string
  title: string
  source_author: string
  source_title: string
  category: string | null
  description: string | null
}

const authorColors: Record<string, string> = {
  'Escoffier': 'bg-amber-50 text-amber-700 border-amber-200',
  'Hirtzler': 'bg-blue-50 text-blue-700 border-blue-200',
  'Artusi': 'bg-green-50 text-green-700 border-green-200',
  'Soyer': 'bg-purple-50 text-purple-700 border-purple-200',
  'Filippini': 'bg-rose-50 text-rose-700 border-rose-200',
  'Belgian': 'bg-yellow-50 text-yellow-800 border-yellow-200',
}

function getAuthorStyle(author: string): string {
  for (const [key, value] of Object.entries(authorColors)) {
    if (author.includes(key)) return value
  }
  return 'bg-stone-50 text-stone-700 border-stone-200'
}

export function ClassicalSuggestions({ query, title = 'Klassieke Inspiratie', maxResults = 6 }: {
  query: string
  title?: string
  maxResults?: number
}) {
  const [recipes, setRecipes] = useState<ClassicalRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!query || query.length < 2) {
      setRecipes([])
      setLoading(false)
      return
    }

    async function search() {
      setLoading(true)
      const { data } = await supabase
        .from('classical_recipes')
        .select('id, title, source_author, source_title, category, description')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(maxResults)

      setRecipes(data || [])
      setLoading(false)
    }
    search()
  }, [query, maxResults])

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-xl" />
        ))}
      </div>
    )
  }

  if (recipes.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-brand-500" />
        <h4 className="text-sm font-semibold text-stone-700">{title}</h4>
        <span className="text-xs text-stone-400 font-mono">{recipes.length} gevonden</span>
      </div>
      <div className="space-y-1.5">
        {recipes.map((recipe, i) => (
          <div 
            key={recipe.id} 
            className="flex items-start gap-3 p-3 rounded-xl hover:bg-stone-50 transition-all duration-200 group cursor-default animate-slide-up opacity-0"
            style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}
          >
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
              <BookOpen className="w-4 h-4 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-stone-900 line-clamp-1">{recipe.title}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${getAuthorStyle(recipe.source_author)}`}>
                  {recipe.source_author.split(' ').pop()}
                </span>
              </div>
              {recipe.description && (
                <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{recipe.description}</p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-brand-400 shrink-0 mt-1 transition-colors" />
          </div>
        ))}
      </div>
    </div>
  )
}
