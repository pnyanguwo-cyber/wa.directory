import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/navbar'
import PWARegistration from '@/components/pwa-registration'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

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
      <body className={`${inter.variable} min-h-screen bg-white font-sans`}>
        <Navbar />
        <PWARegistration />
        <img
          src="/wadbody.webp"
          alt=""
          aria-hidden="true"
          decoding="async"
          className="fixed inset-0 h-full w-full object-cover pointer-events-none select-none -z-10"
        />
        <main className="relative pb-16 md:pb-0">{children}</main>
      </body>
    </html>
  )
}
