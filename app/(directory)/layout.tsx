import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import BannerStrip from '@/components/banner-strip'
import { SITE_URL } from '@/lib/site-url'

const SiteSplash = dynamic(() => import('@/components/site-splash'), { ssr: false })
const PWARegistration = dynamic(() => import('@/components/pwa-registration'), { ssr: false })
const InstallPWA = dynamic(() => import('@/components/install-pwa'), { ssr: false })

// One Organization + WebSite graph for every page in the directory: it names the
// site, tells search engines where the search box lives, and gives AI assistants
// a canonical entity to cite.
const siteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'WA Directory',
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.png`,
      email: 'wadirectory@proton.me',
      areaServed: { '@type': 'Country', name: 'Zimbabwe' },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'WA Directory',
      description: 'Find any business in Zimbabwe on WhatsApp.',
      inLanguage: 'en',
      publisher: { '@id': `${SITE_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}

export default function DirectoryLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
      />
      <SiteSplash />
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
    </>
  )
}
