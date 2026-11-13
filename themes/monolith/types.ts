/* Structural mirrors of wa.directory's SiteView / BusinessItem contracts.
 *
 * These types are intentionally assignable FROM the real app types: every
 * required field here is required there too, and optional/nullability is
 * widened. When theme/ is copied into wa.directory/themes/<id>/ and rendered
 * with a real SiteView, TypeScript accepts it with zero adapter code. */

export type ThemeOrientation = 'immersive' | 'stacked'
export type ThemeMode = 'preview' | 'live' | 'print'

export type ThemeFontPair = {
  head: string
  body: string
  headVars?: string
}

export type ThemeHoursEntry = { day: string; open: string; close: string }
export type ThemeFaqEntry = { q: string; a: string }
export type ThemeTestimonial = {
  rating: number
  comment: string
  name: string
  created_at: string
}
export type ThemeSocialLink = { key: string; url: string }
export type ThemeNavItem = { href: string; label: string }
export type ThemeStat = { label: string; value: string }

export type ThemeSelection = {
  design?: string
  orientation?: string
  font?: string
  accent?: string
  header?: string
  hero?: string
  shop?: string
  contact?: string
}

export type ThemeItem = {
  id: string
  business_id: string
  name: string
  slug: string
  price: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  image_url?: string
  description?: string
  category?: string
  subcategory?: string
  brand?: string
  currency_code?: string
  price_type?: 'fixed' | 'on_request'
  availability_status?:
    | 'in_stock'
    | 'available_on_order'
    | 'out_of_stock'
    | 'availability_unknown'
}

export type ThemeSiteView = {
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
  fontKey: string
  preset?: unknown
  isPreset: boolean
  fontPair: ThemeFontPair
  accent: string
  accentDark: boolean
  accentCtaText: string
  headerBg: string
  isHeaderDark: boolean
  heroBg: string
  shopBg: string
  isShopDark: boolean
  contactBg: string
  contactDark: boolean
  contactCtaText: string
  accentSoftBg: string
  accentMutedBg: string
  accentGlow: string
  tagline: string
  hero: string
  coverImage: string | null
  menuServices: string[]
  faq: ThemeFaqEntry[]
  hours?: ThemeHoursEntry[] | null
  gallery: string[]
  isHeroDark: boolean
  heroWash: { scrimL: number; scrimM: number; scrimB: number }
  testimonials: ThemeTestimonial[]
  socialLinks: ThemeSocialLink[]
  mapsHref: string
  navItems: ThemeNavItem[]
  stats: ThemeStat[]
  jsonLd: Record<string, unknown>
  items: ThemeItem[]
}

export type ThemeProps = {
  site: ThemeSiteView
  orientation?: string
  mode?: ThemeMode
}
