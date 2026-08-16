'use client'

import { useEffect, useRef } from 'react'
import { trackEvent, type StatsEventType } from '@/lib/track'

export default function StatsPing({ businessId, type, category, city }: {
  businessId: string
  type: StatsEventType
  category?: string
  city?: string
}) {
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    const t = setTimeout(() => trackEvent(businessId, type, { category, city }), 800)
    return () => clearTimeout(t)
  }, [businessId, type, category, city])

  return null
}