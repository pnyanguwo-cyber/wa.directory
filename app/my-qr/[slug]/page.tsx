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
    .select('id, name, phone, slug, catalog_link, verified')
    .eq('slug', slug)
    .maybeSingle()

  if (!business) notFound()

  const key = business.slug || business.id
  const profileUrl = `${SITE_URL}/business/${key}`
  const chatUrl = `${SITE_URL}/qr/${key}`
  const waLink = business.phone ? `https://wa.me/${business.phone.replace(/\D/g, '')}` : null

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-text-primary">Your QR codes</h1>
        <p className="text-sm text-text-secondary mt-1">
          {business.name}{business.verified ? '' : ' · pending approval'}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-card flex flex-col items-center gap-3">
          <QrCard
            value={chatUrl}
            title="Customer chat QR"
            subtitle="Scan → opens WhatsApp chat with you (scans are tracked)"
            size={190}
            downloadName={`${key}-customer-chat-qr.png`}
          />
          <p className="text-[11px] text-text-secondary text-center">
            Print this for your counter, shelves, menus and packaging.
          </p>
        </div>
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-card flex flex-col items-center gap-3">
          <QrCard
            value={`${SITE_URL}/portal`}
            title="Portal QR"
            subtitle="Scan → opens your private business portal"
            size={190}
            downloadName={`${key}-portal-qr.png`}
          />
          <p className="text-[11px] text-text-secondary text-center">
            Only you should use this — it leads straight to your stats.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-card space-y-3">
        <p className="text-sm font-bold text-text-primary">Chat links you can share</p>
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-3 hover:bg-whatsapp-100 transition-colors"
          >
            <div>
              <p className="text-xs font-bold text-whatsapp-800">Direct WhatsApp chat</p>
              <p className="text-[11px] text-text-secondary mt-0.5">Opens a chat with you instantly — use in your posts and profile</p>
            </div>
            <svg className="w-4 h-4 text-whatsapp-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        )}
        {business.catalog_link && (
          <a
            href={business.catalog_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 bg-white border border-gray-200/80 rounded-xl px-4 py-3 hover:bg-surface transition-colors"
          >
            <div>
              <p className="text-xs font-bold text-text-primary">WhatsApp Catalog</p>
              <p className="text-[11px] text-text-secondary mt-0.5">Your products as a browsable catalog</p>
            </div>
            <svg className="w-4 h-4 text-text-secondary shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        )}
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 bg-white border border-gray-200/80 rounded-xl px-4 py-3 hover:bg-surface transition-colors"
        >
          <div>
            <p className="text-xs font-bold text-text-primary">Public profile page</p>
            <p className="text-[11px] text-text-secondary mt-0.5">Share this link on Facebook, Twitter and in your WhatsApp status</p>
          </div>
          <svg className="w-4 h-4 text-text-secondary shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      </div>

      <p className="text-center text-[11px] text-text-secondary">
        Tip: the chat QR works from any phone camera — no WhatsApp Business needed.
      </p>
      <div className="text-center">
        <Link href="/portal" className="inline-flex items-center gap-1.5 bg-gradient-to-r from-whatsapp-500 to-whatsapp-600 text-white rounded-full px-4 py-2 text-xs font-medium shadow-sm hover:from-whatsapp-600 hover:to-whatsapp-700 transition-all">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to my portal
        </Link>
      </div>
    </div>
  )
}