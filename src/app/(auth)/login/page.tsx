'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChefHat, Mail, Lock, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/recipes')
      router.refresh()
    }
  }

  const handleMagicLink = async () => {
    if (!email) { setError('Please enter your email first'); return }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/callback` },
    })
    if (error) {
      setError(error.message)
    } else {
      setMagicLinkSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sidebar to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-sidebar-accent/20 rounded-2xl mb-4">
            <ChefHat className="h-8 w-8 text-sidebar-accent" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back, Chef</h1>
          <p className="text-slate-400 mt-1">Sign in to your kitchen</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {magicLinkSent ? (
            <div className="text-center py-4">
              <Mail className="h-12 w-12 text-sidebar-accent mx-auto mb-4" />
              <h2 className="text-lg font-semibold">Check your email</h2>
              <p className="text-muted-foreground mt-2">
                We sent a magic link to <strong>{email}</strong>
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="email">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sidebar-accent"
                    placeholder="chef@kitchen.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sidebar-accent"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-sidebar-accent hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign In
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleMagicLink}
                disabled={loading}
                className="w-full py-2.5 border border-sidebar-accent text-sidebar-accent hover:bg-sidebar-accent/5 font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                Send Magic Link
              </button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-sidebar-accent hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
