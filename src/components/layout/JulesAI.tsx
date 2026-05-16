'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { X, Send, ChefHat, Loader2, Sparkles, AlertTriangle, History, Plus, Trash2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Conversation {
  id: string
  title: string
  context: string | null
  context_id: string | null
  messages: Message[]
  updated_at: string
}

const GENERAL_ACTIONS = [
  { label: 'Seizoen mei', prompt: 'Welke ingrediënten zijn nu in seizoen in mei in België? Geef een overzicht per categorie.' },
  { label: 'Food cost', prompt: 'Hoe bereken ik de food cost van een gerecht? Geef een praktisch voorbeeld.' },
  { label: 'Sous vide gids', prompt: 'Geef me de sous vide parameters voor gevogelte: kip, parelhoen en eend.' },
  { label: 'Mise en place', prompt: 'Wat zijn de belangrijkste mise-en-place taken voor een walking dinner van 50 personen?' },
]

const MEP_ACTIONS = [
  { label: 'Brood & boter', prompt: 'Voeg brood & boter toe (artisanaal zuurdesembrood, roomboter, fleur de sel)' },
  { label: 'Mignardises', prompt: 'Voeg mignardises toe met standaard componenten (canelé, madeleine, financier)' },
  { label: 'Samenvatting', prompt: 'Geef een korte samenvatting van alle gerechten op deze MEP' },
  { label: 'Check volledigheid', prompt: 'Check of de MEP compleet is: missen er categorieën? Zijn er gerechten zonder componenten?' },
]

type Tab = 'chat' | 'history'

