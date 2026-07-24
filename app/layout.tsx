import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/navbar'

export const metadata: Metadata = {
  title: 'WA Directory - Find any business on WhatsApp',
  description: 'AI finds shops, services, prices instantly',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  )
}
