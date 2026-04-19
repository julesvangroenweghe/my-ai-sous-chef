'use client'

import { useState } from 'react'
import { Sparkles, Send, Lightbulb, Brain, Bell, ChevronRight } from 'lucide-react'

type Tab = 'chat' | 'memory' | 'alerts'

const sampleAlerts = [
  { id: 1, type: 'price', title: 'Tomato prices up 18%', description: 'Cherry tomatoes from Metro went from €3.20 to €3.78/kg. Consider switching to San Marzano from Sligro at €2.95/kg.', time: '2h ago' },
  { id: 2, type: 'seasonal', title: 'White asparagus season ending', description: 'Dutch white asparagus season typically ends mid-June. Consider stocking up or switching to green asparagus.', time: '1d ago' },
  { id: 3, type: 'cost', title: 'Food cost alert: Beef Bourguignon', description: 'Cost per serving increased to €8.45 (was €7.20). Main driver: beef cheek price increase.', time: '3d ago' },
]

export default function JulesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [message, setMessage] = useState('')

  const tabs = [
    { id: 'chat' as Tab, label: 'Chat', icon: Sparkles },
    { id: 'memory' as Tab, label: 'Memory', icon: Brain },
    { id: 'alerts' as Tab, label: 'Alerts', icon: Bell, badge: 3 },
  ]

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
            <p className="text-stone-500 text-sm">Your culinary intelligence partner</p>
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
            <div className="flex-1 p-8 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-8 h-8 text-brand-400" />
                </div>
                <h3 className="font-display text-xl font-semibold text-stone-900 mb-2">
                  What can I help you cook up?
                </h3>
                <p className="text-sm text-stone-500 leading-relaxed mb-8">
                  I know your recipes, your costs, and your style. Ask me anything about your kitchen.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    'What can I make with leftover duck?',
                    'Optimize my food cost for next week',
                    'Suggest a seasonal amuse-bouche',
                    'Calculate portions for 80 guests',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setMessage(suggestion)}
                      className="flex items-center gap-2 p-3 bg-stone-50 hover:bg-brand-50 text-left rounded-xl text-sm text-stone-600 hover:text-brand-700 transition-colors group"
                    >
                      <Lightbulb className="w-4 h-4 text-stone-400 group-hover:text-brand-500 shrink-0" />
                      <span className="line-clamp-1">{suggestion}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Input area */}
            <div className="p-4 border-t border-stone-100">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask Jules anything..."
                  className="input-premium flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && message && setMessage('')}
                />
                <button
                  disabled={!message}
                  className="btn-primary px-4 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
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
          <h3 className="font-display text-xl font-semibold text-stone-900 mb-2">Jules is learning your style</h3>
          <p className="text-sm text-stone-500 max-w-[45ch] mx-auto leading-relaxed">
            As you work with recipes, plan events, and chat with Jules, your personal cooking style profile builds here. The more you use it, the smarter Jules gets.
          </p>
        </div>
      )}
    </div>
  )
}
