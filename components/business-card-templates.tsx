'use client'

import type { Business } from '@/types'
import type { ThemeConfig } from '@/components/business-card-print'
import { dedupeCategories } from '@/lib/utils'

const CARD_W = 1050
const CARD_H = 600
const PORTRAIT_W = 600
const PORTRAIT_H = 1050
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif'

export function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = (text || '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const lines: string[] = []
  let line = ''
  let used = 0
  while (used < words.length) {
    const word = words[used]
    if (!line) {
      line = word
      used += 1
      continue
    }
    if (line.length + 1 + word.length <= maxChars) {
      line += ` ${word}`
      used += 1
      continue
    }
    if (lines.length + 1 >= maxLines) break
    lines.push(line)
    line = ''
  }
  if (line && lines.length < maxLines) lines.push(line)
  if (!lines.length) return []
  const truncated = used < words.length || lines[lines.length - 1].length > maxChars
  const last = lines[lines.length - 1]
  if (truncated) lines[lines.length - 1] = `${last.slice(0, maxChars - 1).trimEnd()}…`
  return lines
}

function textWidth(text: string, fontSize: number, weight = 800): number {
  if (typeof document === 'undefined') return text.length * fontSize * 0.5
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return text.length * fontSize * 0.5
  ctx.font = `${weight} ${fontSize}px ${FONT}`
  return ctx.measureText(text).width
}

function fitUrl(url: string, max = 36): string {
  const clean = (url || '')
    .split('https://')
    .join('')
    .split('http://')
    .join('')
    .split('/business/')
    .join('/')
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}

function CheckMark({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x}, ${y})`} suppressHydrationWarning>
      <circle cx="0" cy="0" r="9" fill={color} />
      <path d="M-4 0.5 L-1 3.5 L4.5 -3" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

function ContactBlock({
  x,
  y,
  label,
  value,
  align = 'start',
  valueColor,
  muted,
  size = 17,
  labelMuted,
}: {
  x: number
  y: number
  label: string
  value: string
  align?: 'start' | 'middle' | 'end'
  valueColor: string
  muted: string
  size?: number
  labelMuted?: string
}) {
  return (
    <g>
      <text
        x={x}
        y={y}
        textAnchor={align}
        fill={labelMuted || muted}
        fontSize="10"
        fontWeight="700"
        letterSpacing="1.4"
        fontFamily={FONT}
      >
        {label}
      </text>
      <text x={x} y={y + size + 9} textAnchor={align} fill={valueColor} fontSize={size} fontWeight="700" fontFamily={FONT}>
        {value}
      </text>
    </g>
  )
}

interface TemplateProps {
  business: Business
  theme: ThemeConfig
  logoDataUrl: string | null
  initials: string
  formattedPhone: string
  locationText: string
  profileUrl: string
  uid: string
  voiceOnly: boolean
  portrait: boolean
}

/**
 * Front-face layouts that differ in composition, not just colour: a colour
 * side panel, oversized type, and a fully centred card. The classic palette
 * designs keep their own layout in business-card-print.tsx.
 */
export function TemplateFrontSvg(props: TemplateProps) {
  const { business, theme, portrait } = props
  const layout = theme.decor?.layout || 'classic'
  const W = portrait ? PORTRAIT_W : CARD_W
  const H = portrait ? PORTRAIT_H : CARD_H
  const accent = theme.accentColor
  const panelBg = theme.isDark ? theme.bgTo : '#0B0B0C'
  const muted = theme.mutedText

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto block select-none"
    >
      <defs>
        <linearGradient id={`tplBg_${props.uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={theme.bgFrom} />
          <stop offset="60%" stopColor={theme.bgVia} />
          <stop offset="100%" stopColor={theme.bgTo} />
        </linearGradient>
        <clipPath id={`tplLogoRound_${props.uid}`}>
          <circle cx={portrait ? 300 : layout === 'split' ? 170 : 525} cy={portrait ? 168 : 152} r={portrait ? 62 : 56} />
        </clipPath>
        <clipPath id={`tplLogoSq_${props.uid}`}>
          <rect x={portrait ? 466 : 884} y={portrait ? 56 : 62} width="78" height="78" rx="16" />
        </clipPath>
      </defs>

      <rect width={W} height={H} fill={`url(#tplBg_${props.uid})`} />

      {layout === 'split' ? <SplitLayout {...props} W={W} H={H} panelBg={panelBg} accent={accent} muted={muted} /> : null}
      {layout === 'bold' ? <BoldLayout {...props} W={W} H={H} accent={accent} muted={muted} /> : null}
      {layout === 'centre' ? <CentreLayout {...props} W={W} H={H} accent={accent} muted={muted} /> : null}

      {/* Corner registration mark keeps templates on the same press sheet */}
      <circle cx={W - 26} cy={H - 26} r="3" fill={accent} opacity="0.55" />
      <rect x="2" y="2" width={W - 4} height={H - 4} fill="none" stroke={theme.cardBorder} strokeWidth="2" opacity="0.5" />
      {layout !== 'centre' ? (
        <text
          x={W - 40}
          y={H - 22}
          textAnchor="end"
          fill={accent}
          fontSize="9"
          fontWeight="700"
          letterSpacing="1.4"
          fontFamily={FONT}
        >
          {props.voiceOnly ? 'SCAN BACK TO CALL →' : 'SCAN BACK TO CHAT →'}
        </text>
      ) : null}
    </svg>
  )
}

