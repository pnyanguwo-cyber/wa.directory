'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import {
  BarChart3,
  Building2,
  ClipboardList,
  CreditCard,
  FolderTree,
  Globe2,
  HelpCircle,
  Image as ImageIcon,
  Inbox,
  Landmark,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  MessageSquare,
  Network,
  QrCode,
  Receipt,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Sprout,
  Store,
  Tags,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export type ShellIcon =
  | 'dashboard'
  | 'businesses'
  | 'branches'
  | 'chats'
  | 'transcripts'
  | 'harvest'
  | 'analytics'
  | 'settings'
  | 'help'
  | 'ranking'
  | 'improve'
  | 'billing'
  | 'shop'
  | 'card'
  | 'site'
  | 'listings'
  | 'organizations'
  | 'categories'
  | 'areas'
  | 'requests'
  | 'addresses'
  | 'banners'
  | 'payments'
  | 'subscriptions'
  | 'accounts'
  | 'contests'
  | 'needs'

const ICONS: Record<ShellIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  businesses: Building2,
  branches: Network,
  chats: MessageSquare,
  transcripts: MessageCircle,
  harvest: Sprout,
  analytics: BarChart3,
  settings: Settings,
  help: HelpCircle,
  ranking: TrendingUp,
  improve: Sparkles,
  billing: Wallet,
  shop: Store,
  card: QrCode,
  site: Globe2,
  listings: Inbox,
  organizations: Landmark,
  categories: FolderTree,
  areas: MapPin,
  requests: ClipboardList,
  addresses: MapPin,
  banners: ImageIcon,
  payments: Receipt,
  subscriptions: CreditCard,
  accounts: Users,
  contests: ShieldCheck,
  needs: Send,
}

export interface ShellNavItem {
  id: string
  label: string
  icon: ShellIcon
  href?: string
  badge?: number
  badgeTone?: 'green' | 'amber' | 'red' | 'neutral'
}

export interface ShellNavGroup {
  title?: string
  items: ShellNavItem[]
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/portal' || href === '/admin') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function PortalShell({
  brand,
  eyebrow,
  subtitle,
  nav,
  activeId,
  onNavigate,
  actions,
  footer,
  children,
  fullBleed = false,
  flush,
}: {
  brand: string
  eyebrow: string
  subtitle?: string
  nav: ShellNavGroup[]
  activeId?: string
  onNavigate?: (id: string) => void
  actions?: ReactNode
  footer?: ReactNode
  children: ReactNode
  fullBleed?: boolean
  flush?: boolean
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname, activeId])

  // A tab is a new screen: start it at the top, not where the last one ended.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname, activeId])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function itemActive(item: ShellNavItem): boolean {
    if (activeId) return activeId === item.id
    return item.href ? isActive(pathname, item.href) : false
  }

  const navBody = (
    <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4" aria-label="Portal sections">
      {nav.map((group, groupIndex) => (
        <div key={group.title || groupIndex} className="space-y-0.5">
          {group.title && (
            <p className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
              {group.title}
            </p>
          )}
          {group.items.map(item => {
            const Icon = ICONS[item.icon] || LayoutDashboard
            const active = itemActive(item)
            const className = `group flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[12.5px] font-semibold transition-colors ${
              active
                ? 'bg-whatsapp-50 text-whatsapp-800'
                : 'text-text-secondary hover:bg-surface hover:text-text-primary'
            }`
            const inner = (
              <>
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors ${
                    active ? 'bg-whatsapp-500 text-white' : 'bg-transparent text-gray-400 group-hover:text-text-secondary'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="truncate">{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span
                    aria-label={`${item.badge} new`}
                    className={`ml-auto flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none tabular-nums text-white shadow-sm ${
                      item.badgeTone === 'red'
                        ? 'bg-red-600'
                        : item.badgeTone === 'amber'
                          ? 'bg-amber-500'
                          : item.badgeTone === 'neutral'
                            ? 'bg-gray-500'
                            : 'bg-whatsapp-600'
                    }`}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </>
            )
            if (item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => onNavigate?.(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={className}
                >
                  {inner}
                </Link>
              )
            }
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate?.(item.id)
                  setOpen(false)
                }}
                aria-current={active ? 'page' : undefined}
                className={className}
              >
                {inner}
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen bg-[#f6f8f7]">
      <div className={`mx-auto w-full ${fullBleed ? 'max-w-[1800px]' : 'max-w-[1680px]'} px-2.5 sm:px-4 py-2.5 sm:py-4`}>
        {/* Mobile bar */}
        <div className="mb-2.5 flex items-center gap-2.5 rounded-2xl border border-white/80 bg-white/90 px-3 py-2 shadow-card lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-text-primary"
            aria-label="Open portal navigation"
            aria-expanded={open}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-whatsapp-700">{eyebrow}</p>
            <p className="truncate text-sm font-extrabold leading-tight text-text-primary">{brand}</p>
          </div>
          {actions}
        </div>

        <div className="lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-4">
          {/* Desktop sidebar */}
          <aside className="hidden lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-2rem)] lg:flex-col lg:overflow-hidden lg:rounded-2xl lg:border lg:border-white/80 lg:bg-white/95 lg:shadow-card">
            <div className="flex items-center gap-2.5 border-b border-gray-100 px-3.5 py-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-whatsapp-500 text-white shadow-soft-glow">
                <MessageCircle className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[9.5px] font-bold uppercase tracking-[0.12em] text-whatsapp-700">{eyebrow}</p>
                <p className="truncate text-[13px] font-extrabold leading-tight text-text-primary">{brand}</p>
              </div>
            </div>
            {navBody}
            {footer && <div className="border-t border-gray-100 p-3">{footer}</div>}
          </aside>

          {/* Mobile drawer */}
          {open && (
            <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Portal navigation">
              <button
                type="button"
                className="absolute inset-0 bg-text-primary/30 backdrop-blur-[2px]"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
              />
              <div className="absolute inset-y-0 left-0 flex w-[82vw] max-w-[300px] flex-col bg-white shadow-2xl">
                <div className="flex items-center gap-2.5 border-b border-gray-100 px-3.5 py-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-whatsapp-500 text-white">
                    <MessageCircle className="h-4.5 w-4.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[9.5px] font-bold uppercase tracking-[0.12em] text-whatsapp-700">{eyebrow}</p>
                    <p className="truncate text-[13px] font-extrabold leading-tight text-text-primary">{brand}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface"
                    aria-label="Close navigation"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {navBody}
                {footer && <div className="border-t border-gray-100 p-3">{footer}</div>}
              </div>
            </div>
          )}

          <section className="min-w-0" aria-label="Portal content">
            {(subtitle || actions) && (
              <div className="mb-3 hidden items-center justify-between gap-3 lg:flex">
                <div className="min-w-0">
                  <h1 className="truncate text-[17px] font-extrabold tracking-tight text-text-primary">{brand}</h1>
                  {subtitle && <p className="truncate text-[11.5px] text-text-secondary">{subtitle}</p>}
                </div>
                {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
              </div>
            )}
            <div
              className={
                flush === undefined
                  ? pathname.includes('/conversations') || pathname.includes('/analytics')
                    ? ''
                    : 'rounded-2xl border border-white/80 bg-white/75 p-3 shadow-card sm:p-4'
                  : flush
                    ? ''
                    : 'rounded-2xl border border-white/80 bg-white/75 p-3 shadow-card sm:p-4'
              }
            >
              {children}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
