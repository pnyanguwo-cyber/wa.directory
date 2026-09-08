'use client'

import { useState, useEffect } from 'react'
import type { PlanType } from '@/types'
import { PLAN_CONFIG, PRO_ASSISTANCE_PRICE } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onProceed: (payload: { plan: PlanType; hasProAssistance: boolean }) => void
}

export default function PaymentPlanModal({ open, onClose, onProceed }: Props) {
  const [selected, setSelected] = useState<PlanType | null>(null)
  const [proAssistance, setProAssistance] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setSelected(null)
      setProAssistance(false)
      setError('')
    }
  }, [open])

  useEffect(() => {
    if (selected !== '12m') setProAssistance(false)
  }, [selected])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  function handleProceed() {
    if (!selected) {
      setError('Please select a plan')
      return
    }
    setError('')
    onProceed({ plan: selected, hasProAssistance: proAssistance })
  }

  const plans = (['1m', '6m', '12m'] as PlanType[])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="relative z-10 w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-2xl p-6 space-y-5 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div>
          <h2 className="text-lg font-bold text-text-primary">Choose a payment plan</h2>
          <p className="text-xs text-text-secondary mt-0.5">Select how long you want your listing to stay active.</p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-3 gap-3">
          {plans.map(p => {
            const cfg = PLAN_CONFIG[p]
            const isActive = selected === p
            return (
              <button
                key={p}
                onClick={() => { setSelected(p); setError('') }}
                className={`relative rounded-2xl border-2 p-4 text-center transition-all ${
                  isActive
                    ? 'border-whatsapp-500 bg-whatsapp-50 dark:bg-whatsapp-950/40 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {isActive && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-whatsapp-500 rounded-full flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                )}
                <p className={`text-2xl font-extrabold ${isActive ? 'text-whatsapp-700 dark:text-whatsapp-400' : 'text-text-primary'}`}>
                  {cfg.months}
                </p>
                <p className={`text-xs font-semibold mt-0.5 ${isActive ? 'text-whatsapp-600 dark:text-whatsapp-400' : 'text-text-secondary'}`}>
                  {cfg.months === 1 ? 'Month' : 'Months'}
                </p>
                <div className={`mt-3 pt-3 border-t ${isActive ? 'border-whatsapp-200 dark:border-whatsapp-800' : 'border-gray-200 dark:border-gray-700'}`}>
                  <p className={`text-base font-extrabold ${isActive ? 'text-whatsapp-700 dark:text-whatsapp-400' : 'text-text-primary'}`}>
                    ${cfg.price.toFixed(2)}
                  </p>
                  {cfg.months > 1 && (
                    <p className="text-[10px] text-text-secondary mt-0.5">${cfg.perMonth.toFixed(2)}/mo</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Pro assistance add-on — 12-month only */}
        {selected === '12m' && (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 animate-fade-in">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={proAssistance}
                onChange={e => setProAssistance(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-whatsapp-600 focus:ring-whatsapp-500"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">Professional WhatsApp catalog setup & name reservation</p>
                <p className="text-xs text-text-secondary mt-0.5">Get expert help setting up your WhatsApp Business catalog and securing your directory name. +${PRO_ASSISTANCE_PRICE.toFixed(2)}</p>
              </div>
            </label>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>
        )}

        {/* Summary */}
        {selected && (
          <div className="bg-surface dark:bg-gray-800 rounded-2xl p-4 border border-gray-200/60 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-text-primary">{PLAN_CONFIG[selected].label} listing</span>
              <span className="font-bold text-text-primary">${PLAN_CONFIG[selected].price.toFixed(2)}</span>
            </div>
            {proAssistance && (
              <div className="flex items-center justify-between text-sm mt-1.5 pt-1.5 border-t border-gray-200/60 dark:border-gray-700">
                <span className="font-medium text-text-primary">Pro assistance</span>
                <span className="font-bold text-text-primary">+${PRO_ASSISTANCE_PRICE.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-gray-200/60 dark:border-gray-700">
              <span className="font-bold text-text-primary">Total</span>
              <span className="font-extrabold text-whatsapp-700 dark:text-whatsapp-400">
                ${(PLAN_CONFIG[selected].price + (proAssistance ? PRO_ASSISTANCE_PRICE : 0)).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 h-11 text-sm font-semibold rounded-2xl">
            Cancel
          </button>
          <button onClick={handleProceed} className="btn-primary flex-1 h-11 text-sm font-semibold rounded-2xl">
            Proceed to Payment
          </button>
        </div>
      </div>
    </div>
  )
}
