import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import PWARegistration from '@/components/pwa-registration'
import InstallPWA from '@/components/install-pwa'
import BannerStrip from '@/components/banner-strip'
import WhatsAppSupportButton from '@/components/whatsapp-support-button'
import { getSupabase } from '@/lib/supabase-server'
import { ThemeProvider } from 'next-themes'

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { data: banners } = await getSupabase()
    .from('banners')
    .select('id, text, link, link_label')
    .eq('active', true)
    .order('created_at', { ascending: false })

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <Navbar />
          <BannerStrip
            banners={(banners || []).map(b => ({
              id: b.id,
              text: b.text,
              link: b.link || '',
              link_label: b.link_label || 'Learn more',
            }))}
          />
          <PWARegistration />
          <InstallPWA />
          <WhatsAppSupportButton />
          <img
            src="/wadbody.webp"
            alt=""
            aria-hidden="true"
            decoding="async"
            className="fixed inset-0 h-full w-full object-cover pointer-events-none select-none -z-10 dark:opacity-0 transition-opacity duration-500"
          />
          <main className="relative pb-16 md:pb-0">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
