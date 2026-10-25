'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface NavItem {
  href: string
  label: string
}

interface SiteNavProps {
  businessName: string
  logoUrl?: string
  initials: string
  verified?: boolean
  whatsappHref?: string
  navItems: NavItem[]
  accent: string
  accentDark: boolean
  headerBg?: string
  isHeaderDark: boolean
  ctaTextColor: string
}

export default function SiteNav({
  businessName,
  logoUrl,
  initials,
  verified,
  whatsappHref,
  navItems,
  accent,
  accentDark,
  headerBg,
  isHeaderDark,
  ctaTextColor,
}: SiteNavProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isScrolled, setIsScrolled] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    let lastScrollY = window.scrollY
    let ticking = false

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Calculate reading progress
          const totalHeight = document.documentElement.scrollHeight - window.innerHeight
          const progress = totalHeight > 0 ? Math.min(Math.max((currentScrollY / totalHeight) * 100, 0), 100) : 0
          setScrollProgress(progress)

          // Background blur/shadow trigger
          setIsScrolled(currentScrollY > 16)

          // Directional hide/show
          if (currentScrollY < 60) {
            setIsVisible(true)
          } else if (currentScrollY > lastScrollY + 8) {
            // Scrolling down -> hide
            setIsVisible(false)
            setMobileMenuOpen(false)
          } else if (currentScrollY < lastScrollY - 6) {
            // Scrolling up -> show
            setIsVisible(true)
          }

          lastScrollY = currentScrollY
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Header background & text colors
  const defaultBg = isScrolled
    ? 'bg-white/85 supports-[backdrop-filter]:bg-white/75 border-black/[0.08] shadow-sm'
    : 'bg-white/60 supports-[backdrop-filter]:bg-white/50 border-black/[0.05]'

  const customBgStyle = headerBg
    ? {
        backgroundColor: isScrolled
          ? `color-mix(in srgb, ${headerBg} 92%, transparent)`
          : `color-mix(in srgb, ${headerBg} 75%, transparent)`,
        borderColor: isHeaderDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
      }
    : undefined

  const textColorClass = isHeaderDark ? 'text-white' : 'text-text-primary'

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] backdrop-blur-xl border-b ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      } ${!headerBg ? defaultBg : ''}`}
      style={customBgStyle}
    >
      <div className={`max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 ${textColorClass}`}>
        {/* Brand identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="#"
            className="flex items-center gap-2.5 min-w-0 group focus-visible:ring-2 focus-visible:ring-whatsapp-500 rounded-xl"
            aria-label={`${businessName} home`}
          >
            {logoUrl ? (
              <span className="w-9 h-9 rounded-xl overflow-hidden bg-white border border-black/[0.08] shrink-0 flex items-center justify-center shadow-sm">
                <Image
                  src={logoUrl}
                  alt={businessName}
                  width={36}
                  height={36}
                  className="object-cover w-full h-full"
                />
              </span>
            ) : (
              <span
                className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center font-bold text-sm tracking-wider shadow-sm transition-transform group-hover:scale-105"
                style={{ backgroundColor: accent, color: ctaTextColor }}
              >
                {initials}
              </span>
            )}
            <span className="font-bold text-[15px] sm:text-base truncate tracking-tight group-hover:opacity-90">
              {businessName}
            </span>
          </Link>

          {verified && (
            <span
              className="inline-flex items-center shrink-0 text-whatsapp-500"
              title="Verified business"
              aria-label="Verified business badge"
            >
              <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.5 14.5l-4-4 1.41-1.41L10.5 13.67l6.59-6.59L18.5 8.5l-8 8z" />
              </svg>
            </span>
          )}
        </div>

        {/* Desktop Navigation Anchors */}
        <nav
          className="hidden md:flex items-center gap-1 text-[13.5px] font-medium"
          aria-label="Main section navigation"
        >
          {navItems.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className={`px-3 py-1.5 rounded-full transition-all duration-150 focus-visible:ring-2 focus-visible:ring-whatsapp-500 ${
                isHeaderDark
                  ? 'text-white/75 hover:text-white hover:bg-white/10'
                  : 'text-text-secondary hover:text-text-primary hover:bg-black/[0.04]'
              }`}
            >
              {n.label}
            </a>
          ))}
        </nav>

        {/* Right action group */}
        <div className="flex items-center gap-2">
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Chat with ${businessName} on WhatsApp`}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-bold shadow-sm hover:brightness-105 active:scale-95 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-whatsapp-500"
              style={{
                backgroundColor: accent,
                color: ctaTextColor,
                boxShadow: `0 2px 10px -2px color-mix(in srgb, ${accent} 45%, transparent)`,
              }}
            >
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span>WhatsApp</span>
            </a>
          )}

          <a
            href="#contact"
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium border transition-colors focus-visible:ring-2 focus-visible:ring-whatsapp-500 ${
              isHeaderDark
                ? 'border-white/20 text-white hover:bg-white/10'
                : 'border-black/[0.08] text-text-primary hover:bg-black/[0.03]'
            }`}
          >
            Contact
          </a>

          {/* Mobile hamburger toggle */}
          {navItems.length > 0 && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-whatsapp-500 ${
                isHeaderDark ? 'text-white hover:bg-white/10' : 'text-text-primary hover:bg-black/[0.05]'
              }`}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile drop menu */}
      {mobileMenuOpen && (
        <div
          className={`md:hidden border-t px-4 py-4 space-y-1.5 backdrop-blur-2xl shadow-lg transition-all animate-fade-in ${
            isHeaderDark ? 'bg-slate-900/95 border-white/10 text-white' : 'bg-white/95 border-black/[0.06] text-text-primary'
          }`}
        >
          {navItems.map((n) => (
            <a
              key={n.href}
              href={n.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isHeaderDark ? 'hover:bg-white/10 text-white/90' : 'hover:bg-black/[0.04] text-text-primary'
              }`}
            >
              {n.label}
            </a>
          ))}
          <a
            href="#contact"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              isHeaderDark ? 'hover:bg-white/10 text-white/90' : 'hover:bg-black/[0.04] text-text-primary'
            }`}
          >
            Contact details
          </a>
        </div>
      )}

      {/* Accent reading progress line along bottom edge */}
      <div className="absolute bottom-0 inset-x-0 h-[2px] bg-black/[0.04] overflow-hidden">
        <div
          className="h-full transition-all duration-150 ease-out"
          style={{
            width: `${scrollProgress}%`,
            backgroundColor: accent,
          }}
        />
      </div>
    </header>
  )
}
