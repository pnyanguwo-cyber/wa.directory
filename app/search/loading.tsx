export default function SearchLoading() {
  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-6 animate-fade-in" aria-busy="true" aria-label="Loading Search Directory">
      {/* Search Header Skeleton */}
      <div className="rounded-3xl bg-gradient-to-br from-white/90 via-white/80 to-whatsapp-50/20 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-whatsapp-950/30 backdrop-blur-xl border border-white/80 dark:border-gray-800 p-5 sm:p-7 shadow-soft-lift space-y-4">
        <div className="space-y-2">
          <div className="h-6 sm:h-8 w-56 bg-gray-200/90 dark:bg-gray-700 rounded-xl animate-pulse" />
          <div className="h-4 w-72 bg-gray-200/60 dark:bg-gray-800 rounded-lg animate-pulse" />
        </div>

        {/* Search Bar Input Skeleton */}
        <div className="h-14 w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-2 shadow-inner flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse ml-2" />
          <div className="h-4 w-48 bg-gray-200/70 dark:bg-gray-700 rounded-md animate-pulse flex-1" />
          <div className="h-10 w-24 bg-whatsapp-500/40 rounded-xl animate-pulse" />
        </div>

        {/* Category Pills Skeleton */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
          {[0, 1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className="h-8 w-24 rounded-full bg-white/80 dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 animate-pulse shrink-0"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Business Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className="rounded-3xl bg-white/90 dark:bg-gray-900/80 border border-gray-200/80 dark:border-gray-800 p-5 shadow-card space-y-4 relative overflow-hidden"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {/* Card Header */}
            <div className="flex items-start gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gray-200/80 dark:bg-gray-800 animate-pulse shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-5 w-36 bg-gray-200/90 dark:bg-gray-700 rounded-lg animate-pulse" />
                <div className="h-3 w-24 bg-whatsapp-100 dark:bg-whatsapp-900/40 rounded-md animate-pulse" />
                <div className="h-3 w-28 bg-gray-200/60 dark:bg-gray-800 rounded-md animate-pulse" />
              </div>
            </div>

            {/* Bio Skeleton */}
            <div className="space-y-1.5 pt-1">
              <div className="h-3 w-full bg-gray-200/60 dark:bg-gray-800 rounded-md animate-pulse" />
              <div className="h-3 w-4/5 bg-gray-200/50 dark:bg-gray-800/60 rounded-md animate-pulse" />
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="h-3 w-20 bg-gray-200/70 dark:bg-gray-800 rounded-md animate-pulse" />
              <div className="h-9 w-28 bg-whatsapp-500/40 rounded-xl animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
