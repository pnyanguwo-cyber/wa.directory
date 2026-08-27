'use client'

import { useState, useEffect } from 'react'

interface RatingBreakdownProps {
  businessId: string
  totalReviews: number
}

interface Distribution {
  5: number
  4: number
  3: number
  2: number
  1: number
}

export default function RatingBreakdown({ businessId, totalReviews }: RatingBreakdownProps) {
  const [distribution, setDistribution] = useState<Distribution>({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDistribution() {
      try {
        const res = await fetch(`/api/reviews?business_id=${businessId}`)
        const data = await res.json()
        if (data.reviews) {
          const dist: Distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
          for (const r of data.reviews) {
            const star = Math.min(5, Math.max(1, Math.round(r.rating)))
            dist[star as keyof Distribution]++
          }
          setDistribution(dist)
        }
      } catch {}
      setLoading(false)
    }
    fetchDistribution()
  }, [businessId])

  if (loading || totalReviews === 0) return null

  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map(star => {
        const count = distribution[star as keyof Distribution]
        const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-text-secondary text-right">{star}</span>
            <svg className="w-3 h-3 text-yellow-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 text-right text-text-secondary">{count}</span>
          </div>
        )
      })}
    </div>
  )
}
