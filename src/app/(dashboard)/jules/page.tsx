'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Sparkles, Send, Lightbulb, Brain, Bell, ChevronRight, Loader2 } from 'lucide-react'

type Tab = 'chat' | 'memory' | 'alerts'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const quickPrompts = [
  'Wat is er in seizoen?',
  'Bereken de food cost van mijn laatste recept',
  'Stel een menu voor van 3 gangen',
  'Hoe kan ik mijn food cost verlagen?',
  'Welke klassieke technieken passen bij mijn stijl?',
  'Suggestie voor een dagschotel',
]

const sampleAlerts = [
  { id: 1, type: 'price', title: 'Tomatenprijzen +18%', description: 'Cherry tomaten van Metro zijn gestegen van EUR 3,20 naar EUR 3,78/kg. Overweeg San Marzano van Sligro voor EUR 2,95/kg.', time: '2u geleden' },
  { id: 2, type: 'seasonal', title: 'Witte asperges seizoen eindigt', description: 'Het seizoen voor Nederlandse witte asperges eindigt doorgaans half juni. Overweeg om voorraad in te slaan of over te schakelen naar groene asperges.', time: '1d geleden' },
  { id: 3, type: 'cost', title: 'Food cost alert: Boeuf Bourguignon', description: 'Kostprijs per portie gestegen naar EUR 8,45 (was EUR 7,20). Hoofdoorzaak: prijsstijging runderwang.', time: '3d geleden' },
]

function parseAnthropicStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onText: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
) {
  const decoder = new TextDecoder()
  let buffer = ''

  function processLines() {
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6).trim()
        if (jsonStr === '[DONE]') continue
        try {
          const parsed = JSON.parse(jsonStr)
          if (
            parsed.type === 'content_block_delta' &&
            parsed.delta?.type === 'text_delta' &&
            parsed.delta?.text
          ) {
            onText(parsed.delta.text)
          }
          if (parsed.type === 'message_stop') {
            onDone()
            return
          }
          if (parsed.type === 'error') {
            onError(parsed.error?.message || 'Onbekende fout')
            return
          }
        } catch {
          // Skip non-JSON lines
        }
      }
    }
  }

  function pump(): Promise<void> {
    return reader.read().then(({ done, value }) => {
      if (done) {
        if (buffer) processLines()
        onDone()
        return
      }
      buffer += decoder.decode(value, { stream: true })
      processLines()
      return pump()
    }).catch((err) => {
      onError(err?.message || 'Stream onderbroken')
    })
  }

  pump()
}

