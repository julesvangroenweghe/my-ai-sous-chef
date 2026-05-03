import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip middleware entirely for API routes, static files, and public paths
  const skipPaths = [
    '/api',
    '/_next',
    '/favicon',
    '/login',
    '/signup',
    '/callback',
    '/onboarding',
  ]
  if (skipPaths.some((p) => pathname.startsWith(p)) || pathname === '/') {
    return NextResponse.next()
  }

  const response = await updateSession(request)

  // If updateSession already issued a redirect (e.g. to /login), honour it
  if (response.headers.get('location')) {
    return response
  }

  // Check onboarding completion status
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // Read-only in this context — session refresh handled by updateSession
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('chef_profiles')
      .select('onboarding_completed')
      .eq('auth_user_id', user.id)
      .single()

    // If profile exists and onboarding is explicitly false → redirect
    if (profile && profile.onboarding_completed === false) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
