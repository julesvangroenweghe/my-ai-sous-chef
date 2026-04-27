import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
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

    const body = await request.json().catch(() => ({}))
    const newStatus = body.status || 'approved'

    const { error } = await supabase
      .from('events')
      .update({ status: newStatus })
      .eq('id', eventId)

    if (error) {
      return NextResponse.json({ error: 'Update mislukt: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error) {
    console.error('Approve API error:', error)
    return NextResponse.json({ error: 'Server fout' }, { status: 500 })
  }
}
