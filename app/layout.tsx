import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navbar from '@/components/navbar'
import PWARegistration from '@/components/pwa-registration'

export const metadata: Metadata = {
  metadataBase: new URL('https://wadirectory.vercel.app'),
  title: 'WA Directory - Find any business on WhatsApp',
  description: 'AI finds shops, services, prices instantly',
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
  themeColor: '#25D366',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-white">
        <Navbar />
        <PWARegistration />
        <img
          src="/wadbody.png"
          alt=""
          aria-hidden="true"
          className="fixed inset-0 h-full w-full object-cover pointer-events-none select-none -z-10"
        />
        <main className="relative pb-16 md:pb-0">{children}</main>
      </body>
    </html>
  )
}
