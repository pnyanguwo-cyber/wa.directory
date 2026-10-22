import { getSupabase } from '@/lib/supabase-server'
import { generateSiteContent } from '@/lib/site-generation'
import { parseSiteContent, servicesToCards, hoursRenderable } from '@/lib/site-content'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { Business, BusinessItem } from '@/types'
import { SOCIAL_META, SocialIcon, getSocialLinks } from '@/components/social-icons'
import { digitsOnly } from '@/lib/phone'
import { formatPrice, getInitials } from '@/lib/utils'
import { accentFor } from '@/lib/category-style'
import { getPreset } from '@/lib/site-design'
import { getFontPair } from '@/lib/site-fonts'

import Reveal from '@/components/site/reveal'
import SiteNav from '@/components/site/site-nav'
import SiteStats from '@/components/site/site-stats'
import SiteFaq from '@/components/site/site-faq'
import HoursStatus from '@/components/site/hours-status'
import CategoryIcon from '@/components/site/category-icon'
import TypingTagline from '@/components/site/typing-tagline'
import { getCategoryImage } from '@/data/category-images'

export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  const { data } = await getSupabase()
    .from('businesses')
    .select('slug, id')
  return (data || []).map((b) => ({ slug: b.slug || b.id }))
}

const SITE_SELECT =
  'id, name, slug, bio, category, phone, phone_type, voice_phone, whatsapp_link, logo_url, city, area, areas, payment_status, generate_site, site_hero, site_services, site_contact_email, site_theme, site_socials, site_content, created_at, rating, review_count, website, address, lat, lng, show_location, business_id'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { data } = (await getSupabase()
    .from('businesses')
    .select('name, bio, city, site_content')
    .eq('slug', params.slug)
    .single()) as { data: { name: string; bio: string; city: string; site_content: unknown } | null }
  if (!data) return {}
  const tagline = parseSiteContent(data.site_content).tagline
  const description = (tagline || data.bio)?.slice(0, 160) || `Contact ${data.name} on WhatsApp in ${data.city || 'Zimbabwe'}.`
  return {
    title: `${data.name}${tagline ? ` — ${tagline}` : ''} | WA Directory`,
    description,
    alternates: { canonical: `/site/${params.slug}` },
  }
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/
const hex = (v: string | undefined) => (typeof v === 'string' && HEX_RE.test(v.trim()) ? v.trim().toUpperCase() : '')

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// WCAG 2.1 relative luminance
function getLuminance(h: string): number {
  if (!h || !HEX_RE.test(h)) return 0.5
  const rgb = hexToRgb(h).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
}

function isDark(c: string): boolean {
  if (!c) return false
  return getLuminance(c) < 0.25
}

// Returns text color with >= 4.5:1 (AA) or >= 7:1 (AAA) contrast against background
function getContrastColor(bgHex: string): '#FFFFFF' | '#111B21' {
  const lum = getLuminance(bgHex)
  return lum > 0.35 ? '#111B21' : '#FFFFFF'
}

