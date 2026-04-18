'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import type { Ingredient } from '@/types/database'

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newSupplier, setNewSupplier] = useState('')
  const supabase = createClient()

  const loadIngredients = async () => {
    const { data } = await supabase.from('ingredients').select('*').order('name')
    if (data) setIngredients(data)
    setLoading(false)
  }

  useEffect(() => { loadIngredients() }, [])

  const filtered = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.category || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = async () => {
    await supabase.from('ingredients').insert({
      name: newName,
      category: newCategory || null,
      unit_of_purchase: newUnit || null,
      default_unit_price: newPrice ? Number(newPrice) : null,
      supplier_name: newSupplier || null,
    })
    setShowAdd(false)
    setNewName(''); setNewCategory(''); setNewUnit(''); setNewPrice(''); setNewSupplier('')
    loadIngredients()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ingredients</h1>
          <p className="text-muted-foreground text-sm mt-1">{ingredients.length} ingredients</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Ingredient</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search ingredients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((ing) => (
            <Card key={ing.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="font-medium">{ing.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {ing.category && <Badge variant="secondary" className="text-xs">{ing.category}</Badge>}
                      {ing.supplier_name && <span className="text-xs text-muted-foreground">{ing.supplier_name}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {ing.default_unit_price ? (
                    <p className="font-semibold">{formatCurrency(ing.default_unit_price)}<span className="text-xs text-muted-foreground">/{ing.unit_of_purchase || 'unit'}</span></p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No price</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogHeader><DialogTitle>Add Ingredient</DialogTitle></DialogHeader>
        <DialogContent className="space-y-4">
          <div className="space-y-2"><Label>Name *</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Zeebaarsfilet" /></div>
          <div className="space-y-2"><Label>Category</Label><Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Fish" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Unit of Purchase</Label><Input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="e.g. kg" /></div>
            <div className="space-y-2"><Label>Price per Unit (€)</Label><Input type="number" step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="e.g. 28.50" /></div>
          </div>
          <div className="space-y-2"><Label>Supplier</Label><Input value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} placeholder="e.g. De Vis Groothandel" /></div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!newName}>Add Ingredient</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
