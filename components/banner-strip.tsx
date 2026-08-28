'use client'

import { useEffect, useState } from 'react'
import { getClient } from '@/lib/supabase-client'

export interface BannerData {
  id: string
  text: string
  link: string
  link_label: string
}

const dismissKey = (id: string) => `banner-dismissed-${id}`

export default function BannerStrip() {
  const [banners, setBanners] = useState<BannerData[]>([])

  useEffect(() => {
    async function fetchBanners() {
      try {
        const { data } = await getClient()
          .from('banners')
          .select('id, text, link, link_label')
          .eq('active', true)
          .order('created_at', { ascending: false })
        if (data) {
          const mapped = data.map(b => ({
            id: b.id,
            text: b.text,
            link: b.link || '',
            link_label: b.link_label || 'Learn more',
          }))
          setBanners(mapped)
          const initial: Record<string, boolean> = {}
          for (const b of mapped) initial[b.id] = true
          setVisible(initial)
        }
      } catch {}
    }
    fetchBanners()
  }, [])

  const [visible, setVisible] = useState<Record<string, boolean>>({})

  const ids = banners.map(b => b.id).join(',')
  useEffect(() => {
    setVisible(prev => {
      const next = { ...prev }
      for (const b of banners) {
        try {
          if (sessionStorage.getItem(dismissKey(b.id))) next[b.id] = false
        } catch {
          // sessionStorage unavailable — leave banner visible
        }
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids])

  const active = banners.filter(b => visible[b.id])
  if (active.length === 0) return null

  return (
    <div className="space-y-1 px-3 pt-2">
      {active.map(b => (
        <div
          key={b.id}
          className="relative mx-auto max-w-6xl rounded-xl bg-gradient-to-r from-whatsapp-600 to-whatsapp-500 text-white px-4 py-2.5 pr-10 shadow-sm flex items-center gap-3"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <p className="text-sm font-medium flex-1 min-w-0">{b.text}</p>
          {b.link && (
            <a
              href={b.link}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs font-bold bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1 transition-colors"
            >
              {b.link_label || 'Learn more'}
            </a>
          )}
          <button
            onClick={() => {
              setVisible(v => ({ ...v, [b.id]: false }))
              try {
                sessionStorage.setItem(dismissKey(b.id), '1')
              } catch {
              }
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            aria-label="Dismiss banner"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}