export default async function BusinessSitePage({ params }: { params: { slug: string } }) {
  let { data: business } = (await getSupabase()
    .from('businesses')
    .select(SITE_SELECT)
    .eq('slug', params.slug)
    .single()) as { data: Business | null }

  if (!business) {
    const { data: fallback } = (await getSupabase()
      .from('businesses')
      .select(SITE_SELECT)
      .eq('id', params.slug)
      .single()) as { data: Business | null }
    business = fallback
  }

  if (!business || !business.generate_site || business.payment_status !== 'active') notFound()

  const [itemsRes, ratingsRes] = await Promise.all([
    getSupabase()
      .from('business_items')
      .select('id, business_id, name, slug, price, image_url, is_active, created_at, updated_at')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    getSupabase()
      .from('ratings')
      .select('rating, comment, name, created_at')
      .eq('business_id', business.id)
      .in('rating', [4, 5])
      .not('comment', 'eq', '')
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  const itemList = (itemsRes.data as BusinessItem[]) || []
  const testimonials = (
    (ratingsRes.data as { rating: number; comment: string; name: string; created_at: string }[]) || []
  )
    .filter((r) => r.comment.trim())
    .slice(0, 6)

  const content =
    business.site_hero && business.site_services
      ? { hero: business.site_hero, services: business.site_services }
      : await generateSiteContent({
          businessName: business.name,
          category: business.category?.[0] || '',
          bio: business.bio || '',
          city: business.city || '',
        })

  const hero = business.site_hero || content.hero

  // Structured blocks (tagline / faq / hours / gallery)
  const blocks = parseSiteContent(business.site_content)
  const acCategories = business.category || []
  const cat = acCategories[0] || ''
  const tagline =
    blocks.tagline ||
    (cat
      ? `${cat} specialists${business.city ? ` in ${business.city}` : ''}`
      : `Your trusted local${business.city ? ` ${business.city}` : ''} business`)

  const faq = blocks.faq || [
    {
      q: `How do I reach ${business.name}?`,
      a: 'Send a WhatsApp message from this page — we reply fast during opening hours.',
    },
    ...(business.city
      ? [
          {
            q: 'Which areas do you serve?',
            a: `We are based in ${business.city}, Zimbabwe and cover the surrounding suburbs. Message us to confirm your location.`,
          },
        ]
      : []),
  ]

  const hours = hoursRenderable(blocks.hours) ? blocks.hours : undefined
  const menuServices = servicesToCards(business.site_services || content.services)

  // Gallery: curated uploads win; otherwise item photos fill in up to 6
  const itemPhotos = itemList.map((i) => i.image_url).filter((v): v is string => Boolean(v))
  const gallery = blocks.gallery?.length ? blocks.gallery : itemPhotos.slice(0, 6)

  // Trust stat: years on the directory
  const yearsOn = Math.max(0, new Date().getFullYear() - new Date(business.created_at || Date.now()).getFullYear())

  const phoneClean = digitsOnly(business.phone || '')
  const whatsappHref =
    business.whatsapp_link ||
    (phoneClean
      ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(`Hi ${business.name}, I found you through WA Directory.`)}`
      : '')

  const email = business.site_contact_email || ''
  const initials = getInitials(business.name)
  const profileHref = `/business/${business.slug || business.id}`

  // ---- Color System: derive tints/shades with color-mix() & WCAG contrast ----
  const theme = (business.site_theme || {}) as {
    header?: string
    hero?: string
    shop?: string
    contact?: string
    accent?: string
    design?: string
    font?: string
  }

  // Choosable template preset + font pair (portal "Design" panel writes these).
  const preset = getPreset(theme.design)
  const fontPair = getFontPair(theme.font || preset.defaultFont)
  const isPreset = preset.key !== 'classic'

  // Owner override (site_theme.accent) wins; otherwise the category default
  // gives every industry a distinct brand colour.
  const accent = hex(theme.accent) || accentFor(business.category)
  const accentDark = isDark(accent)
  const accentCtaText = getContrastColor(accent)
  const headerBg = hex(theme.header)
  const isHeaderDark = headerBg ? isDark(headerBg) : false
  const heroBg = hex(theme.hero)
  const shopBg = hex(theme.shop)
  const isShopDark = shopBg ? isDark(shopBg) : false
  const contactBg = hex(theme.contact) || (accentDark ? accent : '#075E54')
  const contactDark = isDark(contactBg)
  const contactCtaText = getContrastColor(contactBg)

  // 4-tier resolution: owner gallery → active item photo → category → procedural mesh (null)
  const coverImage = blocks.gallery?.[0] || itemPhotos[0] || getCategoryImage(business.category)

  // Automatic "dark hero" mode when a photographic cover image is present,
  // or when heroBg is explicitly dark, or when accent is dark
  const isHeroDark = coverImage ? true : (heroBg ? isDark(heroBg) : accentDark)

  // Derived color tokens via color-mix()
  const accentSoftBg = `color-mix(in srgb, ${accent} 10%, transparent)`
  const accentMutedBg = `color-mix(in srgb, ${accent} 18%, transparent)`
  const accentGlow = `color-mix(in srgb, ${accent} 35%, transparent)`

  const socialLinks = getSocialLinks(business.site_socials)

  const mapsHref =
    business.lat != null && business.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${business.lat},${business.lng}`
      : business.address && business.show_location
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${business.address}${business.city ? `, ${business.city}` : ''}, Zimbabwe`
          )}`
        : ''

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    description: `${tagline}. ${hero}`.slice(0, 300),
    telephone: phoneClean ? `+${phoneClean}` : undefined,
    email: email || undefined,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'ZW',
      streetAddress: business.address || undefined,
      addressLocality: business.city || undefined,
    },
    openingHours: hours?.filter((h) => h.open && h.close).map((h) => `${h.day} ${h.open}-${h.close}`),
    image: business.logo_url || undefined,
    url: `/site/${business.slug || business.id}`,
    ...(business.review_count > 0 && business.rating > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: business.rating.toFixed(1),
            reviewCount: business.review_count,
          },
        }
      : {}),
  }

  const NAV_ITEMS = [
    ...(menuServices.length ? [{ href: '#services', label: 'Services' }] : []),
    ...(itemList.length ? [{ href: '#shop', label: 'Shop' }] : []),
    ...(gallery.length ? [{ href: '#gallery', label: 'Gallery' }] : []),
    ...(testimonials.length ? [{ href: '#reviews', label: 'Reviews' }] : []),
    ...(faq.length ? [{ href: '#faq', label: 'FAQ' }] : []),
    ...(hours ? [{ href: '#hours', label: 'Hours' }] : []),
    { href: '#contact', label: 'Contact' },
  ]

  const stats = [
    { label: 'Rating', value: business.rating > 0 ? `${business.rating.toFixed(1)} / 5` : '—' },
    { label: 'Reviews', value: String(business.review_count || 0) },
    { label: 'Products listed', value: String(itemList.length) },
    { label: yearsOn > 0 ? 'Years on directory' : 'Directory status', value: yearsOn > 0 ? `${yearsOn}+` : '✓ Active' },
  ]

  return (
    <div
      className="site-wrap min-h-screen bg-surface text-text-primary isolate selection:bg-whatsapp-100 selection:text-whatsapp-900"
      style={{ fontFamily: fontPair.body, ['--site-head' as string]: fontPair.head }}
    >
      {/* Ambient drifting glow orbs — subtle full-page life behind all content.
          `isolate` on the root makes it a stacking context so the -z-10 orbs
          paint above the opaque bg-surface instead of behind it. */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-[12%] -left-[10%] w-[45vw] h-[45vw] rounded-full blur-[110px] animate-orb-a"
          style={{ backgroundColor: `color-mix(in srgb, ${accent} 20%, transparent)` }}
        />
        <div
          className="absolute top-[38%] -right-[15%] w-[50vw] h-[50vw] rounded-full blur-[130px] animate-orb-b"
          style={{ backgroundColor: `color-mix(in srgb, ${accent} 16%, transparent)` }}
        />
        <div
          className="absolute -bottom-[10%] left-[18%] w-[40vw] h-[40vw] rounded-full blur-[120px] animate-orb-c"
          style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)' }}
        />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ------- Sticky Directional Glass Nav with Reading Progress Line ------- */}
      <SiteNav
        businessName={business.name}
        logoUrl={business.logo_url}
        initials={initials}
        verified={business.verified}
        whatsappHref={whatsappHref}
        navItems={NAV_ITEMS}
        accent={accent}
        accentDark={accentDark}
        headerBg={headerBg}
        isHeaderDark={isHeaderDark}
        ctaTextColor={accentCtaText}
      />

      {/* ------- Hero Section: Gradient mesh + SVG Noise + Auto Dark Mode ------- */}
      <section
        className={`relative pt-28 pb-24 md:pt-36 md:pb-32 overflow-hidden transition-colors ${
          isHeroDark ? 'bg-slate-950 text-white' : 'bg-surface text-text-primary'
        }`}
        style={
          !coverImage && heroBg
            ? {
                backgroundColor: heroBg,
                backgroundImage: `radial-gradient(ellipse 65% 75% at 80% 15%, color-mix(in srgb, ${accent} 35%, transparent), transparent 60%), radial-gradient(ellipse 50% 60% at 15% 85%, color-mix(in srgb, ${accent} 22%, transparent), transparent 65%)`,
              }
            : !coverImage
              ? {
                  backgroundImage: isHeroDark
                    ? `radial-gradient(ellipse 70% 80% at 85% 15%, color-mix(in srgb, ${accent} 30%, transparent), transparent 60%), radial-gradient(ellipse 50% 60% at 10% 85%, color-mix(in srgb, ${accent} 18%, transparent), transparent 65%)`
                    : `radial-gradient(ellipse 65% 75% at 85% 15%, color-mix(in srgb, ${accent} 24%, transparent), transparent 60%), radial-gradient(ellipse 50% 60% at 15% 85%, color-mix(in srgb, ${accent} 15%, transparent), transparent 65%)`,
                }
              : undefined
        }
      >
        {/* Cover Photo with High-Contrast Multi-Layer Tint (WCAG AAA) */}
        {coverImage ? (
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            aria-hidden="true"
            style={{
              backgroundImage: `url("${coverImage}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Native <img> loads the raw URL directly — bypasses the dev
                optimizer and service worker so the cover always paints. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage}
              alt=""
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-center scale-105 brightness-125 contrast-105 saturate-[1.15]"
            />
            {/* Left text wash: strong protection behind the headline column,
                transparent over the photo's open half */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(ellipse 80% 85% at 85% 15%, color-mix(in srgb, ${accent} 40%, transparent), transparent 65%), linear-gradient(to right, rgba(2, 6, 23, 0.65) 0%, rgba(2, 6, 23, 0.45) 40%, rgba(2, 6, 23, 0) 62%), linear-gradient(to bottom, transparent 62%, rgba(2, 6, 23, 0.5) 100%)`,
              }}
            />
            {/* Scrim Layer 3: Tactile SVG noise grain overlay */}
            <div
              className="absolute inset-0 opacity-[0.045] mix-blend-overlay"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              }}
            />
          </div>
        ) : (
          <>
            {/* Tactile SVG micro-grain texture overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-overlay"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              }}
              aria-hidden="true"
            />
            {/* Ambient luminous glow orbs */}
            <div
              className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-30 animate-pulse-slow"
              style={{ backgroundColor: accent }}
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
              style={{ backgroundColor: accent }}
              aria-hidden="true"
            />
          </>
        )}

        {/* Craft preset: tilted photo collage on the desktop hero right edge */}
        {preset.key === 'craft' && (itemPhotos.length > 0 || coverImage) && (
          <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 z-10 w-[300px] h-[300px]" aria-hidden="true">
            <div
              className="absolute right-6 top-8 w-52 h-52 rounded-[1.5rem] overflow-hidden shadow-2xl rotate-6 ring-4 ring-white/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={(itemPhotos[1] || itemPhotos[0] || coverImage) as string}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div
              className="absolute left-2 bottom-2 w-44 h-44 rounded-[1.25rem] overflow-hidden shadow-2xl -rotate-6 ring-4 ring-white/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={(blocks.gallery?.[1] || coverImage || itemPhotos[0]) as string}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <span
              className="absolute -top-3 right-16 rounded-full px-4 py-1.5 text-[12px] font-extrabold shadow-xl -rotate-3"
              style={{ backgroundColor: accent, color: accentCtaText }}
            >
              Fresh &amp; local
            </span>
          </div>
        )}

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal>
            <div
              className={`max-w-3xl ${preset.centeredHero ? 'mx-auto text-center' : ''}`}
            >
              {/* Fluid H1 Clamp Heading - Rock-solid, zero layout shift */}
              <h1
                className="text-[clamp(2.25rem,5.5vw,4.25rem)] font-black tracking-[-0.035em] leading-[1.04] drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] drop-shadow-[0_8px_22px_rgba(0,0,0,0.35)] bg-clip-text text-transparent animate-gloss-sheen"
                style={{
                  backgroundImage: isHeroDark
                    ? `linear-gradient(100deg, #ffffff 0%, #ffffff 40%, color-mix(in srgb, ${accent} 75%, #ffffff) 50%, #ffffff 60%, #ffffff 100%)`
                    : `linear-gradient(100deg, #111B21 0%, #111B21 40%, color-mix(in srgb, ${accent} 65%, #111B21) 50%, #111B21 60%, #111B21 100%)`,
                  backgroundSize: '200% auto',
                }}
              >
                {business.name}
              </h1>

              {/* H2: Tagline that types through the business's services */}
              <h2
                className={`mt-4 text-[clamp(1.15rem,2.4vw,1.75rem)] font-semibold leading-snug max-w-2xl [text-shadow:0_1px_3px_rgba(0,0,0,0.6)] ${
                  isHeroDark ? 'text-white/90' : 'text-text-secondary'
                }`}
              >
                <TypingTagline
                  baseText={tagline}
                  alternateWords={menuServices.slice(0, 5)}
                  accent={accent}
                />
              </h2>

              {/* Prose intro with optimal line measure */}
              <p
                className={`mt-6 text-[clamp(1.05rem,1.8vw,1.25rem)] leading-relaxed max-w-2xl line-clamp-4 [text-shadow:0_1px_3px_rgba(0,0,0,0.55)] ${
                  isHeroDark ? 'text-white/85' : 'text-text-secondary'
                }`}
              >
                {hero}
              </p>

              {/* Primary & Secondary Action Row */}
                <div className={`mt-8 flex flex-wrap items-center gap-3.5 ${preset.centeredHero ? 'justify-center' : ''}`}>
                  {whatsappHref && (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2.5 ${preset.radiusPill} px-7 py-4 text-[15px] font-extrabold shadow-card-lift hover:brightness-105 active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-whatsapp-500`}
                    style={{
                      backgroundColor: accent,
                      color: accentCtaText,
                      boxShadow: `0 12px 32px -4px color-mix(in srgb, ${accent} 40%, transparent)`,
                    }}
                  >
                    <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    <span>Chat on WhatsApp</span>
                  </a>
                )}

                {(business.phone_type === 'voice' || business.voice_phone) &&
                  (business.voice_phone ? digitsOnly(business.voice_phone) : phoneClean) && (
                    <a
                      href={`tel:${business.voice_phone ? digitsOnly(business.voice_phone) : phoneClean}`}
                      className={`inline-flex items-center gap-2.5 ${preset.radiusPill} px-6 py-4 text-[15px] font-bold border transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-whatsapp-500 ${
                        isHeroDark
                          ? 'border-white/20 bg-white/10 text-white hover:bg-white/15'
                          : 'border-black/[0.08] bg-white/85 text-text-primary hover:bg-white shadow-sm'
                      }`}
                    >
                      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                      </svg>
                      <span>Call now</span>
                    </a>
                  )}

                {itemList.length > 0 && (
                  <a
                    href="#shop"
                    className={`hidden sm:inline-flex items-center gap-2 ${preset.radiusPill} px-6 py-4 text-[15px] font-bold border transition-colors focus-visible:ring-2 focus-visible:ring-whatsapp-500 ${
                      isHeroDark
                        ? 'border-white/20 text-white hover:bg-white/10'
                        : 'border-black/[0.08] text-text-primary hover:bg-black/[0.03]'
                    }`}
                  >
                    <span>Browse shop</span>
                    <span aria-hidden="true">↓</span>
                  </a>
                )}
              </div>

              {/* Bolt preset: trust chips row under the CTAs */}
              {preset.key === 'bolt' && (
                <div
                  className={`mt-7 flex flex-wrap gap-2.5 text-[13px] font-semibold ${preset.centeredHero ? 'justify-center' : ''}`}
                >
                  {['WhatsApp orders', business.city ? `${business.city} based` : 'Zimbabwe', itemList.length > 0 ? `${itemList.length} products` : 'Fast reply', 'EcoCash accepted'].map((chip) => (
                    <span
                      key={chip}
                      className={`inline-flex items-center rounded-full border px-4 py-1.5 ${
                        isHeroDark ? 'border-white/25 bg-white/10 text-white/85' : 'border-black/[0.09] bg-white/70 text-text-primary'
                      }`}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              )}

              {/* Star Rating Strip */}
              {business.rating > 0 && business.review_count > 0 && (
                <div className="mt-8 flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-0.5" style={{ color: accent }}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <svg
                        key={i}
                        className="w-4.5 h-4.5 drop-shadow-sm"
                        fill={i < Math.round(business.rating) ? 'currentColor' : 'rgba(0,0,0,0.14)'}
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6L12 2z" />
                      </svg>
                    ))}
                  </div>
                  <span className={`font-extrabold ${isHeroDark ? 'text-white' : 'text-text-primary'}`}>
                    {business.rating.toFixed(1)}
                  </span>
                  <span className={isHeroDark ? 'text-white/70' : 'text-text-secondary'}>
                    · {business.review_count} verified reviews
                  </span>
                </div>
              )}
            </div>
          </Reveal>
        </div>

        {/* Soft gradient divider into page body */}
        <div
          className={`absolute bottom-0 inset-x-0 h-16 sm:h-24 pointer-events-none bg-gradient-to-t ${
            isHeroDark ? 'from-surface to-transparent' : 'from-surface to-transparent'
          }`}
        />
      </section>

      {/* ------- Stats Strip with Scroll-Triggered Progressive Count-Up ------- */}
      <SiteStats stats={stats} accent={accent} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* ------- Services Grid with Category-Aware SVG Icons ------- */}
        {menuServices.length > 0 && (
          <section id="services" className={`scroll-mt-20 pt-20 md:pt-28 ${preset.sectionRule}`}>
            <Reveal>
              <div className="max-w-2xl">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em]" style={{ color: accent }}>
                  What we do
                </p>
                <h2 className="mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] font-black tracking-tight leading-tight">
                  Services built around you
                </h2>
                <p className="mt-3 text-text-secondary text-[15px] sm:text-base leading-relaxed">
                  Fast, dependable, and tailored to your requirements in {business.city || 'Zimbabwe'}.
                </p>
              </div>
            </Reveal>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {menuServices.map((serviceTitle, idx) => (
                <Reveal key={idx} delay={Math.min(idx * 0.05, 0.3)}>
                  <div
                    className={`group relative h-full ${preset.radiusCard} border border-black/[0.07] bg-white p-6 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 hover:border-black/[0.12] overflow-hidden`}
                  >
                    {/* Top specular highlight line on hover */}
                    <div
                      className="absolute top-0 inset-x-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ backgroundColor: accent }}
                    />

                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="inline-flex w-10 h-10 rounded-2xl items-center justify-center font-bold text-sm shadow-sm transition-transform group-hover:scale-105"
                        style={{ backgroundColor: accentSoftBg, color: accent }}
                      >
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-text-secondary/60 group-hover:text-text-primary transition-colors"
                        aria-hidden="true"
                      >
                        <CategoryIcon category={cat} className="w-5 h-5" />
                      </span>
                    </div>

                    <p className="mt-5 text-[15.5px] font-bold leading-snug text-text-primary">
                      {serviceTitle}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* ------- Shop Grid: 4:3 Images, Hover Zoom, Frosted Price Pill ------- */}
        <section id="shop" className={`scroll-mt-20 ${menuServices.length > 0 ? 'pt-20 md:pt-28' : 'pt-16 md:pt-24'}`}>
          <Reveal>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em]" style={{ color: accent }}>
                  Products & Catalogue
                </p>
                <h2 className="mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] font-black tracking-tight leading-tight">
                  {itemList.length > 0 ? 'Browse our products' : 'Our shop'}
                </h2>
              </div>
              {itemList.length > 6 && (
                <Link
                  href={profileHref}
                  className="text-sm font-bold rounded-full px-4.5 py-2 border border-black/[0.08] bg-white hover:bg-black/[0.04] transition-colors focus-visible:ring-2 focus-visible:ring-whatsapp-500 shadow-sm"
                >
                  View all {itemList.length} items →
                </Link>
              )}
            </div>
          </Reveal>

          {itemList.length === 0 && (
            <Reveal>
              <div className={`mt-8 ${preset.radiusCard} border border-black/[0.06] bg-white/70 p-8 text-center max-w-xl`}>
                <p className="text-text-secondary leading-relaxed">
                  Nothing listed yet — message us on WhatsApp and we&apos;ll send our current catalogue.
                </p>
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4"
                    style={{ color: accent }}
                  >
                    Request catalogue on WhatsApp →
                  </a>
                )}
              </div>
            </Reveal>
          )}

          {itemList.length > 0 && (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {itemList.slice(0, 6).map((item, idx) => (
                <Reveal key={item.id} delay={Math.min(idx * 0.05, 0.3)}>
                  <div
                    className={`group h-full ${preset.radiusCard} border border-black/[0.08] bg-white overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 flex flex-col`}
                    style={
                      shopBg
                        ? {
                            backgroundColor: shopBg,
                            borderColor: isShopDark ? 'rgba(255,255,255,0.14)' : undefined,
                          }
                        : undefined
                    }
                  >
                    {/* Fixed 4:3 Image Container with Hover Zoom & Specular Price Pill */}
                    <div
                      className={`relative aspect-[4/3] w-full overflow-hidden ${
                        item.image_url ? 'bg-surface' : 'border-b border-black/[0.06]'
                      }`}
                    >
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex flex-col items-center justify-center p-6 text-center"
                          style={{
                            background: `linear-gradient(135deg, ${accentSoftBg}, transparent 70%)`,
                          }}
                        >
                          <CategoryIcon category={cat} className="w-12 h-12 mb-2 opacity-30 text-text-secondary" />
                          <span className="font-extrabold text-sm uppercase tracking-wider text-text-secondary/70">
                            {cat || 'Product'}
                          </span>
                        </div>
                      )}

                      {/* Frosted Specular Price Pill */}
                      <span
                        className="absolute top-3 right-3 rounded-full px-3.5 py-1 text-xs font-black tracking-tight text-white backdrop-blur-md shadow-pill-sheen"
                        style={{
                          backgroundColor: accent,
                          color: accentCtaText,
                        }}
                      >
                        {formatPrice(item.price)}
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className={`font-bold text-[16px] truncate ${isShopDark ? 'text-white' : 'text-text-primary'}`}>
                          {item.name}
                        </h3>
                        <p className={`text-xs mt-1 ${isShopDark ? 'text-white/70' : 'text-text-secondary'}`}>
                          {cat || 'Product'} · {business.city || 'Zimbabwe'}
                        </p>
                      </div>

                      {whatsappHref && (
                        <div className="mt-4 pt-3 border-t border-black/[0.05]">
                          <a
                            href={`${whatsappHref}&text=${encodeURIComponent(
                              `Hi ${business.name}, I am interested in ${item.name} listed at ${formatPrice(item.price)}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold transition-colors group-hover:underline underline-offset-2"
                            style={{ color: accent }}
                          >
                            <span>Chat to order</span>
                            <span aria-hidden="true">→</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </section>

        {/* ------- Gallery Section: 6 Squares with Image Hover Zoom ------- */}
        {gallery.length > 0 && (
          <section id="gallery" className={`scroll-mt-20 pt-20 md:pt-28 ${preset.sectionRule}`}>
            <Reveal>
              <div className="max-w-2xl">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em]" style={{ color: accent }}>
                  Gallery
                </p>
                <h2 className="mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] font-black tracking-tight leading-tight">
                  Our work in pictures
                </h2>
                <p className="mt-2 text-text-secondary text-[15px] sm:text-base leading-relaxed">
                  Recent projects, products, and operations from {business.name}.
                </p>
              </div>
            </Reveal>

            <div className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-5">
              {gallery.slice(0, 6).map((imgUrl, idx) => (
                <Reveal key={imgUrl + idx} delay={Math.min(idx * 0.05, 0.3)}>
                  <div className={`group relative aspect-square ${preset.radiusTile} overflow-hidden border border-black/[0.08] bg-surface shadow-card hover:shadow-card-hover transition-all duration-300`}>
                    <Image
                      src={imgUrl}
                      alt={`${business.name} work sample ${idx + 1}`}
                      fill
                      sizes="(max-width: 768px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    {/* Subtle vignette on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* ------- Testimonials Section: Typographic Quotations & Initials Avatars ------- */}
        {testimonials.length > 0 && (
          <section id="reviews" className={`scroll-mt-20 pt-20 md:pt-28 ${preset.sectionRule}`}>
            <Reveal>
              <div className="max-w-2xl">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em]" style={{ color: accent }}>
                  Testimonials
                </p>
                <h2 className="mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] font-black tracking-tight leading-tight">
                  What customers say
                </h2>
                <p className="mt-2 text-text-secondary text-[15px] sm:text-base leading-relaxed">
                  Verified customer feedback collected via WhatsApp and WA Directory.
                </p>
              </div>
            </Reveal>

            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t, idx) => (
                <Reveal key={idx} delay={Math.min(idx * 0.06, 0.3)}>
                  <figure className={`relative h-full ${preset.radiusCard} border border-black/[0.08] bg-white p-6 sm:p-7 shadow-card flex flex-col justify-between overflow-hidden`}>
                    {/* Large decorative quote watermark */}
                    <span
                      aria-hidden="true"
                      className="absolute -top-3 right-4 text-7xl font-serif text-black/[0.04] pointer-events-none select-none"
                    >
                      “
                    </span>

                    <div>
                      {/* Star rating row */}
                      <div
                        className="flex items-center gap-1"
                        style={{ color: accent }}
                        aria-label={`${t.rating} out of 5 stars`}
                      >
                        {Array.from({ length: t.rating }).map((_, s) => (
                          <svg key={s} className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6L12 2z" />
                          </svg>
                        ))}
                      </div>

                      <blockquote className="mt-4 text-[15px] leading-relaxed text-text-primary line-clamp-5">
                        “{t.comment.slice(0, 280)}”
                      </blockquote>
                    </div>

                    <figcaption className="mt-6 pt-4 border-t border-black/[0.05] flex items-center gap-3">
                      <span
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${accent} 20%, transparent)`,
                          color: accent,
                        }}
                      >
                        {getInitials(t.name || 'Verified Customer')}
                      </span>
                      <div className="min-w-0">
                        <span className="block text-sm font-bold text-text-primary truncate">
                          {t.name?.trim() || 'Verified Customer'}
                        </span>
                        <span className="block text-[11px] text-text-secondary">Verified buyer</span>
                      </div>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* ------- FAQ Section with Spring Accordion Micro-interactions ------- */}
        {faq.length > 0 && (
          <section id="faq" className="scroll-mt-20 pt-20 md:pt-28">
            <Reveal>
              <div className="max-w-2xl">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em]" style={{ color: accent }}>
                  FAQ
                </p>
                <h2 className="mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] font-black tracking-tight leading-tight">
                  Frequently answered questions
                </h2>
                <p className="mt-2 text-text-secondary text-[15px] sm:text-base leading-relaxed">
                  Everything you need to know about getting started and working with us.
                </p>
              </div>
            </Reveal>

            <Reveal>
              <SiteFaq faq={faq} accent={accent} />
            </Reveal>
          </section>
        )}

        {/* ------- Opening Hours with Live Zimbabwe Time Indicator ------- */}
        {hours && (
          <section id="hours" className="scroll-mt-20 pt-20 md:pt-28">
            <Reveal>
              <div className="max-w-2xl">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em]" style={{ color: accent }}>
                  Business Hours
                </p>
                <h2 className="mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] font-black tracking-tight leading-tight">
                  When we&apos;re open
                </h2>
                <p className="mt-2 text-text-secondary text-[15px] sm:text-base leading-relaxed">
                  Visit us or get in touch during active operational hours.
                </p>
              </div>
            </Reveal>

            <Reveal>
              <HoursStatus hours={hours} accent={accent} />
            </Reveal>
          </section>
        )}

        {/* ------- Contact / CTA Band: High-Contrast Dynamic Lighting ------- */}
        <section id="contact" className="scroll-mt-20 py-20 md:py-28">
          <Reveal>
            <div
              className="relative overflow-hidden rounded-4xl p-8 sm:p-12 md:p-16 shadow-card-lift"
              style={{
                backgroundColor: contactBg,
                backgroundImage: `radial-gradient(ellipse 70% 85% at 85% 10%, rgba(255,255,255,0.15), transparent 60%), radial-gradient(ellipse 55% 65% at 10% 95%, rgba(0,0,0,0.15), transparent 60%)`,
                color: contactDark ? '#ffffff' : '#111B21',
              }}
            >
              <div className="relative max-w-2xl">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] opacity-80">
                  Ready to connect?
                </p>
                <h2 className="mt-2 text-[clamp(2rem,4vw,3rem)] font-black tracking-tight leading-tight">
                  Let&apos;s get you sorted
                </h2>
                <p className="mt-3 text-[16px] sm:text-lg leading-relaxed opacity-90">
                  Fast replies on WhatsApp. Quotes, questions and orders — one message away.
                </p>

                {/* Primary CTA Row */}
                <div className="mt-8 flex flex-wrap items-center gap-3.5">
                  {whatsappHref && (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2.5 rounded-2xl px-7 py-4 text-[15px] font-extrabold shadow-lg hover:brightness-95 active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-offset-2"
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#111B21',
                      }}
                    >
                      <svg className="w-5 h-5 shrink-0 text-whatsapp-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      <span>Message {business.name.split(' ')[0] || 'us'}</span>
                    </a>
                  )}

                  {phoneClean && (
                    <a
                      href={`tel:${phoneClean}`}
                      className="inline-flex items-center gap-2.5 rounded-2xl border border-current px-6 py-4 text-[15px] font-bold opacity-90 hover:opacity-100 hover:bg-white/10 transition-colors focus-visible:ring-2"
                    >
                      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                      </svg>
                      <span>{business.phone}</span>
                    </a>
                  )}
                </div>

                {/* Contact Meta Details */}
                <div className="mt-10 grid gap-3 max-w-md text-sm opacity-90">
                  {email && (
                    <p className="flex items-center gap-2.5">
                      <svg className="w-5 h-5 shrink-0 opacity-75" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                      </svg>
                      <a href={`mailto:${email}`} className="underline underline-offset-4 hover:opacity-100">
                        {email}
                      </a>
                    </p>
                  )}

                  {(business.address || business.city) && business.show_location !== false && (
                    <p className="flex items-center gap-2.5">
                      <svg className="w-5 h-5 shrink-0 opacity-75" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                      </svg>
                      <span>{[business.address, business.city].filter(Boolean).join(', ')}</span>
                    </p>
                  )}
                </div>

                {/* Social icons + Google Maps link */}
                <div className="mt-10 flex items-center gap-3 flex-wrap">
                  {socialLinks.length > 0 && (
                    <span className="text-xs font-bold uppercase tracking-wider opacity-75 mr-1">
                      Follow
                    </span>
                  )}
                  {socialLinks.map((s) => (
                    <a
                      key={s.key}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={SOCIAL_META[s.key].label}
                      title={SOCIAL_META[s.key].label}
                      className="w-10 h-10 rounded-2xl border border-current/25 flex items-center justify-center hover:bg-white/15 transition-all focus-visible:ring-2"
                    >
                      <SocialIcon platform={s.key} className="w-4.5 h-4.5" />
                    </a>
                  ))}

                  {mapsHref && (
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold underline underline-offset-4 decoration-current/40 hover:decoration-current ml-2"
                    >
                      Open in Google Maps ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ------- Footer: Refined Studio Hierarchy ------- */}
      <footer className="border-t border-black/[0.08] bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 flex flex-col md:flex-row items-center gap-6 md:gap-8 justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            {business.logo_url ? (
              <span className="w-10 h-10 rounded-xl overflow-hidden border border-black/[0.08] shrink-0 flex items-center justify-center bg-surface shadow-sm">
                <Image
                  src={business.logo_url}
                  alt={business.name}
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              </span>
            ) : (
              <span
                className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-bold text-sm shadow-sm"
                style={{ backgroundColor: accent, color: accentCtaText }}
              >
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="font-bold text-[15px] truncate">{business.name}</p>
              <p className="text-xs text-text-secondary">
                {business.city ? `${business.city}, Zimbabwe` : 'Zimbabwe'}
                {business.business_id ? ` · Ref ${business.business_id}` : ''}
              </p>
            </div>
          </div>

          <p className="text-xs text-text-secondary text-center order-last md:order-none">
            © {new Date().getFullYear()} {business.name} · Verified business on{' '}
            <Link href="/" className="font-bold hover:text-whatsapp-700 transition-colors">
              WA Directory
            </Link>
          </p>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={profileHref}
              className="text-xs sm:text-sm font-bold rounded-full px-4 py-2 border border-black/[0.08] bg-surface/50 hover:bg-black/[0.04] transition-colors focus-visible:ring-2 focus-visible:ring-whatsapp-500"
            >
              Full directory profile →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
