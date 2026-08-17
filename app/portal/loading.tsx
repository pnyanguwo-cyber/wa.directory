export default function PortalLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-5 w-32 bg-gray-200/70 rounded-lg animate-pulse" />
          <div className="h-3 w-48 bg-gray-200/50 rounded-lg animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-gray-200/70 rounded-2xl animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-200/60 rounded-2xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
      <div className="h-56 bg-gray-200/60 rounded-2xl animate-pulse" />
    </div>
  )
}