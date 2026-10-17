import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import dynamic from 'next/dynamic'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import BannerStrip from '@/components/banner-strip'
import WhatsAppSupportButton from '@/components/whatsapp-support-button'
import Image from 'next/image'
import { SITE_URL } from '@/lib/site-url'

const SiteSplash = dynamic(() => import('@/components/site-splash'), { ssr: false })
const PWARegistration = dynamic(() => import('@/components/pwa-registration'), { ssr: false })
const InstallPWA = dynamic(() => import('@/components/install-pwa'), { ssr: false })
const MobileFloatingActions = dynamic(() => import('@/components/mobile-floating-actions'), { ssr: false })

// Self-hosted Inter variable font (weights 100-900, latin subset).
// No network dependency at build/dev time — Google Fonts being briefly
// unreachable used to silently drop real weights (incl. font-black 900),
// leaving only the Arial fallback and "un-bold" headings.
const inter = localFont({
  src: './fonts/inter-latin-wght-normal.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
  viewportFit: 'cover',
  themeColor: '#25D366',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen font-sans`}>
        <SiteSplash />
        <Navbar />
          <BannerStrip />
          <PWARegistration />
          <InstallPWA />
        <MobileFloatingActions />
        {/* Global Floor / Background Wallpaper */}
          <div
            aria-hidden="true"
            className="fixed inset-0 -z-30 pointer-events-none select-none"
          >
            <Image
              src="/wadbody.webp"
              alt=""
              fill
              sizes="100vw"
              className="object-cover opacity-90 transition-opacity duration-500"
            />
          </div>
          {/* Translucent overlay for crisp card contrast */}
          <div
            aria-hidden="true"
            className="fixed inset-0 h-full w-full pointer-events-none select-none -z-20 bg-white/40 backdrop-blur-[0.5px]"
          />
          {/* Ambient radial accent lighting */}
          <div
            aria-hidden="true"
            className="fixed inset-0 h-full w-full pointer-events-none select-none -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,211,102,0.12),transparent)]"
          />
        <main className="relative pb-16 md:pb-0">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
