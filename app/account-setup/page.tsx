'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function AccountSetupPage() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') || ''
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!token) setNotice('Missing edit link. Open this page from the link in your WhatsApp message.')
  }, [token])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setBusy(true)
    setError('')
    const res = await fetch('/api/account/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edit_token: token, phone, password }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      setError(data.error || 'Could not create account')
      return
    }
    router.push('/portal')
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10 sm:py-16">
      <div className="bg-gradient-to-br from-white/85 via-white/80 to-whatsapp-50/20 backdrop-blur-xl rounded-3xl border border-white/70 shadow-soft-lift p-6 sm:p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Create Your Account</h1>
          <p className="text-gray-500 text-sm mt-1">
            Set a password to unlock your private portal with statistics, conversations and more.
          </p>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4 animate-fade-in">{error}</p>
        )}
        {notice && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 animate-fade-in">{notice}</p>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">WhatsApp Phone Number (as listed)</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="input-field"
              placeholder="+263 77 123 4567"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field"
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Confirm Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="input-field"
              placeholder="Repeat your password"
            />
          </div>
          <button type="submit" disabled={busy || !token} className="btn-primary w-full py-3 text-[15px] font-semibold">
            {busy ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <p className="text-xs text-text-secondary">
            Already have an account?{' '}
            <Link href="/login" className="text-whatsapp-700 font-semibold hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}