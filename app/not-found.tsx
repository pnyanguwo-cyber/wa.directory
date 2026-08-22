'use client'

import Link from 'next/link'
import Icon from '@/components/icon'

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="bg-gradient-to-br from-white/90 via-white/85 to-whatsapp-50/20 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-whatsapp-950/20 backdrop-blur-xl rounded-3xl border border-white/80 dark:border-gray-800 shadow-soft-lift p-8 sm:p-12">
        <div className="w-16 h-16 rounded-3xl bg-whatsapp-100 dark:bg-whatsapp-900/50 text-whatsapp-700 dark:text-gray-100 flex items-center justify-center mx-auto mb-5 shadow-sm">
          <Icon name="search" className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-text-primary dark:text-gray-100 mb-2 tracking-tight">
          Page Not Found
        </h1>
        <p className="text-text-secondary dark:text-gray-400 text-sm sm:text-base mb-6 leading-relaxed">
          The business, category, or page you are looking for does not exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="btn-primary h-11 px-6 text-sm font-semibold flex items-center gap-2 rounded-xl"
          >
            <span>Back to Home</span>
          </Link>
          <Link
            href="/search"
            className="btn-secondary h-11 px-5 text-sm font-semibold flex items-center gap-2 rounded-xl"
          >
            <span>Browse Directory</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
