'use client'

// src/components/learning-popup.tsx
// Zelflerend popup systeem — max 1 per sessie, slim getimed

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LearningQuestion {
  id: string
  question: string
  question_type: 'keuze' | 'open' | 'bevestiging'
  options?: { label: string; value: string; creates_rule?: boolean }[]
  trigger_context: string
}

interface PendingPopup {
  question: LearningQuestion
  trigger_data?: Record<string, unknown>
}

// Sessiebeheer — max 1 popup per sessie
const SESSION_KEY = 'culinary_popup_shown'

function hasShownPopupThisSession(): boolean {
  if (typeof window === 'undefined') return true
  return sessionStorage.getItem(SESSION_KEY) === 'true'
}

function markPopupShown() {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(SESSION_KEY, 'true')
  }
}

// Genereer slimme vragen op basis van gedrag
export function generateLearningQuestion(context: {
  type: 'na_swap' | 'na_bevestigd_menu' | 'wekelijkse_check' | 'patroon_herkend'
  data?: Record<string, unknown>
}): LearningQuestion | null {
  if (context.type === 'na_swap' && context.data?.swapped_ingredient) {
    const ingredient = context.data.swapped_ingredient as string
    const swapCount = context.data.swap_count as number || 1
    
    if (swapCount >= 3) {
      return {
        id: `swap_pattern_${ingredient}`,
        question: `Je hebt ${swapCount}x ${ingredient} vervangen in desserts. Zullen we "geen ${ingredient} in desserts" als vaste regel opslaan?`,
        question_type: 'bevestiging',
        options: [
          { label: 'Ja, sla op als regel', value: 'ja', creates_rule: true },
          { label: 'Nee, geval per geval', value: 'nee' },
        ],
        trigger_context: 'na_swap',
      }
    }
  }

  if (context.type === 'wekelijkse_check') {
    const questions: LearningQuestion[] = [
      {
        id: 'dessert_herb_preference',
        question: 'Welk kruid gebruik je het liefst in desserts?',
        question_type: 'keuze',
        options: [
          { label: 'Verveine', value: 'verveine', creates_rule: true },
          { label: 'Dragon', value: 'dragon', creates_rule: true },
          { label: 'Munt', value: 'munt', creates_rule: true },
          { label: 'Andere', value: 'andere' },
        ],
        trigger_context: 'wekelijkse_check',
      },
      {
        id: 'umami_in_dessert',
        question: 'Gebruik jij bewust umami-elementen in zoete bereidingen? (bv. miso caramel, miso chocolade)',
        question_type: 'keuze',
        options: [
          { label: 'Ja, regelmatig', value: 'ja_regelmatig', creates_rule: true },
          { label: 'Soms als statement', value: 'soms', creates_rule: true },
          { label: 'Nooit in zoet', value: 'nooit', creates_rule: true },
        ],
        trigger_context: 'wekelijkse_check',
      },
      {
        id: 'texture_rule',
        question: 'Hoeveel verschillende texturen streef je na per bord?',
        question_type: 'keuze',
        options: [
          { label: 'Minimum 2', value: '2', creates_rule: true },
          { label: 'Minimum 3 (mijn standaard)', value: '3', creates_rule: true },
          { label: 'Minimum 4', value: '4', creates_rule: true },
        ],
        trigger_context: 'wekelijkse_check',
      },
      {
        id: 'acid_rule',
        question: 'Heb je altijd een zuur-element op elk bord?',
        question_type: 'keuze',
        options: [
          { label: 'Altijd — het is een wet', value: 'altijd', creates_rule: true },
          { label: 'Bijna altijd', value: 'bijna_altijd', creates_rule: true },
          { label: 'Enkel bij hartig', value: 'enkel_hartig', creates_rule: true },
        ],
        trigger_context: 'wekelijkse_check',
      },
    ]
    
    // Kies een willekeurige vraag die nog niet beantwoord is
    const answered = JSON.parse(localStorage.getItem('answered_popup_ids') || '[]') as string[]
    const unanswered = questions.filter(q => !answered.includes(q.id))
    if (unanswered.length === 0) return null
    return unanswered[Math.floor(Math.random() * unanswered.length)]
  }

  return null
}

