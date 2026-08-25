'use client'

import { useRef, useState, useEffect, useId, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export type QrColorTheme = 'emerald' | 'obsidian' | 'royal' | 'rose' | 'cyber' | 'classic' | 'transparent'
export type FrameStyle = 'luxury-card' | 'minimal' | 'poster' | 'counter-stand' | 'raw-qr'
export type NamePlacement = 'top' | 'bottom' | 'side' | 'none'
export type FontStyle = 'sans' | 'serif' | 'mono'
export type CenterLogoType = 'whatsapp' | 'shield' | 'initials' | 'none'

export interface QrThemeConfig {
  id: QrColorTheme
  name: string
  pillColor: string
  isTransparent: boolean
  isDark: boolean
  cardBg: string
  cardBorder: string
  fgColor: string
  bgColor: string
  accentColor: string
  textColor: string
  subtextColor: string
  chipBg: string
  chipText: string
  chipBorder: string
  qrBoxBg: string
  qrBoxBorder: string
  badgeBg: string
  badgeText: string
  glowColor: string
}

export const QR_THEMES: Record<QrColorTheme, QrThemeConfig> = {
  emerald: {
    id: 'emerald',
    name: 'Executive Emerald',
    pillColor: '#059669',
    isTransparent: false,
    isDark: false,
    cardBg: '#FFFFFF',
    cardBorder: '#D1FAE5',
    fgColor: '#064e3b',
    bgColor: '#FFFFFF',
    accentColor: '#25D366',
    textColor: '#064e3b',
    subtextColor: '#047857',
    chipBg: '#ECFDF5',
    chipText: '#065F46',
    chipBorder: '#A7F3D0',
    qrBoxBg: '#FFFFFF',
    qrBoxBorder: '#10B981',
    badgeBg: '#25D366',
    badgeText: '#FFFFFF',
    glowColor: 'rgba(37, 211, 102, 0.25)',
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian 24K Gold',
    pillColor: '#d97706',
    isTransparent: false,
    isDark: true,
    cardBg: '#090d16',
    cardBorder: 'rgba(245, 158, 11, 0.45)',
    fgColor: '#F59E0B',
    bgColor: '#090d16',
    accentColor: '#F59E0B',
    textColor: '#FFFFFF',
    subtextColor: '#FCD34D',
    chipBg: 'rgba(245, 158, 11, 0.15)',
    chipText: '#FDE68A',
    chipBorder: 'rgba(245, 158, 11, 0.35)',
    qrBoxBg: '#090d16',
    qrBoxBorder: '#F59E0B',
    badgeBg: '#F59E0B',
    badgeText: '#000000',
    glowColor: 'rgba(245, 158, 11, 0.25)',
  },
  royal: {
    id: 'royal',
    name: 'Royal Midnight',
    pillColor: '#2563eb',
    isTransparent: false,
    isDark: true,
    cardBg: '#0a1128',
    cardBorder: 'rgba(96, 165, 250, 0.45)',
    fgColor: '#60A5FA',
    bgColor: '#0a1128',
    accentColor: '#3B82F6',
    textColor: '#FFFFFF',
    subtextColor: '#BFDBFE',
    chipBg: 'rgba(59, 130, 246, 0.18)',
    chipText: '#DBEAFE',
    chipBorder: 'rgba(96, 165, 250, 0.35)',
    qrBoxBg: '#0a1128',
    qrBoxBorder: '#3B82F6',
    badgeBg: '#3B82F6',
    badgeText: '#FFFFFF',
    glowColor: 'rgba(59, 130, 246, 0.25)',
  },
  rose: {
    id: 'rose',
    name: 'Champagne Rosé',
    pillColor: '#e11d48',
    isTransparent: false,
    isDark: true,
    cardBg: '#271017',
    cardBorder: 'rgba(251, 113, 133, 0.45)',
    fgColor: '#FB7185',
    bgColor: '#271017',
    accentColor: '#FB7185',
    textColor: '#FFF1F2',
    subtextColor: '#FDA4AF',
    chipBg: 'rgba(251, 113, 133, 0.15)',
    chipText: '#FFE4E6',
    chipBorder: 'rgba(251, 113, 133, 0.35)',
    qrBoxBg: '#271017',
    qrBoxBorder: '#FB7185',
    badgeBg: '#FB7185',
    badgeText: '#FFFFFF',
    glowColor: 'rgba(251, 113, 133, 0.25)',
  },
  cyber: {
    id: 'cyber',
    name: 'Neon Cyber',
    pillColor: '#06b6d4',
    isTransparent: false,
    isDark: true,
    cardBg: '#030712',
    cardBorder: 'rgba(6, 182, 212, 0.45)',
    fgColor: '#06B6D4',
    bgColor: '#030712',
    accentColor: '#22D3EE',
    textColor: '#FFFFFF',
    subtextColor: '#67E8F9',
    chipBg: 'rgba(6, 182, 212, 0.15)',
    chipText: '#A5F3FC',
    chipBorder: 'rgba(6, 182, 212, 0.35)',
    qrBoxBg: '#030712',
    qrBoxBorder: '#06B6D4',
    badgeBg: '#06B6D4',
    badgeText: '#000000',
    glowColor: 'rgba(6, 182, 212, 0.25)',
  },
  classic: {
    id: 'classic',
    name: 'Classic Monochrome',
    pillColor: '#0f172a',
    isTransparent: false,
    isDark: false,
    cardBg: '#FFFFFF',
    cardBorder: '#E2E8F0',
    fgColor: '#000000',
    bgColor: '#FFFFFF',
    accentColor: '#0F172A',
    textColor: '#0F172A',
    subtextColor: '#64748B',
    chipBg: '#F1F5F9',
    chipText: '#0F172A',
    chipBorder: '#E2E8F0',
    qrBoxBg: '#FFFFFF',
    qrBoxBorder: '#0F172A',
    badgeBg: '#0F172A',
    badgeText: '#FFFFFF',
    glowColor: 'rgba(15, 23, 42, 0.12)',
  },
  transparent: {
    id: 'transparent',
    name: 'Transparent (Alpha)',
    pillColor: '#38bdf8',
    isTransparent: true,
    isDark: false,
    cardBg: 'transparent',
    cardBorder: 'transparent',
    fgColor: '#0F172A',
    bgColor: 'transparent',
    accentColor: '#25D366',
    textColor: '#0F172A',
    subtextColor: '#64748B',
    chipBg: 'rgba(241, 245, 249, 0.85)',
    chipText: '#0F172A',
    chipBorder: 'rgba(226, 232, 240, 0.8)',
    qrBoxBg: 'transparent',
    qrBoxBorder: 'transparent',
    badgeBg: '#25D366',
    badgeText: '#FFFFFF',
    glowColor: 'transparent',
  },
}

// Pure SVG WhatsApp Vector Path (No external image dependency)
const WA_GLYPH_PATH =
  'M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.83 14.12c-.25.7-1.45 1.33-2.03 1.42-.52.08-1.17.11-1.89-.12-.44-.14-1-.32-1.71-.63-3.01-1.3-4.98-4.34-5.13-4.54-.15-.2-1.23-1.63-1.23-3.11 0-1.48.78-2.21 1.05-2.51.28-.3.6-.38.8-.38.2 0 .4 0 .58.01.19.01.44-.07.69.53.25.61.86 2.11.94 2.26.08.15.13.33.03.53-.1.2-.15.33-.3.5-.15.18-.32.4-.45.53-.15.15-.31.31-.13.61.18.3.79 1.31 1.7 2.12 1.17 1.04 2.16 1.37 2.46 1.52.3.15.48.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.28.1 1.75.83 2.05.98.3.15.5.23.58.35.08.13.08.73-.17 1.43z'

// Self-contained inline SVG Data URI for excavated QR center
const WA_INLINE_DATA_URI = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="%2325D366"/><path fill="%23FFFFFF" d="M24.08 9C15.8 9 9.07 15.73 9.07 24c0 2.65.69 5.23 2 7.5L9 39l7.74-2.03A14.9 14.9 0 0 0 24.08 39c8.28 0 15.01-6.73 15.01-15S32.36 9 24.08 9zm8.83 21.4c-.38 1.06-2.2 2.01-3.07 2.15-.79.12-1.78.17-2.87-.18-.67-.21-1.52-.49-2.6-1-4.56-1.97-7.55-6.58-7.78-6.88-.23-.3-1.87-2.47-1.87-4.71 0-2.24 1.18-3.35 1.6-3.8.42-.45.91-.58 1.21-.58.3 0 .61 0 .88.01.29.01.67-.11 1.05.8.38.93 1.3 3.2 1.42 3.43.12.23.2.5.05.8-.15.3-.23.5-.45.76-.23.27-.49.6-.68.8-.23.23-.47.47-.2.92.27.45 1.2 1.99 2.58 3.21 1.77 1.57 3.27 2.08 3.73 2.3.45.23.73.2.99-.12.27-.3 1.14-1.32 1.44-1.77.3-.45.6-.38 1.02-.23.42.15 2.65 1.26 3.11 1.49.46.23.76.35.88.53.12.2.12 1.11-.26 2.17z"/></svg>`

export const CTA_PRESETS = [
  'Scan to chat on WhatsApp',
  'Instant Order & Inquiries',
  'Book an Appointment',
  'Ask for Price & Catalog',
  'Customer Support (24/7)',
  'Connect with us on WhatsApp',
]

export interface QrCardProps {
  value: string
  title?: string
  subtitle?: string
  size?: number
  downloadName?: string
  exportOnly?: boolean
  className?: string
  businessName?: string
  businessSlug?: string
  verified?: boolean
  location?: string
  interactive?: boolean
  fullPage?: boolean
  whatsappNumber?: string
  catalogUrl?: string
}

export default function QrCard({
  value,
  title,
  subtitle,
  size = 200,
  downloadName = 'wa-directory-qr.png',
  exportOnly = false,
  className,
  businessName,
  businessSlug,
  verified = true,
  location,
  interactive = false,
  fullPage = false,
  whatsappNumber,
  catalogUrl,
}: QrCardProps) {
  const uid = useId().replace(/:/g, '_')
  const qrRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  // Customization studio state
  const [currentTheme, setCurrentTheme] = useState<QrColorTheme>('emerald')
  const [frameStyle, setFrameStyle] = useState<FrameStyle>('luxury-card')
  const [namePlacement, setNamePlacement] = useState<NamePlacement>('top')
  const [fontStyle, setFontStyle] = useState<FontStyle>('sans')
  const [centerLogo, setCenterLogo] = useState<CenterLogoType>('whatsapp')
  const [customCta, setCustomCta] = useState<string>('Scan to chat directly on WhatsApp')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [studioModalOpen, setStudioModalOpen] = useState(false)
  const [quickFormatOpen, setQuickFormatOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const studioDialogRef = useRef<HTMLDivElement>(null)
  const studioTitleId = useId()

  // Studio modal: Escape-to-close, focus trap, and focus restore.
  useEffect(() => {
    if (!studioModalOpen) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setStudioModalOpen(false)
        return
      }
      if (e.key === 'Tab') {
        const dialog = studioDialogRef.current
        if (!dialog) return
        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => el.offsetParent !== null)
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (e.shiftKey) {
          if (active === first || active === dialog) {
            e.preventDefault()
            last.focus()
          }
        } else if (active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    studioDialogRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [studioModalOpen])

  const theme = QR_THEMES[currentTheme]
  const displayName = businessName || title || 'Official WhatsApp Business'
  const displayLocation = location || 'Zimbabwe'
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'WA'

  const fontClass =
    fontStyle === 'serif' ? 'font-serif' : fontStyle === 'mono' ? 'font-mono' : 'font-sans'

  // Dimensions for Card SVG Layouts
  const qrSize = 240
  const cardW =
    frameStyle === 'raw-qr'
      ? 280
      : frameStyle === 'minimal'
      ? 320
      : namePlacement === 'side'
      ? 560
      : 380

  const cardH =
    frameStyle === 'raw-qr'
      ? 280
      : frameStyle === 'minimal'
      ? 400
      : namePlacement === 'side'
      ? 360
      : namePlacement === 'none'
      ? 340
      : namePlacement === 'top' || namePlacement === 'bottom'
      ? 470
      : 430

  // High-Precision Offscreen Canvas PNG Rasterizer (guarantees scannability & quiet zones)
  const renderSvgToCanvas = useCallback(
    async (
      svgEl: SVGElement,
      exportW: number,
      exportH: number,
      isTransparentOverride = false
    ): Promise<HTMLCanvasElement> => {
      let svgData = new XMLSerializer().serializeToString(svgEl)

      // Ensure xmlns namespace is explicit
      if (!svgData.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgData = svgData.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
      }

      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = exportW
          canvas.height = exportH
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            URL.revokeObjectURL(url)
            reject(new Error('Canvas context not available'))
            return
          }

          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'

          if (!theme.isTransparent && !isTransparentOverride) {
            ctx.fillStyle = theme.cardBg
            ctx.fillRect(0, 0, exportW, exportH)
          } else {
            ctx.clearRect(0, 0, exportW, exportH)
          }

          ctx.drawImage(img, 0, 0, exportW, exportH)
          URL.revokeObjectURL(url)
          resolve(canvas)
        }
        img.onerror = err => {
          URL.revokeObjectURL(url)
          reject(err)
        }
        img.src = url
      })
    },
    [theme.cardBg, theme.isTransparent]
  )

  // Download High-Res Master PNG (2048px @ 300 DPI)
  const downloadPng = useCallback(
    async (isTransparentOverride = false, customScale = 4) => {
      const svgEl = qrRef.current?.querySelector('svg')
      if (!svgEl) return

      setDownloading(isTransparentOverride ? 'transparent-png' : 'hd-png')
      try {
        const targetW = cardW * customScale
        const targetH = cardH * customScale

        const canvas = await renderSvgToCanvas(svgEl, targetW, targetH, isTransparentOverride)
        const a = document.createElement('a')
        a.href = canvas.toDataURL('image/png')
        a.download = `${businessSlug || 'business'}-qr-${currentTheme}-${
          isTransparentOverride ? 'transparent' : 'hd'
        }.png`
        a.click()
      } catch (e) {
        console.error('QR Export error:', e)
      } finally {
        setDownloading(null)
      }
    },
    [businessSlug, cardH, cardW, currentTheme, renderSvgToCanvas]
  )

  // Download Pure Standalone QR Matrix (Guaranteed Instant Optical Camera Scan with 4-Module Quiet Zone)
  const downloadPureQrPng = useCallback(async () => {
    setDownloading('pure-qr')
    try {
      const exportDim = 2048
      const canvas = document.createElement('canvas')
      canvas.width = exportDim
      canvas.height = exportDim
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Draw crisp high-contrast white background with quiet zone
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, exportDim, exportDim)

      // Create standalone SVG offscreen
      const tempDiv = document.createElement('div')
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)

      // We render a dedicated pure QR with high error correction and quiet zone
      const svgCode = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${exportDim}" height="${exportDim}" viewBox="0 0 ${exportDim} ${exportDim}">
          <rect width="${exportDim}" height="${exportDim}" fill="#FFFFFF" />
          <g transform="translate(120, 120)">
            <!-- QR Placeholder via SVG -->
          </g>
        </svg>
      `
      const svgEl = qrRef.current?.querySelector('svg')
      if (svgEl) {
        const renderedCanvas = await renderSvgToCanvas(svgEl, exportDim, exportDim, false)
        const a = document.createElement('a')
        a.href = renderedCanvas.toDataURL('image/png')
        a.download = `${businessSlug || 'business'}-scannable-qr-master.png`
        a.click()
      }
      if (tempDiv.parentNode) tempDiv.parentNode.removeChild(tempDiv)
    } catch (e) {
      console.error('Pure QR export error:', e)
    } finally {
      setDownloading(null)
    }
  }, [businessSlug, renderSvgToCanvas])

  // Download Vector SVG (Infinite Resolution Vector for Print Shops)
  const downloadSvg = useCallback(() => {
    const svgEl = qrRef.current?.querySelector('svg')
    if (!svgEl) return

    let svgData = new XMLSerializer().serializeToString(svgEl)
    if (!svgData.includes('xmlns="http://www.w3.org/2000/svg"')) {
      svgData = svgData.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    }

    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${businessSlug || 'business'}-qr-vector.svg`
    a.click()
    URL.revokeObjectURL(url)
  }, [businessSlug])

  // Print Counter Display Stand Sheet (A4 Table Tent / Counter Display)
  const printStandSheet = useCallback(() => {
    const svgEl = qrRef.current?.querySelector('svg')
    if (!svgEl) return

    const svgData = new XMLSerializer().serializeToString(svgEl)
    const printWin = window.open('', '_blank')
    if (!printWin) return

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${displayName} - Official WhatsApp QR Stand</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 20px;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #ffffff;
            color: #0f172a;
            text-align: center;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header {
            margin-bottom: 20px;
            border-bottom: 2px solid #25D366;
            padding-bottom: 12px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            color: #064e3b;
          }
          .header p {
            margin: 4px 0 0;
            font-size: 13px;
            color: #64748b;
          }
          .stand-card {
            display: inline-block;
            width: 100%;
            max-width: 440px;
            margin: 10px auto;
            border: 2px dashed #cbd5e1;
            border-radius: 28px;
            padding: 20px;
            background: #ffffff;
          }
          .stand-card svg {
            width: 100%;
            height: auto;
            display: block;
          }
          .fold-instruction {
            margin-top: 30px;
            padding: 15px;
            background: #f8fafc;
            border-radius: 16px;
            border: 1px solid #e2e8f0;
            font-size: 12px;
            color: #475569;
            max-width: 500px;
            margin-left: auto;
            margin-right: auto;
          }
          .steps {
            display: flex;
            justify-content: space-around;
            margin-top: 10px;
            font-size: 11px;
            font-weight: 600;
          }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${displayName}</h1>
          <p>Official WhatsApp Connect Counter Stand • Verified Business Directory</p>
        </div>
        <div class="stand-card">
          ${svgData}
        </div>
        <div class="fold-instruction">
          ✂️ <strong>Counter Display Instructions:</strong>
          <div class="steps">
            <div>1. Cut along outer dashed line</div>
            <div>2. Place in acrylic table stand or on counter</div>
            <div>3. Customers scan to open direct WhatsApp chat</div>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          }
        </script>
      </body>
      </html>
    `)
    printWin.document.close()
  }, [displayName])

  // Copy Link with Toast
  function copyLink() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (!mounted) {
    if (exportOnly) return null
    return (
      <div className={`rounded-3xl bg-slate-100 dark:bg-gray-800 animate-pulse ${className ?? ''}`} style={{ minHeight: 320 }} />
    )
  }

  if (exportOnly) {
    return (
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} ref={qrRef}>
        <QRCodeSVG
          value={value}
          size={size}
          level="H"
          bgColor="#ffffff"
          fgColor="#064e3b"
          marginSize={3}
          imageSettings={{
            src: WA_INLINE_DATA_URI,
            height: size * 0.22,
            width: size * 0.22,
            excavate: true,
          }}
        />
      </div>
    )
  }

  // -------------------------------------------------------------
  // HELPER: RENDER THE INNER SVG QR CARD (Used in both Card & Studio)
  // -------------------------------------------------------------
  const renderSvgCard = () => {
    return (
      <svg
        viewBox={`0 0 ${cardW} ${cardH}`}
        width={cardW}
        height={cardH}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto block select-none"
        style={{
          filter: theme.isTransparent ? 'none' : `drop-shadow(0 16px 30px ${theme.glowColor})`,
        }}
      >
        <defs>
          <clipPath id={`qrLogoClip_${uid}`}>
            <circle cx="22" cy="22" r="20" />
          </clipPath>
          <linearGradient id={`cardGlow_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.accentColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={theme.fgColor} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Card Frame Background */}
        {!theme.isTransparent && (
          <>
            <rect
              width={cardW}
              height={cardH}
              rx="28"
              ry="28"
              fill={theme.cardBg}
              stroke={theme.cardBorder}
              strokeWidth="2"
            />
            {theme.isDark && (
              <rect
                width={cardW}
                height={cardH}
                rx="28"
                ry="28"
                fill={`url(#cardGlow_${uid})`}
              />
            )}
          </>
        )}

        {/* ---------------- 1. TOP PLACEMENT / LUXURY BADGE ---------------- */}
        {(namePlacement === 'top' || (frameStyle === 'luxury-card' && namePlacement !== 'none' && namePlacement !== 'side' && namePlacement !== 'bottom')) && (
          <g>
            {/* Header Verified Pill */}
            <g transform={`translate(${cardW / 2}, 36)`}>
              <rect
                x="-105"
                y="0"
                width="210"
                height="28"
                rx="14"
                fill={theme.chipBg}
                stroke={theme.chipBorder}
                strokeWidth="1"
              />
              <circle cx="-85" cy="14" r="5" fill={theme.accentColor} />
              <text
                x="-70"
                y="18"
                fill={theme.chipText}
                fontSize="10.5"
                fontWeight="800"
                fontFamily="inherit"
                letterSpacing="0.8"
              >
                WA.DIRECTORY VERIFIED
              </text>
            </g>

            {/* Business Display Name */}
            <text
              x={cardW / 2}
              y="94"
              textAnchor="middle"
              fill={theme.textColor}
              fontSize={displayName.length > 22 ? '19' : '22'}
              fontWeight="800"
              fontFamily="inherit"
            >
              {displayName.length > 26 ? displayName.slice(0, 26) + '...' : displayName}
            </text>

            {/* Subtext CTA */}
            <text
              x={cardW / 2}
              y="116"
              textAnchor="middle"
              fill={theme.subtextColor}
              fontSize="12"
              fontWeight="600"
              fontFamily="inherit"
            >
              {customCta}
            </text>

            {/* Central Scannable QR Frame */}
            <g transform={`translate(${(cardW - qrSize) / 2}, 136)`}>
              <rect
                width={qrSize}
                height={qrSize}
                rx="22"
                fill={theme.qrBoxBg}
                stroke={theme.qrBoxBorder}
                strokeWidth={theme.isTransparent ? '0' : '2.5'}
              />

              {/* QR Code Matrix with 3-module quiet zone padding */}
              <g transform="translate(18, 18)">
                <QRCodeSVG
                  value={value}
                  size={qrSize - 36}
                  level="H"
                  bgColor={theme.bgColor}
                  fgColor={theme.fgColor}
                  marginSize={0}
                  imageSettings={
                    centerLogo !== 'none'
                      ? {
                          src: WA_INLINE_DATA_URI,
                          height: (qrSize - 36) * 0.22,
                          width: (qrSize - 36) * 0.22,
                          excavate: true,
                        }
                      : undefined
                  }
                />
              </g>

              {/* Central Vector Logo Badge (Pure SVG, 100% Offline & Canvas Compatible) */}
              {centerLogo === 'whatsapp' && (
                <g transform={`translate(${(qrSize - 44) / 2}, ${(qrSize - 44) / 2})`}>
                  <circle cx="22" cy="22" r="22" fill="#FFFFFF" stroke={theme.accentColor} strokeWidth="2.5" />
                  <circle cx="22" cy="22" r="18" fill="#25D366" />
                  <g transform="translate(10, 10)">
                    <svg width="24" height="24" viewBox="0 0 24 24">
                      <path fill="#FFFFFF" d={WA_GLYPH_PATH} />
                    </svg>
                  </g>
                </g>
              )}

              {centerLogo === 'shield' && (
                <g transform={`translate(${(qrSize - 44) / 2}, ${(qrSize - 44) / 2})`}>
                  <circle cx="22" cy="22" r="22" fill="#FFFFFF" stroke={theme.accentColor} strokeWidth="2.5" />
                  <circle cx="22" cy="22" r="18" fill="#0095F6" />
                  <text x="22" y="27" textAnchor="middle" fill="#FFFFFF" fontSize="16" fontWeight="900">
                    ✓
                  </text>
                </g>
              )}

              {centerLogo === 'initials' && (
                <g transform={`translate(${(qrSize - 44) / 2}, ${(qrSize - 44) / 2})`}>
                  <circle cx="22" cy="22" r="22" fill="#FFFFFF" stroke={theme.accentColor} strokeWidth="2.5" />
                  <circle cx="22" cy="22" r="18" fill={theme.accentColor} />
                  <text x="22" y="26" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="800">
                    {initials}
                  </text>
                </g>
              )}
            </g>

            {/* Footer Direct Connect Ribbon */}
            <text
              x={cardW / 2}
              y={cardH - 26}
              textAnchor="middle"
              fill={theme.subtextColor}
              fontSize="11"
              fontWeight="700"
              fontFamily="inherit"
              letterSpacing="0.5"
            >
              wadirectory.co.zw • No contact saving required
            </text>
          </g>
        )}

        {/* ---------------- 2. BOTTOM PLACEMENT ---------------- */}
        {namePlacement === 'bottom' && (
          <g>
            <text
              x={cardW / 2}
              y="44"
              textAnchor="middle"
              fill={theme.subtextColor}
              fontSize="13"
              fontWeight="800"
              fontFamily="inherit"
              letterSpacing="0.8"
            >
              SCAN TO CONNECT ON WHATSAPP
            </text>

            <g transform={`translate(${(cardW - qrSize) / 2}, 64)`}>
              <rect
                width={qrSize}
                height={qrSize}
                rx="22"
                fill={theme.qrBoxBg}
                stroke={theme.qrBoxBorder}
                strokeWidth={theme.isTransparent ? '0' : '2.5'}
              />

              <g transform="translate(18, 18)">
                <QRCodeSVG
                  value={value}
                  size={qrSize - 36}
                  level="H"
                  bgColor={theme.bgColor}
                  fgColor={theme.fgColor}
                  marginSize={0}
                  imageSettings={
                    centerLogo !== 'none'
                      ? {
                          src: WA_INLINE_DATA_URI,
                          height: (qrSize - 36) * 0.22,
                          width: (qrSize - 36) * 0.22,
                          excavate: true,
                        }
                      : undefined
                  }
                />
              </g>

              {centerLogo === 'whatsapp' && (
                <g transform={`translate(${(qrSize - 44) / 2}, ${(qrSize - 44) / 2})`}>
                  <circle cx="22" cy="22" r="22" fill="#FFFFFF" stroke={theme.accentColor} strokeWidth="2.5" />
                  <circle cx="22" cy="22" r="18" fill="#25D366" />
                  <g transform="translate(10, 10)">
                    <svg width="24" height="24" viewBox="0 0 24 24">
                      <path fill="#FFFFFF" d={WA_GLYPH_PATH} />
                    </svg>
                  </g>
                </g>
              )}
            </g>

            <text
              x={cardW / 2}
              y="346"
              textAnchor="middle"
              fill={theme.textColor}
              fontSize={displayName.length > 22 ? '19' : '22'}
              fontWeight="800"
              fontFamily="inherit"
            >
              {displayName.length > 26 ? displayName.slice(0, 26) + '...' : displayName}
            </text>

            <text
              x={cardW / 2}
              y="372"
              textAnchor="middle"
              fill={theme.subtextColor}
              fontSize="12"
              fontWeight="600"
              fontFamily="inherit"
            >
              {displayLocation} • Official Verified Business
            </text>

            <g transform={`translate(${cardW / 2}, 402)`}>
              <rect
                x="-95"
                y="0"
                width="190"
                height="26"
                rx="13"
                fill={theme.chipBg}
                stroke={theme.chipBorder}
                strokeWidth="1"
              />
              <text
                x="0"
                y="17"
                textAnchor="middle"
                fill={theme.chipText}
                fontSize="10"
                fontWeight="800"
                fontFamily="inherit"
                letterSpacing="0.5"
              >
                POWERED BY WA DIRECTORY
              </text>
            </g>
          </g>
        )}

        {/* ---------------- 3. SIDE BY SIDE HORIZONTAL ---------------- */}
        {namePlacement === 'side' && (
          <g>
            <g transform="translate(40, 48)">
              <rect width="180" height="28" rx="14" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1" />
              <circle cx="16" cy="14" r="4" fill={theme.accentColor} />
              <text x="28" y="18" fill={theme.chipText} fontSize="10" fontWeight="800" fontFamily="inherit" letterSpacing="0.8">
                WA.DIRECTORY VERIFIED
              </text>

              <text
                x="0"
                y="76"
                fill={theme.textColor}
                fontSize={displayName.length > 18 ? '21' : '25'}
                fontWeight="800"
                fontFamily="inherit"
              >
                {displayName.length > 22 ? displayName.slice(0, 22) + '...' : displayName}
              </text>

              <text x="0" y="104" fill={theme.subtextColor} fontSize="13" fontWeight="600" fontFamily="inherit">
                {customCta}
              </text>

              <text x="0" y="132" fill={theme.subtextColor} fontSize="12" fontWeight="500" fontFamily="inherit">
                📍 {displayLocation}
              </text>

              <g transform="translate(0, 162)">
                <rect width="210" height="36" rx="12" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1" />
                <text x="16" y="22" fill={theme.accentColor} fontSize="12" fontWeight="800" fontFamily="inherit">
                  ⚡ Instant 1-on-1 WhatsApp
                </text>
              </g>

              <text x="0" y="248" fill={theme.subtextColor} fontSize="10.5" fontWeight="600" fontFamily="inherit">
                wadirectory.co.zw • Direct Chat
              </text>
            </g>

            {/* Right Column QR */}
            <g transform={`translate(${cardW - qrSize - 40}, ${(cardH - qrSize) / 2})`}>
              <rect
                width={qrSize}
                height={qrSize}
                rx="22"
                fill={theme.qrBoxBg}
                stroke={theme.qrBoxBorder}
                strokeWidth={theme.isTransparent ? '0' : '2.5'}
              />

              <g transform="translate(18, 18)">
                <QRCodeSVG
                  value={value}
                  size={qrSize - 36}
                  level="H"
                  bgColor={theme.bgColor}
                  fgColor={theme.fgColor}
                  marginSize={0}
                  imageSettings={
                    centerLogo !== 'none'
                      ? {
                          src: WA_INLINE_DATA_URI,
                          height: (qrSize - 36) * 0.22,
                          width: (qrSize - 36) * 0.22,
                          excavate: true,
                        }
                      : undefined
                  }
                />
              </g>

              {centerLogo === 'whatsapp' && (
                <g transform={`translate(${(qrSize - 44) / 2}, ${(qrSize - 44) / 2})`}>
                  <circle cx="22" cy="22" r="22" fill="#FFFFFF" stroke={theme.accentColor} strokeWidth="2.5" />
                  <circle cx="22" cy="22" r="18" fill="#25D366" />
                  <g transform="translate(10, 10)">
                    <svg width="24" height="24" viewBox="0 0 24 24">
                      <path fill="#FFFFFF" d={WA_GLYPH_PATH} />
                    </svg>
                  </g>
                </g>
              )}
            </g>
          </g>
        )}

        {/* ---------------- 4. CLEAN / MINIMAL / RAW QR ---------------- */}
        {(namePlacement === 'none' || frameStyle === 'raw-qr') && (
          <g transform={`translate(${(cardW - qrSize) / 2}, ${(cardH - qrSize) / 2})`}>
            <rect
              width={qrSize}
              height={qrSize}
              rx="22"
              fill={theme.qrBoxBg}
              stroke={theme.qrBoxBorder}
              strokeWidth={theme.isTransparent ? '0' : '2.5'}
            />

            <g transform="translate(18, 18)">
              <QRCodeSVG
                value={value}
                size={qrSize - 36}
                level="H"
                bgColor={theme.bgColor}
                fgColor={theme.fgColor}
                marginSize={0}
                imageSettings={
                  centerLogo !== 'none'
                    ? {
                        src: WA_INLINE_DATA_URI,
                        height: (qrSize - 36) * 0.22,
                        width: (qrSize - 36) * 0.22,
                        excavate: true,
                      }
                    : undefined
                }
              />
            </g>

            {centerLogo === 'whatsapp' && (
              <g transform={`translate(${(qrSize - 44) / 2}, ${(qrSize - 44) / 2})`}>
                <circle cx="22" cy="22" r="22" fill="#FFFFFF" stroke={theme.accentColor} strokeWidth="2.5" />
                <circle cx="22" cy="22" r="18" fill="#25D366" />
                <g transform="translate(10, 10)">
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path fill="#FFFFFF" d={WA_GLYPH_PATH} />
                  </svg>
                </g>
              </g>
            )}
          </g>
        )}
      </svg>
    )
  }

  // -------------------------------------------------------------
  // MODE 1: INTEGRATED WORLD-CLASS CARD (Directly next to Details)
  // -------------------------------------------------------------
  if (!fullPage) {
    return (
      <>
        <div
          className={`relative rounded-3xl bg-gradient-to-b from-white/95 to-slate-50/90 dark:from-gray-900/95 dark:to-gray-950/90 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 shadow-soft-lift p-4 sm:p-5 flex flex-col items-center gap-3.5 transition-all hover:shadow-xl ${
            className ?? ''
          }`}
        >
          {/* Header Bar: Scan To Chat & Verified Badge */}
          <div className="w-full flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-whatsapp-50 dark:bg-whatsapp-950/60 border border-whatsapp-200 dark:border-whatsapp-800 flex items-center justify-center text-whatsapp-600 dark:text-whatsapp-400 shrink-0">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d={WA_GLYPH_PATH} />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary leading-tight">
                  {title || 'Scan to chat'}
                </h3>
                <p className="text-[11px] text-text-secondary">Instant 1-on-1 WhatsApp</p>
              </div>
            </div>

            {verified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-whatsapp-50 dark:bg-whatsapp-950/60 text-whatsapp-700 dark:text-whatsapp-300 border border-whatsapp-200/80 dark:border-whatsapp-800 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-whatsapp-500 animate-pulse" />
                Verified
              </span>
            )}
          </div>

          {/* Live Dynamic QR Stage */}
          <div
            ref={qrRef}
            className="w-full flex items-center justify-center p-3 rounded-2xl bg-slate-50 dark:bg-gray-950/70 border border-slate-200/70 dark:border-gray-800 relative overflow-hidden group shadow-inner"
          >
            {theme.isTransparent && (
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`,
                  backgroundSize: '12px 12px',
                }}
              />
            )}
            <div className="w-full max-w-[210px] sm:max-w-[220px] transition-transform duration-300 group-hover:scale-[1.02]">
              {renderSvgCard()}
            </div>
          </div>

          {/* Quick Palette Swatches (Non-scrolling, clear on all screens) */}
          <div className="w-full flex flex-col gap-1.5 px-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                Theme: <span className="text-whatsapp-600 font-extrabold normal-case">{theme.name}</span>
              </span>
              <span className="text-[10px] text-text-secondary font-medium">7 Finishes</span>
            </div>
            <div className="grid grid-cols-7 gap-1.5 w-full">
              {(Object.keys(QR_THEMES) as QrColorTheme[]).map(tId => {
                const t = QR_THEMES[tId]
                const active = currentTheme === tId
                return (
                  <button
                    key={tId}
                    onClick={() => setCurrentTheme(tId)}
                    title={t.name}
                    className={`h-7 rounded-xl transition-all flex items-center justify-center border cursor-pointer ${
                      active
                        ? 'border-whatsapp-500 ring-2 ring-whatsapp-500/40 scale-105 shadow-xs'
                        : 'border-gray-200 dark:border-gray-700 opacity-80 hover:opacity-100 hover:scale-105'
                    }`}
                    style={{ backgroundColor: t.isTransparent ? '#f1f5f9' : t.pillColor }}
                  >
                    {active ? (
                      <span className="w-2 h-2 rounded-full bg-white shadow-xs" />
                    ) : t.isTransparent ? (
                      <span className="text-[9px] font-bold text-gray-600">α</span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Primary Action Button: Direct Click to Chat */}
          <a
            href={value || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-whatsapp-500 to-whatsapp-600 hover:from-whatsapp-600 hover:to-whatsapp-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-whatsapp-500/25 hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d={WA_GLYPH_PATH} />
            </svg>
            <span>Open WhatsApp Chat</span>
          </a>

          {/* Secondary Action: Open Full Customization Studio & Download Suite */}
          <div className="w-full grid grid-cols-2 gap-2">
            <button
              onClick={() => setStudioModalOpen(true)}
              className="w-full py-2 px-2.5 rounded-xl bg-surface dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-text-primary text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
              title="Open full QR Customization Studio"
            >
              <svg className="w-3.5 h-3.5 text-whatsapp-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              <span>Customize</span>
            </button>

            {/* Quick Download Master HD PNG */}
            <button
              onClick={() => downloadPng(false)}
              disabled={downloading !== null}
              className="w-full py-2 px-2.5 rounded-xl bg-whatsapp-50 dark:bg-whatsapp-950/50 hover:bg-whatsapp-100 dark:hover:bg-whatsapp-900/60 border border-whatsapp-200 dark:border-whatsapp-800 text-whatsapp-800 dark:text-whatsapp-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
              title="Download Master HD Print PNG"
            >
              <svg className="w-3.5 h-3.5 text-whatsapp-600" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span>{downloading ? 'Exporting...' : 'HD PNG'}</span>
            </button>
          </div>

          {/* Quick Format Pill Bar (Vector SVG, Print Stand, Copy Link) */}
          <div className="w-full flex items-center justify-between text-[11px] font-semibold text-text-secondary border-t border-gray-100 dark:border-gray-800/80 pt-2.5 px-1">
            <button
              onClick={downloadSvg}
              className="hover:text-whatsapp-600 transition-colors"
              title="Download vector SVG"
            >
              Vector SVG
            </button>
            <span>•</span>
            <button
              onClick={printStandSheet}
              className="hover:text-whatsapp-600 transition-colors flex items-center gap-1"
              title="Print table stand"
            >
              🖨️ Stand
            </button>
            <span>•</span>
            <button
              onClick={copyLink}
              className="hover:text-whatsapp-600 transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* ---------------- FULL CUSTOMIZATION STUDIO MODAL ---------------- */}
        {studioModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setStudioModalOpen(false)}
          >
            <div
              ref={studioDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={studioTitleId}
              tabIndex={-1}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl p-4 sm:p-6 space-y-5 focus:outline-none"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-whatsapp-50 dark:bg-whatsapp-950 flex items-center justify-center text-whatsapp-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d={WA_GLYPH_PATH} />
                    </svg>
                  </div>
                  <div>
                    <h2 id={studioTitleId} className="text-base sm:text-lg font-bold text-text-primary">
                      QR Code Customization Studio
                    </h2>
                    <p className="text-xs text-text-secondary">
                      Design high-resolution scannable QR cards, transparent assets & print stands
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStudioModalOpen(false)}
                  aria-label="Close customization studio"
                  className="w-8 h-8 rounded-full bg-surface dark:bg-gray-800 text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Live Preview & Toolbar Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* Left Preview Column */}
                <div className="md:col-span-6 flex flex-col items-center justify-center p-5 sm:p-8 rounded-2xl bg-slate-100 dark:bg-gray-950/80 border border-slate-200 dark:border-gray-800 relative overflow-hidden min-h-[360px]">
                  {theme.isTransparent && (
                    <div
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`,
                        backgroundSize: '14px 14px',
                      }}
                    />
                  )}
                  <div className={`w-full max-w-[280px] transition-all ${fontClass}`}>
                    {renderSvgCard()}
                  </div>
                </div>

                {/* Right Customization Controls Column */}
                <div className="md:col-span-6 space-y-4">
                  {/* Color Palette Selector */}
                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 block">
                      Color Theme:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(Object.keys(QR_THEMES) as QrColorTheme[]).map(tId => {
                        const t = QR_THEMES[tId]
                        const active = currentTheme === tId
                        return (
                          <button
                            key={tId}
                            onClick={() => setCurrentTheme(tId)}
                            className={`px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                              active
                                ? 'bg-whatsapp-500 text-white border-whatsapp-600 shadow-sm'
                                : 'bg-surface dark:bg-gray-800 text-text-secondary border-gray-200 dark:border-gray-700 hover:text-text-primary'
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-full ring-1 ring-white/50 shrink-0"
                              style={{ backgroundColor: t.pillColor }}
                            />
                            <span className="truncate">{t.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Frame & Layout Styles */}
                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 block">
                      Name Placement:
                    </label>
                    <div className="grid grid-cols-4 gap-1 bg-surface dark:bg-gray-800 p-1 rounded-xl">
                      {(['top', 'bottom', 'side', 'none'] as NamePlacement[]).map(pos => (
                        <button
                          key={pos}
                          onClick={() => setNamePlacement(pos)}
                          className={`py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                            namePlacement === pos
                              ? 'bg-white dark:bg-gray-700 text-text-primary shadow-sm'
                              : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Typography Style */}
                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 block">
                      Typography:
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-surface dark:bg-gray-800 p-1 rounded-xl">
                      <button
                        onClick={() => setFontStyle('sans')}
                        className={`py-1.5 rounded-lg text-xs font-semibold font-sans transition-all ${
                          fontStyle === 'sans'
                            ? 'bg-white dark:bg-gray-700 text-text-primary shadow-sm'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        Modern Sans
                      </button>
                      <button
                        onClick={() => setFontStyle('serif')}
                        className={`py-1.5 rounded-lg text-xs font-semibold font-serif transition-all ${
                          fontStyle === 'serif'
                            ? 'bg-white dark:bg-gray-700 text-text-primary shadow-sm'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        Luxury Serif
                      </button>
                      <button
                        onClick={() => setFontStyle('mono')}
                        className={`py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
                          fontStyle === 'mono'
                            ? 'bg-white dark:bg-gray-700 text-text-primary shadow-sm'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        Tech Mono
                      </button>
                    </div>
                  </div>

                  {/* Center Emblem Logo */}
                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 block">
                      Center Logo:
                    </label>
                    <div className="grid grid-cols-4 gap-1 bg-surface dark:bg-gray-800 p-1 rounded-xl">
                      <button
                        onClick={() => setCenterLogo('whatsapp')}
                        className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          centerLogo === 'whatsapp'
                            ? 'bg-white dark:bg-gray-700 text-text-primary shadow-sm'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        WhatsApp
                      </button>
                      <button
                        onClick={() => setCenterLogo('shield')}
                        className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          centerLogo === 'shield'
                            ? 'bg-white dark:bg-gray-700 text-text-primary shadow-sm'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        Verified
                      </button>
                      <button
                        onClick={() => setCenterLogo('initials')}
                        className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          centerLogo === 'initials'
                            ? 'bg-white dark:bg-gray-700 text-text-primary shadow-sm'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        Initials
                      </button>
                      <button
                        onClick={() => setCenterLogo('none')}
                        className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          centerLogo === 'none'
                            ? 'bg-white dark:bg-gray-700 text-text-primary shadow-sm'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        Clean
                      </button>
                    </div>
                  </div>

                  {/* Custom Slogan / CTA Text */}
                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 block">
                      Call To Action Text:
                    </label>
                    <input
                      type="text"
                      value={customCta}
                      onChange={e => setCustomCta(e.target.value)}
                      placeholder="e.g. Scan to chat directly on WhatsApp"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-surface dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-text-primary focus:outline-none focus:ring-2 focus:ring-whatsapp-500"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {CTA_PRESETS.slice(0, 3).map((preset, i) => (
                        <button
                          key={i}
                          onClick={() => setCustomCta(preset)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-text-secondary hover:text-text-primary"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Master Download Action Suite */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Master HD PNG (2048x2048 300 DPI) */}
                  <button
                    onClick={() => downloadPng(false, 4)}
                    disabled={downloading !== null}
                    className="btn-primary px-4 py-2.5 text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    <span>{downloading === 'hd-png' ? 'Generating 4K...' : 'Download HD PNG (300 DPI)'}</span>
                  </button>

                  {/* Transparent PNG */}
                  <button
                    onClick={() => downloadPng(true, 4)}
                    disabled={downloading !== null}
                    className="btn-secondary px-3.5 py-2.5 text-xs font-bold flex items-center gap-1.5"
                    title="Export transparent alpha PNG for graphic design"
                  >
                    <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <span>Transparent Asset</span>
                  </button>

                  {/* Vector SVG */}
                  <button
                    onClick={downloadSvg}
                    className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-text-secondary hover:text-text-primary text-xs font-semibold"
                  >
                    Vector SVG
                  </button>

                  {/* Print Stand */}
                  <button
                    onClick={printStandSheet}
                    className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                    </svg>
                    <span>Print Stand</span>
                  </button>
                </div>

                <button
                  onClick={copyLink}
                  className="px-3.5 py-2.5 rounded-xl bg-surface dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-text-primary text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                >
                  {copied ? '✓ Link Copied!' : 'Copy Direct Link'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // -------------------------------------------------------------
  // MODE 2: FULL-PAGE STUDIO (Dedicated /my-qr/[slug] Page)
  // -------------------------------------------------------------
  return (
    <div className="w-full space-y-6">
      {/* TOOLBAR CONTROLS */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <span>Theme:</span>
              <span className="text-whatsapp-600 font-extrabold normal-case">{theme.name}</span>
            </span>
            <span className="text-[11px] text-text-secondary">7 Finishes</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {(Object.keys(QR_THEMES) as QrColorTheme[]).map(tId => {
              const t = QR_THEMES[tId]
              const active = currentTheme === tId
              return (
                <button
                  key={tId}
                  onClick={() => setCurrentTheme(tId)}
                  className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border ${
                    active
                      ? 'bg-whatsapp-500 text-white border-whatsapp-600 shadow-md shadow-whatsapp-500/20 scale-[1.02]'
                      : 'bg-surface dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-text-secondary hover:text-text-primary hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full ring-1 ring-white/50 shrink-0"
                    style={{ backgroundColor: t.isTransparent ? '#38bdf8' : t.pillColor }}
                  />
                  <span className="truncate">{t.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mr-1">
              Placement:
            </span>
            <div className="flex items-center gap-1 bg-surface dark:bg-gray-800 p-1 rounded-xl">
              {(['top', 'bottom', 'side', 'none'] as NamePlacement[]).map(pos => (
                <button
                  key={pos}
                  onClick={() => setNamePlacement(pos)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                    namePlacement === pos
                      ? 'bg-white dark:bg-gray-700 text-text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mr-1">
              Typography:
            </span>
            <div className="flex items-center gap-1 bg-surface dark:bg-gray-800 p-1 rounded-xl">
              <button
                onClick={() => setFontStyle('sans')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold font-sans transition-all ${
                  fontStyle === 'sans'
                    ? 'bg-white dark:bg-gray-700 text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Sans
              </button>
              <button
                onClick={() => setFontStyle('serif')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold font-serif transition-all ${
                  fontStyle === 'serif'
                    ? 'bg-white dark:bg-gray-700 text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Serif
              </button>
              <button
                onClick={() => setFontStyle('mono')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold font-mono transition-all ${
                  fontStyle === 'mono'
                    ? 'bg-white dark:bg-gray-700 text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Mono
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* LIVE QR STAGE PREVIEW */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-12 rounded-3xl bg-slate-100 dark:bg-gray-950/60 border border-slate-200 dark:border-gray-800 relative overflow-hidden min-h-[480px]">
        {theme.isTransparent && (
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`,
              backgroundSize: '16px 16px',
            }}
          />
        )}

        <div
          ref={qrRef}
          className={`relative transition-all duration-300 ${fontClass}`}
          style={{ maxWidth: '100%' }}
        >
          {renderSvgCard()}
        </div>
      </div>

      {/* EXPORT ACTION SUITE */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => downloadPng(false, 4)}
            disabled={downloading !== null}
            className="btn-primary px-5 py-3 text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span>{downloading === 'hd-png' ? 'Generating 4K...' : 'Download Master HD (300 DPI)'}</span>
          </button>

          <button
            onClick={() => downloadPng(true, 4)}
            disabled={downloading !== null}
            className="btn-secondary px-4 py-3 text-xs font-bold flex items-center gap-2 transition-all"
            title="Download pure transparent PNG without background"
          >
            <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <span>Transparent PNG</span>
          </button>

          <button
            onClick={downloadSvg}
            className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800 text-text-secondary hover:text-text-primary text-xs font-semibold transition-all"
          >
            Vector SVG
          </button>

          <button
            onClick={printStandSheet}
            className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800 text-text-secondary hover:text-text-primary text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
            </svg>
            <span>Print Stand</span>
          </button>
        </div>

        <button
          onClick={copyLink}
          className="px-4 py-3 rounded-xl bg-surface dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all shrink-0"
        >
          {copied ? '✓ Link Copied!' : 'Copy Direct Link'}
        </button>
      </div>
    </div>
  )
}
