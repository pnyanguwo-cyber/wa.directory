'use client'

import { useRef, useState, useEffect } from 'react'
import { QRCodeCanvas } from 'qrcode.react'

interface QrCardProps {
  value: string
  title?: string
  subtitle?: string
  size?: number
  downloadName?: string
}

export default function QrCard({
  value,
  title,
  subtitle,
  size = 200,
  downloadName = 'wa-directory-qr.png',
}: QrCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  function download() {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = downloadName
    a.click()
  }

  if (!mounted) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-card inline-flex flex-col items-center gap-2">
        <div style={{ width: size, height: size }} className="bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-card inline-flex flex-col items-center gap-2">
      {title && <p className="text-sm font-semibold text-text-primary">{title}</p>}
      <QRCodeCanvas
        ref={canvasRef}
        value={value}
        size={size}
        level="H"
        bgColor="#ffffff"
        fgColor="#000000"
        marginSize={2}
        imageSettings={{
          src: '/logo-square.png',
          height: size * 0.2,
          width: size * 0.2,
          excavate: true,
        }}
      />
      {subtitle && <p className="text-xs text-text-secondary text-center">{subtitle}</p>}
      <button
        onClick={download}
        className="text-xs text-whatsapp-600 font-medium hover:underline"
      >
        Download QR
      </button>
    </div>
  )
}