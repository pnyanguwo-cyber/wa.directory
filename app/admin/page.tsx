'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminListings from '@/components/admin/admin-listings'
import AdminCategories from '@/components/admin/admin-categories'
import AdminAreas from '@/components/admin/admin-areas'
import AdminRequests from '@/components/admin/admin-requests'
import AdminBanners from '@/components/admin/admin-banners'
import AdminChatSessions from '@/components/admin/admin-chat-sessions'
import AdminStats from '@/components/admin/admin-stats'
import AdminRankings from '@/components/admin/admin-rankings'
import AdminSubscriptions from '@/components/admin/admin-subscriptions'
import AdminAccounts from '@/components/admin/admin-accounts'

type Tab = 'listings' | 'categories' | 'areas' | 'requests' | 'banners' | 'chat' | 'stats' | 'rankings' | 'subscriptions' | 'accounts'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'listings', label: 'Listings', icon: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25zM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H15.75a2.25 2.25 0 0 1-2.25-2.25v-2.25z' },
  { id: 'stats', label: 'Statistics', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125z' },
  { id: 'rankings', label: 'Rankings & Bids', icon: 'M3 13.5 9 6.75l4.5 4.5L21 3.75M21 15.75v4.5a1.5 1.5 0 0 1-1.5 1.5h-15a1.5 1.5 0 0 1-1.5-1.5v-15a1.5 1.5 0 0 1 1.5-1.5h4.5' },
  { id: 'subscriptions', label: 'Subscriptions', icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5z' },
  { id: 'accounts', label: 'Accounts', icon: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0zM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z' },
  { id: 'categories', label: 'Categories', icon: 'M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-2.25' },
  { id: 'areas', label: 'Areas', icon: 'M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0z' },
  { id: 'requests', label: 'Requests', icon: 'M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75' },
  { id: 'banners', label: 'Banners', icon: 'M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z' },
  { id: 'chat', label: 'Chat Sessions', icon: 'M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z' },
]

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('listings')

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      <div className="bg-gradient-to-br from-white/85 via-white/80 to-whatsapp-50/20 backdrop-blur-xl rounded-3xl border border-white/70 shadow-soft-lift p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-whatsapp-700">Directory Administration</span>
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5 text-xs text-whatsapp-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-whatsapp-500" />
              Logged in
            </span>
            <button
              onClick={async () => {
                await fetch('/api/admin/logout', { method: 'POST' })
                router.push('/admin-login')
              }}
              className="btn-secondary h-10 px-4 text-xs sm:text-sm font-semibold flex items-center gap-1.5"
            >
              <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`h-11 px-4 rounded-2xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'bg-whatsapp-500 text-white shadow-md'
                  : 'bg-white border border-gray-200/80 text-text-secondary hover:bg-surface'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
              </svg>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'listings' && <AdminListings />}
        {tab === 'stats' && <AdminStats />}
        {tab === 'rankings' && <AdminRankings />}
        {tab === 'subscriptions' && <AdminSubscriptions />}
        {tab === 'accounts' && <AdminAccounts />}
        {tab === 'categories' && <AdminCategories />}
        {tab === 'areas' && <AdminAreas />}
        {tab === 'requests' && <AdminRequests />}
        {tab === 'banners' && <AdminBanners />}
        {tab === 'chat' && <AdminChatSessions />}
      </div>
    </div>
  )
}