'use client'

interface Review {
  id: string
  name: string
  rating: number
  comment: string
  created_at: string
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${i <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return d.toLocaleDateString('en-ZW', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ReviewListDisplay({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-text-secondary">No reviews yet. Be the first to leave one!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map(review => (
        <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-whatsapp-100 flex items-center justify-center text-xs font-bold text-whatsapp-700">
              {review.name ? review.name.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{review.name || 'Anonymous'}</p>
              <p className="text-xs text-text-secondary">{formatDate(review.created_at)}</p>
            </div>
            <div className="ml-auto">
              <Stars rating={review.rating} />
            </div>
          </div>
          {review.comment && (
            <p className="text-sm text-text-secondary ml-11">{review.comment}</p>
          )}
        </div>
      ))}
    </div>
  )
}
