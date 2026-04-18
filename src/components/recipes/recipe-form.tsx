'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ComponentBuilder } from '@/components/recipes/component-builder'
import { Loader2, Save } from 'lucide-react'
import type { RecipeCategory } from '@/types/database'

const DIETARY_FLAGS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'pescatarian', 'halal', 'kosher']
const SEASONS = ['spring', 'summer', 'autumn', 'winter', 'all-year']

export function RecipeForm() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<RecipeCategory[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [servingSize, setServingSize] = useState('')
  const [prepTime, setPrepTime] = useState('')
  const [dietaryFlags, setDietaryFlags] = useState<string[]>([])
  const [seasonTags, setSeasonTags] = useState<string[]>([])
  const [components, setComponents] = useState<Array<{
    name: string
    ingredients: Array<{
      ingredient_id: string
      quantity_per_person: number
      unit: string
      prep_instruction: string
    }>
  }>>([{ name: '', ingredients: [] }])

  useEffect(() => {
    supabase
      .from('recipe_categories')
      .select('*, subcategories:recipe_subcategories(*)')
      .order('sort_order')
      .then(({ data }) => {
        if (data) setCategories(data as unknown as RecipeCategory[])
      })
  }, [])

  const selectedCategory = categories.find((c) => c.id === categoryId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get chef profile
      const { data: chef } = await supabase
        .from('chef_profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      // Get kitchen
      const { data: membership } = await supabase
        .from('kitchen_members')
        .select('kitchen_id')
        .eq('chef_id', chef?.id)
        .limit(1)
        .single()

      const { data: recipe, error } = await supabase
        .from('recipes')
        .insert({
          name,
          description: description || null,
          category_id: categoryId || null,
          subcategory_id: subcategoryId || null,
          serving_size_grams: servingSize ? Number(servingSize) : null,
          prep_time_minutes: prepTime ? Number(prepTime) : null,
          dietary_flags: dietaryFlags,
          season_tags: seasonTags,
          kitchen_id: membership?.kitchen_id,
          chef_id: chef?.id,
        })
        .select()
        .single()

      if (error) throw error

      // Insert components
      for (let i = 0; i < components.length; i++) {
        const comp = components[i]
        if (!comp.name) continue

        const { data: component } = await supabase
          .from('recipe_components')
          .insert({
            recipe_id: recipe.id,
            name: comp.name,
            sort_order: i,
          })
          .select()
          .single()

        if (component && comp.ingredients.length > 0) {
          await supabase.from('recipe_component_ingredients').insert(
            comp.ingredients.map((ing) => ({
              component_id: component.id,
              ingredient_id: ing.ingredient_id,
              quantity_per_person: ing.quantity_per_person,
              unit: ing.unit,
              prep_instruction: ing.prep_instruction || null,
            }))
          )
        }
      }

      router.push(`/recipes/${recipe.id}`)
    } catch (err) {
      console.error('Failed to create recipe:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Recipe Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ceviche van zeebaars" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Short description of the dish..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setSubcategoryId('') }}>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subcategory</Label>
              <Select value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} disabled={!categoryId}>
                <option value="">Select subcategory</option>
                {selectedCategory?.subcategories?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serving">Serving Size (g)</Label>
              <Input id="serving" type="number" value={servingSize} onChange={(e) => setServingSize(e.target.value)} placeholder="e.g. 250" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prep">Prep Time (min)</Label>
              <Input id="prep" type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} placeholder="e.g. 45" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dietary Flags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DIETARY_FLAGS.map((flag) => (
              <button
                key={flag}
                type="button"
                onClick={() => setDietaryFlags(
                  dietaryFlags.includes(flag)
                    ? dietaryFlags.filter((f) => f !== flag)
                    : [...dietaryFlags, flag]
                )}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  dietaryFlags.includes(flag)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-input hover:bg-muted'
                }`}
              >
                {flag}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seasons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SEASONS.map((season) => (
              <button
                key={season}
                type="button"
                onClick={() => setSeasonTags(
                  seasonTags.includes(season)
                    ? seasonTags.filter((s) => s !== season)
                    : [...seasonTags, season]
                )}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  seasonTags.includes(season)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-input hover:bg-muted'
                }`}
              >
                {season}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <ComponentBuilder components={components} onChange={setComponents} />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading || !name} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Recipe
        </Button>
      </div>
    </form>
  )
}
