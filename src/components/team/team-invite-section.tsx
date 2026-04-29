'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, X, Check, Clock, Mail, Loader2 } from 'lucide-react'

interface Invite {
  id: string
  email: string
  role: string
  accepted_at: string | null
  expires_at: string
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Eigenaar',
  chef: 'Chef',
  assistant: 'Assistent',
}

export function TeamInviteSection() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('assistant')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadInvites()
  }, [])

  const loadInvites = async () => {
    const res = await fetch('/api/team/invite')
    const data = await res.json()
    if (Array.isArray(data)) setInvites(data)
    setLoading(false)
  }

  const sendInvite = async () => {
    if (!email.trim()) return
    setSending(true)
    setError('')
    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), role }),
    })
    const data = await res.json()
    if (data.ok) {
      setSent(true)
      setEmail('')
      setShowForm(false)
      await loadInvites()
      setTimeout(() => setSent(false), 3000)
    } else {
      setError(data.error || 'Uitnodiging kon niet worden verstuurd')
    }
    setSending(false)
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center gap-2 text-[#9E7E60] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Laden...
        </div>
      ) : (
        <>
          {invites.length > 0 && (
            <div className="space-y-2">
              {invites.map(invite => (
                <div key={invite.id} className="flex items-center justify-between px-4 py-3 bg-[#FDFAF6] border border-[#E8D5B5] rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#F2E8D5] flex items-center justify-center">
                      <Mail className="w-4 h-4 text-[#9E7E60]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#2C1810]">{invite.email}</p>
                      <p className="text-xs text-[#B8997A]">{ROLE_LABELS[invite.role] || invite.role}</p>
                    </div>
                  </div>
                  <div>
                    {invite.accepted_at ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                        <Check className="w-3 h-3" /> Geaccepteerd
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" /> Wacht op acceptatie
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {invites.length === 0 && !showForm && (
            <p className="text-sm text-[#B8997A]">Nog geen teamleden uitgenodigd.</p>
          )}

          {showForm ? (
            <div className="bg-[#FDFAF6] border border-[#E8D5B5] rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-[#2C1810]">Teamlid uitnodigen</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendInvite()}
                  placeholder="e-mailadres"
                  className="flex-1 px-3 py-2 bg-white border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-amber-300"
                  autoFocus
                />
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="px-3 py-2 bg-white border border-[#E8D5B5] rounded-lg text-sm text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <option value="assistant">Assistent</option>
                  <option value="chef">Chef</option>
                </select>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={sendInvite}
                  disabled={sending || !email.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-[#2C1810] text-sm font-medium rounded-lg transition-all disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  Uitnodiging sturen
                </button>
                <button
                  onClick={() => { setShowForm(false); setEmail(''); setError('') }}
                  className="px-3 py-2 text-[#9E7E60] hover:text-[#2C1810] text-sm transition-colors"
                >
                  Annuleer
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#E8D5B5] hover:bg-[#FAF6EF] text-[#5C4730] text-sm font-medium rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" /> Teamlid uitnodigen
              </button>
              {sent && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <Check className="w-3.5 h-3.5" /> Uitnodiging verstuurd
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
