export default function ListLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 animate-fade-in" aria-busy="true" aria-label="Loading List Form">
      <div className="bg-gradient-to-br from-white/85 via-white/80 to-whatsapp-50/20 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-whatsapp-950/20 backdrop-blur-xl rounded-3xl border border-white/70 dark:border-gray-800 shadow-soft-lift p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse mx-auto mb-2" />
          <div className="h-4 w-56 bg-gray-200/60 dark:bg-gray-800/60 rounded-lg animate-pulse mx-auto" />
        </div>

        <div className="space-y-4">
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center">
                {s > 1 && <div className="h-1 w-8 sm:w-12 bg-gray-200 dark:bg-gray-800 animate-pulse" />}
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse mb-1.5" />
              <div className="h-10 w-full bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
            </div>
            <div>
              <div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse mb-1.5" />
              <div className="h-10 w-full bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
            </div>
            <div className="flex gap-3">
              <div className="w-40 h-10 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
              <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
            </div>
            <div className="flex gap-2 pt-2">
              <div className="flex-1 h-12 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
              <div className="flex-1 h-12 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
