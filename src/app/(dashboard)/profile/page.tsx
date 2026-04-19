'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, ChefHat, MapPin, Briefcase, Save, Loader2 } from 'lucide-react'

interface Profile {
  display_name: string
  bio: string
  cuisine_specialties: string[]
  kitchen_type: string
  experience_level: string
  location: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({
    display_name: '',
    bio: '',
    cuisine_specialties: [],
    kitchen_type: '',
    experience_level: '',
    location: '',
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
          cuisine_specialties: data.cuisine_specialties || [],
          kitchen_type: data.kitchen_type || '',
          experience_level: data.experience_level || '',
          location: data.location || '',
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
        ...profile,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'auth_user_id' })

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="skeleton w-48 h-8 rounded-lg" />
        <div className="card p-8 space-y-6">
          {[...Array(4)].map((_, i) => (
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
        <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">Chef Profile</h1>
        <p className="text-stone-500 mt-1">Your culinary identity. This travels with you.</p>
      </div>

      <div className="card p-8 space-y-6 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        {/* Avatar */}
        <div className="flex items-center gap-4 pb-6 border-b border-stone-100">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center">
            <ChefHat className="w-8 h-8 text-brand-400" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-stone-900">
              {profile.display_name || 'Your Name'}
            </h2>
            <p className="text-sm text-stone-500">
              {profile.kitchen_type || 'Set up your profile to get started'}
            </p>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Display Name</label>
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
              placeholder="Tell us about your culinary journey..."
              rows={3}
              className="input-premium resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Kitchen Type</label>
              <select
                value={profile.kitchen_type}
                onChange={(e) => setProfile({ ...profile, kitchen_type: e.target.value })}
                className="input-premium"
              >
                <option value="">Select...</option>
                <option value="restaurant">Restaurant</option>
                <option value="catering">Catering</option>
                <option value="hotel">Hotel</option>
                <option value="food_truck">Food Truck</option>
                <option value="private_chef">Private Chef</option>
                <option value="culinary_school">Culinary School</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Experience Level</label>
              <select
                value={profile.experience_level}
                onChange={(e) => setProfile({ ...profile, experience_level: e.target.value })}
                className="input-premium"
              >
                <option value="">Select...</option>
                <option value="student">Student</option>
                <option value="commis">Commis</option>
                <option value="chef_de_partie">Chef de Partie</option>
                <option value="sous_chef">Sous Chef</option>
                <option value="head_chef">Head Chef</option>
                <option value="executive_chef">Executive Chef</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Location</label>
            <input
              type="text"
              value={profile.location}
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              placeholder="Brussels, Belgium"
              className="input-premium"
            />
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}
