import { getSupabase } from '@/lib/supabase-server'
import { generateSiteContent } from '@/lib/site-generation'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { Business, BusinessItem } from '@/types'
import { SOCIAL_KEYS, SOCIAL_META, SocialIcon, type SocialKey } from '@/components/social-icons'

export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  const { data } = await getSupabase()
    .from('businesses')
    .select('slug, id')
  return (data || []).map(b => ({ slug: b.slug || b.id }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { data } = await getSupabase()
    .from('businesses')
    .select('name, bio, city')
    .eq('slug', params.slug)
    .single() as { data: { name: string; bio: string; city: string } | null }
  if (!data) return {}
  return {
    title: `${data.name} | WA Directory`,
    description: data.bio?.slice(0, 160) || `Contact ${data.name} on WhatsApp in ${data.city || 'Zimbabwe'}.`,
  }
}

function formatPrice(price: number): string {
  return `$${Number(price || 0).toFixed(2)}`
}

export default async function BusinessSitePage({ params }: { params: { slug: string } }) {
  let { data: business } = await getSupabase()
    .from('businesses')
    .select(
      'id, name, slug, bio, category, phone, phone_type, voice_phone, whatsapp_link, logo_url, city, area, areas, payment_status, generate_site, site_hero, site_services, site_contact_email, site_theme, site_socials'
    )
    .eq('slug', params.slug)
    .single() as { data: Business | null }

  if (!business) {
    const { data: fallback } = await getSupabase()
      .from('businesses')
      .select(
        'id, name, slug, bio, category, phone, phone_type, voice_phone, whatsapp_link, logo_url, city, area, areas, payment_status, generate_site, site_hero, site_services, site_contact_email, site_theme, site_socials'
      )
      .eq('id', params.slug)
      .single() as { data: Business | null }
    business = fallback
  }

  if (!business || !business.generate_site || business.payment_status !== 'active') notFound()

  const itemsRes = await getSupabase()
    .from('business_items')
    .select('id, business_id, name, slug, price, is_active, created_at, updated_at')
    .eq('business_id', business.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  const content = business.site_hero && business.site_services
    ? { hero: business.site_hero, services: business.site_services }
    : await generateSiteContent({
        businessName: business.name,
        category: business.category?.[0] || '',
        bio: business.bio || '',
        city: business.city || '',
      })

  const hero = business.site_hero || content.hero
  const services = business.site_services || content.services
  const phoneClean = (business.phone || '').replace(/\D/g, '')
  const whatsappHref = business.whatsapp_link || (phoneClean ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(`Hi ${business.name}, I found you through WA Directory.`)}` : business.whatsapp_link || '')
  const email = business.site_contact_email || ''
  const initials = business.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const itemList = (itemsRes.data as BusinessItem[]) || []

  // Per-section colours chosen by the business ('' / missing key = built-in default).
  const THEME_HEX = /^#[0-9a-fA-F]{6}$/
  const theme = (business.site_theme || {}) as { header?: string; hero?: string; shop?: string; contact?: string; accent?: string }
  const hex = (v: string | undefined) => (typeof v === 'string' && THEME_HEX.test(v.trim()) ? v.trim().toUpperCase() : '')
  const headerBg = hex(theme.header)
  const heroBg = hex(theme.hero)
  const shopBg = hex(theme.shop)
  const contactBg = hex(theme.contact)
  const accent = hex(theme.accent)
  const isDark = (c: string) => {
    const n = parseInt(c.slice(1), 16)
    const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)
    return lum < 140
  }
  const headerDark = headerBg ? isDark(headerBg) : false
  const heroDark = heroBg ? isDark(heroBg) : false
  const shopDark = shopBg ? isDark(shopBg) : false
  const contactDark = contactBg ? isDark(contactBg) : false

  // Social profiles linked by the business (only set platforms are rendered).
  const socialsRaw = (business.site_socials || {}) as Partial<Record<SocialKey, string>>
  const socialLinks = SOCIAL_KEYS
    .map(key => ({ key, url: (socialsRaw[key] || '').trim() }))
    .filter(s => s.url.length > 0)

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header
        className={`border-b border-white/70 ${headerBg ? '' : 'bg-gradient-to-br from-white/90 via-white/80 to-whatsapp-50/20'}`}
        style={headerBg ? { backgroundColor: headerBg } : undefined}
      >
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link href="/" className={`inline-flex items-center gap-1.5 text-sm font-medium hover:underline mb-4 ${headerDark ? 'text-white/80' : 'text-whatsapp-700'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to WA Directory
          </Link>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 ${headerDark ? 'bg-white/15 border-white/30' : 'bg-gradient-to-br from-whatsapp-100 to-whatsapp-200 border-whatsapp-300/40'}`}>
              <span className={`font-bold text-lg tracking-wider ${headerDark ? 'text-white' : 'text-whatsapp-800'}`}>{initials}</span>
            </div>
            <div className="min-w-0">
              <h1 className={`text-2xl font-bold truncate ${headerDark ? 'text-white' : 'text-text-primary'}`}>{business.name}</h1>
              {business.city && <p className={`text-sm font-medium ${headerDark ? 'text-white/80' : 'text-text-secondary'}`}>{business.city} · Zimbabwe</p>}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <section
          className={`backdrop-blur-xl rounded-3xl border shadow-soft-lift p-6 ${heroBg ? 'border-white/40' : 'bg-gradient-to-br from-white/85 via-white/80 to-whatsapp-50/20 border-white/70'}`}
          style={heroBg ? { backgroundColor: heroBg } : undefined}
        >
          {hero && (
            <div className="mb-4">
              <h2 className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${heroDark ? 'text-white/80' : 'text-whatsapp-700'}`}>About</h2>
              <p className={`leading-relaxed text-sm whitespace-pre-line ${heroDark ? 'text-white/90' : 'text-text-secondary'}`}>{hero}</p>
            </div>
          )}
          {services && (
            <div className="mb-5">
              <h2 className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${heroDark ? 'text-white/80' : 'text-whatsapp-700'}`}>Our Services</h2>
              <p className={`leading-relaxed text-sm whitespace-pre-line ${heroDark ? 'text-white/90' : 'text-text-secondary'}`}>{services}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-5">
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold"
                style={accent ? { backgroundColor: accent } : undefined}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2z" />
                </svg>
                Chat on WhatsApp
              </a>
            )}
            <Link href={`/business/${business.slug || business.id}`} className="btn-secondary inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold">
              View full profile
            </Link>
          </div>
        </section>

        {/* Shop */}
        <section
          className={shopBg ? 'rounded-3xl border border-white/40 shadow-soft-lift p-6' : ''}
          style={shopBg ? { backgroundColor: shopBg } : undefined}
        >
          <h2 className={`text-lg font-bold mb-3 ${shopDark ? 'text-white' : 'text-text-primary'}`}>Shop</h2>
          {itemList.length === 0 ? (
            <p className={`text-sm ${shopDark ? 'text-white/80' : 'text-text-secondary'}`}>This business hasn't listed any items yet.</p>
          ) : (
            <div className="space-y-3">
              {itemList.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary text-sm truncate">{item.name}</p>
                      {item.slug && <p className={`text-[11px] font-mono mt-0.5 ${shopDark ? 'text-white/70' : 'text-text-secondary'}`}>{item.slug}</p>}
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${accent ? 'border-transparent text-white' : 'bg-whatsapp-50 border-whatsapp-200 text-whatsapp-800'}`}
                      style={accent ? { backgroundColor: accent } : undefined}
                    >
                      {formatPrice(item.price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Contact */}
        <section
          className={`rounded-2xl border p-5 shadow-card ${contactBg ? 'border-white/40' : 'bg-white border-gray-200/80'}`}
          style={contactBg ? { backgroundColor: contactBg } : undefined}
        >
          <h2 className={`text-sm font-bold mb-3 ${contactDark ? 'text-white' : 'text-text-primary'}`}>Contact</h2>
          <div className="space-y-2 text-sm">
            {email && (
              <p className={contactDark ? 'text-white/80' : 'text-text-secondary'}>
                Email: <span className={`font-semibold ${contactDark ? 'text-white' : 'text-text-primary'}`}>{email}</span>
              </p>
            )}
            {(business.phone || business.whatsapp_link) && (
              <p className={contactDark ? 'text-white/80' : 'text-text-secondary'}>
                Phone: <span className={`font-semibold ${contactDark ? 'text-white' : 'text-text-primary'}`}>{business.phone || ''}</span>
              </p>
            )}
          </div>
          {socialLinks.length > 0 && (
            <div className="pt-2">
              <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${contactDark ? 'text-white/70' : 'text-text-secondary'}`}>Follow us</p>
              <div className="flex flex-wrap gap-2">
                {socialLinks.map(s => (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={SOCIAL_META[s.key].label}
                    title={SOCIAL_META[s.key].label}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors ${contactDark ? 'bg-white/10 border-white/30 text-white hover:bg-white/20' : 'bg-surface border-gray-200/80 text-text-secondary hover:text-whatsapp-700 hover:border-whatsapp-300'}`}
                  >
                    <SocialIcon platform={s.key} className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
