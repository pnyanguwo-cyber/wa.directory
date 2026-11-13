import type {
  Business,
  BusinessItem,
  SiteDesignKey,
  SiteFontKey,
  SiteFaqEntry,
  SiteHoursEntry,
} from '@/types'
import { parseSiteContent, servicesToCards, hoursRenderable } from '@/lib/site-content'
import { generateSiteContent } from '@/lib/site-generation'
import { digitsOnly } from '@/lib/phone'
import { getInitials, dedupeCategories } from '@/lib/utils'
import { accentFor } from '@/lib/category-style'
import { getPreset, SITE_DESIGN_KEYS } from '@/lib/site-design'
import { WEBSITE_THEMES } from '@/registry/websites'
import { washForLuminance } from '@/lib/image-luminance'
import { getFontPair } from '@/lib/site-fonts'
import { getSocialLinks } from '@/components/social-icons'
import { getCategoryImage } from '@/data/category-images'

export const ORIENTATIONS = ['stacked', 'split', 'editorial', 'catalogue', 'immersive', 'compact'] as const
export type ThemeOrientation = (typeof ORIENTATIONS)[number]

const DESIGN_KEYS: SiteDesignKey[] = [
  ...SITE_DESIGN_KEYS,
  ...(Object.keys(WEBSITE_THEMES) as SiteDesignKey[]),
]
const FONT_KEYS: SiteFontKey[] = ['modern', 'editorial', 'grotesk', 'warm']

export interface ThemeSelection {
  design: SiteDesignKey
  orientation?: ThemeOrientation
  font?: SiteFontKey
  accent?: string
  header?: string
  hero?: string
  shop?: string
  contact?: string
}

export type ThemeDisplayMode = 'live' | 'preview' | 'print'

export interface ThemeProps {
  site: SiteView
  orientation: string
  mode: ThemeDisplayMode
}

export interface SiteTestimonial {
  rating: number
  comment: string
  name: string
  created_at: string
}

export interface SiteView {
  id: string
  name: string
  slug: string
  city: string
  area: string
  areas: string[]
  bio: string
  logoUrl: string
  verified: boolean
  website?: string
  address?: string
  lat?: number | null
  lng?: number | null
  showLocation?: boolean
  rating: number
  reviewCount: number
  yearsOn: number
  initials: string
  profileHref: string

  categories: string[]
  category: string

  phoneClean: string
  phoneType?: 'whatsapp' | 'voice'
  voicePhone?: string | null
  whatsappHref: string
  orderDigits: string
  voiceOnly: boolean
  email: string

  theme: ThemeSelection
  fontKey: SiteFontKey
  preset: ReturnType<typeof getPreset>
  isPreset: boolean
  fontPair: ReturnType<typeof getFontPair>

  accent: string
  accentDark: boolean
  accentCtaText: '#FFFFFF' | '#111B21'
  headerBg: string
  isHeaderDark: boolean
  heroBg: string
  shopBg: string
  isShopDark: boolean
  contactBg: string
  contactDark: boolean
  contactCtaText: '#FFFFFF' | '#111B21'
  accentSoftBg: string
  accentMutedBg: string
  accentGlow: string

  tagline: string
  hero: string
  menuServices: ReturnType<typeof servicesToCards>
  faq: SiteFaqEntry[]
  hours?: SiteHoursEntry[]
  gallery: string[]
  coverImage: string | null
  isHeroDark: boolean
  heroWash: ReturnType<typeof washForLuminance>
  testimonials: SiteTestimonial[]
  socialLinks: ReturnType<typeof getSocialLinks>
  mapsHref: string
  navItems: { href: string; label: string }[]
  stats: { label: string; value: string }[]
  jsonLd: Record<string, unknown>

