export default function BusinessProfileLoading() {
  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 animate-fade-in" aria-busy="true" aria-label="Loading Business Profile">
      <div className="bg-gradient-to-br from-white/85 via-white/80 to-whatsapp-50/20 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-whatsapp-950/30 backdrop-blur-xl rounded-3xl border border-white/70 dark:border-gray-800 shadow-soft-lift p-3 sm:p-6 space-y-4">
        {/* Top Action Bar Skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-9 w-20 bg-gray-200/80 dark:bg-gray-800 rounded-full animate-pulse" />
          <div className="h-9 w-24 bg-gray-200/80 dark:bg-gray-800 rounded-full animate-pulse" />
        </div>

        {/* Card Header & Banner Skeleton */}
        <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 overflow-hidden bg-white/90 dark:bg-gray-900/80 shadow-card">
          <div className="h-28 sm:h-44 bg-gradient-to-r from-whatsapp-100/70 to-emerald-100/60 dark:from-whatsapp-950/40 dark:to-emerald-950/30 animate-pulse relative" />

          <div className="px-4 sm:px-6 pb-6 pt-0 relative">
            {/* Avatar & Verification Skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-10 sm:-mt-14 mb-4 gap-3">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-3xl bg-white dark:bg-gray-800 p-1 shadow-lg border border-gray-200/80 dark:border-gray-700 animate-pulse shrink-0 flex items-center justify-center">
                <span className="w-8 h-8 rounded-full bg-whatsapp-400/30 animate-ping" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-10 w-36 bg-whatsapp-500/30 rounded-2xl animate-pulse" />
                <div className="h-10 w-24 bg-gray-200/80 dark:bg-gray-800 rounded-2xl animate-pulse" />
              </div>
            </div>

            {/* Title & Category Skeletons */}
            <div className="space-y-3 mb-6">
              <div className="h-7 sm:h-9 w-64 bg-gray-200/90 dark:bg-gray-700 rounded-xl animate-pulse" />
              <div className="flex items-center gap-2">
                <div className="h-4 w-28 bg-amber-200/60 dark:bg-amber-900/30 rounded-md animate-pulse" />
                <div className="h-4 w-20 bg-gray-200/60 dark:bg-gray-800 rounded-md animate-pulse" />
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-24 bg-whatsapp-100 dark:bg-whatsapp-950/60 rounded-full animate-pulse" />
                <div className="h-6 w-32 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
              </div>
            </div>

            {/* QR Card & Details Grid Skeleton */}
            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 mb-6 items-start">
              {/* QR Box Skeleton */}
              <div className="w-full md:w-[280px] lg:w-[310px] rounded-3xl bg-slate-50 dark:bg-gray-950/70 border border-slate-200/80 dark:border-gray-800 p-5 space-y-4 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse" />
                  <div className="h-4 w-14 bg-whatsapp-100 dark:bg-whatsapp-900/50 rounded-full animate-pulse" />
                </div>
                <div className="aspect-square w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center justify-center p-6">
                  <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse flex items-center justify-center">
                    <span className="w-8 h-8 rounded-full bg-whatsapp-400/40 animate-pulse" />
                  </div>
                </div>
                <div className="h-10 w-full bg-whatsapp-500/40 rounded-2xl animate-pulse" />
              </div>

              {/* Details 2x2 Grid Skeleton */}
              <div className="flex-1 min-w-0 w-full space-y-3">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="rounded-2xl bg-surface/90 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 p-3.5 flex items-center gap-3 min-h-[64px]"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0" />
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="h-2.5 w-16 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse" />
                        <div className="h-3.5 w-28 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
