'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
      router.push('/admin')
    } else if (data.error === 'Server misconfigured') {
      setError('Admin password not set on server — check .env.local or Vercel env vars')
    } else {
      setError('Wrong password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 -mt-8">
      <div className="w-full max-w-sm card p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center text-text-primary">
          WA Directory Admin Login
        </h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={e => {
              setPassword(e.target.value)
              if (error) setError('')
            }}
            className="input-field w-full"
            autoFocus
          />
          {error && (
            <p className="text-red-500 text-sm font-medium">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting || !password}
            className="btn-primary w-full"
          >
            {submitting ? 'Checking...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
