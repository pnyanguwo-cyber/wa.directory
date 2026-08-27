'use client'

import { useState, useEffect } from 'react'

interface Review {
  id: string
  name: string
  rating: number
  comment: string
  created_at: string
}

interface ReviewListProps {
  businessId: string
  initialReviews?: Review[]
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${i <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return 'Anonymous'
  return phone.slice(0, 3) + '•••' + phone.slice(-3)
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

export default function ReviewList({ businessId, initialReviews = [] }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [loading, setLoading] = useState(initialReviews.length === 0)

  useEffect(() => {
    if (initialReviews.length > 0) return
    async function fetchReviews() {
      try {
        const res = await fetch(`/api/reviews?business_id=${businessId}`)
        const data = await res.json()
        if (data.reviews) setReviews(data.reviews)
      } catch {}
      setLoading(false)
    }
    fetchReviews()
  }, [businessId, initialReviews.length])

  function handleNewReview(review: Review) {
    setReviews(prev => [review, ...prev])
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800" />
              <div className="space-y-1">
                <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-2 w-16 bg-gray-200/60 dark:bg-gray-800/60 rounded" />
              </div>
            </div>
            <div className="h-3 w-full bg-gray-200/60 dark:bg-gray-800/60 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return { reviews, handleNewReview, Stars, formatDate }
}

export function ReviewListDisplay({ reviews }: { reviews: Review[] }) {
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
        <div key={review.id} className="border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0 last:pb-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-whatsapp-100 dark:bg-whatsapp-900/50 flex items-center justify-center text-xs font-bold text-whatsapp-700 dark:text-whatsapp-300">
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
