'use client'

import { useRef, useState, useEffect, useId, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { Business } from '@/types'

// International / US Standard Business Card dimensions (3.5" x 2.0" @ 300 DPI ratio = 7:4)
const CARD_W = 1050
const CARD_H = 600

// Modern Portrait / Vertical Card dimensions (2.0" x 3.5" @ 300 DPI ratio = 4:7)
const PORTRAIT_W = 600
const PORTRAIT_H = 1050

export type CardTheme = 'emerald' | 'obsidian' | 'swiss' | 'royal' | 'rose' | 'cyber'
export type CardOrientation = 'landscape' | 'portrait'

export interface ThemeConfig {
  id: CardTheme
  name: string
  pillColor: string
  isDark: boolean
  bgFrom: string
  bgVia: string
  bgTo: string
  cardBorder: string
  accentColor: string
  accentGlow: string
  primaryText: string
  secondaryText: string
  mutedText: string
  chipBg: string
  chipBorder: string
  chipText: string
  headerBg: string
  footerBg: string
  footerBorder: string
  goldAccent: string
  goldGlow: string
  qrBoxBg: string
  qrBoxBorder: string
  qrFgColor: string
  qrBgColor: string
  patternOpacity: number
  backBgFrom: string
  backBgVia: string
  backBgTo: string
}

export const THEMES: Record<CardTheme, ThemeConfig> = {
  emerald: {
    id: 'emerald',
    name: 'Executive Emerald',
    pillColor: '#059669',
    isDark: true,
    bgFrom: '#064e3b',
    bgVia: '#033b2d',
    bgTo: '#022c22',
    cardBorder: 'rgba(52, 211, 153, 0.45)',
    accentColor: '#25D366',
    accentGlow: 'rgba(37, 211, 102, 0.35)',
    primaryText: '#FFFFFF',
    secondaryText: '#A7F3D0',
    mutedText: '#6EE7B7',
    chipBg: 'rgba(6, 78, 59, 0.85)',
    chipBorder: 'rgba(52, 211, 153, 0.35)',
    chipText: '#D1FAE5',
    headerBg: 'rgba(2, 44, 34, 0.75)',
    footerBg: 'rgba(2, 44, 34, 0.95)',
    footerBorder: 'rgba(52, 211, 153, 0.25)',
    goldAccent: '#FBBF24',
    goldGlow: 'rgba(251, 191, 36, 0.3)',
    qrBoxBg: '#FFFFFF',
    qrBoxBorder: '#10B981',
    qrFgColor: '#064e3b',
    qrBgColor: '#FFFFFF',
    patternOpacity: 0.14,
    backBgFrom: '#043c2e',
    backBgVia: '#064e3b',
    backBgTo: '#022c22',
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian 24K Gold',
    pillColor: '#d97706',
    isDark: true,
    bgFrom: '#0f172a',
    bgVia: '#090d16',
    bgTo: '#020617',
    cardBorder: 'rgba(245, 158, 11, 0.5)',
    accentColor: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.35)',
    primaryText: '#FFFFFF',
    secondaryText: '#FDE68A',
    mutedText: '#94A3B8',
    chipBg: 'rgba(30, 41, 59, 0.85)',
    chipBorder: 'rgba(245, 158, 11, 0.35)',
    chipText: '#FCD34D',
    headerBg: 'rgba(2, 6, 23, 0.75)',
    footerBg: 'rgba(2, 6, 23, 0.95)',
    footerBorder: 'rgba(245, 158, 11, 0.3)',
    goldAccent: '#F59E0B',
    goldGlow: 'rgba(245, 158, 11, 0.4)',
    qrBoxBg: '#FFFFFF',
    qrBoxBorder: '#F59E0B',
    qrFgColor: '#090d16',
    qrBgColor: '#FFFFFF',
    patternOpacity: 0.12,
    backBgFrom: '#090d16',
    backBgVia: '#0f172a',
    backBgTo: '#020617',
  },
  swiss: {
    id: 'swiss',
    name: 'Swiss Monolith',
    pillColor: '#475569',
    isDark: false,
    bgFrom: '#FFFFFF',
    bgVia: '#F8FAFC',
    bgTo: '#F1F5F9',
    cardBorder: '#CBD5E1',
    accentColor: '#059669',
    accentGlow: 'rgba(5, 150, 105, 0.2)',
    primaryText: '#0F172A',
    secondaryText: '#334155',
    mutedText: '#64748B',
    chipBg: '#F1F5F9',
    chipBorder: '#CBD5E1',
    chipText: '#0F172A',
    headerBg: '#FFFFFF',
    footerBg: '#F8FAFC',
    footerBorder: '#E2E8F0',
    goldAccent: '#D97706',
    goldGlow: 'rgba(217, 119, 6, 0.2)',
    qrBoxBg: '#FFFFFF',
    qrBoxBorder: '#E2E8F0',
    qrFgColor: '#0F172A',
    qrBgColor: '#FFFFFF',
    patternOpacity: 0.06,
    backBgFrom: '#FFFFFF',
    backBgVia: '#F8FAFC',
    backBgTo: '#EDF2F7',
  },
  royal: {
    id: 'royal',
    name: 'Royal Midnight Navy',
    pillColor: '#2563eb',
    isDark: true,
    bgFrom: '#0a1128',
    bgVia: '#050c1e',
    bgTo: '#020612',
    cardBorder: 'rgba(96, 165, 250, 0.45)',
    accentColor: '#60A5FA',
    accentGlow: 'rgba(96, 165, 250, 0.35)',
    primaryText: '#F8FAFC',
    secondaryText: '#BFDBFE',
    mutedText: '#94A3B8',
    chipBg: 'rgba(15, 23, 42, 0.85)',
    chipBorder: 'rgba(96, 165, 250, 0.35)',
    chipText: '#DBEAFE',
    headerBg: 'rgba(2, 6, 18, 0.75)',
    footerBg: 'rgba(2, 6, 18, 0.95)',
    footerBorder: 'rgba(96, 165, 250, 0.25)',
    goldAccent: '#FBBF24',
    goldGlow: 'rgba(251, 191, 36, 0.3)',
    qrBoxBg: '#FFFFFF',
    qrBoxBorder: '#3B82F6',
    qrFgColor: '#0a1128',
    qrBgColor: '#FFFFFF',
    patternOpacity: 0.15,
    backBgFrom: '#050c1e',
    backBgVia: '#0a1128',
    backBgTo: '#020612',
  },
  rose: {
    id: 'rose',
    name: 'Champagne Rosé',
    pillColor: '#e11d48',
    isDark: true,
    bgFrom: '#271017',
    bgVia: '#1e0c12',
    bgTo: '#14060a',
    cardBorder: 'rgba(251, 113, 133, 0.45)',
    accentColor: '#FB7185',
    accentGlow: 'rgba(251, 113, 133, 0.35)',
    primaryText: '#FFF1F2',
    secondaryText: '#FECDD3',
    mutedText: '#FDA4AF',
    chipBg: 'rgba(39, 16, 23, 0.85)',
    chipBorder: 'rgba(251, 113, 133, 0.35)',
    chipText: '#FFE4E6',
    headerBg: 'rgba(20, 6, 10, 0.75)',
    footerBg: 'rgba(20, 6, 10, 0.95)',
    footerBorder: 'rgba(251, 113, 133, 0.25)',
    goldAccent: '#FDA4AF',
    goldGlow: 'rgba(251, 113, 133, 0.3)',
    qrBoxBg: '#FFFFFF',
    qrBoxBorder: '#FB7185',
    qrFgColor: '#271017',
    qrBgColor: '#FFFFFF',
    patternOpacity: 0.16,
    backBgFrom: '#1e0c12',
    backBgVia: '#271017',
    backBgTo: '#14060a',
  },
  cyber: {
    id: 'cyber',
    name: 'Neon Cyber Titanium',
    pillColor: '#06b6d4',
    isDark: true,
    bgFrom: '#0a0f24',
    bgVia: '#071830',
    bgTo: '#030712',
    cardBorder: 'rgba(6, 182, 212, 0.5)',
    accentColor: '#06B6D4',
    accentGlow: 'rgba(6, 182, 212, 0.45)',
    primaryText: '#FFFFFF',
    secondaryText: '#67E8F9',
    mutedText: '#94A3B8',
    chipBg: 'rgba(6, 182, 212, 0.15)',
    chipBorder: 'rgba(6, 182, 212, 0.4)',
    chipText: '#A5F3FC',
    headerBg: 'rgba(3, 7, 18, 0.75)',
    footerBg: 'rgba(3, 7, 18, 0.95)',
    footerBorder: 'rgba(6, 182, 212, 0.3)',
    goldAccent: '#FBBF24',
    goldGlow: 'rgba(251, 191, 36, 0.3)',
    qrBoxBg: '#FFFFFF',
    qrBoxBorder: '#06B6D4',
    qrFgColor: '#0a0f24',
    qrBgColor: '#FFFFFF',
    patternOpacity: 0.2,
    backBgFrom: '#071830',
    backBgVia: '#0a0f24',
    backBgTo: '#020617',
  },
}

