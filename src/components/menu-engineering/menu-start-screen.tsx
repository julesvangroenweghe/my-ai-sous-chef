'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BriefIntake, { ParsedBrief } from './brief-intake'
import MenuWizard from './menu-wizard'

interface MenuStartScreenProps {
  onMenuSaved?: (menuId: string) => void
}

type ScreenState = 'choice' | 'brief' | 'wizard'

export default function MenuStartScreen({ onMenuSaved }: MenuStartScreenProps) {
  const [screen, setScreen] = useState<ScreenState>('choice')
  const [parsedBrief, setParsedBrief] = useState<ParsedBrief | null>(null)
  const [briefConfirmed, setBriefConfirmed] = useState(false)

  const handleBriefParsed = (brief: ParsedBrief, rawText: string) => {
    setParsedBrief(brief)
    setBriefConfirmed(false)
  }

  const handleConfirmBrief = () => {
    setBriefConfirmed(true)
    setScreen('wizard')
  }

  if (screen === 'wizard') {
    return (
      <MenuWizard
        onMenuSaved={onMenuSaved}
        initialBrief={parsedBrief ?? undefined}
        onBack={() => {
          setParsedBrief(null)
          setScreen('choice')
        }}
      />
    )
  }

  return (
    <AnimatePresence mode="wait">
      {screen === 'choice' && (
        <motion.div
          key="choice"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Intro */}
          <div className="text-center py-4">
            <h2 className="text-xl font-display font-bold text-[#2C1810] mb-2">Hoe wil je starten?</h2>
            <p className="text-sm text-[#9E7E60]">Heb je al een klantbrief, offerte of budgetopgave? Laat de AI dat inlezen.</p>
          </div>

          {/* Two cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Brief importeren */}
            <button
              onClick={() => setScreen('brief')}
              className="group p-6 rounded-2xl border-2 bg-white text-left transition-all hover:shadow-md"
              style={{ borderColor: 'rgba(232,160,64,0.3)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#E8A040')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(232,160,64,0.3)')}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all"
                style={{ backgroundColor: 'rgba(232,160,64,0.12)', border: '1px solid rgba(232,160,64,0.25)' }}
              >
                <svg width="22" height="22" fill="none" stroke="#E8A040" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <h3 className="font-semibold text-[#2C1810] text-base mb-1">Brief importeren</h3>
              <p className="text-sm text-[#9E7E60] leading-relaxed">
                Plak een mail of tekst, of upload een screenshot. De AI leest het budget, personenaantal, datum en wensen — en vult de wizard automatisch in.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-medium" style={{ color: '#E8A040' }}>
                <span>Starten met brief</span>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>

            {/* Leeg starten */}
            <button
              onClick={() => setScreen('wizard')}
              className="group p-6 rounded-2xl border-2 border-[#E8D5B5] bg-white text-left transition-all hover:shadow-md hover:border-[#D4B896]"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(92,71,48,0.06)', border: '1px solid rgba(92,71,48,0.12)' }}>
                <svg width="22" height="22" fill="none" stroke="#9E7E60" strokeWidth="1.5" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>
              <h3 className="font-semibold text-[#2C1810] text-base mb-1">Leeg starten</h3>
              <p className="text-sm text-[#9E7E60] leading-relaxed">
                Stel zelf de parameters in: aantal personen, budget, gangen, stijl. Jij bepaalt alles van nul.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-[#9E7E60]">
                <span>Wizard openen</span>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>
          </div>
        </motion.div>
      )}

      {screen === 'brief' && (
        <motion.div
          key="brief"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Back */}
          <button
            onClick={() => { setScreen('choice'); setParsedBrief(null) }}
            className="flex items-center gap-1.5 text-sm text-[#9E7E60] hover:text-[#5C4730] transition-colors"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Terug
          </button>

          {parsedBrief ? (
            /* Parsed result preview */
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              <div className="p-5 rounded-2xl border border-green-300/60 bg-green-50/40">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <svg width="12" height="12" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-green-800">Brief geanalyseerd</span>
                </div>
                <p className="text-sm text-green-900 italic mb-4">&ldquo;{parsedBrief.summary}&rdquo;</p>

                <div className="grid grid-cols-2 gap-3">
                  {parsedBrief.num_persons && (
                    <div className="p-3 rounded-xl bg-white border border-green-200/60">
                      <p className="text-xs text-[#9E7E60] mb-0.5">Personen</p>
                      <p className="font-semibold text-[#2C1810]">{parsedBrief.num_persons}</p>
                    </div>
                  )}
                  {(parsedBrief.budget_pp || parsedBrief.budget_total) && (
                    <div className="p-3 rounded-xl bg-white border border-green-200/60">
                      <p className="text-xs text-[#9E7E60] mb-0.5">Budget</p>
                      <p className="font-semibold text-[#2C1810]">
                        {parsedBrief.budget_pp ? `€${parsedBrief.budget_pp}/pp` : `€${parsedBrief.budget_total} totaal`}
                      </p>
                    </div>
                  )}
                  {parsedBrief.date_hint && (
                    <div className="p-3 rounded-xl bg-white border border-green-200/60">
                      <p className="text-xs text-[#9E7E60] mb-0.5">Datum</p>
                      <p className="font-semibold text-[#2C1810] text-sm">{parsedBrief.date_hint}</p>
                    </div>
                  )}
                  {parsedBrief.location && (
                    <div className="p-3 rounded-xl bg-white border border-green-200/60">
                      <p className="text-xs text-[#9E7E60] mb-0.5">Locatie</p>
                      <p className="font-semibold text-[#2C1810] text-sm">{parsedBrief.location}</p>
                    </div>
                  )}
                  {parsedBrief.courses.length > 0 && (
                    <div className="p-3 rounded-xl bg-white border border-green-200/60 col-span-2">
                      <p className="text-xs text-[#9E7E60] mb-1">Gangen</p>
                      <div className="flex flex-wrap gap-1.5">
                        {parsedBrief.courses.map(c => (
                          <span key={c} className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/60">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {parsedBrief.restrictions.length > 0 && (
                    <div className="p-3 rounded-xl bg-white border border-green-200/60 col-span-2">
                      <p className="text-xs text-[#9E7E60] mb-1">Dieetwensen</p>
                      <div className="flex flex-wrap gap-1.5">
                        {parsedBrief.restrictions.map(r => (
                          <span key={r} className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200/60">{r}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {parsedBrief.special_requests && (
                    <div className="p-3 rounded-xl bg-white border border-green-200/60 col-span-2">
                      <p className="text-xs text-[#9E7E60] mb-0.5">Speciale wensen</p>
                      <p className="text-sm text-[#2C1810]">{parsedBrief.special_requests}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleConfirmBrief}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{ backgroundColor: '#E8A040', color: '#fff' }}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Wizard invullen met deze gegevens
                </button>
                <button
                  onClick={() => setParsedBrief(null)}
                  className="px-4 py-3 rounded-xl text-sm font-medium text-[#9E7E60] hover:text-[#5C4730] transition-colors"
                >
                  Opnieuw invoeren
                </button>
              </div>
            </motion.div>
          ) : (
            <BriefIntake
              onParsed={(brief, rawText) => setParsedBrief(brief)}
              onSkip={() => setScreen('wizard')}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
