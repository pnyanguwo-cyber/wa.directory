import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import BannerStrip from '@/components/banner-strip'

const SiteSplash = dynamic(() => import('@/components/site-splash'), { ssr: false })
const PWARegistration = dynamic(() => import('@/components/pwa-registration'), { ssr: false })
const InstallPWA = dynamic(() => import('@/components/install-pwa'), { ssr: false })
const MobileFloatingActions = dynamic(() => import('@/components/mobile-floating-actions'), { ssr: false })

export default function DirectoryLayout({ children }: { children: ReactNode }) {
  return (
    <>
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
    </>
  )
}
