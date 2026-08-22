import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase-server'
import QrCard from '@/components/qr-card'

export const dynamic = 'force-dynamic'

const SITE_URL = process.env.SITE_URL || 'https://wadirectory.co.zw'

export default async function MyQrPage({ params }: { params: { slug: string } }) {
  const supabase = getSupabase()
  const slug = params.slug

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, phone, slug, catalog_link, verified, location, city, area')
    .eq('slug', slug)
    .maybeSingle()

  if (!business) notFound()

  const key = business.slug || business.id
  const profileUrl = `${SITE_URL}/business/${key}`
  const phoneClean = (business.phone || '').replace(/\D/g, '')
  const chatMsg = encodeURIComponent(`Hi ${business.name}, I came to you through WA.Directory and I want to ask about your services.`)
  const chatUrl = phoneClean ? `https://wa.me/${phoneClean}?text=${chatMsg}` : `${SITE_URL}/qr/${key}`
  const waLink = phoneClean ? `https://wa.me/${phoneClean}` : null
  const locationText = [business.area, business.city, 'Zimbabwe'].filter(Boolean).join(', ')

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-white/90 via-white/80 to-whatsapp-50/30 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-whatsapp-950/30 backdrop-blur-xl border border-white/80 dark:border-gray-800 rounded-3xl p-5 sm:p-8 shadow-soft-lift flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary">{business.name}</h1>
            {business.verified && (
              <span className="badge-verified" title="Verified Business">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
                  <path d="M23 12L21.2 14.5L21.5 17.5L18.7 18.7L17.5 21.5L14.5 21.2L12 23L9.5 21.2L6.5 21.5L5.3 18.7L2.5 17.5L2.8 14.5L1 12L2.8 9.5L2.5 6.5L5.3 5.3L6.5 2.5L9.5 2.8L12 1L14.5 2.8L17.5 2.5L18.7 5.3L21.5 6.5L21.2 9.5Z" fill="#0095F6" stroke="white" strokeWidth="0.8" />
                  <path d="M9.5 15.5L7 13L5.5 14.5L9.5 18.5L18.5 9.5L17 8L9.5 15.5Z" fill="white" />
                </svg>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-text-secondary">
            World-Standard QR Code Studio • Customise colors, company name placement, typography & transparent backgrounds.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          <Link
            href={`/business/${key}#business-card`}
            className="flex-1 sm:flex-initial btn-secondary px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <span>View Business Card</span>
            <svg className="w-3.5 h-3.5 text-whatsapp-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </Link>
          <Link
            href="/portal"
            className="flex-1 sm:flex-initial btn-primary px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>Portal</span>
          </Link>
        </div>
      </div>

      {/* SECTION 1: THE WORLD-CLASS CUSTOMER CHAT QR STUDIO */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-text-primary">1. Customer Chat QR Studio</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Customise and export print-ready, high-resolution and transparent QR codes for menus, stickers, packaging, and vehicle branding.
            </p>
          </div>
        </div>

        <QrCard
          value={chatUrl}
          businessName={business.name}
          businessSlug={key}
          location={locationText}
          verified={business.verified}
          title={`${business.name} — Customer Chat`}
          subtitle="Point your phone camera to chat on WhatsApp"
          interactive={true}
          fullPage={true}
          size={240}
          downloadName={`${key}-customer-chat-qr.png`}
        />
      </div>

      {/* SECTION 2: PRIVATE OWNER PORTAL QR */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-text-primary">2. Private Owner Portal QR</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
                OWNER ONLY
              </span>
            </div>
            <p className="text-xs text-text-secondary max-w-xl">
              Scan this private QR code with your own phone anytime to open your business analytics, ranking, and profile editing dashboard directly.
            </p>
          </div>

          <div className="self-center md:self-auto shrink-0">
            <QrCard
              value={`${SITE_URL}/portal`}
              title="Owner Portal Quick Access"
              subtitle="Private dashboard & analytics"
              size={140}
              downloadName={`${key}-private-portal-qr.png`}
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: FAST PROMOTIONAL & DIRECT LINKS */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">Direct Links for WhatsApp Status & Social Media</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 bg-whatsapp-50 dark:bg-whatsapp-950/40 border border-whatsapp-200 dark:border-whatsapp-800 rounded-2xl p-4 hover:bg-whatsapp-100 transition-colors"
            >
              <div>
                <p className="text-xs font-bold text-whatsapp-800 dark:text-whatsapp-200">Direct WhatsApp Chat Link</p>
                <p className="text-[11px] text-text-secondary mt-0.5">Opens instant chat with your number</p>
              </div>
              <svg className="w-4 h-4 text-whatsapp-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          )}

          {business.catalog_link && (
            <a
              href={business.catalog_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 bg-surface dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <div>
                <p className="text-xs font-bold text-text-primary">WhatsApp Product Catalog</p>
                <p className="text-[11px] text-text-secondary mt-0.5">Browse your live inventory and pricing</p>
              </div>
              <svg className="w-4 h-4 text-text-secondary shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          )}

          <a
            href={`/business/${key}#business-card`}
            className="flex items-center justify-between gap-3 bg-gradient-to-r from-whatsapp-500/10 via-emerald-500/5 to-white dark:from-whatsapp-950/40 dark:via-gray-800 dark:to-gray-900 border border-whatsapp-300/60 dark:border-whatsapp-700/60 rounded-2xl p-4 hover:bg-whatsapp-50 transition-colors sm:col-span-2"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-whatsapp-800 dark:text-whatsapp-200">Printable & Digital Business Card Studio</p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-whatsapp-500 text-white">WORLD STANDARD</span>
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5">
                3.5″ × 2.0″ landscape & 2.0″ × 3.5″ portrait 3D interactive card with 300 DPI print-ready exports.
              </p>
            </div>
            <svg className="w-4 h-4 text-whatsapp-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>
      </div>

      <div className="text-center pt-2">
        <Link
          href="/portal"
          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-whatsapp-500 to-whatsapp-600 text-white rounded-full px-5 py-2.5 text-xs font-bold shadow-sm hover:from-whatsapp-600 hover:to-whatsapp-700 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to My Business Portal</span>
        </Link>
      </div>
    </div>
  )
}