import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-text-primary">WA Directory</span>
          <span className="inline-flex items-center gap-1 bg-whatsapp-100 text-whatsapp-700 text-xs font-medium px-1.5 py-0.5 rounded-full">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </span>
        </Link>
        <Link
          href="/list"
          className="btn-primary px-4 py-2 text-sm"
        >
          List Your Business
        </Link>
      </div>
    </nav>
  )
}
