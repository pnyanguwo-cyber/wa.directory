'use client'

import { useState, useEffect } from 'react'
import DiscoveryModeSwitch from '@/components/discovery-mode-switch'
import { Clock, Share2, Check } from 'lucide-react'

export default function MapTopBar({ mode }: { mode: 'all' | 'products' | 'services' }) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleString('en-ZW', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Harare',
      }))
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [])

  const [copied, setCopied] = useState(false)
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'WA Directory Map',
          text: 'Explore verified businesses in Zimbabwe',
          url: window.location.href,
        })
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="shrink-0 bg-white/90 backdrop-blur-xl border-b border-white/80 shadow-sm px-4 sm:px-6 py-3">
      <div className="max-w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Mode switch */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <DiscoveryModeSwitch
            mode={mode}
            allHref="/map"
            productsHref="/map?mode=products"
            servicesHref="/map?mode=services"
            className="bg-white/80 backdrop-blur-md border border-white/80 rounded-full p-1 shadow-sm"
          />
        </div>

        {/* Right: Time and Share */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/80 font-medium">
            <Clock className="w-3.5 h-3.5 text-whatsapp-600 shrink-0" />
            <span className="font-mono tabular-nums">{time}</span>
          </div>
          <button
            onClick={handleShare}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
              copied
                ? 'bg-whatsapp-600 text-white border-whatsapp-700 shadow-whatsapp-500/25'
                : 'bg-white/80 backdrop-blur-md text-slate-700 hover:text-whatsapp-700 hover:bg-white border border-white/80 shadow-sm'
            }`}
            title="Share this map"
          >
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}