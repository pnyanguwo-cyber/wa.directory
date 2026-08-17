'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Splash from '@/components/splash'

type Mode = 'login' | 'otp' | 'verify' | 'forgot' | 'reset'

const SPINNER = (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [splash, setSplash] = useState('')
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
    setSplash('Signing you in...')
    router.push('/portal')
  }

  async function doSendCode(e: React.FormEvent) {
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
    if (mode === 'otp') setMode('verify')
    else setMode('reset')
  }

  async function doVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await fetch('/api/account/otp-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      setError(data.error || 'Could not log in')
      return
    }
    setSplash('Signing you in...')
    router.push('/portal')
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
    setSplash('Signing you in...')
    router.push('/portal')
  }

  const headings: Record<Mode, { title: string; subtitle: string }> = {
    login: { title: 'Business Login', subtitle: 'Log in with the phone number you listed' },
    otp: { title: 'Log In With a Code', subtitle: 'A free one-time code is sent to your WhatsApp' },
    verify: { title: 'Enter Your Code', subtitle: 'Type the code we sent to your WhatsApp' },
    forgot: { title: 'Forgot Password', subtitle: 'We will send a one-time code to your WhatsApp' },
    reset: { title: 'Enter Your Code', subtitle: 'Enter the code we sent and choose a new password' },
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10 sm:py-16">
      {splash && <Splash label={splash} />}
      <div className="bg-gradient-to-br from-white/85 via-white/80 to-whatsapp-50/20 backdrop-blur-xl rounded-3xl border border-white/70 shadow-soft-lift p-6 sm:p-8">
        <div className="text-center mb-6">
          <img
            src="/logo-square.png"
            alt="WA Directory logo"
            className="mx-auto w-14 h-14 object-contain rounded-2xl shadow-[0_6px_16px_rgba(37,211,102,0.35)] mb-3"
          />
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">{headings[mode].title}</h1>
          <p className="text-gray-500 text-sm mt-1">{headings[mode].subtitle}</p>
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
            <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-[15px] font-semibold flex items-center justify-center gap-2">
              {busy && SPINNER}
              {busy ? 'Logging in...' : 'Log In'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('otp'); setError(''); setNotice('') }}
              className="w-full text-center text-xs text-whatsapp-700 hover:underline font-medium"
            >
              Log in with a code instead
            </button>
            <button
              type="button"
              onClick={() => { setMode('forgot'); setError(''); setNotice('') }}
              className="w-full text-center text-xs text-text-secondary hover:text-text-primary font-medium"
            >
              Forgot your password?
            </button>
          </form>
        )}

        {(mode === 'otp' || mode === 'forgot') && (
          <form onSubmit={doSendCode} className="space-y-4">
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
            <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-[15px] font-semibold flex items-center justify-center gap-2">
              {busy && SPINNER}
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

        {mode === 'verify' && (
          <form onSubmit={doVerifyOtp} className="space-y-4">
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
            <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-[15px] font-semibold flex items-center justify-center gap-2">
              {busy && SPINNER}
              {busy ? 'Verifying...' : 'Log In'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('otp'); setOtp('') }}
              className="w-full text-center text-xs text-text-secondary hover:text-text-primary font-medium"
            >
              Resend code
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
            <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-[15px] font-semibold flex items-center justify-center gap-2">
              {busy && SPINNER}
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