function SplitLayout({
  business,
  theme,
  logoDataUrl,
  initials,
  formattedPhone,
  locationText,
  profileUrl,
  uid,
  portrait,
  W,
  H,
  panelBg,
  accent,
  muted,
}: TemplateProps & { W: number; H: number; panelBg: string; accent: string; muted: string }) {
  const name = business.name || 'Your business'
  const bio = business.bio || 'Verified WhatsApp business on WA Directory Zimbabwe'
  const cats = dedupeCategories(business.category).slice(0, 2).join(' · ')
  const panelW = portrait ? W : 340
  const panelH = portrait ? 430 : H
  const textX = portrait ? 48 : 382
  const textRight = W - 48
  const logoCx = portrait ? W / 2 : panelW / 2
  const logoCy = portrait ? 168 : 172
  const rowsY = portrait ? [660, 748, 836] : [258, 342, 426]
  const nameLines = wrapText(name, portrait ? 20 : 18, 2)

  return (
    <g>
      <rect width={panelW} height={panelH} fill={panelBg} />
      <rect x="22" y="22" width={panelW - 44} height={panelH - 44} fill="none" stroke={accent} strokeWidth="1.4" opacity="0.45" />

      <circle cx={logoCx} cy={logoCy} r={portrait ? 64 : 58} fill="#FFFFFF14" stroke={accent} strokeWidth="2.5" />
      {logoDataUrl ? (
        <image href={logoDataUrl} x={logoCx - 62} y={logoCy - 62} width="124" height="124" clipPath={`url(#tplLogoRound_${uid})`} />
      ) : (
        <text x={logoCx} y={logoCy + 12} textAnchor="middle" fill="#FFFFFF" fontSize="34" fontWeight="800" letterSpacing="1" fontFamily={FONT}>
          {initials}
        </text>
      )}

      {nameLines.map((line, i) => (
        <text
          key={i}
          x={logoCx}
          y={292 + i * 32}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize={portrait ? 26 : 24}
          fontWeight="800"
          letterSpacing="-0.4"
          fontFamily={FONT}
        >
          {line}
        </text>
      ))}

      <text x={logoCx} y={panelH - 42} textAnchor="middle" fill="#FFFFFF" opacity="0.62" fontSize="9" fontWeight="700" letterSpacing="2.4" fontFamily={FONT}>
        WA DIRECTORY · VERIFIED
      </text>

      {cats ? (
        <text x={textX} y={portrait ? 500 : 96} fill={accent} fontSize="11" fontWeight="700" letterSpacing="1.6" fontFamily={FONT}>
          {cats.toUpperCase()}
        </text>
      ) : null}

      {wrapText(bio, portrait ? 46 : 62, 2).map((line, i) => (
        <text key={i} x={textX} y={(portrait ? 540 : 138) + i * 23} fill={theme.secondaryText} fontSize="15" fontFamily={FONT}>
          {line}
        </text>
      ))}

      <line x1={textX} y1={portrait ? 606 : 192} x2={portrait ? textRight : W - 40} y2={portrait ? 606 : 192} stroke={theme.footerBorder} strokeWidth="1.2" />

      <ContactBlock
        x={textX}
        y={rowsY[0]}
        label={business.phone_type === 'voice' ? 'CALL DIRECT' : 'WHATSAPP DIRECT'}
        value={formattedPhone || business.phone || '+263'}
        valueColor={theme.primaryText}
        muted={muted}
      />
      <ContactBlock x={textX} y={rowsY[1]} label="LOCATION" value={locationText || 'Zimbabwe'} valueColor={theme.primaryText} muted={muted} />
      <ContactBlock x={textX} y={rowsY[2]} label="WEB PROFILE" value={fitUrl(profileUrl)} valueColor={accent} muted={muted} size={13} />

      {business.price_range ? (
        <g>
          <rect x={textX} y={portrait ? 900 : 500} width="150" height="34" rx="17" fill="none" stroke={theme.chipBorder} strokeWidth="1.2" />
          <text x={textX + 75} y={portrait ? 922 : 522} textAnchor="middle" fill={theme.chipText} fontSize="12" fontWeight="700" fontFamily={FONT}>
            {business.price_range}
          </text>
        </g>
      ) : null}
    </g>
  )
}

