'use client'

import { useState } from 'react'

const FAQ_ITEMS = [
  {
    q: 'What is WA Directory?',
    a: "WA Directory is Zimbabwe's AI-powered business directory. We help you discover verified local shops, compare real-time prices, and connect directly on WhatsApp — all in one place.",
  },
  {
    q: 'How do I list my business?',
    a: "Click the \"List Your Business Free\" button, fill in your details, and verify ownership via WhatsApp. Once approved, your business appears in search results and categories.",
  },
  {
    q: 'Is it free to list my business?',
    a: "Yes! Basic listing is completely free. We also offer premium ranking and visibility boosts for businesses that want more exposure.",
  },
  {
    q: 'How does the AI search work?',
    a: "Our AI understands natural language queries like \"plumber near me\" or \"cheap solar panels in Harare\". It matches your request to the most relevant verified businesses.",
  },
  {
    q: 'How are businesses verified?',
    a: "Businesses verify ownership through WhatsApp confirmation and manual review. Verified badges appear on profiles you can trust.",
  },
]

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="bg-gradient-to-br from-white/90 via-white/85 to-whatsapp-50/20 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-whatsapp-950/20 backdrop-blur-xl rounded-3xl border border-white/80 dark:border-gray-800 shadow-soft-lift p-6 sm:p-8">
      <div className="text-center max-w-2xl mx-auto mb-6">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-whatsapp-100/70 dark:bg-whatsapp-900/40 text-whatsapp-800 dark:text-gray-100 text-[11px] font-semibold mb-2">
          FAQ
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary dark:text-gray-100 tracking-tight">
          Frequently Asked Questions
        </h2>
      </div>

      <div className="max-w-3xl mx-auto divide-y divide-gray-200/60 dark:divide-gray-800">
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = open === i
          return (
            <div key={i}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between py-4 text-left gap-4 group"
                aria-expanded={isOpen}
              >
                <span className="font-semibold text-sm sm:text-base text-text-primary dark:text-gray-100 group-hover:text-whatsapp-700 dark:group-hover:text-whatsapp-400 transition-colors">
                  {item.q}
                </span>
                <svg
                  className={`w-4 h-4 text-text-secondary dark:text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              <div
                className={`grid transition-all duration-200 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
              >
                <div className="overflow-hidden">
                  <p className="pb-4 text-xs sm:text-sm text-text-secondary dark:text-gray-400 leading-relaxed">
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
