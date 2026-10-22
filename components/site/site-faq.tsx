'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

interface FaqEntry {
  q: string
  a: string
}

export default function SiteFaq({ faq, accent }: { faq: FaqEntry[]; accent: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0) // First item open by default
  const reducedMotion = useReducedMotion()

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx)
  }

  if (!faq || faq.length === 0) return null

  return (
    <div className="mt-8 sm:mt-10 max-w-3xl space-y-3">
      {faq.map((item, idx) => {
        const isOpen = openIndex === idx
        const itemId = `faq-item-${idx}`
        const headerId = `faq-header-${idx}`

        return (
          <div
            key={idx}
            className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
              isOpen
                ? 'bg-white shadow-soft-lift border-black/[0.12]'
                : 'bg-white/90 border-black/[0.06] shadow-card hover:border-black/[0.10]'
            }`}
            style={
              isOpen
                ? {
                    borderColor: `color-mix(in srgb, ${accent} 40%, transparent)`,
                    boxShadow: `0 8px 24px -4px color-mix(in srgb, ${accent} 12%, transparent)`,
                  }
                : undefined
            }
          >
            <h3>
              <button
                type="button"
                id={headerId}
                aria-expanded={isOpen}
                aria-controls={itemId}
                onClick={() => toggle(idx)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-4.5 text-left text-[15px] sm:text-base font-bold text-text-primary focus-visible:ring-2 focus-visible:ring-whatsapp-500 rounded-2xl outline-none select-none transition-colors"
              >
                <span>{item.q}</span>
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 ${
                    isOpen
                      ? 'border-transparent text-white rotate-180'
                      : 'border-black/[0.08] text-text-secondary bg-surface/60'
                  }`}
                  style={isOpen ? { backgroundColor: accent } : undefined}
                  aria-hidden="true"
                >
                  <svg className="w-4 h-4 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
            </h3>

            {reducedMotion ? (
              isOpen && (
                <div id={itemId} role="region" aria-labelledby={headerId} className="px-5 pb-5 sm:px-6 sm:pb-6 pt-1 text-[14.5px] leading-relaxed text-text-secondary">
                  <p>{item.a}</p>
                </div>
              )
            ) : (
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={itemId}
                    role="region"
                    aria-labelledby={headerId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { type: 'spring', damping: 28, stiffness: 280 },
                      opacity: { duration: 0.2 },
                    }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-1 text-[14.5px] leading-relaxed text-text-secondary border-t border-black/[0.04]">
                      <p>{item.a}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        )
      })}
    </div>
  )
}