function BoldLayout({
  business,
  theme,
  logoDataUrl,
  initials,
  formattedPhone,
  locationText,
  profileUrl,
  uid,
  portrait,
  W,
  H,
  accent,
  muted,
}: TemplateProps & { W: number; H: number; accent: string; muted: string }) {
  const name = business.name || 'Your business'
  const cats = dedupeCategories(business.category).slice(0, 3).join(' · ')
  const nameSize = portrait ? (name.length > 22 ? 40 : name.length > 14 ? 46 : 52) : name.length > 26 ? 42 : name.length > 18 ? 50 : 58
  const nameLines = wrapText(name, portrait ? 17 : nameSize > 50 ? 20 : 24, 2)
  const nameTop = portrait ? 250 : 196
  const nameBottom = nameTop + (nameLines.length - 1) * (nameSize + 6)
  const bioY = nameBottom + (portrait ? 78 : 72)
  const bioLines = wrapText(business.bio || '', portrait ? 40 : 64, 2)

  return (
    <g>
      <rect x="0" y="0" width={portrait ? W : 16} height={portrait ? 14 : H} fill={accent} />

      <g>
        <rect x={portrait ? W - 134 : W - 166} y={portrait ? 56 : 62} width="78" height="78" rx="16" fill="#FFFFFF10" stroke={accent} strokeWidth="2" />
        {logoDataUrl ? (
          <image href={logoDataUrl} x={portrait ? W - 134 : W - 166} y={portrait ? 56 : 62} width="78" height="78" clipPath={`url(#tplLogoSq_${uid})`} />
        ) : (
          <text
            x={portrait ? W - 95 : W - 127}
            y={portrait ? 107 : 113}
            textAnchor="middle"
            fill={theme.primaryText}
            fontSize="26"
            fontWeight="800"
            letterSpacing="1"
            fontFamily={FONT}
          >
            {initials}
          </text>
        )}
      </g>

      {cats ? (
        <text x={48} y={portrait ? 130 : 118} fill={accent} fontSize="11" fontWeight="800" letterSpacing="1.8" fontFamily={FONT}>
          {cats.toUpperCase()}
        </text>
      ) : null}

      {nameLines.map((line, i) => (
        <text
          key={i}
          x={portrait ? 46 : 60}
          y={nameTop + i * (nameSize + 6)}
          fill={theme.primaryText}
          fontSize={nameSize}
          fontWeight="800"
          letterSpacing="-1.6"
          fontFamily={FONT}
        >
          {line}
        </text>
      ))}

      {business.verified ? (
        <CheckMark
          x={(portrait ? 48 : 60) + textWidth(nameLines[0] || '', nameSize) + 16}
          y={nameTop - nameSize * 0.3}
          color={accent}
        />
      ) : null}

      {bioLines.map((line, i) => (
        <text key={i} x={portrait ? 48 : 62} y={bioY + i * 24} fill={theme.secondaryText} fontSize="16" fontFamily={FONT}>
          {line}
        </text>
      ))}

      <line x1={portrait ? 48 : 62} y1={portrait ? 590 : 404} x2={W - 48} y2={portrait ? 590 : 404} stroke={theme.footerBorder} strokeWidth="1.2" />

      {portrait ? (
        <g>
          <ContactBlock x={48} y={650} label="WHATSAPP DIRECT" value={formattedPhone || business.phone || '+263'} valueColor={theme.primaryText} muted={muted} size={18} />
          <ContactBlock x={48} y={760} label="LOCATION" value={locationText || 'Zimbabwe'} valueColor={theme.primaryText} muted={muted} size={18} />
          <ContactBlock x={48} y={870} label="WEB PROFILE" value={fitUrl(profileUrl, 30)} valueColor={accent} muted={muted} size={13} />
        </g>
      ) : (
        <g>
          <ContactBlock x={62} y={450} label="WHATSAPP DIRECT" value={formattedPhone || business.phone || '+263'} valueColor={theme.primaryText} muted={muted} size={16} />
          <ContactBlock x={410} y={450} label="LOCATION" value={locationText || 'Zimbabwe'} valueColor={theme.primaryText} muted={muted} size={16} />
          <ContactBlock x={750} y={450} label="WEB PROFILE" value={fitUrl(profileUrl, 32)} valueColor={accent} muted={muted} size={13} />
        </g>
      )}

      {business.price_range ? (
        <text x={portrait ? 48 : 62} y={portrait ? 956 : 540} fill={muted} fontSize="12" fontWeight="600" letterSpacing="0.6" fontFamily={FONT}>
          Price range: <tspan fill={theme.primaryText} fontWeight="700">{business.price_range}</tspan>
        </text>
      ) : null}
    </g>
  )
}

