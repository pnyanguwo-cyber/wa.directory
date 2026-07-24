export default function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="skeleton-title" />
          <div className="skeleton-text w-1/3" />
        </div>
      </div>
      <div className="skeleton-text w-1/4" />
      <div className="space-y-2">
        <div className="skeleton-text w-full" />
        <div className="skeleton-text w-2/3" />
      </div>
      <div className="flex gap-2">
        <div className="skeleton h-10 flex-1 rounded-xl" />
        <div className="skeleton h-10 w-28 rounded-xl" />
      </div>
    </div>
  )
}

export function SkeletonProfile() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <div className="skeleton h-5 w-16 rounded" />
      <div className="card overflow-hidden">
        <div className="skeleton h-32 sm:h-40 rounded-none" />
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="skeleton h-8 w-48 rounded" />
            <div className="skeleton h-5 w-20 rounded-full" />
          </div>
          <div className="skeleton h-5 w-32 rounded" />
          <div className="space-y-2">
            <div className="skeleton h-5 w-16 rounded" />
            <div className="skeleton-text w-full" />
            <div className="skeleton-text w-3/4" />
          </div>
          <div className="flex gap-2">
            <div className="skeleton h-8 w-24 rounded-full" />
            <div className="skeleton h-8 w-24 rounded-full" />
          </div>
          <div className="skeleton h-12 w-full rounded-xl mt-6" />
        </div>
      </div>
    </div>
  )
}