// Clean phone formatter for international standards
function formatPhone(phone: string): string {
  if (!phone) return ''
  const clean = phone.replace(/[^0-9+]/g, '')
  if (clean.startsWith('+263') && clean.length === 13) {
    return `+263 ${clean.slice(4, 6)} ${clean.slice(6, 9)} ${clean.slice(9)}`
  }
  if (clean.startsWith('263') && clean.length === 12) {
    return `+263 ${clean.slice(3, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`
  }
  if (clean.startsWith('0') && clean.length === 10) {
    return `+263 ${clean.slice(1, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`
  }
  return clean.startsWith('+') ? clean : `+${clean}`
}

// Verified Badge
function VerifiedBadgeSvg({ x, y, scale = 1 }: { x: number | string; y: number | string; scale?: number | string }) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <path
        d="M23 12L21.2 14.5L21.5 17.5L18.7 18.7L17.5 21.5L14.5 21.2L12 23L9.5 21.2L6.5 21.5L5.3 18.7L2.5 17.5L2.8 14.5L1 12L2.8 9.5L2.5 6.5L5.3 5.3L6.5 2.5L9.5 2.8L12 1L14.5 2.8L17.5 2.5L18.7 5.3L21.5 6.5L21.2 9.5Z"
        fill="#0095F6"
        stroke="white"
        strokeWidth="0.8"
      />
      <path d="M9.5 15.5L7 13L5.5 14.5L9.5 18.5L18.5 9.5L17 8L9.5 15.5Z" fill="white" />
    </g>
  )
}

// Star Rating SVG Component
function StarsSvg({
  x,
  y,
  rating,
  goldColor = '#FBBF24',
  emptyColor = 'rgba(255,255,255,0.2)',
}: {
  x: number | string
  y: number | string
  rating: number
  goldColor?: string
  emptyColor?: string
}) {
  const rounded = Math.round(rating)
  return (
    <g transform={`translate(${x}, ${y})`}>
      {[0, 1, 2, 3, 4].map(i => (
        <path
          key={i}
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          transform={`translate(${i * 20}, 0) scale(0.75)`}
          fill={i < rounded ? goldColor : emptyColor}
        />
      ))}
    </g>
  )
}

// WhatsApp Icon Vector
function WhatsAppIconSvg({
  x,
  y,
  size = 20,
  fill = '#25D366',
}: {
  x: number | string
  y: number | string
  size?: number | string
  fill?: string
}) {
  const numSize = typeof size === 'string' ? parseFloat(size) || 20 : size
  const scale = numSize / 24
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <path
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
        fill={fill}
      />
    </g>
  )
}

// Location Pin Vector
function LocationIconSvg({
  x,
  y,
  size = 16,
  fill = '#25D366',
}: {
  x: number | string
  y: number | string
  size?: number | string
  fill?: string
}) {
  const numSize = typeof size === 'string' ? parseFloat(size) || 16 : size
  const scale = numSize / 24
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
        fill={fill}
      />
    </g>
  )
}

// Globe / Web Vector
function GlobeIconSvg({
  x,
  y,
  size = 16,
  fill = '#25D366',
}: {
  x: number | string
  y: number | string
  size?: number | string
  fill?: string
}) {
  const numSize = typeof size === 'string' ? parseFloat(size) || 16 : size
  const scale = numSize / 24
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
        fill={fill}
      />
    </g>
  )
}

