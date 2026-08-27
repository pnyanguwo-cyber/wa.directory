'use client'

import { useEffect } from 'react'

interface RequestConfirmModalProps {
  open: boolean
  name: string
  type: 'city' | 'area' | 'category'
  onConfirm: () => void
  onCancel: () => void
}

const TYPE_LABELS = {
  city: 'city / town',
  area: 'area',
  category: 'category',
}

const TYPE_ICONS = {
  city: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  ),
  area: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 2.499l1.221-7.397M11.023 17.501l1.221 7.397M12 2.25a9.75 9.75 0 00-9.75 9.75c0 5.385 4.365 9.75 9.75 9.75s9.75-4.365 9.75-9.75A9.75 9.75 0 0012 2.25z" />
    </svg>
  ),
  category: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  ),
}

export default function RequestConfirmModal({
  open,
  name,
  type,
  onConfirm,
  onCancel,
}: RequestConfirmModalProps) {
  useEffect(() => {
    if (!open) return
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-whatsapp-100 dark:bg-whatsapp-900/50 text-whatsapp-700 dark:text-gray-100 mx-auto mb-4">
          {TYPE_ICONS[type]}
        </div>

        <h2 id="request-modal-title" className="text-lg font-bold text-text-primary dark:text-gray-100 text-center mb-2">
          Request new {TYPE_LABELS[type]}?
        </h2>

        <div className="bg-surface dark:bg-gray-800 rounded-xl px-4 py-3 mb-4 text-center">
          <p className="text-sm text-text-secondary dark:text-gray-400">
            You&apos;re requesting
          </p>
          <p className="text-base font-semibold text-text-primary dark:text-gray-100 mt-0.5">
            &ldquo;{name}&rdquo;
          </p>
        </div>

        <p className="text-xs text-text-secondary dark:text-gray-400 text-center mb-6 leading-relaxed">
          This will be sent to our team for review. Once approved, it will appear for all users on WA Directory.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-text-secondary dark:text-gray-400 bg-surface dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-whatsapp-600 hover:bg-whatsapp-700 rounded-xl transition-colors shadow-sm"
          >
            Request It
          </button>
        </div>
      </div>
    </div>
  )
}
