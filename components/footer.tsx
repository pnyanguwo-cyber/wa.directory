import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-surface mt-16 border-t border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left">
          <div>
            <h3 className="font-semibold text-text-primary mb-2">How it works</h3>
            <ol className="space-y-2 text-text-secondary text-sm">
              <li className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="bg-whatsapp-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium">1</span>
                Search for any business
              </li>
              <li className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="bg-whatsapp-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium">2</span>
                Chat on WhatsApp
              </li>
              <li className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="bg-whatsapp-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium">3</span>
                Buy with confidence
              </li>
            </ol>
          </div>
          <div>
            <h3 className="font-semibold text-text-primary mb-2">For Businesses</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/list" className="text-whatsapp-600 hover:underline">
                  List Your Business
                </Link>
              </li>
              <li>
                <Link href="/admin-login" className="text-text-secondary hover:text-text-primary transition-colors">
                  Admin
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-text-primary mb-2">WA Directory</h3>
            <p className="text-text-secondary text-sm">
              Find any business on WhatsApp. AI finds shops, services, prices instantly.
            </p>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-xs text-text-secondary">
          &copy; {new Date().getFullYear()} WA Directory. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
