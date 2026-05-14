// src/app/api/sales/deals/[id]/versions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createRouteHandlerClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { data, error } = await supabase
    .from('deal_versions')
    .select('*')
    .eq('deal_id', id)
    .order('version_number', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ versions: data || [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createRouteHandlerClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const body = await req.json();
  const { snapshot, changed_fields, status_from, status_to, note, kitchen_id } = body;

  // Haal huidig versienummer op
  const { data: lastVersion } = await supabase
    .from('deal_versions')
    .select('version_number')
    .eq('deal_id', id)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();

  const nextVersion = (lastVersion?.version_number || 0) + 1;

  const { data, error } = await supabase
    .from('deal_versions')
    .insert({
      deal_id: id,
      kitchen_id,
      version_number: nextVersion,
      snapshot,
      changed_fields,
      status_from,
      status_to,
      note,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ version: data });
}
