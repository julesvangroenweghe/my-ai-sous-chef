'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, ChefHat, MapPin, Save, Loader2, Sparkles, Heart } from 'lucide-react'
import { TagInput } from '@/components/ui/tag-input'
import { MatchStyleButton } from '@/components/profile/match-style-button'

interface Profile {
  display_name: string
  bio: string
  cuisine_specialties: string[]
  kitchen_type: string
  experience_level: string
  location: string
  cooking_philosophy: string
  preferred_ingredients: string[]
  technique_preferences: string[]
}

const cuisineOptions = [
  'Frans', 'Belgisch', 'Italiaans', 'Aziatisch', 'Nordisch',
  'Modern', 'Moleculair', 'Mediterraan', 'Japans', 'Mexicaans',
]

const techniqueOptions = [
  'Sous vide', 'Braiseren', 'Fermentatie', 'Patisserie',
  'Grillen', 'Confijten', 'Roken', 'Dehydrateren',
  'Ceviche', 'Tempura', 'Emulsies', 'Gelificatie',
]

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({
    display_name: '',
    bio: '',
    cuisine_specialties: [],
    kitchen_type: '',
    experience_level: '',
    location: '',
    cooking_philosophy: '',
    preferred_ingredients: [],
    technique_preferences: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('chef_profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (data) {
        setProfile({
          display_name: data.display_name || '',
          bio: data.bio || '',
          cuisine_specialties: data.cuisine_specialties || data.cuisine_styles || [],
          kitchen_type: data.kitchen_type || '',
          experience_level: data.experience_level || '',
          location: data.location || '',
          cooking_philosophy: data.cooking_philosophy || '',
          preferred_ingredients: data.preferred_ingredients || [],
          technique_preferences: data.signature_techniques || [],
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('chef_profiles')
      .upsert({
        auth_user_id: user.id,
        display_name: profile.display_name,
        bio: profile.bio,
        cuisine_specialties: profile.cuisine_specialties,
        cuisine_styles: profile.cuisine_specialties,
        kitchen_type: profile.kitchen_type,
        experience_level: profile.experience_level,
        location: profile.location,
        cooking_philosophy: profile.cooking_philosophy,
        preferred_ingredients: profile.preferred_ingredients,
        signature_techniques: profile.technique_preferences,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'auth_user_id' })

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="skeleton w-48 h-8 rounded-lg" />
        <div className="card p-8 space-y-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="skeleton w-24 h-4 rounded" />
              <div className="skeleton w-full h-12 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="animate-fade-in">
        <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">Chef Profiel</h1>
        <p className="text-stone-500 mt-1">Je culinaire identiteit. Dit reist met je mee.</p>
      </div>

      <div className="card p-8 space-y-6 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        {/* Avatar */}
        <div className="flex items-center gap-4 pb-6 border-b border-stone-100">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center">
            <ChefHat className="w-8 h-8 text-brand-400" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-stone-900">
              {profile.display_name || 'Je naam'}
            </h2>
            <p className="text-sm text-stone-500">
              {profile.kitchen_type || 'Stel je profiel in om te beginnen'}
            </p>
          </div>
        </div>

        {/* Basic Fields */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Weergavenaam</label>
            <input
              type="text"
              value={profile.display_name}
              onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
              placeholder="Chef Jules"
              className="input-premium"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Bio</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Vertel over je culinaire reis..."
              rows={3}
              className="input-premium resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Keukentype</label>
              <select
                value={profile.kitchen_type}
                onChange={(e) => setProfile({ ...profile, kitchen_type: e.target.value })}
                className="input-premium"
              >
                <option value="">Selecteer...</option>
                <option value="restaurant">Restaurant</option>
                <option value="catering">Catering</option>
                <option value="hotel">Hotel</option>
                <option value="brasserie">Brasserie</option>
                <option value="foodtruck">Foodtruck</option>
                <option value="private_chef">Privéchef</option>
                <option value="culinary_school">Kookschool</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Ervaringsniveau</label>
              <select
                value={profile.experience_level}
                onChange={(e) => setProfile({ ...profile, experience_level: e.target.value })}
                className="input-premium"
              >
                <option value="">Selecteer...</option>
                <option value="student">Student</option>
                <option value="commis">Commis</option>
                <option value="chef_de_partie">Chef de Partie</option>
                <option value="sous_chef">Sous Chef</option>
                <option value="head_chef">Chef-kok</option>
                <option value="executive_chef">Executive Chef</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Locatie</label>
            <input
              type="text"
              value={profile.location}
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              placeholder="Brussel, België"
              className="input-premium"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-stone-100 pt-6">
          <h3 className="font-display font-semibold text-stone-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Culinaire voorkeuren
          </h3>

          <div className="space-y-5">
            {/* Cuisine preferences */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Keukenstijlen</label>
              <TagInput
                value={profile.cuisine_specialties}
                onChange={(tags) => setProfile({ ...profile, cuisine_specialties: tags })}
                suggestions={cuisineOptions}
                placeholder="Typ een keukenstijl..."
              />
            </div>

            {/* Technique preferences */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Technieken</label>
              <TagInput
                value={profile.technique_preferences}
                onChange={(tags) => setProfile({ ...profile, technique_preferences: tags })}
                suggestions={techniqueOptions}
                placeholder="Typ een techniek..."
              />
            </div>

            {/* Cooking Philosophy */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Keukenfilosofie</label>
              <textarea
                value={profile.cooking_philosophy}
                onChange={(e) => setProfile({ ...profile, cooking_philosophy: e.target.value })}
                placeholder="Wat drijft je in de keuken? Welke waarden zijn belangrijk?"
                rows={3}
                className="input-premium resize-none"
              />
            </div>

            {/* Favorite Ingredients */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2 flex items-center gap-2">
                <Heart className="w-3.5 h-3.5 text-red-400" />
                Favoriete ingrediënten
              </label>
              <TagInput
                value={profile.preferred_ingredients}
                onChange={(tags) => setProfile({ ...profile, preferred_ingredients: tags })}
                placeholder="Typ een ingrediënt..."
              />
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Opslaan...' : 'Profiel opslaan'}
        </button>
      </div>

      {/* Match Style Section */}
      <div className="card p-8 animate-slide-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-stone-900">Stijlanalyse</h3>
            <p className="text-xs text-stone-400">AI-analyse van je kookstijl op basis van je recepten</p>
          </div>
        </div>
        <MatchStyleButton />
      </div>
    </div>
  )
}
