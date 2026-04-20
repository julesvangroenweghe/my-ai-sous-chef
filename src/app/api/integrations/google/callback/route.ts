import { createClient } from '@/lib/supabase/server'
import { decodeState, exchangeCodeForTokens, getUserEmail } from '@/lib/google'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (error) {
    return NextResponse.redirect(`${appUrl}/integrations?integration=error&message=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/integrations?integration=error&message=missing_params`)
  }

  try {
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(`${appUrl}/login`)
    }

    // Decode state to get kitchen_id
    const { kitchen_id } = decodeState(state)

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    if (!tokens.access_token) {
      throw new Error('No access token received')
    }

    // Get user email from Google
    const providerEmail = await getUserEmail(tokens.access_token)

    // Calculate token expiry
    const tokenExpiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString()

    // Upsert into kitchen_integrations
    // First check if an integration already exists for this kitchen + provider
    const { data: existing } = await supabase
      .from('kitchen_integrations')
      .select('id')
      .eq('kitchen_id', kitchen_id)
      .eq('provider', 'google')
      .single()

    if (existing) {
      // Update existing
      await supabase
        .from('kitchen_integrations')
        .update({
          provider_email: providerEmail,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || undefined,
          token_expires_at: tokenExpiresAt,
          scopes: tokens.scope?.split(' ') || [],
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      // Insert new
      await supabase
        .from('kitchen_integrations')
        .insert({
          kitchen_id: kitchen_id,
          provider: 'google',
          provider_email: providerEmail,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_expires_at: tokenExpiresAt,
          scopes: tokens.scope?.split(' ') || [],
          status: 'active',
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
    }

    return NextResponse.redirect(`${appUrl}/integrations?integration=success`)
  } catch (err) {
    console.error('Google OAuth callback error:', err)
    const message = err instanceof Error ? err.message : 'unknown_error'
    return NextResponse.redirect(`${appUrl}/integrations?integration=error&message=${encodeURIComponent(message)}`)
  }
}
