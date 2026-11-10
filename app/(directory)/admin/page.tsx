'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import PortalShell, { type ShellNavGroup } from '@/components/portal/shell'
import AdminListings from '@/components/admin/admin-listings'
import AdminCategories from '@/components/admin/admin-categories'
import AdminAreas from '@/components/admin/admin-areas'
import AdminRequests from '@/components/admin/admin-requests'
import AdminAddressRequests from '@/components/admin/admin-address-requests'
import AdminBanners from '@/components/admin/admin-banners'
import AdminChats from '@/components/admin/admin-chats'
import AdminHarvest from '@/components/admin/admin-harvest'
import AdminStats from '@/components/admin/admin-stats'
import AdminRankings from '@/components/admin/admin-rankings'
import AdminSubscriptions from '@/components/admin/admin-subscriptions'
import AdminAccounts from '@/components/admin/admin-accounts'
import AdminNameContests from '@/components/admin/admin-name-contests'
import AdminPaymentEvents from '@/components/admin/admin-payment-events'
import AdminOrganizations from '@/components/admin/admin-organizations'
import AdminNeeds from '@/components/admin/admin-needs'
import AdminTranscripts from '@/components/admin/admin-transcripts'
import AdminSettings from '@/components/admin/admin-settings'
import AdminHelp from '@/components/admin/admin-help'
import AdminAiUsage from '@/components/admin/admin-ai-usage'
import AdminAiControls from '@/components/admin/admin-ai-controls'
import AnalyticsPanel from '@/components/portal/analytics-view'
import Splash from '@/components/splash'

type Tab =
  | 'stats'
  | 'analytics'
  | 'ai-usage'
  | 'ai-controls'
  | 'listings'
  | 'categories'
  | 'areas'
  | 'requests'
  | 'addresses'
  | 'banners'
  | 'rankings'
  | 'payments'
  | 'subscriptions'
  | 'accounts'
  | 'organizations'
  | 'contests'
  | 'chats'
  | 'harvest'
  | 'transcripts'
  | 'needs'
  | 'settings'
  | 'help'

const NAV: ShellNavGroup[] = [
  {
    title: 'Overview',
    items: [
      { id: 'stats', label: 'Statistics', icon: 'dashboard' },
      { id: 'analytics', label: 'Analytics', icon: 'analytics' },
      { id: 'ai-usage', label: 'AI Usage', icon: 'analytics' },
      { id: 'ai-controls', label: 'AI Controls', icon: 'settings' },
    ],
  },
  {
    title: 'Directory',
    items: [
      { id: 'listings', label: 'Listings', icon: 'listings' },
      { id: 'categories', label: 'Categories', icon: 'categories' },
      { id: 'areas', label: 'Areas', icon: 'areas' },
      { id: 'requests', label: 'Requests', icon: 'requests' },
      { id: 'addresses', label: 'Addresses', icon: 'addresses' },
      { id: 'banners', label: 'Banners', icon: 'banners' },
      { id: 'rankings', label: 'Rankings & Bids', icon: 'ranking' },
    ],
  },
  {
    title: 'Conversations',
    items: [
      { id: 'chats', label: 'Chats', icon: 'chats' },
      { id: 'harvest', label: 'Harvest Data', icon: 'harvest' },
      { id: 'transcripts', label: 'Transcripts', icon: 'transcripts' },
    ],
  },
  {
    title: 'Revenue',
    items: [
      { id: 'payments', label: 'Payment Events', icon: 'payments' },
      { id: 'subscriptions', label: 'Subscriptions', icon: 'subscriptions' },
    ],
  },
  {
    title: 'People',
    items: [
      { id: 'accounts', label: 'Accounts', icon: 'accounts' },
      { id: 'organizations', label: 'Organizations', icon: 'organizations' },
      { id: 'contests', label: 'Name Contests', icon: 'contests' },
      { id: 'needs', label: 'Needs & Digest', icon: 'needs' },
    ],
  },
  {
    title: 'System',
    items: [
      { id: 'settings', label: 'Settings', icon: 'settings' },
      { id: 'help', label: 'Help & Support', icon: 'help' },
    ],
  },
]

const FLUSH_TABS: Tab[] = ['chats', 'harvest', 'analytics', 'ai-usage']

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('stats')
  const [harvestPhone, setHarvestPhone] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  async function logout() {
    if (loggingOut) return
    setLoggingOut(true)
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin-login')
  }

  return (
    <>
      {loggingOut && <Splash label="Logging out..." />}
      <PortalShell
        brand="WA Directory"
        eyebrow="Directory Administration"
        subtitle="Review listings, conversations and training data."
        nav={NAV}
        activeId={tab}
        onNavigate={id => setTab(id as Tab)}
        fullBleed={FLUSH_TABS.includes(tab)}
        flush={FLUSH_TABS.includes(tab)}
        actions={
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="btn-secondary flex h-8 items-center gap-1.5 px-2.5 text-[11px] font-semibold"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        }
        footer={
          <div className="flex items-center gap-2 rounded-lg bg-whatsapp-50/80 px-2.5 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-whatsapp-500" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-whatsapp-800">Logged in</p>
              <p className="truncate text-[9.5px] text-text-secondary">Admin session</p>
            </div>
          </div>
        }
      >
        {tab === 'stats' && <AdminStats />}
        {tab === 'analytics' && (
          <AnalyticsPanel
            endpoint="/api/admin/analytics"
            title="Directory analytics"
            subtitle="Conversation volume, search demand and response performance across all businesses."
          />
        )}
        {tab === 'ai-usage' && <AdminAiUsage />}
        {tab === 'ai-controls' && <AdminAiControls />}
        {tab === 'listings' && <AdminListings />}
        {tab === 'rankings' && <AdminRankings />}
        {tab === 'payments' && <AdminPaymentEvents />}
        {tab === 'subscriptions' && <AdminSubscriptions />}
        {tab === 'accounts' && <AdminAccounts />}
        {tab === 'organizations' && <AdminOrganizations />}
        {tab === 'categories' && <AdminCategories />}
        {tab === 'areas' && <AdminAreas />}
        {tab === 'requests' && <AdminRequests />}
        {tab === 'addresses' && <AdminAddressRequests />}
        {tab === 'banners' && <AdminBanners />}
        {tab === 'chats' && (
          <AdminChats
            onHarvest={phone => {
              setHarvestPhone(phone)
              setTab('harvest')
            }}
          />
        )}
        {tab === 'harvest' && <AdminHarvest initialPhone={harvestPhone || undefined} />}
        {tab === 'needs' && <AdminNeeds />}
        {tab === 'transcripts' && <AdminTranscripts />}
        {tab === 'settings' && <AdminSettings />}
        {tab === 'contests' && <AdminNameContests />}
        {tab === 'help' && <AdminHelp onGo={id => setTab(id as Tab)} />}
      </PortalShell>
    </>
  )
}
