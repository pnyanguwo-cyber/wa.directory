'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getClient } from '@/lib/supabase-client'
import type { Business } from '@/types'

export default function AdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [businesses, setBusinesses] = useState<Business[]>([])

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth') === 'true'
    setIsAuthenticated(auth)
    setLoading(false)
    if (!auth) router.push('/admin-login')
  }, [router])

  useEffect(() => {
    if (!isAuthenticated) return
    getClient()
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setBusinesses(data as Business[])
      })
  }, [isAuthenticated])

  const handleLogout = () => {
    localStorage.removeItem('admin_auth')
    router.push('/admin-login')
  }

  if (loading) return null
  if (!isAuthenticated) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          className="h-10 px-5 border border-gray-300 rounded-xl flex items-center gap-1.5 text-sm font-medium text-text-primary hover:bg-gray-50 active:bg-gray-100 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>

      {businesses.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-surface w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-1">No businesses listed yet</h2>
          <p className="text-text-secondary text-sm">Businesses will appear here once they are submitted</p>
        </div>
      ) : (
        <div className="space-y-3">
          {businesses.map(b => (
            <div key={b.id} className="card p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-text-primary truncate">{b.name}</h3>
                  {b.verified && (
                    <span className="badge-verified text-xs px-2 py-0.5 shrink-0">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-text-secondary">
                  <span>{b.category?.join(', ')}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span>{b.city || b.location}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!b.verified && (
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                    Pending
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
