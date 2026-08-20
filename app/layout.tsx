import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import Image from 'next/image'
import './globals.css'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import PWARegistration from '@/components/pwa-registration'
import InstallPWA from '@/components/install-pwa'
import BannerStripLoader from '@/components/banner-strip-loader'
import WhatsAppSupportButton from '@/components/whatsapp-support-button'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://wadirectory.vercel.app'),
  title: 'WA Directory - Find any business on WhatsApp',
  description: 'AI finds shops, services, prices instantly',
  manifest: '/manifest.webmanifest',
  applicationName: 'WA Directory',
  appleWebApp: {
    capable: true,
    title: 'WA Directory',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
    apple: [{ url: '/icon-192.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'WA Directory',
    locale: 'en_ZW',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#25D366',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen bg-white font-sans`}>
        <Navbar />
        <Suspense fallback={null}>
          <BannerStripLoader />
        </Suspense>
        <PWARegistration />
        <InstallPWA />
        <WhatsAppSupportButton />
        <div className="fixed inset-0 -z-10 pointer-events-none select-none">
          <Image
            src="/wadbody.webp"
            alt=""
            aria-hidden="true"
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
        </div>
        <main className="relative pb-16 md:pb-0">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
