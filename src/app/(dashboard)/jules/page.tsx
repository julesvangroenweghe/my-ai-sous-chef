'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Brain, Bell, Sparkles, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { JulesPanel } from '@/components/jules/jules-panel'
import { MemoryDisplay } from '@/components/jules/memory-display'
import { useJules } from '@/hooks/use-jules'
import { formatCurrency } from '@/lib/utils'
import type { JulesSuggestion, ChefMemory } from '@/types/database'

type Tab = 'alerts' | 'memory' | 'insights'

export default function JulesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('alerts')
  const [suggestions, setSuggestions] = useState<JulesSuggestion[]>([])
  const [memories, setMemories] = useState<ChefMemory[]>([])
  const [loading, setLoading] = useState(true)
  const { getSuggestions, getMemory } = useJules()

  useEffect(() => {
    async function load() {
      const [sugs, mems] = await Promise.all([getSuggestions(), getMemory()])
      setSuggestions(sugs)
      setMemories(mems)
      setLoading(false)
    }
    load()
  }, [getSuggestions, getMemory])

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: 'alerts',
      label: 'Alerts',
      icon: <Bell className="h-4 w-4" />,
      count: suggestions.length,
    },
    {
      id: 'memory',
      label: 'Memory',
      icon: <Brain className="h-4 w-4" />,
      count: memories.length,
    },
    {
      id: 'insights',
      label: 'Insights',
      icon: <BarChart3 className="h-4 w-4" />,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-xl">
          <Brain className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Jules AI</h1>
          <p className="text-muted-foreground text-sm">
            Your proactive kitchen intelligence partner
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <Badge variant={activeTab === tab.id ? 'default' : 'secondary'} className="text-xs h-5 min-w-[20px] flex items-center justify-center">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'alerts' && <JulesPanel />}

          {activeTab === 'memory' && (
            <div className="space-y-6">
              <MemoryDisplay memories={memories} />
            </div>
          )}

          {activeTab === 'insights' && <InsightsTab />}
        </>
      )}
    </div>
  )
}

function InsightsTab() {
  const supabase = createClient()
  const [stats, setStats] = useState({
    totalRecipes: 0,
    avgFoodCost: 0,
    highCostRecipes: 0,
    totalIngredients: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadInsights() {
      const [recipesRes, ingredientsRes] = await Promise.all([
        supabase.from('recipes').select('food_cost_percentage, total_cost_per_serving').eq('is_active', true),
        supabase.from('ingredients').select('id', { count: 'exact', head: true }),
      ])

      const recipes = recipesRes.data || []
      const avgCost = recipes.length > 0
        ? recipes.reduce((sum, r) => sum + (r.food_cost_percentage || 0), 0) / recipes.length
        : 0
      const highCost = recipes.filter((r) => (r.food_cost_percentage || 0) > 35).length

      setStats({
        totalRecipes: recipes.length,
        avgFoodCost: avgCost,
        highCostRecipes: highCost,
        totalIngredients: ingredientsRes.count || 0,
      })
      setLoading(false)
    }
    loadInsights()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    )
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const currentMonth = new Date().getMonth()

  const seasonalSuggestions: Record<number, string[]> = {
    0: ['Root vegetables', 'Citrus fruits', 'Winter greens'],
    1: ['Blood oranges', 'Brussels sprouts', 'Celeriac'],
    2: ['Spring onions', 'Asparagus', 'Rhubarb'],
    3: ['Asparagus', 'Peas', 'Spring lamb', 'Morels'],
    4: ['Strawberries', 'Artichokes', 'Broad beans'],
    5: ['Cherries', 'Courgettes', 'New potatoes'],
    6: ['Tomatoes', 'Berries', 'Stone fruits'],
    7: ['Corn', 'Peppers', 'Aubergine'],
    8: ['Figs', 'Wild mushrooms', 'Squash'],
    9: ['Pumpkin', 'Apples', 'Game meats'],
    10: ['Chestnuts', 'Parsnips', 'Cranberries'],
    11: ['Winter truffles', 'Pomegranate', 'Root vegetables'],
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Recipes</p>
            <p className="text-2xl font-bold mt-1">{stats.totalRecipes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Avg Food Cost %</p>
            <p className="text-2xl font-bold mt-1">{stats.avgFoodCost.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">High Cost Recipes</p>
            <p className="text-2xl font-bold mt-1 text-orange-500">{stats.highCostRecipes}</p>
            <p className="text-xs text-muted-foreground">&gt;35% food cost</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Ingredients Tracked</p>
            <p className="text-2xl font-bold mt-1">{stats.totalIngredients}</p>
          </CardContent>
        </Card>
      </div>

      {/* Seasonal Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            🌿 Seasonal Calendar — {monthNames[currentMonth]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            In-season ingredients for this month:
          </p>
          <div className="flex flex-wrap gap-2">
            {(seasonalSuggestions[currentMonth] || []).map((item) => (
              <Badge key={item} variant="secondary" className="text-sm py-1 px-3">
                {item}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
