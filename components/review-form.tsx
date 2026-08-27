'use client'

import { useState } from 'react'

interface ReviewFormProps {
  businessId: string
  onReviewSubmitted: (review: { id: string; name: string; rating: number; comment: string; created_at: string }) => void
}

export default function ReviewForm({ businessId, onReviewSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [name, setName] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) {
      setError('Please select a star rating')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId, rating, comment, name }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to submit review')
        return
      }
      setSubmitted(true)
      onReviewSubmitted(data.review)
    } catch {
      setError('Failed to submit review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-whatsapp-50 dark:bg-whatsapp-950/40 border border-whatsapp-200 dark:border-whatsapp-800/50 rounded-xl p-4 text-center animate-slide-up">
        <div className="w-10 h-10 rounded-full bg-whatsapp-100 dark:bg-whatsapp-900/50 flex items-center justify-center mx-auto mb-2">
          <svg className="w-5 h-5 text-whatsapp-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-whatsapp-800 dark:text-whatsapp-200">Thanks for your review!</p>
        <p className="text-xs text-whatsapp-600 dark:text-whatsapp-400 mt-1">Your feedback helps others find great businesses.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">Your rating</label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-0.5 transition-transform hover:scale-110"
              aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            >
              <svg
                className={`w-7 h-7 transition-colors ${
                  star <= (hoverRating || rating)
                    ? 'text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          ))}
          {rating > 0 && (
            <span className="text-sm text-text-secondary ml-2">
              {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Very Good' : 'Excellent'}
            </span>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="review-name" className="block text-sm font-medium text-text-primary mb-1.5">
          Your name <span className="text-text-secondary">(optional)</span>
        </label>
        <input
          id="review-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Anonymous"
          className="input-field"
          maxLength={50}
        />
      </div>

      <div>
        <label htmlFor="review-comment" className="block text-sm font-medium text-text-primary mb-1.5">
          Your review <span className="text-text-secondary">(optional)</span>
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Tell others about your experience..."
          rows={3}
          className="input-field resize-none"
          maxLength={500}
        />
        <p className="text-xs text-text-secondary mt-1">{comment.length}/500</p>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 animate-fade-in">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="w-full btn-primary py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Submitting...
          </span>
        ) : (
          'Submit Review'
        )}
      </button>
    </form>
  )
}
