'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Splash from '@/components/splash'

interface FieldErrors {
  phone?: string
  password?: string
  confirm?: string
}

export default function AccountSetupPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-4 py-10"><div className="h-96 bg-gray-100 rounded-3xl animate-pulse" /></div>}>
      <AccountSetupForm />
    </Suspense>
  )
}

function AccountSetupForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') || ''
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [splash, setSplash] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  useEffect(() => {
    if (!token) setNotice('Missing edit link. Open this page from the link in your WhatsApp message.')
  }, [token])

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    const digits = phone.replace(/[^0-9]/g, '')
    if (!phone.trim()) {
      errors.phone = 'Phone number is required'
    } else if (digits.length < 9 || digits.length > 15) {
      errors.phone = 'Enter a valid phone number, e.g. +263 77 123 4567'
    }
    if (!password) {
      errors.password = 'Password is required'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    if (!confirm) {
      errors.confirm = 'Please verify your password'
    } else if (password && confirm !== password) {
      errors.confirm = 'Passwords do not match'
    }
    return errors
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      const firstKey = (['phone', 'password', 'confirm'] as const).find(k => errors[k])
      if (firstKey) {
        const el = document.getElementById(`field-${firstKey}`)
        el?.focus()
      }
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
      if (data.error?.includes('Phone number does not match')) {
        setFieldErrors({ phone: data.error })
      } else {
        setError(data.error || 'Could not create account')
      }
      return
    }
    setSplash('Creating your account...')
    router.push('/portal')
  }

  const inputClass = (hasError: boolean) =>
    `input-field pr-11 ${hasError ? 'border-red-400 focus:ring-red-200 focus:border-red-500 bg-red-50/40' : ''}`

  const toggleButton = (visible: boolean, setVisible: (v: boolean) => void) => (
    <button
      type="button"
      onClick={() => setVisible(!visible)}
      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-whatsapp-700 transition-colors"
      aria-label={visible ? 'Hide password' : 'Show password'}
    >
      {visible ? (
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
  )

  return (
    <div className="max-w-md mx-auto px-4 py-10 sm:py-16">
      {splash && <Splash label={splash} />}
      <div className="bg-gradient-to-br from-white/85 via-white/80 to-whatsapp-50/20 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-whatsapp-950/20 backdrop-blur-xl rounded-3xl border border-white/70 dark:border-gray-800 shadow-soft-lift p-6 sm:p-8">
        <div className="text-center mb-6">
          <Image
            src="/logo-square.png"
            alt="WA Directory logo"
            width={56}
            height={56}
            priority
            className="mx-auto w-14 h-14 object-contain rounded-2xl shadow-[0_6px_16px_rgba(37,211,102,0.35)] mb-3"
          />
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

        <form onSubmit={submit} noValidate className="space-y-4">
          <div>
            <label htmlFor="field-phone" className="block text-sm font-medium text-text-primary mb-1.5">
              WhatsApp Phone Number (as listed)
            </label>
            <input
              id="field-phone"
              type="tel"
              value={phone}
              onChange={e => {
                setPhone(e.target.value)
                if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: undefined }))
              }}
              className={inputClass(!!fieldErrors.phone)}
              placeholder="+263 77 123 4567"
              autoFocus
            />
            {fieldErrors.phone && (
              <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Zm-7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1-9a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1Z" clipRule="evenodd" />
                </svg>
                {fieldErrors.phone}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="field-password" className="block text-sm font-medium text-text-primary mb-1.5">Password</label>
            <div className="relative">
              <input
                id="field-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value)
                  if (fieldErrors.password || fieldErrors.confirm) setFieldErrors(prev => ({ ...prev, password: undefined, confirm: undefined }))
                }}
                className={inputClass(!!fieldErrors.password)}
                placeholder="At least 6 characters"
              />
              {toggleButton(showPassword, setShowPassword)}
            </div>
            {fieldErrors.password && (
              <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Zm-7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1-9a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1Z" clipRule="evenodd" />
                </svg>
                {fieldErrors.password}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="field-confirm" className="block text-sm font-medium text-text-primary mb-1.5">Verify Password</label>
            <div className="relative">
              <input
                id="field-confirm"
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={e => {
                  setConfirm(e.target.value)
                  if (fieldErrors.confirm) setFieldErrors(prev => ({ ...prev, confirm: undefined }))
                }}
                className={inputClass(!!fieldErrors.confirm)}
                placeholder="Repeat your password"
              />
              {toggleButton(showConfirm, setShowConfirm)}
            </div>
            {fieldErrors.confirm && (
              <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Zm-7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1-9a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1Z" clipRule="evenodd" />
                </svg>
                {fieldErrors.confirm}
              </p>
            )}
          </div>
          <button type="submit" disabled={busy || !token} className="btn-primary w-full py-3 text-[15px] font-semibold flex items-center justify-center gap-2">
            {busy && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
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