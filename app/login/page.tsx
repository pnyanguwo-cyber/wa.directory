'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function doLogin(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await fetch('/api/account/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      setError(data.error || 'Login failed')
      return
    }
    router.push('/portal')
  }

  async function doForgot(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    const res = await fetch('/api/account/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      setError(data.error || 'Could not send code')
      return
    }
    setNotice('Code sent to your WhatsApp. It expires in 10 minutes.')
    setMode('reset')
  }

  async function doReset(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await fetch('/api/account/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, password: newPassword }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      setError(data.error || 'Could not reset password')
      return
    }
    router.push('/portal')
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10 sm:py-16">
      <div className="bg-gradient-to-br from-white/85 via-white/80 to-whatsapp-50/20 backdrop-blur-xl rounded-3xl border border-white/70 shadow-soft-lift p-6 sm:p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            {mode === 'login' ? 'Business Login' : mode === 'forgot' ? 'Forgot Password' : 'Enter Your Code'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {mode === 'login'
              ? 'Log in with the phone number you listed'
              : mode === 'forgot'
                ? 'We will send a one-time code to your WhatsApp'
                : 'Enter the code we sent and choose a new password'}
          </p>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4 animate-fade-in">{error}</p>
        )}
        {notice && (
          <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 mb-4 animate-fade-in">{notice}</p>
        )}

        {mode === 'login' && (
          <form onSubmit={doLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">WhatsApp Phone Number</label>
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
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                placeholder="Your password"
              />
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-[15px] font-semibold">
              {busy ? 'Logging in...' : 'Log In'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('forgot'); setError(''); setNotice('') }}
              className="w-full text-center text-xs text-whatsapp-700 hover:underline font-medium"
            >
              Forgot your password?
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={doForgot} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">WhatsApp Phone Number</label>
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
            <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-[15px] font-semibold">
              {busy ? 'Sending...' : 'Send Code'}
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-center text-xs text-text-secondary hover:text-text-primary font-medium"
            >
              Back to login
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={doReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">One-Time Code</label>
              <input
                type="text"
                required
                value={otp}
                onChange={e => setOtp(e.target.value)}
                className="input-field text-center tracking-[0.4em] text-lg"
                placeholder="••••••"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="input-field"
                placeholder="At least 6 characters"
              />
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-[15px] font-semibold">
              {busy ? 'Resetting...' : 'Set New Password'}
            </button>
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="w-full text-center text-xs text-text-secondary hover:text-text-primary font-medium"
            >
              Resend code
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <p className="text-xs text-text-secondary">
            New here?{' '}
            <Link href="/list" className="text-whatsapp-700 font-semibold hover:underline">
              List your business
            </Link>
            {' '}to create your account.
          </p>
        </div>
      </div>
    </div>
  )
}