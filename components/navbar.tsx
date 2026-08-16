import Link from 'next/link'
import { getBusinessId } from '@/lib/business-auth'

export default function Navbar() {
  const businessId = getBusinessId()

  return (
    <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-gray-200/60 shadow-sm" aria-label="Main navigation">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <img
            src="/logo-square.png"
            alt="WA Directory logo"
            className="w-10 h-10 object-contain rounded-xl group-hover:scale-105 transition-transform duration-200"
          />
          <span className="text-lg font-extrabold text-text-primary tracking-tight group-hover:text-whatsapp-700 transition-colors leading-tight">
            WA Directory
          </span>
        </Link>

        <div className="flex items-center gap-2.5">
          <Link
            href={businessId ? '/portal' : '/login'}
            className="btn-secondary px-3.5 py-1.5 text-xs sm:text-sm font-semibold flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0zM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span>{businessId ? 'My Portal' : 'Log in your account'}</span>
          </Link>
          <Link
            href="/list"
            className="btn-primary px-3.5 py-1.5 text-xs sm:text-sm font-semibold flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>List your business</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}