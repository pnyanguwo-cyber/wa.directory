'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface FilterBarProps {
  total: number
  query: string
}

export default function FilterBar({ total, query }: FilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const verified = searchParams.get('verified') === 'true'
  const sort = searchParams.get('sort') || 'rating'

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('q', query)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/search?${params.toString()}`)
  }

  return (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
      <p className="text-text-secondary dark:text-gray-400 text-sm">
        <span className="font-semibold text-text-primary dark:text-gray-100">{total}</span>{' '}
        business{total !== 1 ? 'es' : ''} for &ldquo;{query}&rdquo;
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateParam('verified', verified ? '' : 'true')}
          className={`chip text-xs ${verified ? 'chip-active' : ''}`}
        >
          {verified ? '✓ ' : ''}Verified
        </button>
        <button
          onClick={() => updateParam('sort', sort === 'rating' ? 'newest' : 'rating')}
          className={`chip text-xs ${sort === 'newest' ? 'chip-active' : ''}`}
        >
          {sort === 'newest' ? 'Newest' : 'Rating'}
        </button>
      </div>
    </div>
  )
}