function CentreLayout({
  business,
  theme,
  logoDataUrl,
  initials,
  formattedPhone,
  locationText,
  profileUrl,
  uid,
  portrait,
  W,
  accent,
  muted,
}: TemplateProps & { W: number; H: number; accent: string; muted: string }) {
  const name = business.name || 'Your business'
  const cats = dedupeCategories(business.category).slice(0, 2).join(' · ')
  const cx = W / 2
  const nameLines = wrapText(name, portrait ? 24 : 30, 2)
  const logoCy = portrait ? 196 : 150
  const nameTop = portrait ? 340 : 254
  const bioLines = wrapText(business.bio || '', portrait ? 44 : 74, 2)
  const nameBottom = nameTop + (nameLines.length - 1) * 36
  const catY = nameBottom + 46
  const bioY = catY + 34
  const hairY = Math.min((portrait ? 580 : 452) - 40, bioY + bioLines.length * 24 + 20)

  return (
    <g>
      <circle cx={cx} cy={logoCy} r={portrait ? 60 : 54} fill="#FFFFFF0D" stroke={accent} strokeWidth="2.2" />
      {logoDataUrl ? (
        <image
          href={logoDataUrl}
          x={cx - (portrait ? 58 : 52)}
          y={logoCy - (portrait ? 58 : 52)}
          width={portrait ? 116 : 104}
          height={portrait ? 116 : 104}
          clipPath={`url(#tplLogoRound_${uid})`}
        />
      ) : (
        <text x={cx} y={logoCy + 11} textAnchor="middle" fill={theme.primaryText} fontSize="32" fontWeight="800" letterSpacing="1" fontFamily={FONT}>
          {initials}
        </text>
      )}

      {nameLines.map((line, i) => (
        <text
          key={i}
          x={cx}
          y={nameTop + i * 36}
          textAnchor="middle"
          fill={theme.primaryText}
          fontSize={portrait ? 28 : 31}
          fontWeight="800"
          letterSpacing="-0.6"
          fontFamily={FONT}
        >
          {line}
        </text>
      ))}

      {business.verified ? (
        <CheckMark x={cx + textWidth(nameLines[0] || '', portrait ? 28 : 31) / 2 + 14} y={nameTop - 11} color={accent} />
      ) : null}

      {cats ? (
        <text x={cx} y={catY} textAnchor="middle" fill={accent} fontSize="11" fontWeight="700" letterSpacing="1.8" fontFamily={FONT}>
          {cats.toUpperCase()}
        </text>
      ) : null}

      {bioLines.map((line, i) => (
        <text key={i} x={cx} y={bioY + i * 24} textAnchor="middle" fill={theme.secondaryText} fontSize="15" fontFamily={FONT}>
          {line}
        </text>
      ))}

      <line x1={cx - (portrait ? 160 : 230)} y1={hairY} x2={cx + (portrait ? 160 : 230)} y2={hairY} stroke={theme.footerBorder} strokeWidth="1.2" />

      {portrait ? (
        <g>
          <ContactBlock x={cx} y={580} align="middle" label="WHATSAPP DIRECT" value={formattedPhone || business.phone || '+263'} valueColor={theme.primaryText} muted={muted} size={18} />
          <ContactBlock x={cx} y={668} align="middle" label="LOCATION" value={locationText || 'Zimbabwe'} valueColor={theme.primaryText} muted={muted} size={17} />
          <ContactBlock x={cx} y={756} align="middle" label="WEB PROFILE" value={fitUrl(profileUrl, 32)} valueColor={accent} muted={muted} size={13} />
        </g>
      ) : (
        <g>
          <ContactBlock x={cx - 330} y={452} align="middle" label="WHATSAPP DIRECT" value={formattedPhone || business.phone || '+263'} valueColor={theme.primaryText} muted={muted} size={16} />
          <ContactBlock x={cx} y={452} align="middle" label="LOCATION" value={locationText || 'Zimbabwe'} valueColor={theme.primaryText} muted={muted} size={16} />
          <ContactBlock x={cx + 330} y={452} align="middle" label="WEB PROFILE" value={fitUrl(profileUrl, 30)} valueColor={accent} muted={muted} size={13} />
        </g>
      )}

      {business.price_range ? (
        <text x={cx} y={portrait ? 856 : 520} textAnchor="middle" fill={muted} fontSize="12" fontWeight="600" letterSpacing="0.5" fontFamily={FONT}>
          Price range: <tspan fill={theme.primaryText} fontWeight="700">{business.price_range}</tspan>
        </text>
      ) : null}

      <rect x="0" y={portrait ? 986 : 536} width={W} height={portrait ? 64 : 64} fill={theme.footerBg} />
      <line x1="0" y1={portrait ? 986 : 536} x2={W} y2={portrait ? 986 : 536} stroke={theme.footerBorder} strokeWidth="1" />
      <text x={40} y={portrait ? 1026 : 576} fill={theme.mutedText} fontSize="10.5" fontWeight="600" letterSpacing="1.3" fontFamily={FONT}>
        WA DIRECTORY · ZIMBABWE
      </text>
      <text x={W - 40} y={portrait ? 1026 : 576} textAnchor="end" fill={accent} fontSize="10.5" fontWeight="700" letterSpacing="1.1" fontFamily={FONT}>
        {business.phone_type === 'voice' ? 'SCAN TO CALL' : 'SCAN TO CHAT'}
      </text>
    </g>
  )
}
