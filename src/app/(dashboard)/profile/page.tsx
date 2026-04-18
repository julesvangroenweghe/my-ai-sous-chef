'use client'

import { useState } from 'react'
import { useProfile } from '@/hooks/use-profile'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TagInput } from '@/components/ui/tag-input'
import { ProfileCard } from '@/components/profile/profile-card'
import { MemoryTimeline } from '@/components/profile/memory-timeline'
import {
  ChefHat, Edit3, Save, X, Camera,
  BookOpen, Calendar, TrendingDown, Brain,
} from 'lucide-react'

const CUISINE_SUGGESTIONS = [
  'French', 'Italian', 'Japanese', 'Asian', 'Mediterranean', 'Nordic',
  'Belgian', 'Spanish', 'Mexican', 'Thai', 'Indian', 'Middle Eastern',
  'Korean', 'Peruvian', 'Modern European', 'Fusion', 'American', 'Chinese',
]

export default function ProfilePage() {
  const {
    profile,
    memories,
    loading,
    memoriesLoading,
    error,
    updateProfile,
    addMemory,
    loadMoreMemories,
    hasMoreMemories,
  } = useProfile()

  const { addToast } = useToast()

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit form state
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    current_role: '',
    years_experience: 0,
    cuisine_styles: [] as string[],
    signature_techniques: [] as string[],
    preferred_ingredients: [] as string[],
    avoided_ingredients: [] as string[],
    cooking_philosophy: '',
  })

  // Add memory form
  const [showAddMemory, setShowAddMemory] = useState(false)
  const [newMemory, setNewMemory] = useState({
    memory_type: 'note' as const,
    content: '',
    importance: 3,
  })

  const startEditing = () => {
    if (!profile) return
    setFormData({
      display_name: profile.display_name || '',
      bio: profile.bio || '',
      current_role: profile.current_role || '',
      years_experience: profile.years_experience || 0,
      cuisine_styles: profile.cuisine_styles || [],
      signature_techniques: profile.signature_techniques || [],
      preferred_ingredients: profile.preferred_ingredients || [],
      avoided_ingredients: profile.avoided_ingredients || [],
      cooking_philosophy: profile.cooking_philosophy || '',
    })
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const result = await updateProfile(formData)
    setSaving(false)

    if (result.success) {
      setEditing(false)
      addToast({ title: 'Profile updated', variant: 'success' })
    } else {
      addToast({ title: 'Error saving profile', description: result.error, variant: 'destructive' })
    }
  }

  const handleAddMemory = async () => {
    if (!newMemory.content.trim()) return
    const result = await addMemory(newMemory)
    if (result.success) {
      setNewMemory({ memory_type: 'note', content: '', importance: 3 })
      setShowAddMemory(false)
      addToast({ title: 'Memory added', variant: 'success' })
    } else {
      addToast({ title: 'Error adding memory', description: result.error, variant: 'destructive' })
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="border-destructive/50">
          <CardContent className="p-6 text-center">
            <p className="text-destructive font-medium">Error loading profile</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) return null

  const initials = profile.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative group">
          <Avatar className="h-20 w-20">
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
            ) : (
              <AvatarFallback className="bg-orange-100 text-orange-700 text-2xl font-semibold">
                {initials || <ChefHat className="h-8 w-8" />}
              </AvatarFallback>
            )}
          </Avatar>
          {editing && (
            <button className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-5 w-5 text-white" />
            </button>
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-2xl font-bold">{profile.display_name}</h1>
          <p className="text-muted-foreground text-sm">
            {profile.current_role || 'Chef'} · {profile.years_experience || 0} years experience
          </p>
          {profile.bio && !editing && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{profile.bio}</p>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={cancelEditing} className="gap-1.5">
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="gap-1.5 bg-orange-500 hover:bg-orange-600"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={startEditing} className="gap-1.5">
              <Edit3 className="h-4 w-4" /> Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <BookOpen className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-xl font-bold">—</p>
              <p className="text-xs text-muted-foreground">Recipes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold">—</p>
              <p className="text-xs text-muted-foreground">Events</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <TrendingDown className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold">—</p>
              <p className="text-xs text-muted-foreground">Cost Savings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Brain className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{memories.length}</p>
              <p className="text-xs text-muted-foreground">Memories</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content: 2-column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Profile info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Info</CardTitle>
              <CardDescription>Your basic information visible to your team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Display Name</Label>
                      <Input
                        value={formData.display_name}
                        onChange={(e) =>
                          setFormData((f) => ({ ...f, display_name: e.target.value }))
                        }
                        placeholder="Chef name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Current Role</Label>
                      <Input
                        value={formData.current_role}
                        onChange={(e) =>
                          setFormData((f) => ({ ...f, current_role: e.target.value }))
                        }
                        placeholder="e.g. Head Chef at Le Gastronome"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Years of Experience</Label>
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={formData.years_experience || ''}
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          years_experience: parseInt(e.target.value) || 0,
                        }))
                      }
                      placeholder="0"
                      className="w-32"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData((f) => ({ ...f, bio: e.target.value }))}
                      className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                      placeholder="Tell us about your culinary journey…"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Role</span>
                      <p className="font-medium">{profile.current_role || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Experience</span>
                      <p className="font-medium">
                        {profile.years_experience ? `${profile.years_experience} years` : '—'}
                      </p>
                    </div>
                  </div>
                  {profile.bio && (
                    <div>
                      <span className="text-sm text-muted-foreground">Bio</span>
                      <p className="text-sm mt-1">{profile.bio}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Culinary Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Culinary Identity</CardTitle>
              <CardDescription>
                Your cooking DNA — Jules uses this to personalize suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Cuisine Styles */}
              <div className="space-y-2">
                <Label>Cuisine Styles</Label>
                {editing ? (
                  <TagInput
                    value={formData.cuisine_styles}
                    onChange={(tags) => setFormData((f) => ({ ...f, cuisine_styles: tags }))}
                    suggestions={CUISINE_SUGGESTIONS}
                    placeholder="Add cuisine style…"
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.cuisine_styles.length > 0 ? (
                      profile.cuisine_styles.map((style) => (
                        <Badge key={style} variant="secondary">
                          {style}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No cuisines added</span>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Signature Techniques */}
              <div className="space-y-2">
                <Label>Signature Techniques</Label>
                {editing ? (
                  <TagInput
                    value={formData.signature_techniques}
                    onChange={(tags) =>
                      setFormData((f) => ({ ...f, signature_techniques: tags }))
                    }
                    placeholder="e.g. sous-vide, fermentation, smoking…"
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.signature_techniques.length > 0 ? (
                      profile.signature_techniques.map((tech) => (
                        <Badge key={tech} variant="outline">
                          {tech}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No techniques added</span>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Preferred Ingredients */}
              <div className="space-y-2">
                <Label>Preferred Ingredients</Label>
                {editing ? (
                  <TagInput
                    value={formData.preferred_ingredients}
                    onChange={(tags) =>
                      setFormData((f) => ({ ...f, preferred_ingredients: tags }))
                    }
                    placeholder="Ingredients you love working with…"
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.preferred_ingredients.length > 0 ? (
                      profile.preferred_ingredients.map((ing) => (
                        <Badge key={ing} variant="success" className="bg-green-50 text-green-700 border-green-200">
                          {ing}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No preferred ingredients
                      </span>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Avoided Ingredients */}
              <div className="space-y-2">
                <Label>Avoided Ingredients</Label>
                {editing ? (
                  <TagInput
                    value={formData.avoided_ingredients}
                    onChange={(tags) =>
                      setFormData((f) => ({ ...f, avoided_ingredients: tags }))
                    }
                    placeholder="Ingredients you avoid…"
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.avoided_ingredients.length > 0 ? (
                      profile.avoided_ingredients.map((ing) => (
                        <Badge key={ing} variant="destructive" className="bg-red-50 text-red-700 border-red-200">
                          {ing}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No avoided ingredients
                      </span>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Cooking Philosophy */}
              <div className="space-y-2">
                <Label>Cooking Philosophy</Label>
                {editing ? (
                  <textarea
                    value={formData.cooking_philosophy}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, cooking_philosophy: e.target.value }))
                    }
                    className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    placeholder="What drives your cooking? Your approach to food…"
                  />
                ) : (
                  <p className="text-sm">
                    {profile.cooking_philosophy || (
                      <span className="text-muted-foreground">No philosophy added</span>
                    )}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Memory Feed + Card */}
        <div className="space-y-6">
          {/* Profile Card preview */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Profile Preview
            </p>
            <ProfileCard profile={profile} />
          </div>

          {/* Jules Memory Feed */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-500" />
                  Jules&apos; Memory
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddMemory(!showAddMemory)}
                  className="text-xs h-7"
                >
                  + Add
                </Button>
              </div>
              <CardDescription>What Jules has learned about you</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add memory form */}
              {showAddMemory && (
                <div className="mb-4 p-3 rounded-lg border bg-gray-50/50 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <select
                      value={newMemory.memory_type}
                      onChange={(e) =>
                        setNewMemory((m) => ({
                          ...m,
                          memory_type: e.target.value as typeof m.memory_type,
                        }))
                      }
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="preference">🧠 Preference</option>
                      <option value="technique">🔪 Technique</option>
                      <option value="style">🎨 Style</option>
                      <option value="feedback">💬 Feedback</option>
                      <option value="note">📝 Note</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Content</Label>
                    <textarea
                      value={newMemory.content}
                      onChange={(e) => setNewMemory((m) => ({ ...m, content: e.target.value }))}
                      className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                      placeholder="What should Jules remember?"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Importance (1-5)</Label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setNewMemory((m) => ({ ...m, importance: n }))}
                          className={`h-8 w-8 rounded-md text-sm font-medium transition-colors ${
                            newMemory.importance >= n
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddMemory(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddMemory}
                      disabled={!newMemory.content.trim()}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      Save Memory
                    </Button>
                  </div>
                </div>
              )}

              <MemoryTimeline
                memories={memories}
                loading={memoriesLoading}
                hasMore={hasMoreMemories}
                onLoadMore={loadMoreMemories}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
