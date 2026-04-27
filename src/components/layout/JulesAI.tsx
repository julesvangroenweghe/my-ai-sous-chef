'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, ChefHat, Loader2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_ACTIONS = [
  { label: 'Seizoen april', prompt: 'Welke ingrediënten zijn nu in seizoen in april in België? Geef een overzicht per categorie.' },
  { label: 'Food cost check', prompt: 'Hoe bereken ik de food cost van een gerecht? Geef een praktisch voorbeeld.' },
  { label: 'MEP planning', prompt: 'Wat zijn de belangrijkste mise-en-place taken voor een walking dinner van 50 personen?' },
  { label: 'Techniek: sous vide', prompt: 'Geef me de sous vide parameters voor gevogelte (kip, parelhoen, eend) — temperatuur, tijd en resultaat.' },
]

export default function JulesAI() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

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

      // Check if streaming
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          // Handle SSE format
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
        // Non-streaming JSON response
        const data = await res.json()
        const reply = data.response || data.content || data.message || 'Geen antwoord ontvangen'
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Verbindingsfout. Controleer je internet.' }])
      }
    }
    setLoading(false)
    setStreamText('')
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          open ? 'bg-[#FDF8F2] rotate-12' : 'bg-brand-700 hover:bg-brand-600'
        }`}
        title="Jules AI"
      >
        {open ? <X className="w-5 h-5 text-[#2C1810]" /> : <ChefHat className="w-5 h-5 text-[#2C1810]" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-[380px] max-h-[560px] flex flex-col bg-[#FAFAF8] border border-[#E8D5B5] rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E8D5B5] bg-white/90">
            <div className="w-7 h-7 rounded-lg bg-brand-700 flex items-center justify-center shrink-0">
              <ChefHat className="w-4 h-4 text-[#2C1810]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[#2C1810]">Jules AI</div>
              <div className="text-[10px] text-[#B8997A]">Culinaire assistent</div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white text-[#B8997A] hover:text-[#5C4730] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.length === 0 && !loading && (
              <div className="space-y-3">
                <p className="text-xs text-[#B8997A] text-center pt-2">Stel een vraag of kies een snelle actie</p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map((qa, i) => (
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
                <div className="px-3 py-2 bg-white border border-[#E8D5B5] rounded-2xl rounded-bl-md">
                  <Loader2 className="w-3.5 h-3.5 text-[#B8997A] animate-spin" />
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
                placeholder="Stel een vraag..."
                className="flex-1 bg-transparent text-sm text-[#3D2810] placeholder:text-[#5C4730] outline-none"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="w-7 h-7 rounded-lg bg-brand-700 disabled:bg-white flex items-center justify-center transition-colors hover:bg-brand-600 disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5 text-[#2C1810]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
