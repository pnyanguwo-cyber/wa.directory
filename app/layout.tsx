import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import dynamic from 'next/dynamic'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import BannerStrip from '@/components/banner-strip'
import WhatsAppSupportButton from '@/components/whatsapp-support-button'
import { ThemeProvider } from 'next-themes'
import Image from 'next/image'

const SiteSplash = dynamic(() => import('@/components/site-splash'), { ssr: false })
const PWARegistration = dynamic(() => import('@/components/pwa-registration'), { ssr: false })
const InstallPWA = dynamic(() => import('@/components/install-pwa'), { ssr: false })

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'https://wadirectory.co.zw'),
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen font-sans`}>
        <SiteSplash />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <Navbar />
          <BannerStrip />
          <PWARegistration />
          <InstallPWA />
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
              className="object-cover opacity-90 dark:opacity-25 transition-opacity duration-500"
            />
          </div>
          {/* Translucent overlay for crisp card contrast */}
          <div
            aria-hidden="true"
            className="fixed inset-0 h-full w-full pointer-events-none select-none -z-20 bg-white/40 dark:bg-gray-950/80 backdrop-blur-[0.5px]"
          />
          {/* Ambient radial accent lighting */}
          <div
            aria-hidden="true"
            className="fixed inset-0 h-full w-full pointer-events-none select-none -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,211,102,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(18,140,126,0.2),transparent)]"
          />
          <main className="relative pb-16 md:pb-0">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
