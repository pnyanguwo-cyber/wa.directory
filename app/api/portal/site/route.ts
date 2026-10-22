import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getActingPortalBusiness } from '@/lib/portal'
import { getSupabase } from '@/lib/supabase-server'
import { parseSiteContent, generateSiteSections } from '@/lib/site-content'
import type { SiteContentBlocks } from '@/types'

const MAX_TEXT = 2000
const MAX_EMAIL = 320

// Whitelisted per-section theme keys; values must be '' (default) or strict #RRGGBB.
const THEME_KEYS = ['header', 'hero', 'shop', 'contact', 'accent'] as const
type ThemeKey = (typeof THEME_KEYS)[number]
const HEX_RE = /^#[0-9a-fA-F]{6}$/

function parseSiteTheme(input: unknown): Record<ThemeKey, string> | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null
  const src = input as Record<string, unknown>
  const out: Record<ThemeKey, string> = { header: '', hero: '', shop: '', contact: '', accent: '' }
  let touched = false
  for (const key of THEME_KEYS) {
    const raw = src[key]
    if (typeof raw === 'string') {
      const v = raw.trim()
      if (v === '') {
        out[key] = ''
        touched = true
      } else if (HEX_RE.test(v)) {
        out[key] = v.toUpperCase()
        touched = true
      }
      // Invalid values are dropped (left as default).
    }
  }
  return touched ? out : null
}

// Whitelisted social keys; values must be '' (unset) or an https URL on the platform's domain.
const SOCIAL_KEYS = ['twitter', 'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube'] as const
type SocialKey = (typeof SOCIAL_KEYS)[number]
const SOCIAL_DOMAINS: Record<SocialKey, string[]> = {
  twitter: ['twitter.com', 'x.com'],
  instagram: ['instagram.com'],
  facebook: ['facebook.com', 'fb.com'],
  linkedin: ['linkedin.com'],
  tiktok: ['tiktok.com'],
  youtube: ['youtube.com', 'youtu.be'],
}
const MAX_SOCIAL_URL = 200

function parseSiteSocials(input: unknown): Record<SocialKey, string> | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null
  const src = input as Record<string, unknown>
  const out: Record<SocialKey, string> = { twitter: '', instagram: '', facebook: '', linkedin: '', tiktok: '', youtube: '' }
  let touched = false
  for (const key of SOCIAL_KEYS) {
    const raw = src[key]
    if (typeof raw !== 'string') continue
    const v = raw.trim().slice(0, MAX_SOCIAL_URL)
    if (v === '') {
      out[key] = ''
      touched = true
    } else if (/^https?:\/\//i.test(v)) {
      try {
        const host = new URL(v).hostname.replace(/^www\./, '').toLowerCase()
        if (SOCIAL_DOMAINS[key].some(d => host === d || host.endsWith(`.${d}`))) {
          out[key] = v
          touched = true
        }
      } catch {
        // Invalid URL: dropped (left as default).
      }
    }
  }
  return touched ? out : null
}

function contentEmpty(c: SiteContentBlocks): boolean {
  return !c.tagline && !(c.faq && c.faq.length) && !(c.hours && c.hours.length) && !(c.gallery && c.gallery.length)
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const session = await getActingPortalBusiness()
    if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    const business = session.business

    const site_hero = typeof body?.site_hero === 'string' ? body.site_hero.trim().slice(0, MAX_TEXT) : null
    const site_services = typeof body?.site_services === 'string' ? body.site_services.trim().slice(0, MAX_TEXT) : null
    const site_contact_email = typeof body?.site_contact_email === 'string' ? body.site_contact_email.trim().slice(0, MAX_EMAIL) : null
    const generate_site = typeof body?.generate_site === 'boolean' ? body.generate_site : null
    const theme = parseSiteTheme(body?.site_theme)
    const socials = parseSiteSocials(body?.site_socials)

    const updates: {
      generate_site?: boolean
      site_hero?: string
      site_services?: string
      site_contact_email?: string
      site_theme?: Record<ThemeKey, string> | null
      site_socials?: Record<SocialKey, string> | null
      site_content?: SiteContentBlocks | null
    } = {}
    if (generate_site !== null) updates.generate_site = generate_site
    if (site_hero !== null) updates.site_hero = site_hero
    if (site_services !== null) updates.site_services = site_services
    if (site_contact_email !== null) updates.site_contact_email = site_contact_email
    if (theme !== null) {
      // All-defaults theme clears the column so the site falls back to built-in styling.
      const allDefault = THEME_KEYS.every(k => theme[k] === '')
      updates.site_theme = allDefault ? null : theme
    }
    if (socials !== null) {
      // No links stored clears the column entirely.
      const allEmpty = SOCIAL_KEYS.every(k => socials[k] === '')
      updates.site_socials = allEmpty ? null : socials
    }

    // Structured content blocks (tagline / faq / hours / gallery).
    let finalContent: SiteContentBlocks | null = null
    if (body?.site_content !== undefined || body?.generate_ai === true) {
      const parsed = parseSiteContent(body?.site_content)
      if (body?.generate_ai === true) {
        // Regenerate the tagline + FAQ with AI; keep manual hours/gallery.
        const ai = await generateSiteSections({
          businessName: business.name,
          category: business.category?.[0] || '',
          bio: (typeof body?.site_hero === 'string' ? body.site_hero.trim() : business.site_hero) || '',
          city: business.city || '',
        })
        finalContent = {
          tagline: ai.tagline,
          faq: ai.faq,
          hours: parsed.hours,
          gallery: parsed.gallery,
        }
      } else {
        finalContent = {
          tagline: parsed.tagline,
          faq: parsed.faq,
          hours: parsed.hours,
          gallery: parsed.gallery,
        }
      }
      updates.site_content = contentEmpty(finalContent) ? null : finalContent
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { error } = await supabase.from('businesses').update(updates).eq('id', business.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Push the saved settings live immediately (auto-site + profile are ISR).
    const slug = business.slug || business.id
    revalidatePath(`/site/${slug}`)
    revalidatePath(`/business/${slug}`)

    return NextResponse.json({ success: true, site_content: finalContent })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
