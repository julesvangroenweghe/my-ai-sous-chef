import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { MepPdfDocument } from '@/components/mep/mep-pdf-document'
import React from 'react'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = await createClient()
    const { eventId } = params

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    // Get event data
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, event_date, num_persons, event_type, location, price_per_person')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event niet gevonden' }, { status: 404 })
    }

    const numPersons = event.num_persons || 0

    // Get menu items with full recipe/component/ingredient data
    const { data: menuItems, error: menuError } = await supabase
      .from('event_menu_items')
      .select(
        `
        id, course, course_order,
        recipe:recipes(
          id, name, total_cost_per_serving, serving_size_grams,
          components:recipe_components(
            id, name,
            ingredients:recipe_component_ingredients(
              id, quantity_per_person, unit, cost_per_unit,
              ingredient:ingredients(id, name)
            )
          )
        )
      `
      )
      .eq('event_id', eventId)
      .order('course_order')

    if (menuError) {
      console.error('MEP PDF query error:', menuError)
      return NextResponse.json({ error: 'Fout bij laden menu' }, { status: 500 })
    }

    // Build courses
    const courses = ((menuItems || []) as any[])
      .map((item: any) => {
        const recipe = item.recipe
        if (!recipe) return null

        const components = ((recipe.components || []) as any[]).map((component: any) => {
          const ingredients = ((component.ingredients || []) as any[]).map((rci: any) => {
            const qpp = Number(rci.quantity_per_person) || 0
            const unit = (rci.unit || 'g').toLowerCase()

            let totalQuantity: number
            if (unit === 'kg' || unit === 'l') {
              totalQuantity = Math.round((qpp / 1000) * numPersons * 100) / 100
            } else {
              totalQuantity = Math.round(qpp * numPersons * 100) / 100
            }

            return {
              ingredient_name: rci.ingredient?.name || 'Onbekend',
              quantity_per_person: qpp,
              total_quantity: totalQuantity,
              unit,
              cost_per_unit: Number(rci.cost_per_unit) || 0,
            }
          })

          return {
            component_name: component.name,
            ingredients,
          }
        })

        const costPerPerson = Number(recipe.total_cost_per_serving) || 0
        const totalCost = costPerPerson * numPersons

        return {
          course: item.course || `Gang ${item.course_order}`,
          course_order: item.course_order,
          recipe_id: recipe.id,
          recipe_name: recipe.name,
          cost_per_person: costPerPerson,
          total_cost: totalCost,
          components,
        }
      })
      .filter(Boolean)

    const totalFoodCostPerPerson = courses.reduce(
      (sum: number, c: any) => sum + c.cost_per_person,
      0
    )
    const totalFoodCost = totalFoodCostPerPerson * numPersons
    const revenue = (Number(event.price_per_person) || 0) * numPersons
    const foodCostPercentage = revenue > 0 ? (totalFoodCost / revenue) * 100 : 0

    const mepData = {
      event: {
        name: event.name,
        event_date: event.event_date,
        num_persons: numPersons,
        event_type: event.event_type,
        location: event.location,
        price_per_person: event.price_per_person,
      },
      courses,
      totals: {
        food_cost_per_person: Math.round(totalFoodCostPerPerson * 100) / 100,
        total_food_cost: Math.round(totalFoodCost * 100) / 100,
        food_cost_percentage: Math.round(foodCostPercentage * 10) / 10,
      },
    }

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(MepPdfDocument, { data: mepData })
    )

    const eventNameSlug = event.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 40)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="mep-${eventNameSlug}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('MEP PDF error:', error)
    return NextResponse.json({ error: 'PDF generatie mislukt' }, { status: 500 })
  }
}
