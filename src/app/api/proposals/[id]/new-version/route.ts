// /api/proposals/[id]/new-version/route.ts
// POST → kloon huidig voorstel als V(n+1), neem items over, voeg feedback toe als context
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const proposalId = params.id

  // Origineel voorstel + items ophalen
  const { data: original, error: origError } = await supabase
    .from('saved_menus')
    .select('*, items:saved_menu_items(*)')
    .eq('id', proposalId)
    .single()

  if (origError || !original) {
    return NextResponse.json({ error: 'Voorstel niet gevonden' }, { status: 404 })
  }

  // Volgende revisienummer
  const { data: latest } = await supabase
    .from('saved_menus')
    .select('revision_number')
    .eq('event_id', original.event_id)
    .order('revision_number', { ascending: false })
    .limit(1)
    .single()

  const nextRevision = (latest?.revision_number || original.revision_number || 1) + 1

  // Event requirements: voeg feedback toe als context voor de AI
  const originalReqs = original.event_requirements || {}
  const updatedReqs = {
    ...originalReqs,
    previous_feedback: original.client_feedback || originalReqs.previous_feedback || '',
    previous_version: original.revision_number,
    concept_note: undefined, // reset concept note voor nieuwe versie
    chef_note: undefined,
  }

  // Nieuw voorstel aanmaken
  const { data: newProposal, error: createError } = await supabase
    .from('saved_menus')
    .insert({
      kitchen_id: original.kitchen_id,
      created_by: user.id,
      event_id: original.event_id,
      name: `Voorstel V${nextRevision}`,
      menu_type: original.menu_type,
      num_persons: original.num_persons,
      price_per_person: original.price_per_person,
      target_food_cost_pct: original.target_food_cost_pct,
      season: original.season,
      status: 'draft',
      proposal_status: 'draft',
      revision_number: nextRevision,
      event_requirements: updatedReqs,
    })
    .select()
    .single()

  if (createError || !newProposal) {
    return NextResponse.json({ error: createError?.message || 'Create failed' }, { status: 500 })
  }

  // Items overnemen van origineel
  if (original.items && original.items.length > 0) {
    await supabase.from('saved_menu_items').insert(
      original.items.map((item: any) => ({
        menu_id: newProposal.id,
        course: item.course,
        dish_name: item.dish_name,
        dish_description: item.dish_description,
        source_type: item.source_type,
        cost_per_person: item.cost_per_person,
        sort_order: item.sort_order,
      }))
    )
  }

  return NextResponse.json({ id: newProposal.id, revision_number: nextRevision })
}
