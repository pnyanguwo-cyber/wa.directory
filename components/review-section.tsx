'use client'

import { useState } from 'react'
import ReviewForm from './review-form'
import { ReviewListDisplay } from './review-list'
import RatingBreakdown from './rating-breakdown'

interface Review {
  id: string
  name: string
  rating: number
  comment: string
  created_at: string
  customer_phone?: string
}

interface ReviewSectionProps {
  businessId: string
  initialReviews: Review[]
  totalReviews: number
  rating: number
}

export default function ReviewSection({ businessId, initialReviews, totalReviews, rating }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)

  function handleNewReview(review: Review) {
    setReviews(prev => [review, ...prev])
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Business Stats */}
      <div>
        <h2 className="text-sm sm:text-[16px] font-semibold text-text-primary mb-2 sm:mb-3">Business Stats</h2>
        <div className="rounded-2xl bg-surface/90 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 p-3 sm:p-4 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-text-primary">{rating || 0}</p>
              <p className="text-[10px] text-text-secondary font-medium">out of 5</p>
            </div>
            <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
            <div>
              <p className="text-sm font-semibold text-text-primary">{totalReviews} reviews</p>
            </div>
          </div>
          {totalReviews > 0 && (
            <RatingBreakdown businessId={businessId} totalReviews={totalReviews} />
          )}
        </div>
      </div>

      {/* Reviews */}
      <div>
        <h2 className="text-sm sm:text-[16px] font-semibold text-text-primary mb-2 sm:mb-3">Reviews</h2>
        <div className="rounded-2xl bg-surface/90 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 p-3 sm:p-4 shadow-xs">
          <ReviewForm businessId={businessId} onReviewSubmitted={handleNewReview} />
          {reviews.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/80">
              <ReviewListDisplay reviews={reviews.slice(0, 10)} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