  items: BusinessItem[]
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/
const hex = (v: string | undefined) =>
  typeof v === 'string' && HEX_RE.test(v.trim()) ? v.trim().toUpperCase() : ''

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

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

function getContrastColor(bgHex: string): '#FFFFFF' | '#111B21' {
  const lum = getLuminance(bgHex)
  return lum > 0.35 ? '#111B21' : '#FFFFFF'
}

export function parseThemeSelection(raw: unknown): ThemeSelection {
  const t = (raw || {}) as Record<string, unknown>
  const str = (k: string) => (typeof t[k] === 'string' ? (t[k] as string).trim() : '')
  const pick = (k: string) => hex(str(k)) || undefined
  const design = str('design') as SiteDesignKey
  const orientation = str('orientation') as ThemeOrientation
  const font = str('font') as SiteFontKey
  return {
    design: DESIGN_KEYS.includes(design) ? design : 'classic',
    orientation: (ORIENTATIONS as readonly string[]).includes(orientation) ? orientation : undefined,
    font: FONT_KEYS.includes(font) ? font : undefined,
    accent: pick('accent'),
    header: pick('header'),
    hero: pick('hero'),
    shop: pick('shop'),
    contact: pick('contact'),
  }
}

export async function buildSiteView(
  business: Business,
  itemList: BusinessItem[],
  testimonials: SiteTestimonial[]
): Promise<SiteView> {
  const cleanCats = dedupeCategories(business.category)
  const content =
    business.site_hero && business.site_services
      ? { hero: business.site_hero, services: business.site_services }
      : await generateSiteContent({
          businessName: business.name,
          category: cleanCats[0] || '',
          bio: business.bio || '',
          city: business.city || '',
        })

  const hero = business.site_hero || content.hero
  const blocks = parseSiteContent(business.site_content)
  const cat = cleanCats[0] || ''
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

  const itemPhotos = itemList.map((i) => i.image_url).filter((v): v is string => Boolean(v))
  const gallery = blocks.gallery?.length ? blocks.gallery : itemPhotos.slice(0, 6)

  const yearsOn = Math.max(
    0,
    new Date().getFullYear() - new Date(business.created_at || Date.now()).getFullYear()
  )

  const phoneClean = digitsOnly(business.phone || '')
  const whatsappHref =
    business.whatsapp_link ||
    (phoneClean
      ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(`Hi ${business.name}, I found you through WA Directory.`)}`
      : '')

  const waLinkDigits = /wa\.me\/(\d+)/.exec(business.whatsapp_link || '')?.[1] || null
  const orderDigits = business.phone_type !== 'voice' && phoneClean ? phoneClean : waLinkDigits || ''

  const email = business.site_contact_email || ''
  const initials = getInitials(business.name)
  const profileHref = `/business/${business.slug || business.id}`

  const theme = parseThemeSelection(business.site_theme)
  const preset = getPreset(theme.design)
  const fontKey = theme.font || preset.defaultFont
  const fontPair = getFontPair(fontKey)
  const isPreset = preset.key !== 'classic'

  const accent = theme.accent || accentFor(cleanCats)
  const accentDark = isDark(accent)
  const accentCtaText = getContrastColor(accent)
  const headerBg = theme.header || ''
  const isHeaderDark = headerBg ? isDark(headerBg) : false
  const heroBg = theme.hero || ''
  const shopBg = theme.shop || ''
  const isShopDark = shopBg ? isDark(shopBg) : false
  const contactBg = theme.contact || (accentDark ? accent : '#075E54')
  const contactDark = isDark(contactBg)
  const contactCtaText = getContrastColor(contactBg)

  const coverImage = blocks.gallery?.[0] || itemPhotos[0] || getCategoryImage(business.category)
  const isHeroDark = coverImage ? true : heroBg ? isDark(heroBg) : accentDark

  const heroLuminance = blocks.gallery?.[0]
    ? (business.site_cover_luminance ?? null)
    : (itemList.find((i) => i.image_url)?.image_luminance ?? null)
  const heroWash = washForLuminance(heroLuminance)

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

  const jsonLd: Record<string, unknown> = {
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

  const navItems = [
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
    {
      label: yearsOn > 0 ? 'Years on directory' : 'Directory status',
      value: yearsOn > 0 ? `${yearsOn}+` : '✓ Active',
    },
  ]

  return {
    id: business.id,
    name: business.name,
    slug: business.slug || business.id,
    city: business.city,
    area: business.area,
    areas: business.areas || [],
    bio: business.bio,
    logoUrl: business.logo_url,
    verified: business.verified,
    website: business.website,
    address: business.address,
    lat: business.lat,
    lng: business.lng,
    showLocation: business.show_location,
    rating: business.rating,
    reviewCount: business.review_count,
    yearsOn,
    initials,
    profileHref,

    categories: cleanCats,
    category: cat,

    phoneClean,
    phoneType: business.phone_type,
    voicePhone: business.voice_phone,
    whatsappHref,
    orderDigits,
    voiceOnly: !orderDigits,
    email,

    theme,
    fontKey,
    preset,
    isPreset,
    fontPair,

    accent,
    accentDark,
    accentCtaText,
    headerBg,
    isHeaderDark,
    heroBg,
    shopBg,
    isShopDark,
    contactBg,
    contactDark,
    contactCtaText,
    accentSoftBg,
    accentMutedBg,
    accentGlow,

    tagline,
    hero,
    menuServices,
    faq,
    hours,
    gallery,
    coverImage,
    isHeroDark,
    heroWash,
    testimonials,
    socialLinks,
    mapsHref,
    navItems,
    stats,
    jsonLd,

    items: itemList,
  }
}
