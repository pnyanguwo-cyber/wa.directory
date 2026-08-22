'use client'

import Link from 'next/link'
import Icon from '@/components/icon'

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-gray-200/80 dark:border-gray-800 bg-surface/70 dark:bg-gray-900/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-left">
          {/* Brand Col */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo-square.png"
                alt="WA Directory logo"
                className="h-9 w-9 rounded-xl object-contain shadow-sm"
              />
              <span className="font-extrabold text-base tracking-tight text-text-primary dark:text-gray-100">
                WA Directory
              </span>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary dark:text-gray-400 leading-relaxed">
              Zimbabwe&apos;s AI-powered business directory. Discover verified local shops, compare real-time prices, and chat directly on WhatsApp.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-whatsapp-100/70 dark:bg-whatsapp-900/40 text-whatsapp-800 dark:text-gray-100 text-xs font-semibold">
              <Icon name="mapPin" className="w-3.5 h-3.5" />
              <span>Made for Zimbabwe</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold mb-3 text-sm text-text-primary dark:text-gray-100 tracking-tight">
              Explore Directory
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-text-secondary dark:text-gray-400">
              <li>
                <Link href="/" className="hover:text-whatsapp-600 dark:hover:text-whatsapp-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-whatsapp-600 dark:hover:text-whatsapp-400 transition-colors">
                  Search All Listings
                </Link>
              </li>
              <li>
                <Link href="/search?q=Solar" className="hover:text-whatsapp-600 dark:hover:text-whatsapp-400 transition-colors">
                  Solar & Power Installers
                </Link>
              </li>
              <li>
                <Link href="/search?q=Plumber" className="hover:text-whatsapp-600 dark:hover:text-whatsapp-400 transition-colors">
                  Plumbers & Boreholes
                </Link>
              </li>
              <li>
                <Link href="/search?q=Automotive" className="hover:text-whatsapp-600 dark:hover:text-whatsapp-400 transition-colors">
                  Auto Mechanics & Spares
                </Link>
              </li>
            </ul>
          </div>

          {/* For Businesses */}
          <div>
            <h3 className="font-bold mb-3 text-sm text-text-primary dark:text-gray-100 tracking-tight">
              For Businesses
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-text-secondary dark:text-gray-400">
              <li>
                <Link href="/list" className="text-whatsapp-600 dark:text-whatsapp-400 hover:underline font-semibold flex items-center gap-1">
                  <span>List Your Business Free</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-whatsapp-600 dark:hover:text-whatsapp-400 transition-colors">
                  Owner Portal Login
                </Link>
              </li>
              <li>
                <Link href="/portal/billing" className="hover:text-whatsapp-600 dark:hover:text-whatsapp-400 transition-colors">
                  Premium Ranking & Bids
                </Link>
              </li>
              <li>
                <Link href="/admin-login" className="hover:text-whatsapp-600 dark:hover:text-whatsapp-400 transition-colors">
                  Admin Login
                </Link>
              </li>
            </ul>
          </div>

          {/* How It Works & Support */}
          <div>
            <h3 className="font-bold mb-3 text-sm text-text-primary dark:text-gray-100 tracking-tight">
              How It Works
            </h3>
            <ol className="space-y-2 text-xs sm:text-sm text-text-secondary dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="bg-whatsapp-600 text-white w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5" aria-hidden="true">1</span>
                <span>Search by service, shop, or location</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-whatsapp-600 text-white w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5" aria-hidden="true">2</span>
                <span>Chat instantly on WhatsApp</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-whatsapp-600 text-white w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5" aria-hidden="true">3</span>
                <span>Verify ratings & buy with confidence</span>
              </li>
            </ol>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200/60 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-secondary dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} WA Directory. All rights reserved.</p>
          <p className="flex items-center gap-1">
            <span>Powered by WhatsApp Cloud & Google Gemini AI</span>
          </p>
        </div>
      </div>
    </footer>
  )
}

