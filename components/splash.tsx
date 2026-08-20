'use client'

import Image from 'next/image'

export default function Splash({ label }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center gap-5 animate-fade-in">
      <Image src="/logo-square.png" alt="WA Directory" width={128} height={128} priority className="w-20 h-20 object-contain animate-bounce-slow" />
      <div className="flex items-center gap-2.5">
        <svg className="w-5 h-5 animate-spin text-whatsapp-500" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm font-semibold text-text-primary">{label || 'Loading...'}</p>
      </div>
    </div>
  )
}