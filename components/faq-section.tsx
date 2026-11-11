'use client'

import { useState } from 'react'
import { FAQ_ITEMS } from '@/data/faq'

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="bg-gradient-to-br from-white/90 via-white/85 to-whatsapp-50/20 backdrop-blur-xl rounded-3xl border border-white/80 shadow-soft-lift p-6 sm:p-8">
      <div className="text-center max-w-2xl mx-auto mb-6">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-whatsapp-100/70 text-whatsapp-800 text-[11px] font-semibold mb-2">
          FAQ
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
          Frequently Asked Questions
        </h2>
      </div>

      <div className="max-w-3xl mx-auto divide-y divide-gray-200/60">
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = open === i
          return (
            <div key={i}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between py-4 text-left gap-4 group"
                aria-expanded={isOpen}
              >
                <span className="font-semibold text-sm sm:text-base text-text-primary group-hover:text-whatsapp-700 transition-colors">
                  {item.q}
                </span>
                <svg
                  className={`w-4 h-4 text-text-secondary shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
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
                  <p className="pb-4 text-xs sm:text-sm text-text-secondary leading-relaxed">
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
