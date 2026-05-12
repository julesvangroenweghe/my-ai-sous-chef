'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { X, Send, ChefHat, Loader2, Sparkles } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const GENERAL_ACTIONS = [
  { label: 'Seizoen mei', prompt: 'Welke ingrediënten zijn nu in seizoen in mei in België? Geef een overzicht per categorie.' },
  { label: 'Food cost check', prompt: 'Hoe bereken ik de food cost van een gerecht? Geef een praktisch voorbeeld.' },
  { label: 'MEP planning', prompt: 'Wat zijn de belangrijkste mise-en-place taken voor een walking dinner van 50 personen?' },
  { label: 'Techniek: sous vide', prompt: 'Geef me de sous vide parameters voor gevogelte (kip, parelhoen, eend).' },
]

const MEP_ACTIONS = [
  { label: '➕ Mignardises', prompt: 'Voeg mignardises toe met standaard componenten (canelé, madeleine, financier)' },
  { label: '➕ Brood & boter', prompt: 'Voeg brood & boter toe (artisanaal zuurdesembrood, roomboter, fleur de sel)' },
  { label: '📋 Samenvatting', prompt: 'Geef een korte samenvatting van alle gerechten en componenten op deze MEP' },
  { label: '🔍 Check compleet', prompt: 'Check of de MEP compleet is: zijn er categorieën die missen? Zijn er gerechten zonder componenten?' },
]

export default function JulesAI() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Detect MEP detail page
  const mepMatch = pathname?.match(/\/mep\/([a-f0-9-]{36})$/)
  const eventId = mepMatch?.[1] || null
  const isMepMode = !!eventId

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

  // Reset messages when navigating to different event
  useEffect(() => {
    setMessages([])
  }, [eventId])

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setLoading(true)
    setStreamText('')

    abortRef.current = new AbortController()

    try {
      if (isMepMode) {
        // MEP edit mode — non-streaming, tool use
        const res = await fetch('/api/mep/ai-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: newMessages, eventId }),
          signal: abortRef.current.signal,
        })

        if (!res.ok) {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Er ging iets mis. Probeer opnieuw.' }])
          setLoading(false)
          return
        }

        const data = await res.json()
        const reply = data.response || 'Klaar!'
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])

        // If mutations were made, refresh the page
        if (data.mutationsCount > 0) {
          // Trigger a reload of the page data
          router.refresh()
          // Also dispatch a custom event that the detail page can listen to
          window.dispatchEvent(new CustomEvent('mep-data-updated'))
        }
      } else {
        // General chat mode — streaming
        const res = await fetch('/api/jules/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: newMessages }),
          signal: abortRef.current.signal,
        })

        if (!res.ok || !res.body) {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Er ging iets mis. Probeer opnieuw.' }])
          setLoading(false)
          return
        }

        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let accumulated = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue
                try {
                  const parsed = JSON.parse(data)
                  const delta = parsed.delta?.text || parsed.choices?.[0]?.delta?.content || ''
                  accumulated += delta
                  setStreamText(accumulated)
                } catch {
                  accumulated += data
                  setStreamText(accumulated)
                }
              }
            }
          }
          setMessages(prev => [...prev, { role: 'assistant', content: accumulated }])
          setStreamText('')
        } else {
          const data = await res.json()
          const reply = data.response || data.content || data.message || 'Geen antwoord'
          setMessages(prev => [...prev, { role: 'assistant', content: reply }])
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Verbindingsfout. Controleer je internet.' }])
      }
    }
    setLoading(false)
    setStreamText('')
  }

  const quickActions = isMepMode ? MEP_ACTIONS : GENERAL_ACTIONS

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          open ? 'bg-[#FDF8F2] rotate-12' : isMepMode ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-brand-700 hover:bg-brand-600'
        }`}
        style={{ bottom: '24px', right: '24px' }}
        title={isMepMode ? 'MEP Assistent' : 'Jules AI'}
      >
        {open ? <X className="w-5 h-5 text-[#2C1810]" /> : isMepMode ? <Sparkles className="w-5 h-5 text-white" /> : <ChefHat className="w-5 h-5 text-[#2C1810]" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-[400px] max-h-[600px] flex flex-col bg-[#FAFAF8] border border-[#E8D5B5] rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E8D5B5] bg-white/90">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isMepMode ? 'bg-emerald-600' : 'bg-brand-700'}`}>
              {isMepMode ? <Sparkles className="w-4 h-4 text-white" /> : <ChefHat className="w-4 h-4 text-[#2C1810]" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[#2C1810]">
                {isMepMode ? 'MEP Assistent' : 'Jules AI'}
              </div>
              <div className="text-[10px] text-[#B8997A] truncate">
                {isMepMode ? '✏️ Zeg wat je wilt aanpassen' : 'Culinaire assistent'}
              </div>
            </div>
            {isMepMode && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-medium rounded-full">
                MEP MODE
              </span>
            )}
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white text-[#B8997A] hover:text-[#5C4730] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.length === 0 && !loading && (
              <div className="space-y-3">
                <p className="text-xs text-[#B8997A] text-center pt-2">
                  {isMepMode
                    ? 'Zeg wat je wilt aanpassen — ik doe het direct in de database'
                    : 'Stel een vraag of kies een snelle actie'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((qa, i) => (
                    <button
                      key={i}
                      onClick={() => send(qa.prompt)}
                      className="px-3 py-2.5 bg-white hover:bg-white border border-[#E8D5B5] hover:border-[#E8D5B5] rounded-xl text-xs text-[#9E7E60] hover:text-[#3D2810] text-left transition-all"
                    >
                      {qa.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-brand-700 text-[#2C1810] rounded-br-md'
                    : 'bg-white border border-[#E8D5B5] text-[#3D2810] rounded-bl-md'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {/* Streaming */}
            {streamText && (
              <div className="flex justify-start">
                <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-md bg-white border border-[#E8D5B5] text-[#3D2810] text-xs leading-relaxed whitespace-pre-wrap">
                  {streamText}
                  <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-brand-500 animate-pulse rounded-sm" />
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && !streamText && (
              <div className="flex justify-start">
                <div className="px-3 py-2 bg-white border border-[#E8D5B5] rounded-2xl rounded-bl-md flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-[#B8997A] animate-spin" />
                  <span className="text-[10px] text-[#B8997A]">
                    {isMepMode ? 'Bezig met aanpassen...' : 'Denken...'}
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-[#E8D5B5]">
            <div className="flex items-center gap-2 bg-white border border-[#E8D5B5] rounded-xl px-3 py-2 focus-within:border-brand-600 transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder={isMepMode ? 'bv. "voeg mignardises toe" of "makreel naar 15g"' : 'Stel een vraag...'}
                className="flex-1 bg-transparent text-sm text-[#3D2810] placeholder:text-[#B8997A] outline-none"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 ${
                  isMepMode ? 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-200' : 'bg-brand-700 hover:bg-brand-600 disabled:bg-white'
                }`}
              >
                <Send className={`w-3.5 h-3.5 ${isMepMode ? 'text-white' : 'text-[#2C1810]'}`} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
