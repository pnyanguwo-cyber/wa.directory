import { getSupabase } from '@/lib/supabase-server'
import { generateSiteContent } from '@/lib/site-generation'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { Business, BusinessItem } from '@/types'

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
      'id, name, slug, bio, category, phone, phone_type, voice_phone, whatsapp_link, logo_url, city, area, areas, payment_status, generate_site, site_hero, site_services, site_contact_email'
    )
    .eq('slug', params.slug)
    .single() as { data: Business | null }

  if (!business) {
    const { data: fallback } = await getSupabase()
      .from('businesses')
      .select(
        'id, name, slug, bio, category, phone, phone_type, voice_phone, whatsapp_link, logo_url, city, area, areas, payment_status, generate_site, site_hero, site_services, site_contact_email'
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

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-gradient-to-br from-white/90 via-white/80 to-whatsapp-50/20 border-b border-white/70">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-whatsapp-700 hover:text-whatsapp-800 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to WA Directory
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-whatsapp-100 to-whatsapp-200 border border-whatsapp-300/40 flex items-center justify-center shrink-0">
              <span className="text-whatsapp-800 font-bold text-lg tracking-wider">{initials}</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-text-primary truncate">{business.name}</h1>
              {business.city && <p className="text-sm text-text-secondary font-medium">{business.city} · Zimbabwe</p>}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <section className="bg-gradient-to-br from-white/85 via-white/80 to-whatsapp-50/20 backdrop-blur-xl rounded-3xl border border-white/70 shadow-soft-lift p-6">
          {hero && (
            <div className="mb-4">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-whatsapp-700 mb-2">About</h2>
              <p className="text-text-secondary leading-relaxed text-sm whitespace-pre-line">{hero}</p>
            </div>
          )}
          {services && (
            <div className="mb-5">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-whatsapp-700 mb-2">Our Services</h2>
              <p className="text-text-secondary leading-relaxed text-sm whitespace-pre-line">{services}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-5">
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold"
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
        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Shop</h2>
          {itemList.length === 0 ? (
            <p className="text-text-secondary text-sm">This business hasn't listed any items yet.</p>
          ) : (
            <div className="space-y-3">
              {itemList.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary text-sm truncate">{item.name}</p>
                      {item.slug && <p className="text-[11px] text-text-secondary font-mono mt-0.5">{item.slug}</p>}
                    </div>
                    <span className="shrink-0 inline-flex items-center rounded-full bg-whatsapp-50 border border-whatsapp-200 px-2.5 py-1 text-xs font-bold text-whatsapp-800">
                      {formatPrice(item.price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Contact */}
        <section className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-card">
          <h2 className="text-sm font-bold text-text-primary mb-3">Contact</h2>
          <div className="space-y-2 text-sm">
            {email && (
              <p className="text-text-secondary">
                Email: <span className="font-semibold text-text-primary">{email}</span>
              </p>
            )}
            {(business.phone || business.whatsapp_link) && (
              <p className="text-text-secondary">
                Phone: <span className="font-semibold text-text-primary">{business.phone || ''}</span>
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
