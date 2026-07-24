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
      setError('Invalid password. Please try again.')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-whatsapp-100/60 via-surface to-surface flex items-center justify-center px-4 py-8">
      <div
        ref={cardRef}
        className={`w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_12px_40px_rgba(11,20,26,0.08)] border border-white/90 p-8 space-y-6 transition-all duration-500 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        } ${shake ? 'animate-shake' : ''}`}
      >
        <div className={`text-center space-y-3 ${visible ? 'animate-slide-up animate-delay-100' : 'opacity-0'}`}>
          <div className="mx-auto w-12 h-12 bg-gradient-to-tr from-whatsapp-600 via-whatsapp-500 to-emerald-400 rounded-2xl flex items-center justify-center text-white shadow-[0_6px_16px_rgba(37,211,102,0.35)]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-.47-.042-.94-.092-1.408-.15A3.003 3.003 0 0 1 12 14.502V10.6c0-1.136.847-2.1 1.98-2.193 2.092-.167 4.192-.167 6.27 0ZM3.75 6.011c0-.97.616-1.813 1.5-2.097 2.078-.167 4.178-.167 6.27 0 1.133.093 1.98 1.057 1.98 2.193v3.89c0 1.136-.847 2.1-1.98 2.193-.68.055-1.36.096-2.04.122l-2.73 2.73v-2.617c-1.133-.093-1.98-1.057-1.98-2.193V6.011Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-text-primary tracking-tight">
              WA Directory Portal
            </h1>
            <p className="text-xs font-semibold text-whatsapp-700 tracking-wider uppercase mt-0.5">
              Administrator Control Center
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className={`space-y-4 ${visible ? 'animate-slide-up animate-delay-350' : 'opacity-0'}`}>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Admin Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value)
                  if (error) setError('')
                }}
                className="input-field pl-10 text-sm"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200/60 rounded-xl text-red-600 text-xs font-medium">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full h-11 btn-primary text-sm font-semibold flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Authenticating...</span>
              </span>
            ) : (
              <span>Sign In to Admin</span>
            )}
          </button>
        </form>

        <p className={`text-center text-xs text-gray-400 ${visible ? 'animate-slide-up animate-delay-500' : 'opacity-0'}`}>
          &copy; {new Date().getFullYear()} WA Directory. Protected Portal.
        </p>
      </div>
    </div>
  )
}
