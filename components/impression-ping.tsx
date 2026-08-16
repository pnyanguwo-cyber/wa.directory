'use client'

import { useEffect, useRef } from 'react'

export default function ImpressionPing({ businesses, category, city }: {
  businesses: { id: string }[]
  category?: string
  city?: string
}) {
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current || businesses.length === 0) return
    sent.current = true
    const t = setTimeout(() => {
      try {
        const events = businesses.map(b => ({
          business_id: b.id,
          type: 'impression',
          category: category || '',
          city: city || '',
        }))
        navigator.sendBeacon?.('/api/stats/event', new Blob([JSON.stringify({ events })], { type: 'application/json' }))
      } catch {
      }
    }, 900)
    return () => clearTimeout(t)
  }, [businesses, category, city])

  return null
}