export default function JulesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [message, setMessage] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages, scrollToBottom])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return

    const userMessage: ChatMessage = { role: 'user', content: text.trim() }
    const newMessages = [...chatMessages, userMessage]
    setChatMessages(newMessages)
    setMessage('')
    setIsStreaming(true)

    // Add empty assistant message for streaming
    setChatMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/jules/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Fout: ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('Geen stream beschikbaar')

      parseAnthropicStream(
        reader,
        (text) => {
          setChatMessages(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last && last.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: last.content + text }
            }
            return updated
          })
        },
        () => {
          setIsStreaming(false)
          inputRef.current?.focus()
        },
        (errMsg) => {
          setChatMessages(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last && last.role === 'assistant' && !last.content) {
              updated[updated.length - 1] = { ...last, content: `Fout: ${errMsg}` }
            }
            return updated
          })
          setIsStreaming(false)
        },
      )
    } catch (err: any) {
      setChatMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last && last.role === 'assistant') {
          updated[updated.length - 1] = {
            ...last,
            content: err.message || 'Er ging iets mis. Probeer het opnieuw.',
          }
        }
        return updated
      })
      setIsStreaming(false)
    }
  }, [chatMessages, isStreaming])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && message.trim()) {
      e.preventDefault()
      sendMessage(message)
    }
  }

  const tabs = [
    { id: 'chat' as Tab, label: 'Chat', icon: Sparkles },
    { id: 'memory' as Tab, label: 'Geheugen', icon: Brain },
    { id: 'alerts' as Tab, label: 'Meldingen', icon: Bell, badge: 3 },
  ]

  const hasMessages = chatMessages.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">Jules</h1>
            <p className="text-stone-500 text-sm">Jouw culinaire intelligence partner</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-stone-100 rounded-xl w-fit animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge && (
              <span className="w-5 h-5 bg-brand-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="card overflow-hidden animate-scale-in" style={{ minHeight: '60vh' }}>
          <div className="flex flex-col h-full" style={{ minHeight: '60vh' }}>
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-6">
              {!hasMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Sparkles className="w-8 h-8 text-brand-400" />
                    </div>
                    <h3 className="font-display text-xl font-semibold text-stone-900 mb-2">
                      Wat kan ik voor je doen?
                    </h3>
                    <p className="text-sm text-stone-500 leading-relaxed mb-8">
                      Ik ken je recepten, je kosten en je stijl. Vraag me alles over je keuken.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {quickPrompts.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => sendMessage(suggestion)}
                          className="flex items-center gap-2 p-3 bg-stone-50 hover:bg-brand-50 text-left rounded-xl text-sm text-stone-600 hover:text-brand-700 transition-colors group"
                        >
                          <Lightbulb className="w-4 h-4 text-stone-400 group-hover:text-brand-500 shrink-0" />
                          <span className="line-clamp-1">{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-brand-600 text-white'
                            : 'bg-stone-100 text-stone-800'
                        }`}
                      >
                        {msg.role === 'assistant' && !msg.content && isStreaming ? (
                          <div className="flex items-center gap-2 text-stone-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Jules denkt na...</span>
                          </div>
                        ) : (
                          <div className={`text-sm leading-relaxed ${msg.role === 'user' ? 'whitespace-pre-wrap' : 'prose prose-sm prose-stone max-w-none'}`}>
                            {msg.role === 'assistant' ? (
                              <ReactMarkdown
                                components={{
                                  h1: ({children}) => <h3 className="text-base font-bold text-stone-900 mt-3 mb-1">{children}</h3>,
                                  h2: ({children}) => <h4 className="text-sm font-bold text-stone-800 mt-3 mb-1">{children}</h4>,
                                  h3: ({children}) => <h5 className="text-sm font-semibold text-stone-700 mt-2 mb-1">{children}</h5>,
                                  p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                                  strong: ({children}) => <strong className="font-semibold text-stone-900">{children}</strong>,
                                  ul: ({children}) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                                  ol: ({children}) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                                  li: ({children}) => <li className="text-stone-700">{children}</li>,
                                  hr: () => <hr className="my-3 border-stone-200" />,
                                  code: ({children}) => <code className="bg-stone-200/60 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            ) : msg.content}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="p-4 border-t border-stone-100">
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Stel Jules een vraag..."
                  disabled={isStreaming}
                  className="input-premium flex-1 disabled:opacity-60"
                />
                <button
                  onClick={() => sendMessage(message)}
                  disabled={!message.trim() || isStreaming}
                  className="btn-primary px-4 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-3 animate-scale-in">
          {sampleAlerts.map((alert, i) => (
            <div
              key={alert.id}
              className="card-hover p-5 flex items-start gap-4 animate-slide-up opacity-0"
              style={{ animationDelay: `${i * 75}ms`, animationFillMode: 'forwards' }}
            >
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-5 h-5 text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-display font-semibold text-stone-900 text-sm">{alert.title}</h4>
                <p className="text-sm text-stone-500 mt-1 leading-relaxed">{alert.description}</p>
                <span className="text-xs text-stone-400 mt-2 block">{alert.time}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-300 shrink-0 mt-1" />
            </div>
          ))}
        </div>
      )}

      {/* Memory Tab */}
      {activeTab === 'memory' && (
        <div className="card p-8 text-center animate-scale-in">
          <div className="w-16 h-16 bg-violet-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Brain className="w-8 h-8 text-violet-400" />
          </div>
          <h3 className="font-display text-xl font-semibold text-stone-900 mb-2">Jules leert jouw stijl</h3>
          <p className="text-sm text-stone-500 max-w-[45ch] mx-auto leading-relaxed">
            Naarmate je werkt met recepten, evenementen plant en chat met Jules, wordt je persoonlijke kookstijl-profiel hier opgebouwd. Hoe meer je het gebruikt, hoe slimmer Jules wordt.
          </p>
        </div>
      )}
    </div>
  )
}
