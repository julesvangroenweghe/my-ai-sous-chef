import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const body = await request.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch the invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single()

  if (invoiceError || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  // Update invoice with confirmed supplier/date if provided
  const updateData: Record<string, unknown> = {
    ocr_status: 'completed',
    updated_at: new Date().toISOString(),
  }
  if (body.supplier_name) updateData.supplier_name = body.supplier_name
  if (body.invoice_date) updateData.invoice_date = body.invoice_date

  // Calculate total from line items
  const lineItems = body.line_items || body.matched_items || []
  const totalAmount = lineItems.reduce(
    (sum: number, item: any) => sum + (item.total || item.price * (item.quantity || 1) || 0),
    0
  )
  if (totalAmount > 0) updateData.total_amount = totalAmount

  // Store confirmed OCR data
  if (body.line_items) {
    const ocrData = (invoice.ocr_data as Record<string, unknown>) || {}
    updateData.ocr_data = { ...ocrData, line_items: body.line_items, confirmed: true }
  }

  await supabase.from('invoices').update(updateData).eq('id', id)

  // Process matched items — create price entries and update ingredient prices
  const priceUpdates: Array<{ ingredient_id: string; price: number; source: string }> = []

  for (const item of lineItems) {
    const ingredientId = item.matched_ingredient_id || item.ingredient_id
    const price = item.unit_price || item.price
    const source = body.supplier_name || invoice.supplier_name || 'Invoice'

    if (ingredientId && price) {
      priceUpdates.push({ ingredient_id: ingredientId, price, source })
    }
  }

  // Insert price history entries
  if (priceUpdates.length > 0) {
    const priceEntries = priceUpdates.map((p) => ({
      ingredient_id: p.ingredient_id,
      price: p.price,
      source: p.source,
      invoice_id: id,
      recorded_at: new Date().toISOString(),
    }))

    await supabase.from('ingredient_prices').insert(priceEntries)

    // Update current price on ingredients
    for (const p of priceUpdates) {
      await supabase
        .from('ingredients')
        .update({
          current_price: p.price,
          supplier: p.source,
          last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', p.ingredient_id)
    }

    // Find affected recipes and flag them for recalculation
    const ingredientIds = priceUpdates.map((p) => p.ingredient_id)
    const { data: affectedComponents } = await supabase
      .from('recipe_component_ingredients')
      .select('component_id, ingredient_id')
      .in('ingredient_id', ingredientIds)

    if (affectedComponents && affectedComponents.length > 0) {
      const componentIds = [...new Set(affectedComponents.map((c) => c.component_id))]
      const { data: components } = await supabase
        .from('recipe_components')
        .select('recipe_id')
        .in('id', componentIds)

      if (components) {
        const recipeIds = [...new Set(components.map((c) => c.recipe_id))]

        // Create Jules suggestion for affected recipes
        const { data: chef } = await supabase
          .from('chef_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (chef && recipeIds.length > 0) {
          const { data: recipes } = await supabase
            .from('recipes')
            .select('id, name')
            .in('id', recipeIds)

          await supabase.from('jules_suggestions').insert({
            chef_id: chef.id,
            kitchen_id: invoice.kitchen_id,
            suggestion_type: 'cost_alert',
            title: `Prices updated: ${priceUpdates.length} ingredients`,
            body: `Invoice from ${body.supplier_name || invoice.supplier_name || 'supplier'} confirmed. ${recipeIds.length} recipe(s) may need cost recalculation.`,
            data: {
              invoice_id: id,
              updated_ingredients: priceUpdates.map((p) => p.ingredient_id),
              affected_recipes: recipes?.map((r) => r.name) || [],
              recipe_ids: recipeIds,
              suggested_action: 'Recalculate costs for affected recipes to ensure food cost accuracy.',
            },
            priority: 'high',
            status: 'pending',
          })
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    invoice_id: id,
    prices_updated: priceUpdates.length,
  })
}
