import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">WA Directory</span>
          <span className="text-xs bg-whatsapp-100 text-whatsapp-700 px-1.5 py-0.5 rounded font-medium">
            ✓
          </span>
        </Link>
        <Link
          href="/list"
          className="bg-whatsapp-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-whatsapp-600 transition-colors"
        >
          List Your Business
        </Link>
      </div>
    </nav>
  )
}
