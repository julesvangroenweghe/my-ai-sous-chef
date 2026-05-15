import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

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
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const body = await req.json();
  const { snapshot, changed_fields, status_from, status_to, note, kitchen_id } = body;

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
