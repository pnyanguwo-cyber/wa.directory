import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-gray-200/60 shadow-sm" aria-label="Main navigation">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <img
            src="/logo-square.png"
            alt="WA Directory logo"
            className="w-8 h-8 object-contain rounded-xl group-hover:scale-105 transition-transform duration-200"
          />
          <span className="text-lg font-extrabold text-text-primary tracking-tight group-hover:text-whatsapp-700 transition-colors leading-tight">
            WA Directory
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/list"
            className="btn-primary px-3.5 py-1.5 text-xs sm:text-sm font-semibold flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>List Your Business</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
