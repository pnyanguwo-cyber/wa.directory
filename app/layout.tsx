import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { SITE_URL } from '@/lib/site-url'

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

// Root layout is deliberately bare: fonts, metadata and globals only.
// The WA Directory chrome (navbar, footer, wallpaper) lives in the
// (directory) route group so auto-generated business websites (/site/*)
// render full-bleed with their own branded header/footer.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen font-sans`}>{children}</body>
    </html>
  )
}
