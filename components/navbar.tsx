import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-gray-200/60 shadow-sm" aria-label="Main navigation">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-whatsapp-600 via-whatsapp-500 to-emerald-400 flex items-center justify-center text-white shadow-[0_3px_10px_rgba(37,211,102,0.3)] group-hover:scale-105 transition-transform duration-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-.47-.042-.94-.092-1.408-.15A3.003 3.003 0 0 1 12 14.502V10.6c0-1.136.847-2.1 1.98-2.193 2.092-.167 4.192-.167 6.27 0ZM3.75 6.011c0-.97.616-1.813 1.5-2.097 2.078-.167 4.178-.167 6.27 0 1.133.093 1.98 1.057 1.98 2.193v3.89c0 1.136-.847 2.1-1.98 2.193-.68.055-1.36.096-2.04.122l-2.73 2.73v-2.617c-1.133-.093-1.98-1.057-1.98-2.193V6.011Z" />
            </svg>
          </div>
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
