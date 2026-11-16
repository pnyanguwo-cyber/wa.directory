'use client'

import { useState } from 'react'

interface Tip {
  level: 'good' | 'warn' | 'bad'
  title: string
  detail: string
}

export default function TipsList({ tips }: { tips: Tip[] }) {
  const [done, setDone] = useState<Set<number>>(new Set())
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())

  const levelStyles: Record<Tip['level'], string> = {
    good: 'border-whatsapp-200 bg-whatsapp-50/60',
    warn: 'border-amber-200 bg-amber-50/60',
    bad: 'border-red-200 bg-red-50/60',
  }
  const levelDot: Record<Tip['level'], string> = {
    good: 'bg-whatsapp-500',
    warn: 'bg-amber-500',
    bad: 'bg-red-500',
  }

  if (tips.length && tips.every((_, i) => dismissed.has(i))) {
    return <p className="text-xs text-text-secondary">All tips dismissed. Reload the page to see them again.</p>
  }

  return (
    <div className="space-y-3">
      {tips.map((tip, i) => {
        if (dismissed.has(i)) return null
        const isDone = done.has(i)
        return (
          <div key={i} className={`border rounded-2xl p-4 ${levelStyles[tip.level]}${isDone ? ' opacity-60' : ''}`}>
            <p className="text-sm font-bold text-text-primary flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${levelDot[tip.level]}`} />
              {tip.title}
              {isDone && <span className="ml-auto text-[11px] font-semibold text-whatsapp-700">Done</span>}
            </p>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">{tip.detail}</p>
            <div className="mt-3 flex items-center gap-4">
              {isDone ? (
                <button
                  type="button"
                  onClick={() =>
                    setDone(prev => {
                      const next = new Set(prev)
                      next.delete(i)
                      return next
                    })
                  }
                  className="text-[11px] font-semibold text-text-secondary hover:text-text-primary"
                >
                  Undo
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setDone(prev => new Set(prev).add(i))}
                    className="text-[11px] font-semibold text-whatsapp-700 hover:text-whatsapp-800"
                  >
                    Mark done
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissed(prev => new Set(prev).add(i))}
                    className="text-[11px] font-semibold text-text-secondary hover:text-text-primary"
                  >
                    Dismiss
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
