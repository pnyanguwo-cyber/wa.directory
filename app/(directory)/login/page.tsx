'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Splash from '@/components/splash'
import { broadcastSession, safeNextPath } from '@/lib/session-sync'

type Mode = 'login' | 'choose' | 'password' | 'otp' | 'verify' | 'forgot' | 'reset'
type PendingIntent = 'login' | 'send-code' | 'verify' | 'reset'

type BusinessChoice = {
  id: string
  name: string
  slug: string | null
  branchLabel: string | null
  isHq: boolean
  verified: boolean
  hasAccount: boolean
}

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
  const [choices, setChoices] = useState<BusinessChoice[]>([])
  const [pendingIntent, setPendingIntent] = useState<PendingIntent>('login')
  const [codePurpose, setCodePurpose] = useState<'login' | 'reset'>('login')
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [selectedBusinessName, setSelectedBusinessName] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  function chooseFrom(list: BusinessChoice[], intent: PendingIntent) {
    setChoices(list)
    setPendingIntent(intent)
    setError('')
    setNotice('')
    setMode('choose')
  }

  function selectBusiness(choice: BusinessChoice) {
    setSelectedBusinessId(choice.id)
    setSelectedBusinessName(choice.name)
    setChoices([])
    setPassword('')
    setError('')
    setNotice(
      choice.hasAccount
        ? ''
        : 'This listing has no password yet. Use "Log in with a code" to get a setup link on WhatsApp.'
    )
    setMode('password')
  }

  // Step 1: find every listing linked to the entered WhatsApp number. A
  // number with one listing goes straight to its password; a number with
  // several asks which business first, so the password is checked against
  // the account the user actually chose.
  async function lookupBusinesses(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch('/api/account/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not find that number')
        return
      }
      const list: BusinessChoice[] = data.businesses || []
      if (list.length === 0) {
        setError('No account found for that number. List your business first.')
        return
      }
      if (list.length === 1) {
        selectBusiness(list[0])
        return
      }
      chooseFrom(list, 'login')
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function doLogin(e?: React.FormEvent) {
    e?.preventDefault()
    if (!selectedBusinessId) {
      setMode('login')
      return
    }
    setBusy(true)
    setError('')
    setSplash('Signing you in...')
    const res = await fetch('/api/account/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password, business_id: selectedBusinessId }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      setSplash('')
      setError(data.error || 'Login failed')
      return
    }
    broadcastSession(true)
    // Return the user to the portal tab they came from (?next=), not the first tab.
    const next = safeNextPath()
    router.push(next)
    router.refresh()
  }

  async function doSendCode(e?: React.FormEvent, businessId?: string) {
    e?.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    const res = await fetch('/api/account/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, business_id: businessId || selectedBusinessId || undefined }),
    })
    const data = await res.json()
    setBusy(false)
    if (res.status === 409 && data.needsBusinessSelection) {
      chooseFrom(data.businesses || [], 'send-code')
      return
    }
    if (!res.ok) {
      setError(data.error || 'Could not send code')
      if (businessId) setMode(codePurpose === 'login' ? 'otp' : 'forgot')
      return
    }
    // No stored password yet (WhatsApp sign-up): nothing to reset, so the
    // setup link is sent instead and we stay on this screen.
    if (data.needsSetup) {
      setMode(codePurpose === 'login' ? 'otp' : 'forgot')
      setNotice(data.message || 'We sent you a link on WhatsApp to create your password.')
      return
    }
    setNotice('Code sent to your WhatsApp. It expires in 10 minutes.')
    setMode(codePurpose === 'login' ? 'verify' : 'reset')
  }

  async function doVerifyOtp(e?: React.FormEvent, businessId?: string) {
    e?.preventDefault()
    setBusy(true)
    setError('')
    setSplash('Signing you in...')
    const res = await fetch('/api/account/otp-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, business_id: businessId || selectedBusinessId || undefined }),
    })
    const data = await res.json()
    setBusy(false)
    if (res.status === 409 && data.needsBusinessSelection) {
      setSplash('')
      chooseFrom(data.businesses || [], 'verify')
      return
    }
    if (!res.ok) {
      setSplash('')
      setError(data.error || 'Could not log in')
      return
    }
    broadcastSession(true)
    const next = safeNextPath()
    router.push(next)
    router.refresh()
  }

  async function doReset(e?: React.FormEvent, businessId?: string) {
    e?.preventDefault()
    setBusy(true)
    setError('')
    setSplash('Signing you in...')
    const res = await fetch('/api/account/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        otp,
        password: newPassword,
        business_id: businessId || selectedBusinessId || undefined,
      }),
    })
    const data = await res.json()
    setBusy(false)
    if (res.status === 409 && data.needsBusinessSelection) {
      setSplash('')
      chooseFrom(data.businesses || [], 'reset')
      return
    }
    if (!res.ok) {
      setSplash('')
      setError(data.error || 'Could not reset password')
      return
    }
    broadcastSession(true)
    const next = safeNextPath()
    router.push(next)
    router.refresh()
  }

  async function chooseBusiness(choice: BusinessChoice) {
    setSelectedBusinessId(choice.id)
    setSelectedBusinessName(choice.name)
    setChoices([])
    setError('')

    if (pendingIntent === 'login') {
      selectBusiness(choice)
      return
    }
    if (pendingIntent === 'send-code') {
      setMode(codePurpose === 'login' ? 'otp' : 'forgot')
      await doSendCode(undefined, choice.id)
      return
    }
    if (pendingIntent === 'verify') {
      setMode('verify')
      await doVerifyOtp(undefined, choice.id)
      return
    }
    setMode('reset')
    await doReset(undefined, choice.id)
  }

  function cancelChoice() {
    setChoices([])
    setSelectedBusinessId('')
    setSelectedBusinessName('')
    if (pendingIntent === 'login') setMode('login')
    else if (pendingIntent === 'verify') setMode('verify')
    else if (pendingIntent === 'reset') setMode('reset')
    else setMode(codePurpose === 'login' ? 'otp' : 'forgot')
  }

  function changePhone(value: string) {
    setPhone(value)
    setSelectedBusinessId('')
    setSelectedBusinessName('')
  }

  const headings: Record<Mode, { title: string; subtitle: string }> = {
    login: { title: 'Business Login', subtitle: 'Enter the WhatsApp number linked to your listing' },
    choose: { title: 'Choose a Business', subtitle: 'This number is linked to more than one listing' },
    password: { title: 'Enter Your Password', subtitle: 'Log in to the business you selected' },
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
          <Image
            src="/logo-square.png"
            alt="WA Directory logo"
            width={56}
            height={56}
            priority
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

        {mode === 'choose' && (
          <div className="space-y-3">
            <p className="text-xs text-text-secondary leading-relaxed">
              Select the business you are logging in to. You will enter its password next.
            </p>
            <div className="space-y-2">
              {choices.map(choice => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => chooseBusiness(choice)}
                  disabled={busy}
                  className="w-full text-left rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 hover:border-whatsapp-400 hover:bg-whatsapp-50/50 transition-colors disabled:opacity-60"
                >
                  <span className="block text-sm font-bold text-text-primary">{choice.name}</span>
                  <span className="mt-0.5 block text-[11px] text-text-secondary">
                    {[
                      choice.branchLabel,
                      choice.isHq ? 'Organization HQ' : '',
                      choice.hasAccount ? 'Portal account' : 'No password yet',
                    ].filter(Boolean).join(' · ')}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={cancelChoice}
              disabled={busy}
              className="w-full text-center text-xs text-text-secondary hover:text-text-primary font-medium"
            >
              Back
            </button>
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={lookupBusinesses} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">WhatsApp Phone Number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => changePhone(e.target.value)}
                className="input-field"
                placeholder="077 379 1864 or +263 77 379 1864"
                autoComplete="tel"
                autoFocus
              />
              <p className="text-[11px] text-text-secondary mt-1">
                077…, 26377… and +26377… all work (we recognise them as the same number).
              </p>
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-[15px] font-semibold flex items-center justify-center gap-2">
              {busy && SPINNER}
              {busy ? 'Checking...' : 'Continue'}
            </button>
            <button
              type="button"
              onClick={() => { setCodePurpose('login'); setMode('otp'); setError(''); setNotice(''); setSelectedBusinessId(''); setSelectedBusinessName('') }}
              className="w-full text-center text-xs text-whatsapp-700 hover:underline font-medium"
            >
              Log in with a code instead
            </button>
          </form>
        )}

        {mode === 'password' && (
          <form onSubmit={doLogin} className="space-y-4">
            <div className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5">
              <p>Signing in to <b>{selectedBusinessName}</b></p>
              <button
                type="button"
                onClick={() => { setMode('login'); setPassword(''); setError(''); setNotice(''); setSelectedBusinessId(''); setSelectedBusinessName('') }}
                className="mt-1 text-[11px] text-text-secondary hover:text-text-primary font-medium"
              >
                Use a different number
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-11"
                  placeholder="Your password"
                  autoComplete="current-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-whatsapp-700 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-[15px] font-semibold flex items-center justify-center gap-2">
              {busy && SPINNER}
              {busy ? 'Logging in...' : 'Log In'}
            </button>
            <button
              type="button"
              onClick={() => { setCodePurpose('login'); setMode('otp'); setError(''); setNotice('') }}
              className="w-full text-center text-xs text-whatsapp-700 hover:underline font-medium"
            >
              Log in with a code instead
            </button>
            <button
              type="button"
              onClick={() => { setCodePurpose('reset'); setMode('forgot'); setError(''); setNotice('') }}
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
                onChange={e => changePhone(e.target.value)}
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
              className="w-full inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-whatsapp-500 to-whatsapp-600 text-white rounded-full px-4 py-2 text-xs font-medium shadow-sm hover:from-whatsapp-600 hover:to-whatsapp-700 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to login
            </button>
          </form>
        )}

        {mode === 'verify' && (
          <form onSubmit={doVerifyOtp} className="space-y-4">
            {selectedBusinessName && (
              <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5">
                Signing in to <b>{selectedBusinessName}</b>
              </p>
            )}
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
            {selectedBusinessName && (
              <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5">
                Resetting <b>{selectedBusinessName}</b>
              </p>
            )}
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