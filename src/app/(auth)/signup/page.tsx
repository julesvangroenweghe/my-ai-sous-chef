'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ChefHat, Mail, Lock, User, Loader2 } from 'lucide-react'

export default function SignupPage() {
 const [name, setName] = useState('')
 const [email, setEmail] = useState('')
 const [password, setPassword] = useState('')
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState<string | null>(null)
 const [success, setSuccess] = useState(false)
 const supabase = createClient()

 const handleSignup = async (e: React.FormEvent) => {
 e.preventDefault()
 setLoading(true)
 setError(null)

 const { error } = await supabase.auth.signUp({
 email,
 password,
 options: {
 emailRedirectTo: `${window.location.origin}/callback`,
 data: { name },
 },
 })

 if (error) {
 setError(error.message)
 } else {
 setSuccess(true)
 }
 setLoading(false)
 }

 return (
 <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-brand-950 flex items-center justify-center p-6">
 <div className="w-full max-w-md animate-fade-in">
 <div className="text-center mb-8">
 <div className="inline-flex p-3 bg-brand-500/20 rounded-2xl mb-4">
 <ChefHat className="h-8 w-8 text-brand-400" />
 </div>
 <h1 className="text-2xl font-display font-extrabold text-[#2C1810]">Word lid van de keuken</h1>
 <p className="text-[#9E7E60] mt-1">Maak je chef-profiel aan</p>
 </div>

 <div className="bg-white rounded-2xl shadow-diffusion-lg p-8">
 {success ? (
 <div className="text-center py-4">
 <Mail className="h-12 w-12 text-brand-500 mx-auto mb-4" />
 <h2 className="text-lg font-semibold font-display">Controleer je e-mail</h2>
 <p className="text-[#B8997A] mt-2">
 We hebben een bevestigingslink gestuurd naar <strong className="text-stone-900">{email}</strong>
 </p>
 </div>
 ) : (
 <form onSubmit={handleSignup} className="space-y-4">
 {error && (
 <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl border border-red-100">
 {error}
 </div>
 )}

 <div className="space-y-2">
 <label className="text-sm font-medium text-stone-700" htmlFor="name">Chef naam</label>
 <div className="relative">
 <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E7E60]" />
 <input
 id="name"
 type="text"
 value={name}
 onChange={(e) => setName(e.target.value)}
 className="input-premium pl-10"
 placeholder="Chef Jules"
 required
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-sm font-medium text-stone-700" htmlFor="email">E-mail</label>
 <div className="relative">
 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E7E60]" />
 <input
 id="email"
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="input-premium pl-10"
 placeholder="chef@kitchen.com"
 required
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-sm font-medium text-stone-700" htmlFor="password">Wachtwoord</label>
 <div className="relative">
 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E7E60]" />
 <input
 id="password"
 type="password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 className="input-premium pl-10"
 placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
 minLength={6}
 required
 />
 </div>
 </div>

 <button
 type="submit"
 disabled={loading}
 className="btn-primary w-full disabled:opacity-50"
 >
 {loading && <Loader2 className="h-4 w-4 animate-spin" />}
 Account aanmaken
 </button>
 </form>
 )}

 <p className="text-center text-sm text-[#B8997A] mt-6">
 Heb je al een account?{' '}
 <Link href="/login" className="text-brand-600 hover:text-brand-700 hover:underline font-medium">
 Inloggen
 </Link>
 </p>
 </div>
 </div>
 </div>
 )
}
