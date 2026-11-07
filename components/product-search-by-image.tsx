'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Camera, Loader2, X, Sparkles } from 'lucide-react'
import type { BusinessItem } from '@/types'
import ProductCard from '@/components/product-card'

interface Interpretation {
  query: string
  category: string
  attributes: string[]
}

/**
 * Visual product search (web).
 *
 * Sends the photo to /api/products/search-by-image, which treats it as a
 * SEARCH reference only — it never becomes a listing. Results are ordinary
 * product search hits.
 */
export default function ProductSearchByImage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null)
  const [products, setProducts] = useState<BusinessItem[] | null>(null)

  function reset() {
    setPreview('')
    setError('')
    setMessage('')
    setInterpretation(null)
    setProducts(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Photo too large (max 2MB).')
      return
    }

    setPreview(URL.createObjectURL(file))
    setLoading(true)
    setError('')
    setMessage('')
    setInterpretation(null)
    setProducts(null)

    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/products/search-by-image', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Photo search failed. Try again.')
        return
      }
      setInterpretation(data.interpretation || null)
      setProducts(data.products || [])
      if (data.message) setMessage(data.message)
    } catch {
      setError('Photo search failed. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-whatsapp-200/70 bg-gradient-to-br from-whatsapp-50/70 to-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-whatsapp-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">Find a product with a photo</h2>
            <p className="text-xs text-text-secondary">
              Upload a picture of what you want. We will look for the same or similar items from local sellers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full bg-whatsapp-600 hover:bg-whatsapp-700 disabled:opacity-60 text-white px-4 py-2 text-sm font-semibold transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Camera className="w-4 h-4" aria-hidden="true" />}
            {loading ? 'Looking…' : 'Upload photo'}
          </button>
          {(preview || products) && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              Clear
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
      </div>

      {preview && (
        <div className="mt-3 flex items-center gap-3">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 bg-white">
            <Image src={preview} alt="Your search photo" fill className="object-cover" unoptimized />
          </div>
          {interpretation?.query && (
            <p className="text-xs text-text-secondary">
              Looking for <span className="font-semibold text-text-primary">{interpretation.query}</span>
              {interpretation.category ? ` · ${interpretation.category}` : ''}
              {interpretation.attributes.length > 0 ? ` · ${interpretation.attributes.join(', ')}` : ''}
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-xs font-medium text-red-600">{error}</p>}
      {message && !error && <p className="mt-3 text-xs text-text-secondary">{message}</p>}

      {products && products.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}
