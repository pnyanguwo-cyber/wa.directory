'use client'

import { useEffect, useState } from 'react'

interface SideAd { text: string; link: string; image_url: string; active: boolean }

export default function SideAdRails() {
  const [ads, setAds] = useState<{ left: SideAd; right: SideAd } | null>(null)

  useEffect(() => {
    fetch('/api/side-ads')
      .then(r => r.json())
      .then(d => setAds(d.sideAds))
      .catch(() => {})
  }, [])

  const render = (side: 'left' | 'right', ad: SideAd | undefined) => {
    if (!ad?.active || (!ad.text && !ad.image_url)) return null
    const content = (
      <div className="w-40 rounded-2xl border border-white/80 bg-white/90 p-3 shadow-card backdrop-blur-sm">
        {ad.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.image_url} alt="" className="mb-2 h-24 w-full rounded-lg object-cover" />
        )}
        {ad.text && <p className="text-xs font-medium text-text-primary">{ad.text}</p>}
        {ad.link && <span className="mt-2 block text-[11px] font-semibold text-whatsapp-700">Learn more →</span>}
      </div>
    )
    return ad.link ? (
      <a href={ad.link} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    ) : (
      content
    )
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-y-0 left-0 z-20 hidden w-48 items-start justify-center pt-28 xl:flex">
        <div className="pointer-events-auto">{render('left', ads?.left)}</div>
      </div>
      <div className="pointer-events-none fixed inset-y-0 right-0 z-20 hidden w-48 items-start justify-center pt-28 xl:flex">
        <div className="pointer-events-auto">{render('right', ads?.right)}</div>
      </div>
    </>
  )
}
