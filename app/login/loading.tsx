import Image from 'next/image'

export default function LoginLoading() {
  return (
    <div className="max-w-md mx-auto px-4 py-10 sm:py-16 animate-fade-in" aria-busy="true" aria-label="Loading Login">
      <div className="bg-gradient-to-br from-white/85 via-white/80 to-whatsapp-50/20 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-whatsapp-950/20 backdrop-blur-xl rounded-3xl border border-white/70 dark:border-gray-800 shadow-soft-lift p-6 sm:p-8">
        <div className="text-center mb-6">
          <Image
            src="/logo-square.png"
            alt="WA Directory logo"
            width={56}
            height={56}
            priority
            className="mx-auto w-14 h-14 object-contain rounded-2xl shadow-[0_6px_16px_rgba(37,211,102,0.35)] mb-3 opacity-50"
          />
          <div className="h-7 w-40 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse mx-auto mb-2" />
          <div className="h-4 w-56 bg-gray-200/60 dark:bg-gray-800/60 rounded-lg animate-pulse mx-auto" />
        </div>

        <div className="space-y-4">
          <div>
            <div className="h-4 w-36 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse mb-1.5" />
            <div className="h-10 w-full bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          </div>
          <div>
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse mb-1.5" />
            <div className="h-10 w-full bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          </div>
          <div className="h-12 w-full bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
          <div className="h-4 w-40 bg-gray-200/60 dark:bg-gray-800/60 rounded-lg animate-pulse mx-auto" />
          <div className="h-4 w-32 bg-gray-200/60 dark:bg-gray-800/60 rounded-lg animate-pulse mx-auto" />
        </div>
      </div>
    </div>
  )
}
