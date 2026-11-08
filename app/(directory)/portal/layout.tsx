import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPortalActor } from '@/lib/org-auth'
import { getSubscription } from '@/lib/portal'
import PortalShell, { type ShellNavGroup, type ShellNavItem } from '@/components/portal/shell'

export const dynamic = 'force-dynamic'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const actor = await getPortalActor()
  if (!actor) redirect('/login')

  const business = actor.business
  const sub = await getSubscription(business.id)
  const paid = sub?.status === 'active' && (!sub.expiresAt || new Date(sub.expiresAt) > new Date())
  const isHq = actor.role === 'org-hq'

  const nav: ShellNavGroup[] = [
    {
      title: 'Workspace',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/portal' },
        { id: 'chats', label: 'Chats', icon: 'chats', href: '/portal/conversations' },
        { id: 'analytics', label: 'Analytics', icon: 'analytics', href: '/portal/analytics' },
      ],
    },
    {
      title: 'Listing',
      items: [
        ...(isHq
          ? ([
              { id: 'branches', label: 'Branches', icon: 'branches', href: '/portal/branches' },
              { id: 'businesses', label: 'My Businesses', icon: 'businesses', href: '/portal/businesses' },
            ] as ShellNavItem[])
          : []),
        { id: 'ranking', label: 'Ranking', icon: 'ranking', href: '/portal/ranking' },
        { id: 'improve', label: 'Improve', icon: 'improve', href: '/portal/improve' },
        { id: 'site', label: 'Site', icon: 'site', href: '/portal/site' },
      ],
    },
    {
      title: 'Commerce',
      items: [
        { id: 'billing', label: 'Billing', icon: 'billing', href: '/portal/billing' },
        { id: 'shop', label: 'Shop', icon: 'shop', href: '/portal/shop' },
        { id: 'card', label: 'Card & QR', icon: 'card', href: '/portal/card' },
      ],
    },
    {
      title: 'Account',
      items: [
        { id: 'settings', label: 'Settings', icon: 'settings', href: '/portal/settings' },
        { id: 'help', label: 'Help & Support', icon: 'help', href: '/portal/help' },
      ],
    },
  ]

  const eyebrow = isHq
    ? 'Organization Portal · HQ'
    : actor.role === 'org-branch'
      ? `${actor.orgName} · Branch`
      : 'Business Portal'

  return (
    <PortalShell
      brand={business.name}
      eyebrow={eyebrow}
      subtitle={isHq ? 'HQ workspace · every branch' : paid ? 'Premium workspace' : 'Free plan workspace'}
      nav={nav}
      footer={
        <div className="rounded-xl bg-whatsapp-50/80 p-2.5">
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold text-whatsapp-800">
            <span className={`h-1.5 w-1.5 rounded-full ${paid ? 'bg-whatsapp-500' : 'bg-gray-400'}`} />
            {paid ? 'Premium active' : 'Free plan'}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-text-secondary">
            {paid ? 'Full history, chats and analytics.' : '7 days of history, 3 improvement tips.'}
          </p>
          <Link href="/portal/billing" className="mt-1.5 inline-block text-[10.5px] font-semibold text-whatsapp-700 hover:underline">
            Manage plan
          </Link>
        </div>
      }
    >
      {!business.verified && (
        <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
          <p className="flex items-center gap-2 text-[12px] font-bold text-amber-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Your listing is pending approval
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-800">
            Customers can&apos;t find you yet. An admin will review your listing shortly: you&apos;ll see it go live here.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href={`/edit?token=${business.edit_token}`}
              className="rounded-lg bg-amber-600 px-2.5 py-1.5 text-[10.5px] font-semibold text-white hover:bg-amber-700"
            >
              Edit listing
            </Link>
            <Link
              href={`/my-qr/${business.slug || business.id}`}
              className="rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[10.5px] font-semibold text-amber-800 hover:bg-amber-100"
            >
              Get your QR codes
            </Link>
          </div>
        </div>
      )}
      {children}
    </PortalShell>
  )
}
