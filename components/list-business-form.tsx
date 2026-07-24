'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getClient } from '@/lib/supabase-client'

export default function ListBusinessForm() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [bioLoading, setBioLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    description: '',
    bio: '',
    catalog_link: '',
  })
  const router = useRouter()

  async function handleGenerateBio() {
    if (!form.description.trim()) return
    setBioLoading(true)
    try {
      const res = await fetch('/api/generate-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: form.description }),
      })
      const data = await res.json()
      if (data.bio) setForm(f => ({ ...f, bio: data.bio }))
    } catch {
      // silently fail, user can proceed without AI bio
    } finally {
      setBioLoading(false)
    }
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      const whatsappLink = `https://wa.me/${form.phone.replace(/[^0-9]/g, '')}`
      const { data, error } = await getClient()
        .from('businesses')
        .insert({
          name: form.name.trim(),
          phone: form.phone.trim(),
          bio: form.bio || `Professional ${form.description} services.`,
          category: [form.description.trim()],
          location: '',
          whatsapp_link: whatsappLink,
          catalog_link: form.catalog_link.trim() || null,
          verified: false,
          rating: 0,
          review_count: 0,
        })
        .select()
        .single()

      if (error) throw error
      router.push(`/business/${data.id}`)
    } catch (err) {
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isValidStep1 = form.name.trim() && form.phone.trim()
  const isValidStep2 = form.description.trim()

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center">
            {s > 1 && (
              <div className={`h-1 w-8 sm:w-12 ${step >= s ? 'bg-whatsapp-500' : 'bg-gray-200'}`} />
            )}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-whatsapp-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s}
            </div>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. John's Plumbing"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-whatsapp-500 outline-none transition-colors"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="e.g. 263712345678"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-whatsapp-500 outline-none transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1">Include country code (e.g. 263 for Zimbabwe)</p>
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={!isValidStep1}
            className="w-full bg-whatsapp-500 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-whatsapp-600 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">What do you sell?</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe your business, products, or services..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-whatsapp-500 outline-none transition-colors resize-none"
              autoFocus
            />
          </div>
          <button
            onClick={handleGenerateBio}
            disabled={!isValidStep2 || bioLoading}
            className="w-full border-2 border-whatsapp-500 text-whatsapp-600 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-whatsapp-50 transition-colors"
          >
            {bioLoading ? 'Generating...' : '✨ Generate AI Bio'}
          </button>
          {form.bio && (
            <div className="bg-whatsapp-50 border border-whatsapp-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">{form.bio}</p>
              <button
                onClick={() => setForm(f => ({ ...f, bio: '' }))}
                className="text-xs text-gray-500 mt-2 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!isValidStep2}
              className="flex-1 bg-whatsapp-500 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-whatsapp-600 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catalog Link <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="url"
              value={form.catalog_link}
              onChange={e => setForm(f => ({ ...f, catalog_link: e.target.value }))}
              placeholder="https://example.com/catalog"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-whatsapp-500 outline-none transition-colors"
              autoFocus
            />
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-1">
            <h3 className="font-semibold mb-2">Preview</h3>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Name:</span> {form.name}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Phone:</span> {form.phone}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Bio:</span>{' '}
              {form.bio || `Professional ${form.description} services.`}
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-whatsapp-500 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-whatsapp-600 transition-colors"
            >
              {loading ? 'Submitting...' : 'Go Live'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
