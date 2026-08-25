export default function PortalLoading() {
  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-fade-in" aria-busy="true" aria-label="Loading Portal Dashboard">
      {/* Top Banner Skeleton */}
      <div className="rounded-3xl bg-gradient-to-br from-white/90 via-white/80 to-whatsapp-50/30 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-whatsapp-950/30 backdrop-blur-xl border border-white/80 dark:border-gray-800 p-5 sm:p-8 shadow-soft-lift flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          <div className="w-14 h-14 rounded-2xl bg-gray-200/80 dark:bg-gray-800 animate-pulse shrink-0 flex items-center justify-center">
            <span className="w-6 h-6 rounded-full bg-whatsapp-400/40 animate-ping" />
          </div>
          <div className="space-y-2 flex-1 min-w-0">
            <div className="h-6 w-44 bg-gray-200/80 dark:bg-gray-800 rounded-xl animate-pulse" />
            <div className="h-3.5 w-64 bg-gray-200/60 dark:bg-gray-800/60 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="h-10 w-28 bg-gray-200/80 dark:bg-gray-800 rounded-2xl animate-pulse flex-1 md:flex-initial" />
          <div className="h-10 w-32 bg-whatsapp-200/60 dark:bg-whatsapp-900/40 rounded-2xl animate-pulse flex-1 md:flex-initial" />
        </div>
      </div>

      {/* 4 Metric Cards Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="rounded-2xl bg-white/90 dark:bg-gray-900/80 border border-gray-200/80 dark:border-gray-800 p-4 sm:p-5 shadow-xs space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 bg-gray-200/80 dark:bg-gray-800 rounded-md animate-pulse" />
              <div className="w-7 h-7 rounded-xl bg-whatsapp-50 dark:bg-whatsapp-950/60 border border-whatsapp-200/60 dark:border-whatsapp-800/60 flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-whatsapp-400 animate-pulse" />
              </div>
            </div>
            <div className="h-8 w-20 bg-gray-200/90 dark:bg-gray-700/80 rounded-xl animate-pulse" />
            <div className="h-2.5 w-24 bg-gray-200/50 dark:bg-gray-800/50 rounded-md animate-pulse" />
          </div>
        ))}
      </div>

      {/* Analytics Chart Box Skeleton */}
      <div className="rounded-3xl bg-white/90 dark:bg-gray-900/80 border border-gray-200/80 dark:border-gray-800 p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-5 w-36 bg-gray-200/80 dark:bg-gray-800 rounded-xl animate-pulse" />
            <div className="h-3 w-48 bg-gray-200/50 dark:bg-gray-800/50 rounded-md animate-pulse" />
          </div>
          <div className="h-8 w-28 bg-gray-200/70 dark:bg-gray-800 rounded-xl animate-pulse" />
        </div>
        <div className="h-48 sm:h-64 w-full bg-gradient-to-b from-whatsapp-50/20 to-transparent dark:from-whatsapp-950/10 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-center p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-whatsapp-600 dark:text-whatsapp-400 animate-pulse">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Loading live customer engagement analytics...</span>
          </div>
        </div>
      </div>
    </div>
  )
}