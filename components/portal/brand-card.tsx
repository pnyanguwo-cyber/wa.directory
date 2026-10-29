'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { Business } from '@/types'
import BusinessCardPrint from '@/components/business-card-print'

// Lazy: qrcode.react stays out of the main portal chunk (same pattern as Overview).
const QrCard = dynamic(() => import('@/components/qr-card'))

export default function PortalBrandCard({
  business,
  profileUrl,
  chatUrl,
  chatLabel,
}: {
  business: Business
  profileUrl: string
  chatUrl: string
  chatLabel: string
}) {
  const key = business.slug || business.id
  const fileSafe = business.slug || 'business'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Brand &amp; Card</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Your official business card and QR codes — customise, download and print them for the counter, shelves and packaging.
        </p>
      </div>

      {/* Digital business card (world-standard 3.5 x 2.0 deck, themes, PNG/SVG/vCard) */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-card">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-text-primary">Official business card</h3>
          <Link href="/portal/card" className="text-xs font-semibold text-whatsapp-600 hover:underline shrink-0">
            Print &amp; export &rarr;
          </Link>
        </div>
        <BusinessCardPrint business={business} />
      </div>

      {/* QR codes (tracked scan downloads) */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-card">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="text-sm font-bold text-text-primary">QR codes</h3>
          <Link href={`/my-qr/${key}`} className="text-xs font-semibold text-whatsapp-600 hover:underline shrink-0">
            Full QR studio &rarr;
          </Link>
        </div>
        <p className="text-xs text-text-secondary mb-4">
          Customers scan to chat with you directly or open your profile. Prints export at 300 DPI.
        </p>
        <div className="flex flex-wrap gap-4">
          <QrCard
            value={chatUrl}
            title={chatLabel}
            subtitle="Scans open a conversation with you (tracked)"
            size={130}
            downloadName={`${fileSafe}-customer-chat-qr.png`}
          />
          <QrCard
            value={profileUrl}
            title="Profile QR"
            subtitle="Scans open your WA.Directory profile"
            size={130}
            downloadName={`${fileSafe}-profile-qr.png`}
          />
        </div>
      </div>
    </div>
  )
}