// Guilloché & Geometric Micro-mesh Pattern Definition
function GuillocheDefs({ themeId, opacity = 0.12 }: { themeId: string; opacity?: number }) {
  return (
    <>
      <pattern id={`guilloche_${themeId}`} x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
        <circle cx="30" cy="30" r="28" fill="none" stroke="currentColor" strokeWidth="0.5" opacity={opacity} />
        <circle cx="30" cy="30" r="20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity={opacity * 0.8} />
        <circle cx="30" cy="30" r="12" fill="none" stroke="currentColor" strokeWidth="0.5" opacity={opacity * 0.6} />
        <path d="M0 30 Q 30 0 60 30 T 120 30" fill="none" stroke="currentColor" strokeWidth="0.4" opacity={opacity * 0.7} />
        <path d="M0 30 Q 30 60 60 30 T 120 30" fill="none" stroke="currentColor" strokeWidth="0.4" opacity={opacity * 0.7} />
      </pattern>
      <pattern id={`dotMatrix_${themeId}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.1" fill="currentColor" opacity={opacity * 0.9} />
      </pattern>
    </>
  )
}

// -------------------------------------------------------------
// 1. LANDSCAPE FRONT CARD SVG COMPONENT (Standard 3.5" x 2.0")
// -------------------------------------------------------------
function FrontLandscapeSvg({
  business,
  theme,
  logoDataUrl,
  initials,
  formattedPhone,
  locationText,
  profileUrl,
  uid,
}: {
  business: Business
  theme: ThemeConfig
  logoDataUrl: string | null
  initials: string
  formattedPhone: string
  locationText: string
  profileUrl: string
  uid: string
}) {
  const nameLength = business.name.length
  const nameFontSize = nameLength > 28 ? 26 : nameLength > 20 ? 30 : 34
  const nameY = 70
  const displayBio = business.bio ? (business.bio.length > 115 ? business.bio.slice(0, 115) + '...' : business.bio) : ''

  return (
    <svg
      viewBox={`0 0 ${CARD_W} ${CARD_H}`}
      width={CARD_W}
      height={CARD_H}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto block select-none"
    >
      <defs>
        <linearGradient id={`frontBg_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={theme.bgFrom} />
          <stop offset="50%" stopColor={theme.bgVia} />
          <stop offset="100%" stopColor={theme.bgTo} />
        </linearGradient>

        <linearGradient id={`goldBorder_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        <linearGradient id={`accentBar_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={theme.accentColor} />
          <stop offset="100%" stopColor={theme.isDark ? '#059669' : '#10B981'} />
        </linearGradient>

        <clipPath id={`frontLogoClip_${uid}`}>
          <circle cx="95" cy="85" r="50" />
        </clipPath>

        <GuillocheDefs themeId={uid} opacity={theme.patternOpacity} />
      </defs>

      {/* Card Base */}
      <rect width={CARD_W} height={CARD_H} rx="28" ry="28" fill={`url(#frontBg_${uid})`} />

      {/* Guilloche & Dot Matrix Texture Layer */}
      <g color={theme.primaryText}>
        <rect x="0" y="0" width={CARD_W} height={CARD_H} rx="28" ry="28" fill={`url(#guilloche_${uid})`} />
        <rect x="0" y="0" width={CARD_W} height={CARD_H} rx="28" ry="28" fill={`url(#dotMatrix_${uid})`} />
      </g>

      {/* Specular Radial Ambient Glow */}
      <circle cx={CARD_W - 80} cy="40" r="240" fill={theme.accentGlow} opacity={theme.isDark ? 0.35 : 0.15} />

      {/* Outer Border Stroke & Crop Guidelines */}
      <rect
        x="2"
        y="2"
        width={CARD_W - 4}
        height={CARD_H - 4}
        rx="26"
        ry="26"
        fill="none"
        stroke={theme.cardBorder}
        strokeWidth="2.5"
      />

      {/* Left Prestige Metallic Accent Ribbon */}
      <rect x="0" y="28" width="10" height={CARD_H - 56} rx="5" fill={`url(#accentBar_${uid})`} />

      {/* Top Header Region Frosted Strip */}
      <rect x="10" y="10" width={CARD_W - 20} height="150" fill={theme.headerBg} opacity={0.7} rx="18" />

      {/* Logo Avatar or Initials Monogram Frame */}
      <g>
        {/* Outer Glow & Metallic Ring */}
        <circle cx="95" cy="85" r="54" fill="none" stroke={theme.accentColor} strokeWidth="3" opacity="0.9" />
        <circle cx="95" cy="85" r="50" fill={theme.isDark ? '#064e3b' : '#E2E8F0'} />

        {logoDataUrl ? (
          <image href={logoDataUrl} x="45" y="35" width="100" height="100" clipPath={`url(#frontLogoClip_${uid})`} />
        ) : (
          <text
            x="95"
            y="95"
            textAnchor="middle"
            fill={theme.isDark ? '#FFFFFF' : '#0F172A'}
            fontSize="34"
            fontWeight="bold"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="1"
          >
            {initials}
          </text>
        )}
      </g>

      {/* Business Name & Verification */}
      <g transform="translate(170, 0)">
        <text
          x="0"
          y={nameY}
          fill={theme.primaryText}
          fontSize={nameFontSize}
          fontWeight="800"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="-0.5"
        >
          {nameLength > 32 ? business.name.slice(0, 32) + '...' : business.name}
        </text>

        {business.verified && (
          <VerifiedBadgeSvg x={Math.min(nameLength, 32) * (nameFontSize * 0.58) + 12} y={nameY - 24} scale={1.15} />
        )}

        {/* WhatsApp Username Handle */}
        {business.whatsapp_username && (
          <g transform="translate(0, 102)">
            <rect
              x="0"
              y="-18"
              width={business.whatsapp_username.length * 10.5 + 40}
              height="26"
              rx="13"
              fill={theme.chipBg}
              stroke={theme.chipBorder}
              strokeWidth="1"
            />
            <WhatsAppIconSvg x={6} y={-14} size={16} fill={theme.accentColor} />
            <text x="26" y="-1" fill={theme.secondaryText} fontSize="14" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif">
              @{business.whatsapp_username}
            </text>
          </g>
        )}

        {/* Star Rating Badge */}
        <g transform={`translate(${business.whatsapp_username ? business.whatsapp_username.length * 10.5 + 50 : 0}, 102)`}>
          <StarsSvg x={0} y={-17} rating={business.rating || 5} goldColor={theme.goldAccent} emptyColor={theme.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'} />
          <text x="110" y="-1" fill={theme.mutedText} fontSize="14" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif">
            {business.rating > 0 ? business.rating.toFixed(1) : '5.0'} ({business.review_count || 0} reviews)
          </text>
        </g>
      </g>

      {/* Directory Accreditation Badge (Top Right) */}
      <g transform={`translate(${CARD_W - 245}, 34)`}>
        <rect width="200" height="34" rx="17" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1" />
        <circle cx="18" cy="17" r="5" fill={theme.accentColor} />
        <text x="32" y="22" fill={theme.secondaryText} fontSize="11" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.8">
          WA.DIRECTORY • VERIFIED
        </text>
      </g>

      {/* Horizontal Hairline Divider */}
      <line x1="45" y1="172" x2={CARD_W - 45} y2="172" stroke={theme.footerBorder} strokeWidth="1.5" />

      {/* MIDDLE SECTION: Dynamic Category Chips with Zero-Overlap */}
      {(() => {
        if (!business.category || business.category.length === 0) return null
        let curX = 0
        const maxTotalWidth = CARD_W - 90 // 960px
        const chips: { cat: string; width: number; x: number }[] = []

        for (const cat of business.category.slice(0, 3)) {
          const textLen = cat.length
          const chipWidth = Math.max(90, Math.min(textLen * 8.4 + 42, 320))
          if (curX + chipWidth > maxTotalWidth && chips.length > 0) {
            break
          }
          chips.push({ cat, width: chipWidth, x: curX })
          curX += chipWidth + 16 // 16px clean gap
        }

        return (
          <g transform="translate(45, 195)">
            {chips.map(({ cat, width, x }, i) => (
              <g key={i} transform={`translate(${x}, 0)`}>
                <rect width={width} height="32" rx="16" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1.2" />
                <circle cx="14" cy="16" r="3.5" fill={theme.accentColor} />
                <text x="26" y="21" fill={theme.chipText} fontSize="13" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif">
                  {cat.length > 30 ? cat.slice(0, 30) + '...' : cat}
                </text>
              </g>
            ))}
          </g>
        )
      })()}

      {/* Business Bio / Tagline */}
      <g transform="translate(45, 260)">
        <text
          x="0"
          y="0"
          fill={theme.isDark ? '#E2E8F0' : '#334155'}
          fontSize="15.5"
          fontWeight="400"
          fontFamily="system-ui, -apple-system, sans-serif"
          opacity="0.95"
          letterSpacing="0.1"
        >
          {displayBio || 'Official Verified WhatsApp Business on WA Directory Zimbabwe'}
        </text>
      </g>

      {/* CONTACT INFORMATION MATRIX (Luxury 3-Item Layout) */}
      <g transform="translate(45, 305)">
        <rect
          width={CARD_W - 90}
          height="195"
          rx="18"
          fill={theme.isDark ? 'rgba(0, 0, 0, 0.32)' : 'rgba(255, 255, 255, 0.75)'}
          stroke={theme.footerBorder}
          strokeWidth="1.2"
        />

        {/* Column 1: WhatsApp Direct */}
        <g transform="translate(25, 42)">
          <rect width="40" height="40" rx="12" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1" />
          <WhatsAppIconSvg x={8} y={8} size={24} fill={theme.accentColor} />
          <text x="54" y="16" fill={theme.mutedText} fontSize="12" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.5">
            WHATSAPP DIRECT
          </text>
          <text x="54" y="36" fill={theme.primaryText} fontSize="18" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
            {formattedPhone || '+263 WhatsApp Direct'}
          </text>
        </g>

        {/* Column 2: Location & Area */}
        <g transform="translate(480, 42)">
          <rect width="40" height="40" rx="12" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1" />
          <LocationIconSvg x={8} y={8} size={24} fill={theme.accentColor} />
          <text x="54" y="16" fill={theme.mutedText} fontSize="12" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.5">
            LOCATION & PRESENCE
          </text>
          <text x="54" y="36" fill={theme.primaryText} fontSize="17" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
            {locationText || 'Zimbabwe'}
          </text>
        </g>

        {/* Bottom Row: Official Web Profile */}
        <g transform="translate(25, 125)">
          <rect width="40" height="40" rx="12" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1" />
          <GlobeIconSvg x={8} y={8} size={24} fill={theme.accentColor} />
          <text x="54" y="16" fill={theme.mutedText} fontSize="12" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.5">
            OFFICIAL WEB PROFILE
          </text>
          <text x="54" y="36" fill={theme.accentColor} fontSize="17" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
            {profileUrl}
          </text>
        </g>

        {/* Price Tier Pill */}
        {business.price_range && (
          <g transform={`translate(${CARD_W - 270}, 125)`}>
            <rect width="145" height="40" rx="12" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1" />
            <text x="72" y="25" textAnchor="middle" fill={theme.secondaryText} fontSize="14" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
              Price: {business.price_range}
            </text>
          </g>
        )}
      </g>

      {/* FOOTER BAR */}
      <g transform={`translate(0, ${CARD_H - 64})`}>
        <rect width={CARD_W} height="64" fill={theme.footerBg} rx="0" />
        <line x1="0" y1="0" x2={CARD_W} y2="0" stroke={theme.footerBorder} strokeWidth="1" />

        <text x="45" y="38" fill={theme.mutedText} fontSize="13" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.8">
          WA DIRECTORY — ZIMBABWE'S PREMIER VERIFIED BUSINESS PLATFORM
        </text>

        <text x={CARD_W - 45} y="38" textAnchor="end" fill={theme.accentColor} fontSize="13" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
          FLIP CARD FOR INSTANT WHATSAPP QR SCAN →
        </text>
      </g>
    </svg>
  )
}

// -------------------------------------------------------------
// 2. LANDSCAPE BACK CARD SVG COMPONENT (Standard 3.5" x 2.0")
// -------------------------------------------------------------
function BackLandscapeSvg({
  business,
  theme,
  logoDataUrl,
  initials,
  qrValue,
  profileUrl,
  uid,
}: {
  business: Business
  theme: ThemeConfig
  logoDataUrl: string | null
  initials: string
  qrValue: string
  profileUrl: string
  uid: string
}) {
  return (
    <svg
      viewBox={`0 0 ${CARD_W} ${CARD_H}`}
      width={CARD_W}
      height={CARD_H}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto block select-none"
    >
      <defs>
        <linearGradient id={`backBg_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={theme.backBgFrom} />
          <stop offset="50%" stopColor={theme.backBgVia} />
          <stop offset="100%" stopColor={theme.backBgTo} />
        </linearGradient>

        <clipPath id={`backLogoClip_${uid}`}>
          <circle cx="36" cy="36" r="32" />
        </clipPath>

        <clipPath id={`qrLogoClip_${uid}`}>
          <circle cx="24" cy="24" r="22" />
        </clipPath>

        <GuillocheDefs themeId={uid} opacity={theme.patternOpacity} />
      </defs>

      {/* Card Base */}
      <rect width={CARD_W} height={CARD_H} rx="28" ry="28" fill={`url(#backBg_${uid})`} />

      {/* Guilloche & Dot Matrix Texture Layer */}
      <g color={theme.primaryText}>
        <rect width={CARD_W} height={CARD_H} rx="28" ry="28" fill={`url(#guilloche_${uid})`} />
        <rect width={CARD_W} height={CARD_H} rx="28" ry="28" fill={`url(#dotMatrix_${uid})`} />
      </g>

      {/* Center Radial Glow behind QR */}
      <circle cx="245" cy="300" r="230" fill={theme.accentGlow} opacity={theme.isDark ? 0.35 : 0.15} />

      {/* Outer Border Stroke */}
      <rect
        x="2"
        y="2"
        width={CARD_W - 4}
        height={CARD_H - 4}
        rx="26"
        ry="26"
        fill="none"
        stroke={theme.cardBorder}
        strokeWidth="2.5"
      />

      {/* TOP HEADER: Brand & Verified Status */}
      <g transform="translate(45, 28)">
        <circle cx="36" cy="36" r="34" fill="none" stroke={theme.accentColor} strokeWidth="2.5" />
        <circle cx="36" cy="36" r="32" fill={theme.isDark ? '#064e3b' : '#E2E8F0'} />
        {logoDataUrl ? (
          <image href={logoDataUrl} x="4" y="4" width="64" height="64" clipPath={`url(#backLogoClip_${uid})`} />
        ) : (
          <text
            x="36"
            y="43"
            textAnchor="middle"
            fill={theme.isDark ? '#FFFFFF' : '#0F172A'}
            fontSize="20"
            fontWeight="bold"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {initials}
          </text>
        )}

        <text x="85" y="32" fill={theme.primaryText} fontSize="24" fontWeight="800" fontFamily="system-ui, -apple-system, sans-serif">
          {business.name.length > 28 ? business.name.slice(0, 28) + '...' : business.name}
        </text>
        <text x="85" y="54" fill={theme.secondaryText} fontSize="14" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif">
          OFFICIAL VERIFIED WHATSAPP BUSINESS
        </text>

        {/* Security Seal */}
        <g transform={`translate(${CARD_W - 330}, 6)`}>
          <rect width="240" height="42" rx="21" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1.2" />
          <WhatsAppIconSvg x={12} y={9} size={24} fill={theme.accentColor} />
          <text x="44" y="26" fill={theme.chipText} fontSize="13" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.5">
            INSTANT CHAT QR CODE
          </text>
        </g>
      </g>

      <line x1="45" y1="110" x2={CARD_W - 45} y2="110" stroke={theme.footerBorder} strokeWidth="1.5" />

      {/* LEFT COLUMN: THE WORLD STANDARD QR CODE CONTAINER */}
      <g transform="translate(65, 135)">
        <rect
          width="320"
          height="320"
          rx="24"
          fill={theme.qrBoxBg}
          stroke={theme.qrBoxBorder}
          strokeWidth="3.5"
        />

        <g transform="translate(25, 25)">
          <QRCodeSVG
            value={qrValue}
            size={270}
            level="H"
            bgColor={theme.qrBgColor}
            fgColor={theme.qrFgColor}
            marginSize={0}
            imageSettings={{
              src: '/logo.png',
              height: 52,
              width: 52,
              excavate: true,
            }}
          />
        </g>

        {/* Center Official WA.Directory Logo Overlay on QR */}
        <g transform="translate(136, 136)">
          <circle cx="24" cy="24" r="24" fill="#FFFFFF" stroke={theme.accentColor} strokeWidth="2.5" />
          <image href="/logo.png" x="4" y="4" width="40" height="40" clipPath={`url(#qrLogoClip_${uid})`} preserveAspectRatio="xMidYMid meet" />
        </g>
      </g>

      {/* RIGHT COLUMN: ACTION VALUE PROPOSITION */}
      <g transform="translate(425, 140)">
        <text x="0" y="32" fill={theme.primaryText} fontSize="32" fontWeight="800" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="-0.5">
          Scan to Chat on WhatsApp
        </text>

        <text x="0" y="65" fill={theme.secondaryText} fontSize="16" fontWeight="500" fontFamily="system-ui, -apple-system, sans-serif">
          Point your phone camera or WhatsApp scanner to connect directly.
        </text>

        {/* 3 Value Features */}
        <g transform="translate(0, 95)">
          {/* Feature 1 */}
          <g transform="translate(0, 0)">
            <circle cx="16" cy="16" r="16" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1" />
            <path d="M11 16l3.5 3.5 7.5-7.5" fill="none" stroke={theme.accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <text x="44" y="21" fill={theme.primaryText} fontSize="16" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
              Instant 1-on-1 Direct Messaging
            </text>
            <text x="44" y="39" fill={theme.mutedText} fontSize="13" fontWeight="400" fontFamily="system-ui, -apple-system, sans-serif">
              No need to save the number first to your contacts.
            </text>
          </g>

          {/* Feature 2 */}
          <g transform="translate(0, 65)">
            <circle cx="16" cy="16" r="16" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1" />
            <path d="M11 16l3.5 3.5 7.5-7.5" fill="none" stroke={theme.accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <text x="44" y="21" fill={theme.primaryText} fontSize="16" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
              Live Product & Service Inquiries
            </text>
            <text x="44" y="39" fill={theme.mutedText} fontSize="13" fontWeight="400" fontFamily="system-ui, -apple-system, sans-serif">
              Get price quotes, order products, and book services.
            </text>
          </g>

          {/* Feature 3 */}
          <g transform="translate(0, 130)">
            <circle cx="16" cy="16" r="16" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1" />
            <path d="M11 16l3.5 3.5 7.5-7.5" fill="none" stroke={theme.accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <text x="44" y="21" fill={theme.primaryText} fontSize="16" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
              Verified Business Guarantee
            </text>
            <text x="44" y="39" fill={theme.mutedText} fontSize="13" fontWeight="400" fontFamily="system-ui, -apple-system, sans-serif">
              Authenticity certified by WA Directory Zimbabwe.
            </text>
          </g>
        </g>
      </g>

      {/* FOOTER BAR */}
      <g transform={`translate(0, ${CARD_H - 64})`}>
        <rect width={CARD_W} height="64" fill={theme.footerBg} rx="0" />
        <line x1="0" y1="0" x2={CARD_W} y2="0" stroke={theme.footerBorder} strokeWidth="1" />

        <text x="45" y="38" fill={theme.accentColor} fontSize="15" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
          {profileUrl}
        </text>

        <text x={CARD_W - 45} y="38" textAnchor="end" fill={theme.mutedText} fontSize="13" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif">
          POWERED BY WA DIRECTORY ZIMBABWE • WADIRECTORY.CO.ZW
        </text>
      </g>
    </svg>
  )
}

// -------------------------------------------------------------
// 3. PORTRAIT FRONT CARD SVG COMPONENT (Modern Vertical 2.0" x 3.5")
// -------------------------------------------------------------
function FrontPortraitSvg({
  business,
  theme,
  logoDataUrl,
  initials,
  formattedPhone,
  locationText,
  profileUrl,
  uid,
}: {
  business: Business
  theme: ThemeConfig
  logoDataUrl: string | null
  initials: string
  formattedPhone: string
  locationText: string
  profileUrl: string
  uid: string
}) {
  const nameLength = business.name.length
  const nameFontSize = nameLength > 24 ? 26 : nameLength > 16 ? 30 : 34
  const displayBio = business.bio ? (business.bio.length > 140 ? business.bio.slice(0, 140) + '...' : business.bio) : ''

  return (
    <svg
      viewBox={`0 0 ${PORTRAIT_W} ${PORTRAIT_H}`}
      width={PORTRAIT_W}
      height={PORTRAIT_H}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto block select-none"
    >
      <defs>
        <linearGradient id={`pFrontBg_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={theme.bgFrom} />
          <stop offset="50%" stopColor={theme.bgVia} />
          <stop offset="100%" stopColor={theme.bgTo} />
        </linearGradient>

        <clipPath id={`pLogoClip_${uid}`}>
          <circle cx="300" cy="170" r="70" />
        </clipPath>

        <GuillocheDefs themeId={`p_${uid}`} opacity={theme.patternOpacity} />
      </defs>

      {/* Card Base */}
      <rect width={PORTRAIT_W} height={PORTRAIT_H} rx="28" ry="28" fill={`url(#pFrontBg_${uid})`} />

      <g color={theme.primaryText}>
        <rect width={PORTRAIT_W} height={PORTRAIT_H} rx="28" ry="28" fill={`url(#guilloche_p_${uid})`} />
        <rect width={PORTRAIT_W} height={PORTRAIT_H} rx="28" ry="28" fill={`url(#dotMatrix_p_${uid})`} />
      </g>

      {/* Outer Border Stroke */}
      <rect x="2" y="2" width={PORTRAIT_W - 4} height={PORTRAIT_H - 4} rx="26" ry="26" fill="none" stroke={theme.cardBorder} strokeWidth="2.5" />

      {/* Top Banner Seal */}
      <g transform="translate(0, 45)">
        <rect x="180" y="0" width="240" height="34" rx="17" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1.2" />
        <circle cx="200" cy="17" r="5" fill={theme.accentColor} />
        <text x="215" y="22" fill={theme.secondaryText} fontSize="11" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.8">
          WA.DIRECTORY • VERIFIED
        </text>
      </g>

      {/* Big Central Logo Ring */}
      <g>
        <circle cx="300" cy="170" r="76" fill="none" stroke={theme.accentColor} strokeWidth="3.5" opacity="0.9" />
        <circle cx="300" cy="170" r="70" fill={theme.isDark ? '#064e3b' : '#E2E8F0'} />
        {logoDataUrl ? (
          <image href={logoDataUrl} x="230" y="100" width="140" height="140" clipPath={`url(#pLogoClip_${uid})`} />
        ) : (
          <text
            x="300"
            y="184"
            textAnchor="middle"
            fill={theme.isDark ? '#FFFFFF' : '#0F172A'}
            fontSize="48"
            fontWeight="bold"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {initials}
          </text>
        )}
      </g>

      {/* Business Title & Verification */}
      <g transform="translate(0, 290)">
        <text x="300" y="0" textAnchor="middle" fill={theme.primaryText} fontSize={nameFontSize} fontWeight="800" fontFamily="system-ui, -apple-system, sans-serif">
          {business.name.length > 28 ? business.name.slice(0, 28) + '...' : business.name}
        </text>

        {business.verified && (
          <VerifiedBadgeSvg x={288} y={15} scale={1.2} />
        )}

        {business.whatsapp_username && (
          <text x="300" y={business.verified ? 56 : 38} textAnchor="middle" fill={theme.accentColor} fontSize="16" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
            @{business.whatsapp_username}
          </text>
        )}

        <g transform={`translate(195, ${business.verified ? (business.whatsapp_username ? 78 : 58) : 46})`}>
          <StarsSvg x={0} y={0} rating={business.rating || 5} goldColor={theme.goldAccent} emptyColor={theme.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'} />
          <text x="110" y="15" fill={theme.mutedText} fontSize="14" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif">
            {business.rating > 0 ? business.rating.toFixed(1) : '5.0'} ({business.review_count || 0})
          </text>
        </g>
      </g>

      {/* Divider */}
      <line x1="45" y1="420" x2={PORTRAIT_W - 45} y2="420" stroke={theme.footerBorder} strokeWidth="1.5" />

      {/* Category Pills (Dynamic Multi-chip or Clean Stack) */}
      {business.category && business.category.length > 0 && (
        <g transform="translate(45, 450)">
          {(() => {
            const firstTwo = business.category.slice(0, 2)
            if (firstTwo.length === 1) {
              const label = firstTwo[0]
              const width = Math.min(label.length * 9 + 40, PORTRAIT_W - 90)
              const x = (PORTRAIT_W - 90 - width) / 2
              return (
                <g transform={`translate(${x}, 0)`}>
                  <rect width={width} height="34" rx="17" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1.2" />
                  <text x={width / 2} y="22" textAnchor="middle" fill={theme.chipText} fontSize="13" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
                    {label}
                  </text>
                </g>
              )
            }
            let cX = 0
            const pChips: { label: string; width: number; x: number }[] = []
            for (const cat of firstTwo) {
              const label = cat.length > 20 ? cat.slice(0, 20) + '...' : cat
              const width = Math.max(85, label.length * 8.2 + 34)
              pChips.push({ label, width, x: cX })
              cX += width + 10
            }
            const totalW = cX - 10
            const startX = Math.max(0, (PORTRAIT_W - 90 - totalW) / 2)
            return (
              <g transform={`translate(${startX}, 0)`}>
                {pChips.map(({ label, width, x }, i) => (
                  <g key={i} transform={`translate(${x}, 0)`}>
                    <rect width={width} height="34" rx="17" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1.2" />
                    <text x={width / 2} y="22" textAnchor="middle" fill={theme.chipText} fontSize="12" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
                      {label}
                    </text>
                  </g>
                ))}
              </g>
            )
          })()}
        </g>
      )}

      {/* Bio */}
      <g transform="translate(50, 520)">
        <text
          x="250"
          y="0"
          textAnchor="middle"
          fill={theme.isDark ? '#E2E8F0' : '#334155'}
          fontSize="15"
          fontWeight="400"
          fontFamily="system-ui, -apple-system, sans-serif"
          opacity="0.95"
        >
          {displayBio || 'Official Verified WhatsApp Business on WA Directory Zimbabwe'}
        </text>
      </g>

      {/* Vertical Contact Box Matrix */}
      <g transform="translate(45, 590)">
        <rect width={PORTRAIT_W - 90} height="360" rx="20" fill={theme.isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.75)'} stroke={theme.footerBorder} strokeWidth="1.2" />

        {/* Row 1: WhatsApp Direct */}
        <g transform="translate(25, 30)">
          <rect width="44" height="44" rx="12" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1" />
          <WhatsAppIconSvg x={10} y={10} size={24} fill={theme.accentColor} />
          <text x="58" y="16" fill={theme.mutedText} fontSize="12" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif">
            WHATSAPP DIRECT
          </text>
          <text x="58" y="38" fill={theme.primaryText} fontSize="17" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
            {formattedPhone || '+263 WhatsApp Direct'}
          </text>
        </g>

        {/* Row 2: Location */}
        <g transform="translate(25, 120)">
          <rect width="44" height="44" rx="12" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1" />
          <LocationIconSvg x={10} y={10} size={24} fill={theme.accentColor} />
          <text x="58" y="16" fill={theme.mutedText} fontSize="12" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif">
            LOCATION & PRESENCE
          </text>
          <text x="58" y="38" fill={theme.primaryText} fontSize="16" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
            {locationText || 'Zimbabwe'}
          </text>
        </g>

        {/* Row 3: Web Profile */}
        <g transform="translate(25, 210)">
          <rect width="44" height="44" rx="12" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1" />
          <GlobeIconSvg x={10} y={10} size={24} fill={theme.accentColor} />
          <text x="58" y="16" fill={theme.mutedText} fontSize="12" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif">
            OFFICIAL WEB PROFILE
          </text>
          <text x="58" y="38" fill={theme.accentColor} fontSize="15" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
            {profileUrl}
          </text>
        </g>

        {/* Row 4: Price & Accreditation */}
        <g transform="translate(25, 290)">
          <rect width={PORTRAIT_W - 140} height="40" rx="12" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1" />
          <text x={(PORTRAIT_W - 140) / 2} y="25" textAnchor="middle" fill={theme.secondaryText} fontSize="13" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
            {business.price_range ? `Price: ${business.price_range} • ` : ''}Accredited Business
          </text>
        </g>
      </g>

      {/* Footer */}
      <g transform={`translate(0, ${PORTRAIT_H - 64})`}>
        <rect width={PORTRAIT_W} height="64" fill={theme.footerBg} />
        <line x1="0" y1="0" x2={PORTRAIT_W} y2="0" stroke={theme.footerBorder} strokeWidth="1" />
        <text x="300" y="38" textAnchor="middle" fill={theme.accentColor} fontSize="13" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
          FLIP CARD FOR WHATSAPP QR SCAN →
        </text>
      </g>
    </svg>
  )
}

// -------------------------------------------------------------
// 4. PORTRAIT BACK CARD SVG COMPONENT (Modern Vertical 2.0" x 3.5")
// -------------------------------------------------------------
function BackPortraitSvg({
  business,
  theme,
  logoDataUrl,
  initials,
  qrValue,
  profileUrl,
  uid,
}: {
  business: Business
  theme: ThemeConfig
  logoDataUrl: string | null
  initials: string
  qrValue: string
  profileUrl: string
  uid: string
}) {
  return (
    <svg
      viewBox={`0 0 ${PORTRAIT_W} ${PORTRAIT_H}`}
      width={PORTRAIT_W}
      height={PORTRAIT_H}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto block select-none"
    >
      <defs>
        <linearGradient id={`pBackBg_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={theme.backBgFrom} />
          <stop offset="50%" stopColor={theme.backBgVia} />
          <stop offset="100%" stopColor={theme.backBgTo} />
        </linearGradient>

        <clipPath id={`pBackLogoClip_${uid}`}>
          <circle cx="30" cy="30" r="26" />
        </clipPath>

        <clipPath id={`pQrLogoClip_${uid}`}>
          <circle cx="24" cy="24" r="22" />
        </clipPath>

        <GuillocheDefs themeId={`p_back_${uid}`} opacity={theme.patternOpacity} />
      </defs>

      {/* Card Base */}
      <rect width={PORTRAIT_W} height={PORTRAIT_H} rx="28" ry="28" fill={`url(#pBackBg_${uid})`} />

      <g color={theme.primaryText}>
        <rect width={PORTRAIT_W} height={PORTRAIT_H} rx="28" ry="28" fill={`url(#guilloche_p_back_${uid})`} />
        <rect width={PORTRAIT_W} height={PORTRAIT_H} rx="28" ry="28" fill={`url(#dotMatrix_p_back_${uid})`} />
      </g>

      <circle cx="300" cy="380" r="240" fill={theme.accentGlow} opacity={theme.isDark ? 0.35 : 0.15} />

      <rect x="2" y="2" width={PORTRAIT_W - 4} height={PORTRAIT_H - 4} rx="26" ry="26" fill="none" stroke={theme.cardBorder} strokeWidth="2.5" />

      {/* Top Header */}
      <g transform="translate(45, 36)">
        <circle cx="30" cy="30" r="28" fill="none" stroke={theme.accentColor} strokeWidth="2" />
        <circle cx="30" cy="30" r="26" fill={theme.isDark ? '#064e3b' : '#E2E8F0'} />
        {logoDataUrl ? (
          <image href={logoDataUrl} x="4" y="4" width="52" height="52" clipPath={`url(#pBackLogoClip_${uid})`} />
        ) : (
          <text x="30" y="36" textAnchor="middle" fill={theme.isDark ? '#FFFFFF' : '#0F172A'} fontSize="18" fontWeight="bold" fontFamily="system-ui, -apple-system, sans-serif">
            {initials}
          </text>
        )}

        <text x="70" y="28" fill={theme.primaryText} fontSize="20" fontWeight="800" fontFamily="system-ui, -apple-system, sans-serif">
          {business.name.length > 20 ? business.name.slice(0, 20) + '...' : business.name}
        </text>
        <text x="70" y="48" fill={theme.secondaryText} fontSize="12" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif">
          OFFICIAL VERIFIED WHATSAPP BUSINESS
        </text>
      </g>

      <line x1="45" y1="105" x2={PORTRAIT_W - 45} y2="105" stroke={theme.footerBorder} strokeWidth="1.5" />

      {/* QR CONTAINER */}
      <g transform="translate(110, 135)">
        <rect width="380" height="380" rx="24" fill={theme.qrBoxBg} stroke={theme.qrBoxBorder} strokeWidth="3.5" />
        <g transform="translate(25, 25)">
          <QRCodeSVG
            value={qrValue}
            size={330}
            level="H"
            bgColor={theme.qrBgColor}
            fgColor={theme.qrFgColor}
            marginSize={0}
            imageSettings={{
              src: '/logo.png',
              height: 60,
              width: 60,
              excavate: true,
            }}
          />
        </g>
        {/* Center WA.Directory Logo Overlay */}
        <g transform="translate(166, 166)">
          <circle cx="24" cy="24" r="24" fill="#FFFFFF" stroke={theme.accentColor} strokeWidth="2.5" />
          <image href="/logo.png" x="4" y="4" width="40" height="40" clipPath={`url(#pQrLogoClip_${uid})`} preserveAspectRatio="xMidYMid meet" />
        </g>
      </g>

      {/* VALUE HIGHLIGHTS */}
      <g transform="translate(45, 560)">
        <text x="255" y="30" textAnchor="middle" fill={theme.primaryText} fontSize="28" fontWeight="800" fontFamily="system-ui, -apple-system, sans-serif">
          Scan to Chat on WhatsApp
        </text>
        <text x="255" y="58" textAnchor="middle" fill={theme.secondaryText} fontSize="14" fontWeight="500" fontFamily="system-ui, -apple-system, sans-serif">
          Point camera to start instant 1-on-1 messaging
        </text>

        {/* 3 Features */}
        <g transform="translate(30, 95)">
          <g transform="translate(0, 0)">
            <circle cx="14" cy="14" r="14" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1" />
            <path d="M9 14l3.5 3.5 7-7" fill="none" stroke={theme.accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <text x="38" y="18" fill={theme.primaryText} fontSize="15" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
              Instant 1-on-1 Direct Messaging
            </text>
            <text x="38" y="36" fill={theme.mutedText} fontSize="12" fontWeight="400" fontFamily="system-ui, -apple-system, sans-serif">
              No need to save number to contacts
            </text>
          </g>

          <g transform="translate(0, 65)">
            <circle cx="14" cy="14" r="14" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1" />
            <path d="M9 14l3.5 3.5 7-7" fill="none" stroke={theme.accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <text x="38" y="18" fill={theme.primaryText} fontSize="15" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
              Live Quotes & Product Orders
            </text>
            <text x="38" y="36" fill={theme.mutedText} fontSize="12" fontWeight="400" fontFamily="system-ui, -apple-system, sans-serif">
              Direct line to sales & support
            </text>
          </g>

          <g transform="translate(0, 130)">
            <circle cx="14" cy="14" r="14" fill={theme.chipBg} stroke={theme.chipBorder} strokeWidth="1" />
            <path d="M9 14l3.5 3.5 7-7" fill="none" stroke={theme.accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <text x="38" y="18" fill={theme.primaryText} fontSize="15" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
              Verified Business Guarantee
            </text>
            <text x="38" y="36" fill={theme.mutedText} fontSize="12" fontWeight="400" fontFamily="system-ui, -apple-system, sans-serif">
              Certified by WA Directory Zimbabwe
            </text>
          </g>
        </g>
      </g>

      {/* Footer */}
      <g transform={`translate(0, ${PORTRAIT_H - 64})`}>
        <rect width={PORTRAIT_W} height="64" fill={theme.footerBg} />
        <line x1="0" y1="0" x2={PORTRAIT_W} y2="0" stroke={theme.footerBorder} strokeWidth="1" />
        <text x="300" y="38" textAnchor="middle" fill={theme.accentColor} fontSize="14" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
          {profileUrl}
        </text>
      </g>
    </svg>
  )
}

// -------------------------------------------------------------
// 5. MAIN BUSINESS CARD COMPONENT WITH 3D TILT & EXPORT SUITE
// -------------------------------------------------------------
export default function BusinessCardPrint({ business }: { business: Business }) {
  const uniqueId = useId().replace(/:/g, '_')
  const frontRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)
  const cardContainerRef = useRef<HTMLDivElement>(null)

  const [mounted, setMounted] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<CardTheme>('emerald')
  const [orientation, setOrientation] = useState<CardOrientation>('landscape')
  const [activeSide, setActiveSide] = useState<'front' | 'back' | 'both'>('front')
  const [isFlipped, setIsFlipped] = useState(false)
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)

  // Interactive 3D tilt state
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, isHovered: false })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Safely load and convert business logo to base64 Data URL to prevent CORS taint on canvas export
  useEffect(() => {
    if (business.logo_url) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const c = document.createElement('canvas')
          c.width = 180
          c.height = 180
          const ctx = c.getContext('2d')
          if (ctx) {
            ctx.beginPath()
            ctx.arc(90, 90, 90, 0, Math.PI * 2)
            ctx.clip()
            ctx.drawImage(img, 0, 0, 180, 180)
            setLogoDataUrl(c.toDataURL('image/png'))
          }
        } catch {
          setLogoDataUrl(null)
        }
      }
      img.onerror = () => {
        setLogoDataUrl(null)
      }
      img.src = business.logo_url
    }
  }, [business.logo_url])

  const initials =
    business.name
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'WA'

  const locationText = [business.area, business.city, 'Zimbabwe'].filter(Boolean).join(', ')
  const profileUrl = `wadirectory.co.zw/business/${business.slug || business.id}`
  const phoneClean = (business.phone || '').replace(/[^0-9]/g, '')
  const qrValue = `https://wa.me/${phoneClean}?text=${encodeURIComponent(
    `Hi ${business.name}, I found your official business card on WA Directory Zimbabwe and would like to inquire about your services.`
  )}`
  const formattedPhone = formatPhone(business.phone)
  const theme = THEMES[currentTheme]

  // Mouse Move Tilt Handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardContainerRef.current) return
    const rect = cardContainerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = ((y - centerY) / centerY) * -12
    const rotateY = ((x - centerX) / centerX) * 12

    const glareX = (x / rect.width) * 100
    const glareY = (y / rect.height) * 100

    setTilt({ rotateX, rotateY, glareX, glareY, isHovered: true })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, isHovered: false })
  }, [])

  // Render SVG element to high-res PNG
  async function renderSvgToCanvas(svgEl: SVGElement, scale = 3): Promise<HTMLCanvasElement> {
    const svgData = new XMLSerializer().serializeToString(svgEl)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const curW = orientation === 'landscape' ? CARD_W : PORTRAIT_W
    const curH = orientation === 'landscape' ? CARD_H : PORTRAIT_H

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = curW * scale
        canvas.height = curH * scale
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(url)
          reject(new Error('No canvas context'))
          return
        }
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(url)
        resolve(canvas)
      }
      img.onerror = err => {
        URL.revokeObjectURL(url)
        reject(err)
      }
      img.src = url
    })
  }

  // Download Single Side PNG (300 DPI Ultra-HD)
  async function downloadSidePng(side: 'front' | 'back') {
    const ref = side === 'front' ? frontRef.current : backRef.current
    if (!ref) return
    const svgEl = ref.querySelector('svg')
    if (!svgEl) return

    setDownloading(side)
    try {
      const canvas = await renderSvgToCanvas(svgEl, 3)
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `${business.slug || 'business'}-card-${side}-${currentTheme}-${orientation}.png`
      a.click()
    } catch (e) {
      console.error('Export error:', e)
    } finally {
      setDownloading(null)
    }
  }

  // Download Double-Sided Combined Presentation Sheet (3150 x 3900 px)
  async function downloadDoubleSidedPng() {
    const frontEl = frontRef.current?.querySelector('svg')
    const backEl = backRef.current?.querySelector('svg')
    if (!frontEl || !backEl) return

    setDownloading('both')
    try {
      const scale = 3
      const [frontCanvas, backCanvas] = await Promise.all([
        renderSvgToCanvas(frontEl, scale),
        renderSvgToCanvas(backEl, scale),
      ])

      const curW = orientation === 'landscape' ? CARD_W * scale : PORTRAIT_W * scale
      const curH = orientation === 'landscape' ? CARD_H * scale : PORTRAIT_H * scale

      const pad = 90 * scale
      const headerH = 130 * scale
      const totalW = curW + pad * 2
      const totalH = curH * 2 + pad * 3 + headerH

      const sheet = document.createElement('canvas')
      sheet.width = totalW
      sheet.height = totalH
      const ctx = sheet.getContext('2d')
      if (!ctx) return

      // Dark luxury background
      ctx.fillStyle = '#090d16'
      ctx.fillRect(0, 0, totalW, totalH)

      // Header Branding
      ctx.fillStyle = '#FFFFFF'
      ctx.font = `bold ${30 * scale}px system-ui, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(`${business.name.toUpperCase()} — OFFICIAL BUSINESS CARD`, totalW / 2, 52 * scale)

      ctx.fillStyle = '#25D366'
      ctx.font = `600 ${16 * scale}px system-ui, -apple-system, sans-serif`
      ctx.fillText(`WA DIRECTORY ZIMBABWE • 3.5" x 2.0" STANDARD PRINT SPECIFICATION`, totalW / 2, 82 * scale)

      // Label: Front Side
      ctx.fillStyle = '#94A3B8'
      ctx.font = `bold ${14 * scale}px system-ui, -apple-system, sans-serif`
      ctx.textAlign = 'left'
      ctx.fillText(`SIDE A (FRONT EXECUTIVE IDENTITY)`, pad, headerH + 20 * scale)

      // Draw Front with subtle shadow
      ctx.drawImage(frontCanvas, pad, headerH + 30 * scale)

      // Label: Back Side
      const backY = headerH + 30 * scale + curH + 60 * scale
      ctx.fillText(`SIDE B (BACK WHATSAPP QR SCAN GATEWAY)`, pad, backY - 10 * scale)

      // Draw Back
      ctx.drawImage(backCanvas, pad, backY)

      const a = document.createElement('a')
      a.href = sheet.toDataURL('image/png')
      a.download = `${business.slug || 'business'}-business-card-double-sided-kit.png`
      a.click()
    } catch (e) {
      console.error('Export error:', e)
    } finally {
      setDownloading(null)
    }
  }

  // Download Vector SVG
  function downloadSvg(side: 'front' | 'back') {
    const ref = side === 'front' ? frontRef.current : backRef.current
    if (!ref) return
    const svgEl = ref.querySelector('svg')
    if (!svgEl) return

    const svgData = new XMLSerializer().serializeToString(svgEl)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${business.slug || 'business'}-card-${side}-${currentTheme}-${orientation}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Download Digital vCard (.vcf)
  function downloadVCard() {
    const vCardData = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${business.name}`,
      `ORG:${business.name}`,
      `TEL;TYPE=CELL,VOICE,PREF:${formattedPhone || business.phone}`,
      `ADR;TYPE=WORK:;;${business.address || ''};${business.city || 'Harare'};;Zimbabwe`,
      `URL:https://${profileUrl}`,
      `NOTE:Verified WhatsApp Business on WA Directory Zimbabwe. Category: ${business.category?.join(', ') || 'Business'}`,
      'X-SOCIALPROFILE;TYPE=whatsapp:https://wa.me/' + phoneClean,
      'END:VCARD',
    ].join('\r\n')

    const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${business.slug || 'business'}-contact.vcf`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Print Standard 3.5" x 2.0" Physical Sheet (with Crop & Bleed Marks)
  function printStandardSheet() {
    const frontEl = frontRef.current?.querySelector('svg')
    const backEl = backRef.current?.querySelector('svg')
    if (!frontEl || !backEl) return

    const frontSvg = new XMLSerializer().serializeToString(frontEl)
    const backSvg = new XMLSerializer().serializeToString(backEl)

    const printWin = window.open('', '_blank')
    if (!printWin) return

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${business.name} - Business Card Print Sheet (WA Directory)</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 20px;
            font-family: system-ui, -apple-system, sans-serif;
            background: #f8fafc;
            color: #0f172a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header {
            text-align: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #e2e8f0;
          }
          .title {
            font-size: 20px;
            font-weight: 800;
            margin: 0 0 4px 0;
          }
          .subtitle {
            font-size: 12px;
            color: #64748b;
            margin: 0;
          }
          .grid {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 32px;
          }
          .card-container {
            width: ${orientation === 'landscape' ? '3.5in' : '2.0in'};
            height: ${orientation === 'landscape' ? '2.0in' : '3.5in'};
            position: relative;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
          }
          .card-container svg {
            width: 100%;
            height: 100%;
            display: block;
          }
          .card-label {
            font-size: 11px;
            font-weight: 700;
            color: #475569;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .print-guide {
            margin-top: 30px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            border-top: 1px dashed #cbd5e1;
            padding-top: 15px;
          }
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .no-print {
              display: none;
            }
            .card-container {
              box-shadow: none;
              border: 1px dashed #cbd5e1;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">${business.name} — Official Business Cards</h1>
          <p class="subtitle">Standard ${orientation === 'landscape' ? '3.5" × 2.0"' : '2.0" × 3.5"'} Print Template • WA Directory Zimbabwe (wadirectory.co.zw)</p>
        </div>

        <div class="grid">
          <div>
            <div class="card-label">Front Side (Executive Brand Identity)</div>
            <div class="card-container">
              ${frontSvg}
            </div>
          </div>

          <div>
            <div class="card-label">Back Side (Instant WhatsApp QR Scan)</div>
            <div class="card-container">
              ${backSvg}
            </div>
          </div>
        </div>

        <div class="print-guide">
          ✂️ Cut along edges for standard business cards (88.9 × 50.8 mm). Recommended paper: 350–400 GSM Matte or Silk Cardstock with Soft-Touch Lamination.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 350);
          }
        </script>
      </body>
      </html>
    `)
    printWin.document.close()
  }

  // Copy Profile Link
  function copyCardLink() {
    const fullUrl = `https://wadirectory.co.zw/business/${business.slug || business.id}`
    navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  // Share to WhatsApp
  function shareToWhatsApp() {
    const fullUrl = `https://wadirectory.co.zw/business/${business.slug || business.id}`
    const msg = `Check out *${business.name}*'s official digital business card on WA Directory Zimbabwe:\n\n${fullUrl}\n\nScan or tap to connect on WhatsApp directly!`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (!mounted) {
    return (
      <div className="w-full aspect-[7/4] bg-slate-900/10 rounded-2xl animate-pulse flex items-center justify-center">
        <span className="text-sm font-medium text-slate-500">Loading Business Card Studio...</span>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* ---------------- TOOLBAR: THEME & ORIENTATION & VIEW MODES ---------------- */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Row 1: Top Bar with Title, Orientation & View Switchers */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-whatsapp-50 dark:bg-whatsapp-950/60 border border-whatsapp-200/80 dark:border-whatsapp-800/80 flex items-center justify-center text-whatsapp-600 dark:text-whatsapp-400 shrink-0">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-text-primary">Business Card Studio</h3>
              <p className="text-[11px] sm:text-xs text-text-secondary">Customise card style, orientation & export</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Orientation Toggle */}
            <div className="flex items-center gap-1 bg-surface dark:bg-gray-800 p-1 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
              <button
                onClick={() => setOrientation('landscape')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  orientation === 'landscape' ? 'bg-white dark:bg-gray-700 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Standard Landscape (3.5 × 2.0 in)"
              >
                Horizontal
              </button>
              <button
                onClick={() => setOrientation('portrait')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  orientation === 'portrait' ? 'bg-white dark:bg-gray-700 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Modern Vertical Portrait (2.0 × 3.5 in)"
              >
                Vertical
              </button>
            </div>

            {/* View Modes (Front, Back, Dual) */}
            <div className="flex items-center gap-1 bg-surface dark:bg-gray-800 p-1 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
              <button
                onClick={() => {
                  setActiveSide('front')
                  setIsFlipped(false)
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeSide === 'front' && !isFlipped ? 'bg-white dark:bg-gray-700 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Front
              </button>
              <button
                onClick={() => {
                  setActiveSide('back')
                  setIsFlipped(true)
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeSide === 'back' || (activeSide === 'front' && isFlipped)
                    ? 'bg-white dark:bg-gray-700 text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Back (QR)
              </button>
              <button
                onClick={() => setActiveSide('both')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeSide === 'both' ? 'bg-white dark:bg-gray-700 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Dual View
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Prominent Non-Scrolling Card Color Themes Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <span>Card Color & Theme:</span>
              <span className="text-whatsapp-600 font-extrabold normal-case tracking-normal">
                {THEMES[currentTheme].name}
              </span>
            </span>
            <span className="text-[11px] text-text-secondary font-medium">6 Luxury Finishes</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 w-full">
            {(Object.keys(THEMES) as CardTheme[]).map(tId => {
              const t = THEMES[tId]
              const active = currentTheme === tId
              return (
                <button
                  key={tId}
                  onClick={() => setCurrentTheme(tId)}
                  className={`p-2.5 sm:p-3 rounded-2xl text-left transition-all border flex flex-col justify-between gap-2 relative group cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-gray-800 border-whatsapp-500 ring-2 ring-whatsapp-500/30 shadow-md scale-[1.02]'
                      : 'bg-surface/80 dark:bg-gray-800/60 border-gray-200/80 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-surface'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div
                      className="w-5 h-5 rounded-full ring-2 ring-white/80 shadow-xs flex items-center justify-center shrink-0"
                      style={{ backgroundColor: t.pillColor }}
                    >
                      {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    {active && (
                      <span className="text-[10px] font-bold text-whatsapp-600 bg-whatsapp-50 dark:bg-whatsapp-950/60 px-1.5 py-0.5 rounded-md border border-whatsapp-200 dark:border-whatsapp-800">
                        Active
                      </span>
                    )}
                  </div>
                  <div>
                    <p className={`text-xs font-bold leading-tight ${active ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>
                      {t.name}
                    </p>
                    <p className="text-[10px] text-text-secondary/80 mt-0.5">
                      {t.isDark ? 'Dark Luxury' : 'Clean Light'}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ---------------- CARD PREVIEW VIEWPORT ---------------- */}
      {activeSide === 'both' ? (
        /* SIDE-BY-SIDE DUAL VIEW */
        <div className={`grid gap-4 sm:gap-6 ${orientation === 'landscape' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto'}`}>
          {/* Front Side */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Front Side — Executive Brand
              </span>
              <button onClick={() => downloadSidePng('front')} className="text-xs text-whatsapp-600 font-semibold hover:underline">
                Download Front (HD)
              </button>
            </div>
            <div ref={frontRef} className="w-full rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ring-1 ring-black/10 dark:ring-white/10">
              {orientation === 'landscape' ? (
                <FrontLandscapeSvg
                  business={business}
                  theme={theme}
                  logoDataUrl={logoDataUrl}
                  initials={initials}
                  formattedPhone={formattedPhone}
                  locationText={locationText}
                  profileUrl={profileUrl}
                  uid={`${uniqueId}_dual_fl`}
                />
              ) : (
                <FrontPortraitSvg
                  business={business}
                  theme={theme}
                  logoDataUrl={logoDataUrl}
                  initials={initials}
                  formattedPhone={formattedPhone}
                  locationText={locationText}
                  profileUrl={profileUrl}
                  uid={`${uniqueId}_dual_fp`}
                />
              )}
            </div>
          </div>

          {/* Back Side */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Back Side — WhatsApp QR Scan
              </span>
              <button onClick={() => downloadSidePng('back')} className="text-xs text-whatsapp-600 font-semibold hover:underline">
                Download Back (HD)
              </button>
            </div>
            <div ref={backRef} className="w-full rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ring-1 ring-black/10 dark:ring-white/10">
              {orientation === 'landscape' ? (
                <BackLandscapeSvg
                  business={business}
                  theme={theme}
                  logoDataUrl={logoDataUrl}
                  initials={initials}
                  qrValue={qrValue}
                  profileUrl={profileUrl}
                  uid={`${uniqueId}_dual_bl`}
                />
              ) : (
                <BackPortraitSvg
                  business={business}
                  theme={theme}
                  logoDataUrl={logoDataUrl}
                  initials={initials}
                  qrValue={qrValue}
                  profileUrl={profileUrl}
                  uid={`${uniqueId}_dual_bp`}
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        /* INTERACTIVE 3D TILT & FLIP STAGE */
        <div className="flex flex-col items-center">
          {/* Hidden reference elements for PNG & print canvas rasterization */}
          <div className="hidden">
            <div ref={frontRef}>
              {orientation === 'landscape' ? (
                <FrontLandscapeSvg
                  business={business}
                  theme={theme}
                  logoDataUrl={logoDataUrl}
                  initials={initials}
                  formattedPhone={formattedPhone}
                  locationText={locationText}
                  profileUrl={profileUrl}
                  uid={`${uniqueId}_hidden_fl`}
                />
              ) : (
                <FrontPortraitSvg
                  business={business}
                  theme={theme}
                  logoDataUrl={logoDataUrl}
                  initials={initials}
                  formattedPhone={formattedPhone}
                  locationText={locationText}
                  profileUrl={profileUrl}
                  uid={`${uniqueId}_hidden_fp`}
                />
              )}
            </div>
            <div ref={backRef}>
              {orientation === 'landscape' ? (
                <BackLandscapeSvg
                  business={business}
                  theme={theme}
                  logoDataUrl={logoDataUrl}
                  initials={initials}
                  qrValue={qrValue}
                  profileUrl={profileUrl}
                  uid={`${uniqueId}_hidden_bl`}
                />
              ) : (
                <BackPortraitSvg
                  business={business}
                  theme={theme}
                  logoDataUrl={logoDataUrl}
                  initials={initials}
                  qrValue={qrValue}
                  profileUrl={profileUrl}
                  uid={`${uniqueId}_hidden_bp`}
                />
              )}
            </div>
          </div>

          {/* Interactive Card Stage with 3D Tilt & Specular Glare */}
          <div
            ref={cardContainerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`w-full [perspective:1400px] ${orientation === 'landscape' ? 'max-w-2xl' : 'max-w-xs sm:max-w-sm'}`}
          >
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className={`relative w-full cursor-pointer transition-transform duration-700 [transform-style:preserve-3d] group ${
                orientation === 'landscape' ? 'aspect-[7/4]' : 'aspect-[4/7]'
              }`}
              style={{
                transform: `rotateY(${isFlipped ? 180 + tilt.rotateY : tilt.rotateY}deg) rotateX(${tilt.rotateX}deg)`,
                transition: tilt.isHovered ? 'transform 0.1s ease-out' : 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
              title="Click to flip card"
            >
              {/* Front Face */}
              <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl [backface-visibility:hidden] ring-1 ring-black/10 dark:ring-white/10">
                {orientation === 'landscape' ? (
                  <FrontLandscapeSvg
                    business={business}
                    theme={theme}
                    logoDataUrl={logoDataUrl}
                    initials={initials}
                    formattedPhone={formattedPhone}
                    locationText={locationText}
                    profileUrl={profileUrl}
                    uid={`${uniqueId}_stage_fl`}
                  />
                ) : (
                  <FrontPortraitSvg
                    business={business}
                    theme={theme}
                    logoDataUrl={logoDataUrl}
                    initials={initials}
                    formattedPhone={formattedPhone}
                    locationText={locationText}
                    profileUrl={profileUrl}
                    uid={`${uniqueId}_stage_fp`}
                  />
                )}

                {/* Dynamic Specular Light Glare on Tilt */}
                <div
                  className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,${
                      theme.isDark ? 0.22 : 0.4
                    }) 0%, rgba(255,255,255,0) 65%)`,
                    opacity: tilt.isHovered ? 1 : 0,
                  }}
                />

                {/* Hover Flip Hint Tag */}
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <span>Click to flip</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>

              {/* Back Face */}
              <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)] ring-1 ring-black/10 dark:ring-white/10">
                {orientation === 'landscape' ? (
                  <BackLandscapeSvg
                    business={business}
                    theme={theme}
                    logoDataUrl={logoDataUrl}
                    initials={initials}
                    qrValue={qrValue}
                    profileUrl={profileUrl}
                    uid={`${uniqueId}_stage_bl`}
                  />
                ) : (
                  <BackPortraitSvg
                    business={business}
                    theme={theme}
                    logoDataUrl={logoDataUrl}
                    initials={initials}
                    qrValue={qrValue}
                    profileUrl={profileUrl}
                    uid={`${uniqueId}_stage_bp`}
                  />
                )}

                {/* Dynamic Specular Light Glare on Tilt */}
                <div
                  className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,${
                      theme.isDark ? 0.22 : 0.4
                    }) 0%, rgba(255,255,255,0) 65%)`,
                    opacity: tilt.isHovered ? 1 : 0,
                  }}
                />

                {/* Hover Flip Hint Tag */}
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <span>Click to flip</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Flip Toggle Button */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-text-primary text-xs font-semibold shadow-sm transition-all"
            >
              <svg className="w-4 h-4 text-whatsapp-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span>{isFlipped ? 'Show Front Side' : 'Flip to WhatsApp QR Code'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ---------------- EXPORT & ACTION COMMAND BAR ---------------- */}
      <div className="bg-gradient-to-r from-surface via-white to-surface dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Download Buttons Group */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Download HD PNG */}
            <button
              onClick={() => downloadSidePng(isFlipped ? 'back' : 'front')}
              disabled={downloading !== null}
              className="btn-primary px-4 py-2.5 text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span>
                {downloading === 'front' || downloading === 'back' ? 'Generating HD...' : `Download ${isFlipped ? 'Back' : 'Front'} (HD PNG)`}
              </span>
            </button>

            {/* Download Double Sided Kit */}
            <button
              onClick={downloadDoubleSidedPng}
              disabled={downloading !== null}
              className="btn-secondary px-4 py-2.5 text-xs font-bold flex items-center gap-2 transition-all"
            >
              <svg className="w-4 h-4 text-whatsapp-600" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m-15 0a2.246 2.246 0 0 0-.75 1.622v6c0 1.242 1.008 2.25 2.25 2.25h12A2.25 2.25 0 0 0 20.25 17.5v-6c0-.62-.25-1.18-.654-1.584A2.246 2.246 0 0 0 19.5 9.878" />
              </svg>
              <span>{downloading === 'both' ? 'Preparing Kit...' : 'Both Sides Kit'}</span>
            </button>

            {/* Print Physical Sheet */}
            <button onClick={printStandardSheet} className="btn-secondary px-4 py-2.5 text-xs font-bold flex items-center gap-2 transition-all">
              <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
              <span>Print Sheet</span>
            </button>

            {/* Vector SVG */}
            <button
              onClick={() => downloadSvg(isFlipped ? 'back' : 'front')}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800 text-text-secondary hover:text-text-primary text-xs font-semibold transition-all"
              title="Download vector SVG for professional graphic designers and print shops"
            >
              Vector SVG
            </button>

            {/* Digital vCard (.vcf) */}
            <button
              onClick={downloadVCard}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800 text-text-secondary hover:text-text-primary text-xs font-semibold transition-all flex items-center gap-1.5"
              title="Download vCard (.vcf) contact file for phone contacts"
            >
              <svg className="w-3.5 h-3.5 text-whatsapp-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
              <span>vCard</span>
            </button>
          </div>

          {/* Social & Sharing Group */}
          <div className="flex items-center gap-2">
            {/* Share to WhatsApp */}
            <button
              onClick={shareToWhatsApp}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-whatsapp-50 dark:bg-whatsapp-950/40 border border-whatsapp-200 dark:border-whatsapp-800 text-whatsapp-700 dark:text-whatsapp-300 hover:bg-whatsapp-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <WhatsAppIconSvg x={0} y={0} size={15} fill="#25D366" />
              <span>Share</span>
            </button>

            {/* Copy Card Link */}
            <button
              onClick={copyCardLink}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-surface dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-whatsapp-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-whatsapp-600">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                  </svg>
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* World Standard Print Spec Footer */}
        <p className="text-[11px] text-text-secondary mt-2.5 text-center sm:text-left flex items-center justify-center sm:justify-start gap-1">
          <svg className="w-3.5 h-3.5 text-whatsapp-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span>
            <b>World Standard Print Specification:</b> 3.5″ × 2.0″ (3150 × 1800 px @ 300 DPI) & 2.0″ × 3.5″ portrait formats with crop marks, CMYK/RGB calibrated vector SVG, and vCard contact file.
          </span>
        </p>
      </div>
    </div>
  )
}
