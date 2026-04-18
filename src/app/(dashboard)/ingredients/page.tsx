'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, Pencil, Check, X, ChevronDown, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useIngredients } from '@/hooks/use-ingredients'
import type { Ingredient, IngredientPrice } from '@/types/database'

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<Ingredient>>({})
  const [priceHistoryId, setPriceHistoryId] = useState<string | null>(null)
  const [priceHistory, setPriceHistory] = useState<IngredientPrice[]>([])

  // Add form state
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newSupplier, setNewSupplier] = useState('')

  const supabase = createClient()
  const { createIngredient, updateIngredient, getPriceHistory } = useIngredients()
  const { addToast } = useToast()

  const loadIngredients = async () => {
    const { data } = await supabase.from('ingredients').select('*').order('name')
    if (data) setIngredients(data as Ingredient[])
    setLoading(false)
  }

  useEffect(() => { loadIngredients() }, [])

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(ingredients.map((i) => i.category).filter(Boolean) as string[])
    return Array.from(cats).sort()
  }, [ingredients])

  const filtered = useMemo(() => {
    return ingredients.filter((i) => {
      const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
        (i.category || '').toLowerCase().includes(search.toLowerCase()) ||
        (i.supplier || '').toLowerCase().includes(search.toLowerCase())
      const matchesCat = !categoryFilter || i.category === categoryFilter
      return matchesSearch && matchesCat
    })
  }, [ingredients, search, categoryFilter])

  const handleAdd = async () => {
    const result = await createIngredient({
      name: newName,
      category: newCategory || undefined,
      unit: newUnit || undefined,
      current_price: newPrice ? Number(newPrice) : undefined,
      supplier: newSupplier || undefined,
    })
    if (result.success) {
      addToast({ title: 'Ingredient added', variant: 'success' })
      setShowAdd(false)
      setNewName(''); setNewCategory(''); setNewUnit(''); setNewPrice(''); setNewSupplier('')
      loadIngredients()
    } else {
      addToast({ title: 'Error', description: result.error, variant: 'destructive' })
    }
  }

  const startEdit = (ing: Ingredient) => {
    setEditingId(ing.id)
    setEditValues({
      name: ing.name,
      category: ing.category,
      unit: ing.unit,
      current_price: ing.current_price,
      supplier: ing.supplier,
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    const result = await updateIngredient(editingId, editValues)
    if (result.success) {
      addToast({ title: 'Ingredient updated', variant: 'success' })
      setEditingId(null)
      loadIngredients()
    }
  }

  const showHistory = async (ingredientId: string) => {
    setPriceHistoryId(ingredientId)
    const history = await getPriceHistory(ingredientId, 5)
    setPriceHistory(history)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ingredients</h1>
          <p className="text-muted-foreground text-sm mt-1">{ingredients.length} ingredients in your kitchen</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Ingredient
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search ingredients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-40">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-medium p-3 pl-4">Name</th>
                    <th className="text-left font-medium p-3">Category</th>
                    <th className="text-left font-medium p-3">Unit</th>
                    <th className="text-right font-medium p-3">Price</th>
                    <th className="text-left font-medium p-3">Supplier</th>
                    <th className="text-left font-medium p-3">Updated</th>
                    <th className="text-right font-medium p-3 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ing) => {
                    const isEditing = editingId === ing.id

                    if (isEditing) {
                      return (
                        <tr key={ing.id} className="border-b bg-orange-50/50">
                          <td className="p-2 pl-4">
                            <Input
                              value={editValues.name || ''}
                              onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                              className="h-8 text-sm"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={editValues.category || ''}
                              onChange={(e) => setEditValues({ ...editValues, category: e.target.value })}
                              className="h-8 text-sm"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={editValues.unit || ''}
                              onChange={(e) => setEditValues({ ...editValues, unit: e.target.value })}
                              className="h-8 text-sm w-20"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={editValues.current_price ?? ''}
                              onChange={(e) => setEditValues({ ...editValues, current_price: Number(e.target.value) })}
                              className="h-8 text-sm w-24 text-right"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={editValues.supplier || ''}
                              onChange={(e) => setEditValues({ ...editValues, supplier: e.target.value })}
                              className="h-8 text-sm"
                            />
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">—</td>
                          <td className="p-2 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={saveEdit} className="h-7 w-7">
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setEditingId(null)} className="h-7 w-7">
                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    }

                    return (
                      <tr key={ing.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-3 pl-4 font-medium">{ing.name}</td>
                        <td className="p-3">
                          {ing.category ? <Badge variant="secondary" className="text-xs">{ing.category}</Badge> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="p-3 text-muted-foreground">{ing.unit || '—'}</td>
                        <td className="p-3 text-right">
                          {ing.current_price ? (
                            <span className="font-semibold">{formatCurrency(ing.current_price)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">{ing.supplier || '—'}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {ing.last_updated ? formatDate(ing.last_updated) : '—'}
                        </td>
                        <td className="p-3 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => showHistory(ing.id)} className="h-7 w-7" title="Price history">
                              <History className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => startEdit(ing)} className="h-7 w-7" title="Edit">
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                {search || categoryFilter ? 'No ingredients match your filters.' : 'No ingredients yet.'}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogHeader><DialogTitle>Add Ingredient</DialogTitle></DialogHeader>
        <DialogContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Zeebaarsfilet" />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Fish" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="e.g. kg" />
            </div>
            <div className="space-y-2">
              <Label>Price per Unit (€)</Label>
              <Input type="number" step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="e.g. 28.50" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Supplier</Label>
            <Input value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} placeholder="e.g. De Vis Groothandel" />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!newName}>Add Ingredient</Button>
        </DialogFooter>
      </Dialog>

      {/* Price History Dialog */}
      <Dialog open={!!priceHistoryId} onOpenChange={() => setPriceHistoryId(null)}>
        <DialogHeader>
          <DialogTitle>Price History</DialogTitle>
        </DialogHeader>
        <DialogContent>
          {priceHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No price history recorded.</p>
          ) : (
            <div className="space-y-2">
              {priceHistory.map((ph) => (
                <div key={ph.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-semibold text-sm">{formatCurrency(ph.price)}</p>
                    <p className="text-xs text-muted-foreground">{ph.source || 'Unknown source'}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(ph.recorded_at)}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPriceHistoryId(null)}>Close</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
