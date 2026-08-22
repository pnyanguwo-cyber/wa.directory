import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="mt-8 border-t dark:border-gray-800" style={{ backgroundColor: 'rgb(var(--bg-secondary))', borderColor: 'rgb(var(--border-color))' }}>
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-left">
          <div>
            <h3 className="font-semibold mb-1.5 text-sm" style={{ color: 'rgb(var(--text-primary))' }}>How it works</h3>
            <ol className="space-y-1 text-xs sm:text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
              <li className="flex items-center gap-2">
                <span className="bg-whatsapp-600 text-white w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-medium shrink-0" aria-hidden="true">1</span>
                <span>Search for any business</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="bg-whatsapp-600 text-white w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-medium shrink-0" aria-hidden="true">2</span>
                <span>Chat on WhatsApp</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="bg-whatsapp-600 text-white w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-medium shrink-0" aria-hidden="true">3</span>
                <span>Buy with confidence</span>
              </li>
            </ol>
          </div>
          <div>
            <h3 className="font-semibold mb-1.5 text-sm" style={{ color: 'rgb(var(--text-primary))' }}>For Businesses</h3>
            <ul className="space-y-1 text-xs sm:text-sm">
              <li>
                <Link href="/list" className="text-whatsapp-700 hover:text-whatsapp-800 hover:underline font-medium">
                  List Your Business
                </Link>
              </li>
              <li>
                <Link href="/admin-login" className="hover:underline transition-colors" style={{ color: 'rgb(var(--text-secondary))' }}>
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <img
                src="/favicon.png"
                alt="WA Directory logo"
                className="h-10 w-auto object-contain"
              />
              <span className="font-bold text-sm" style={{ color: 'rgb(var(--text-primary))' }}>WA Directory</span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'rgb(var(--text-secondary))' }}>
              Find any business on WhatsApp. AI finds shops, services, and prices instantly.
            </p>
          </div>
        </div>
        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t text-center text-xs" style={{ borderColor: 'rgb(var(--border-color))', color: 'rgb(var(--text-secondary))' }}>
          &copy; {new Date().getFullYear()} WA Directory. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
