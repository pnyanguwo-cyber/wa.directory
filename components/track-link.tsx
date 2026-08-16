'use client'

import { trackEvent, type StatsEventType } from '@/lib/track'

export default function TrackLink({ href, businessId, type, className, children }: {
  href: string
  businessId: string
  type: StatsEventType
  className?: string
  children: React.ReactNode
}) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (businessId) trackEvent(businessId, type)
  }

  return (
    <a href={href} onClick={handleClick} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  )
}