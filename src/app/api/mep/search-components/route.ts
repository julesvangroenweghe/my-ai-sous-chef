import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = createAdminClient();

  // Step 1: Find matching components
  const { data: components, error: compError } = await supabase
    .from('mep_components')
    .select('id, component_name, quantity, unit, preparation, supplier, component_group, dish_id')
    .ilike('component_name', `%${q}%`)
    .limit(60);

  if (compError || !components?.length) {
    return NextResponse.json({ results: [] });
  }

  // Step 2: Fetch dishes for these components
  const dishIds = [...new Set(components.map((c) => c.dish_id).filter(Boolean))];
  const { data: dishes } = await supabase
    .from('mep_dishes')
    .select('id, title, category, event_id')
    .in('id', dishIds);

  const dishMap = new Map((dishes || []).map((d) => [d.id, d]));

  // Step 3: Fetch events for these dishes
  const eventIds = [...new Set((dishes || []).map((d) => d.event_id).filter(Boolean))];
  const { data: events } = await supabase
    .from('events')
    .select('id, name, event_date')
    .in('id', eventIds);

  const eventMap = new Map((events || []).map((e) => [e.id, e]));

  // Step 4: Assemble results
  const results = components
    .map((c) => {
      const dish = dishMap.get(c.dish_id);
      const event = dish ? eventMap.get(dish.event_id) : null;
      return {
        component_id: c.id,
        component_name: c.component_name,
        quantity: c.quantity,
        unit: c.unit,
        preparation: c.preparation,
        supplier: c.supplier,
        component_group: c.component_group,
        dish_title: dish?.title ?? '',
        category: dish?.category ?? '',
        event_name: event?.name ?? '',
        event_date: event?.event_date ?? '',
      };
    })
    // Sort: most recent first
    .sort((a, b) => (a.event_date < b.event_date ? 1 : a.event_date > b.event_date ? -1 : 0));

  return NextResponse.json({ results });
}
