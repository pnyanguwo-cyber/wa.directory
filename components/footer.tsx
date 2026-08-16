import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-surface mt-8 border-t border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
          <div>
            <h3 className="font-semibold text-text-primary mb-2 text-sm">How it works</h3>
            <ol className="space-y-1.5 text-text-secondary text-xs sm:text-sm">
              <li className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="bg-whatsapp-600 text-white w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-medium shrink-0" aria-hidden="true">1</span>
                <span>Search for any business</span>
              </li>
              <li className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="bg-whatsapp-600 text-white w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-medium shrink-0" aria-hidden="true">2</span>
                <span>Chat on WhatsApp</span>
              </li>
              <li className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="bg-whatsapp-600 text-white w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-medium shrink-0" aria-hidden="true">3</span>
                <span>Buy with confidence</span>
              </li>
            </ol>
          </div>
          <div>
            <h3 className="font-semibold text-text-primary mb-2 text-sm">For Businesses</h3>
            <ul className="space-y-1.5 text-xs sm:text-sm">
              <li>
                <Link href="/list" className="text-whatsapp-700 hover:text-whatsapp-800 hover:underline font-medium">
                  List Your Business
                </Link>
              </li>
              <li>
                <Link href="/admin-login" className="text-text-secondary hover:text-text-primary transition-colors">
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
              <img
                src="/logo-square.png"
                alt="WA Directory logo"
                className="w-8 h-8 object-contain rounded-lg"
              />
              <span className="font-bold text-text-primary">WA Directory</span>
            </div>
            <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">
              Find any business on WhatsApp. AI finds shops, services, and prices instantly.
            </p>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} WA Directory. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
