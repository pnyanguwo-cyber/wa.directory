'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [shake, setShake] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    const data = await res.json()
    setSubmitting(false)

    if (data.success) {
      localStorage.setItem('admin_auth', 'true')
      sessionStorage.setItem('admin_password', password)
      router.push('/admin')
    } else if (data.error === 'Server misconfigured') {
      setError('Admin password not set on server')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    } else {
      setError('Wrong password')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f2f5] via-white to-[#e8f0fe] flex items-center justify-center px-4">
      <div
        ref={cardRef}
        className={`w-full max-w-sm bg-white rounded-2xl shadow-lg border border-gray-100 p-8 space-y-6 transition-all duration-500 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        } ${shake ? 'animate-shake' : ''}`}
      >
        <div className={`text-center space-y-3 ${visible ? 'animate-slide-up animate-delay-100' : 'opacity-0'}`}>
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-whatsapp-400 to-whatsapp-600 rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-text-primary tracking-tight">
            WA Directory
          </h1>
          <p className="text-sm text-text-secondary">
            Admin Login
          </p>
        </div>

        <div className={`${visible ? 'animate-slide-up animate-delay-200' : 'opacity-0'}`}>
          <div className="relative flex items-center justify-center">
            <div className="flex-1 border-t border-gray-100" />
            <span className="mx-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Admin</span>
            <div className="flex-1 border-t border-gray-100" />
          </div>
        </div>

        <form onSubmit={handleLogin} className={`space-y-5 ${visible ? 'animate-slide-up animate-delay-350' : 'opacity-0'}`}>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value)
                  if (error) setError('')
                }}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white placeholder:text-gray-400 focus:border-whatsapp-500 focus:ring-4 focus:ring-whatsapp-500/10 outline-none transition-all duration-200"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm font-medium">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full py-2.5 bg-whatsapp-500 hover:bg-whatsapp-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all duration-150 active:scale-[0.98] hover:shadow-lg hover:shadow-whatsapp-500/25"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </span>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <p className={`text-center text-xs text-gray-400 ${visible ? 'animate-slide-up animate-delay-500' : 'opacity-0'}`}>
          &copy; {new Date().getFullYear()} WA Directory
        </p>
      </div>
    </div>
  )
}