// Sla antwoord op en maak eventueel een regel aan
async function saveAnswer(question: LearningQuestion, answer: string, creates_rule: boolean) {
  // Log popup antwoord
  await fetch('/api/culinary-rules/popup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question_id: question.id,
      question: question.question,
      question_type: question.question_type,
      answer,
      trigger_context: question.trigger_context,
      should_create_rule: creates_rule,
    }),
  })

  // Markeer als beantwoord
  const answered = JSON.parse(localStorage.getItem('answered_popup_ids') || '[]') as string[]
  answered.push(question.id)
  localStorage.setItem('answered_popup_ids', JSON.stringify(answered))
}

interface LearningPopupProps {
  popup: PendingPopup | null
  onClose: () => void
}

export function LearningPopup({ popup, onClose }: LearningPopupProps) {
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleAnswer = useCallback(async (value: string, creates_rule: boolean = false) => {
    if (!popup) return
    setSubmitted(true)
    await saveAnswer(popup.question, value, creates_rule)
    markPopupShown()
    setTimeout(onClose, 1200)
  }, [popup, onClose])

  if (!popup) return null

  const { question } = popup

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed bottom-24 right-6 z-40 w-80 bg-white border border-[#E8D5B5] rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-[#F2E8D5] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#E8A040] animate-pulse" />
            <span className="text-xs font-semibold text-[#2C1810] uppercase tracking-wide">
              Culinair geheugen
            </span>
          </div>
          <button
            onClick={() => { markPopupShown(); onClose() }}
            className="text-[#9E7E60] hover:text-[#2C1810] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {!submitted ? (
            <>
              <p className="text-sm text-[#2C1810] mb-4 leading-relaxed">{question.question}</p>

              {question.question_type === 'bevestiging' && question.options && (
                <div className="flex gap-2">
                  {question.options.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleAnswer(opt.value, opt.creates_rule || false)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        opt.creates_rule
                          ? 'bg-[#E8A040] text-white hover:bg-[#C4703A]'
                          : 'bg-[#F2E8D5] text-[#9E7E60] hover:text-[#2C1810]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {question.question_type === 'keuze' && question.options && (
                <div className="flex flex-col gap-2">
                  {question.options.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleAnswer(opt.value, opt.creates_rule || false)}
                      className="text-left py-2 px-3 rounded-lg text-sm text-[#2C1810] border border-[#E8D5B5] hover:border-[#E8A040] hover:bg-[#FEF3E2] transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                  <button
                    onClick={() => { markPopupShown(); onClose() }}
                    className="text-center py-1.5 text-xs text-[#9E7E60] hover:text-[#2C1810] transition-colors"
                  >
                    Niet nu
                  </button>
                </div>
              )}

              {question.question_type === 'open' && (
                <div>
                  <textarea
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    placeholder="Jouw antwoord..."
                    className="w-full border border-[#E8D5B5] rounded-lg px-3 py-2 text-sm text-[#2C1810] h-20 resize-none focus:outline-none focus:border-[#E8A040] mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAnswer(answer, true)}
                      disabled={!answer.trim()}
                      className="flex-1 py-2 bg-[#E8A040] text-white rounded-lg text-sm font-medium hover:bg-[#C4703A] transition-colors disabled:opacity-50"
                    >
                      Opslaan
                    </button>
                    <button
                      onClick={() => { markPopupShown(); onClose() }}
                      className="px-3 py-2 text-sm text-[#9E7E60] hover:text-[#2C1810] transition-colors"
                    >
                      Overslaan
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-sm text-emerald-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Begrepen — ik onthoud dit.
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Hook: trigger popups op basis van gedrag
export function useLearningPopup() {
  const [popup, setPopup] = useState<PendingPopup | null>(null)

  // Wekelijkse check — toon popup na 30s als nog niet getoond deze sessie
  useEffect(() => {
    if (hasShownPopupThisSession()) return

    const timer = setTimeout(() => {
      const question = generateLearningQuestion({ type: 'wekelijkse_check' })
      if (question) {
        setPopup({ question })
      }
    }, 30_000) // 30 seconden na laden

    return () => clearTimeout(timer)
  }, [])

  // Trigger na swap
  function triggerAfterSwap(data: { swapped_ingredient: string; swap_count: number }) {
    if (hasShownPopupThisSession()) return
    const question = generateLearningQuestion({ type: 'na_swap', data })
    if (question) setPopup({ question, trigger_data: data })
  }

  function closePopup() {
    setPopup(null)
  }

  return { popup, triggerAfterSwap, closePopup }
}