export default function JulesAI() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('chat')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [currentConvId, setCurrentConvId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mepMatch = pathname?.match(/\/mep\/([a-f0-9-]{36})$/)
  const eventId = mepMatch?.[1] || null
  const isMepMode = !!eventId

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (open && tab === 'chat' && inputRef.current) inputRef.current.focus()
  }, [open, tab])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

  useEffect(() => {
    setMessages([])
    setWarnings([])
    setCurrentConvId(null)
  }, [eventId])

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/ai-conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch { /* silent */ }
    setLoadingHistory(false)
  }, [])

  useEffect(() => {
    if (tab === 'history') loadHistory()
  }, [tab, loadHistory])

  const saveConversation = useCallback(async (msgs: Message[], convId: string | null) => {
    if (msgs.length < 2) return
    const title = msgs.find(m => m.role === 'user')?.content?.slice(0, 60) || 'Gesprek'
    try {
      if (convId) {
        await fetch(`/api/ai-conversations/${convId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: msgs, title }),
        })
      } else {
        const res = await fetch('/api/ai-conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: msgs, title,
            context: isMepMode ? 'mep' : 'general',
            context_id: eventId || null,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          setCurrentConvId(data.id)
        }
      }
    } catch { /* silent */ }
  }, [isMepMode, eventId])

  const handleFileUpload = async (file: File) => {
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    
    const userMsg: Message = { role: 'user', content: `[Bestand geüpload: ${file.name}]` }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)
    
    try {
      const res = await fetch('/api/jules/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        const reply = `**${data.filename}** geanalyseerd:\n\n${data.analysis}`
        const finalMsgs = [...newMessages, { role: 'assistant' as const, content: reply }]
        setMessages(finalMsgs)
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => saveConversation(finalMsgs, currentConvId), 1500)
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Kon bestand niet analyseren.' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Upload mislukt.' }])
    }
    setUploading(false)
    setLoading(false)
    setUploadFile(null)
  }

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
        const res = await fetch('/api/mep/ai-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: newMessages, eventId }),
          signal: abortRef.current.signal,
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          const finalMsgs = [...newMessages, { role: 'assistant' as const, content: errData.error || 'Er ging iets mis.' }]
          setMessages(finalMsgs)
          setLoading(false)
          return
        }
        const data = await res.json()
        const reply = data.response || 'Klaar!'
        const finalMsgs = [...newMessages, { role: 'assistant' as const, content: reply }]
        setMessages(finalMsgs)
        if (data.warnings?.length) setWarnings(data.warnings)
        if (data.mutationsCount > 0) {
          router.refresh()
          window.dispatchEvent(new CustomEvent('mep-data-updated'))
        }
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => saveConversation(finalMsgs, currentConvId), 1500)
      } else {
        const res = await fetch('/api/jules/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: newMessages }),
          signal: abortRef.current.signal,
        })
        if (!res.ok || !res.body) {
          const finalMsgs = [...newMessages, { role: 'assistant' as const, content: 'Er ging iets mis. Probeer opnieuw.' }]
          setMessages(finalMsgs)
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
            for (const line of chunk.split('\n')) {
              if (line.startsWith('data: ')) {
                const d = line.slice(6)
                if (d === '[DONE]') continue
                try {
                  const parsed = JSON.parse(d)
                  const delta = parsed.delta?.text || parsed.choices?.[0]?.delta?.content || ''
                  accumulated += delta
                  setStreamText(accumulated)
                } catch {
                  accumulated += d
                  setStreamText(accumulated)
                }
              }
            }
          }
          const finalMsgs = [...newMessages, { role: 'assistant' as const, content: accumulated }]
          setMessages(finalMsgs)
          setStreamText('')
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
          saveTimerRef.current = setTimeout(() => saveConversation(finalMsgs, currentConvId), 1500)
        } else {
          const data = await res.json()
          const reply = data.response || data.content || data.message || 'Geen antwoord'
          const finalMsgs = [...newMessages, { role: 'assistant' as const, content: reply }]
          setMessages(finalMsgs)
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
          saveTimerRef.current = setTimeout(() => saveConversation(finalMsgs, currentConvId), 1500)
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

  const loadConversation = (conv: Conversation) => {
    setMessages(conv.messages)
    setCurrentConvId(conv.id)
    setTab('chat')
  }

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await fetch(`/api/ai-conversations/${id}`, { method: 'DELETE' })
    setConversations(prev => prev.filter(c => c.id !== id))
    if (currentConvId === id) { setMessages([]); setCurrentConvId(null) }
  }

  const startNewConversation = () => {
    setMessages([])
    setCurrentConvId(null)
    setWarnings([])
    setTab('chat')
  }

  const quickActions = isMepMode ? MEP_ACTIONS : GENERAL_ACTIONS

  // Jules AI knop: rechtsonder, boven eventueel keyboard op mobile
  // Panel: op mobile bijna full-screen, op desktop vaste breedte
  const BTN_BOTTOM = isMobile ? 20 : 28
  const BTN_RIGHT = isMobile ? 20 : 24
  const PANEL_BOTTOM = isMobile ? 76 : 84  // net boven de knop

  const accentColor = isMepMode ? '#065F46' : '#2C3E2D'

  return (
    <>
      {/* Floating button — rechts, Scan staat links op mobile */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={isMepMode ? 'MEP Assistent' : 'Jules AI'}
        style={{
          position: 'fixed',
          bottom: BTN_BOTTOM,
          right: BTN_RIGHT,
          zIndex: 50,
          width: 48, height: 48,
          borderRadius: '50%',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
          backgroundColor: open ? '#FDF8F2' : accentColor,
          transition: 'all 200ms ease',
        }}
      >
        {open
          ? <X style={{ width: 20, height: 20, color: '#2C1810' }} />
          : isMepMode
            ? <Sparkles style={{ width: 20, height: 20, color: 'white' }} />
            : <ChefHat style={{ width: 20, height: 20, color: 'white' }} />
        }
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: PANEL_BOTTOM,
            // Mobile: full-width met kleine marge; Desktop: vaste breedte rechts
            ...(isMobile
              ? { left: 8, right: 8, maxHeight: 'calc(100dvh - 100px)' }
              : { right: 24, width: 420, maxHeight: 640 }
            ),
            zIndex: 49,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#FAFAF8',
            border: '1px solid #E8D5B5',
            borderRadius: 16,
            boxShadow: '0 8px 40px rgba(44,24,16,0.18)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px', borderBottom: '1px solid #E8D5B5',
            backgroundColor: isMepMode ? '#065F46' : '#FFFFFF',
            flexShrink: 0,
          }}>
            <button
              onClick={() => setTab('chat')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 8, border: 'none',
                backgroundColor: tab === 'chat' ? (isMepMode ? '#059669' : '#F2E8D5') : 'transparent',
                color: isMepMode ? 'white' : (tab === 'chat' ? '#2C1810' : '#9E7E60'),
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {isMepMode
                ? <Sparkles style={{ width: 13, height: 13 }} />
                : <ChefHat style={{ width: 13, height: 13 }} />
              }
              {isMepMode ? 'MEP' : 'Jules AI'}
            </button>

            <button
              onClick={() => setTab('history')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 8, border: 'none',
                backgroundColor: tab === 'history' ? (isMepMode ? '#059669' : '#F2E8D5') : 'transparent',
                color: isMepMode ? 'white' : (tab === 'history' ? '#2C1810' : '#9E7E60'),
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <History style={{ width: 13, height: 13 }} />
              Gesprekken
            </button>

            <div style={{ flex: 1 }} />

            {tab === 'chat' && messages.length > 0 && (
              <button
                onClick={startNewConversation}
                style={{
                  padding: '4px 8px', borderRadius: 7, border: 'none',
                  backgroundColor: isMepMode ? 'rgba(255,255,255,0.15)' : '#F2E8D5',
                  color: isMepMode ? 'white' : '#9E7E60',
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <Plus style={{ width: 12, height: 12 }} />
                Nieuw
              </button>
            )}

            <button
              onClick={() => setOpen(false)}
              style={{
                padding: 4, borderRadius: 7, border: 'none',
                backgroundColor: 'transparent', cursor: 'pointer',
                color: isMepMode ? 'rgba(255,255,255,0.7)' : '#B8997A',
              }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && tab === 'chat' && messages.length > 0 && (
            <div style={{ padding: '8px 12px', backgroundColor: '#FFFBEB', borderBottom: '1px solid #FDE68A', flexShrink: 0 }}>
              {warnings.map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: '#92400E' }}>
                  <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0, marginTop: 1 }} />
                  <span>{w.replace('⚠️ ', '')}</span>
                </div>
              ))}
            </div>
          )}

          {/* CHAT TAB */}
          {tab === 'chat' && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.length === 0 && !loading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ fontSize: 11, color: '#B8997A', textAlign: 'center', paddingTop: 8 }}>
                      {isMepMode ? 'Zeg wat je wilt — ik pas het direct aan in de database' : 'Stel een vraag of kies een snelle actie'}
                    </p>
                    {isMepMode && (
                      <div style={{
                        fontSize: 11, color: '#B8997A',
                        backgroundColor: 'white', borderRadius: 12,
                        padding: '10px 12px', border: '1px solid #E8D5B5', lineHeight: 1.6,
                      }}>
                        <div style={{ fontWeight: 600, color: '#9E7E60', marginBottom: 4 }}>Voorbeelden:</div>
                        <div>\"pas aantallen aan: 135 personen, crew 6\"</div>
                        <div>\"voeg mignardises toe\"</div>
                        <div>\"zet de makreel op 15g\"</div>
                        <div>\"starttijd is 19:30, eindtijd 23:00\"</div>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {quickActions.map((qa, i) => (
                        <button
                          key={i}
                          onClick={() => send(qa.prompt)}
                          style={{
                            padding: '10px 12px', backgroundColor: 'white',
                            border: '1px solid #E8D5B5', borderRadius: 12,
                            fontSize: 11, color: '#9E7E60',
                            textAlign: 'left', cursor: 'pointer',
                            transition: 'all 150ms ease', fontFamily: 'inherit',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FDF8F2')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}
                        >
                          {qa.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '88%', padding: '8px 12px',
                      borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap',
                      backgroundColor: m.role === 'user' ? accentColor : 'white',
                      color: m.role === 'user' ? 'white' : '#3D2810',
                      border: m.role === 'user' ? 'none' : '1px solid #E8D5B5',
                    }}>
                      {m.content}
                    </div>
                  </div>
                ))}

                {streamText && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{
                      maxWidth: '88%', padding: '8px 12px',
                      borderRadius: '16px 16px 16px 4px',
                      fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap',
                      backgroundColor: 'white', border: '1px solid #E8D5B5', color: '#3D2810',
                    }}>
                      {streamText}
                      <span style={{
                        display: 'inline-block', width: 6, height: 14, marginLeft: 3,
                        backgroundColor: '#E8A040', borderRadius: 2,
                        animation: 'pulse 1s infinite',
                      }} />
                    </div>
                  </div>
                )}

                {loading && !streamText && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{
                      padding: '8px 12px', backgroundColor: 'white',
                      border: '1px solid #E8D5B5', borderRadius: '16px 16px 16px 4px',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <Loader2 style={{ width: 14, height: 14, color: '#B8997A', animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: 11, color: '#B8997A' }}>
                        {isMepMode ? 'Aanpassingen doorvoeren...' : 'Denken...'}
                      </span>
                    </div>
                  </div>
                )}

                {uploading && (
                  <div style={{ fontSize: 11, color: '#B8997A', textAlign: 'center', padding: '4px 0' }}>
                    Bestand analyseren...
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '8px 12px 12px', borderTop: '1px solid #E8D5B5', flexShrink: 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  backgroundColor: 'white', border: '1px solid #E8D5B5',
                  borderRadius: 12, padding: '8px 12px',
                }}>
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) handleFileUpload(f)
                      e.target.value = ''
                    }}
                  />
                  {/* Paperclip button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || uploading}
                    title="Bestand uploaden (PDF of foto)"
                    style={{
                      width: 30, height: 30, borderRadius: 8, border: 'none',
                      backgroundColor: 'transparent', cursor: loading || uploading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#B8997A', flexShrink: 0,
                    }}
                  >
                    <svg width={15} height={15} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                    </svg>
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                    placeholder={isMepMode ? 'bv. "135 personen, starttijd 19:00"' : 'Stel een vraag...'}
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      fontSize: 13, color: '#3D2810', fontFamily: 'inherit',
                    }}
                  />
                  <button
                    onClick={() => send()}
                    disabled={!input.trim() || loading}
                    style={{
                      width: 30, height: 30, borderRadius: 8, border: 'none',
                      backgroundColor: !input.trim() || loading ? '#F2E8D5' : accentColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
                      transition: 'all 150ms ease', flexShrink: 0,
                    }}
                  >
                    <Send style={{ width: 13, height: 13, color: !input.trim() || loading ? '#B8997A' : 'white' }} />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* HISTORY TAB */}
          {tab === 'history' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={startNewConversation}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', borderRadius: 10,
                  border: '1.5px dashed #E8D5B5', backgroundColor: 'transparent',
                  cursor: 'pointer', color: '#9E7E60', fontSize: 13, fontWeight: 600,
                  fontFamily: 'inherit', transition: 'all 150ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FDF8F2'; e.currentTarget.style.borderColor = '#C4703A' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = '#E8D5B5' }}
              >
                <Plus style={{ width: 16, height: 16 }} />
                Nieuw gesprek starten
              </button>

              {loadingHistory && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                  <Loader2 style={{ width: 20, height: 20, color: '#B8997A', animation: 'spin 1s linear infinite' }} />
                </div>
              )}

              {!loadingHistory && conversations.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#B8997A', fontSize: 13 }}>
                  <History style={{ width: 28, height: 28, margin: '0 auto 8px', opacity: 0.4 }} />
                  <div>Nog geen eerdere gesprekken</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>Gesprekken worden automatisch opgeslagen</div>
                </div>
              )}

              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 12px', borderRadius: 10,
                    border: `1px solid ${currentConvId === conv.id ? '#E8A040' : '#E8D5B5'}`,
                    backgroundColor: currentConvId === conv.id ? '#FEF3E2' : 'white',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={e => { if (currentConvId !== conv.id) e.currentTarget.style.backgroundColor = '#FDF8F2' }}
                  onMouseLeave={e => { if (currentConvId !== conv.id) e.currentTarget.style.backgroundColor = 'white' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#2C1810', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                      <span style={{ fontSize: 11, color: '#B8997A' }}>
                        {new Date(conv.updated_at).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {conv.context && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                          backgroundColor: conv.context === 'mep' ? '#D1FAE5' : '#F2E8D5',
                          color: conv.context === 'mep' ? '#065F46' : '#9E7E60',
                        }}>
                          {conv.context === 'mep' ? 'MEP' : 'Algemeen'}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: '#B8997A' }}>{conv.messages.length} berichten</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    title="Verwijder gesprek"
                    style={{
                      padding: 6, borderRadius: 6, border: 'none',
                      backgroundColor: 'transparent', cursor: 'pointer',
                      color: '#B8997A', flexShrink: 0,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.backgroundColor = '#FEF2F2' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#B8997A'; e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <Trash2 style={{ width: 13, height: 13 }} />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
