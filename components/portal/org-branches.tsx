'use client'

import Link from 'next/link'
import type { Business } from '@/types'

export interface BranchRow {
  id: string
  name: string
  slug: string | null
  city: string
  area: string
  phone: string
  isHq: boolean
  branchLabel: string
  verified: boolean
  views7d: number
  chats7d: number
  lifetimeViews: number
}

export default function OrgBranches({ orgName, branches, totals }: {
  orgName: string
  branches: BranchRow[]
  totals: { views: number; chats: number }
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Branches — {orgName}</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Organization-wide controls. Open any branch to manage its ranking, billing and settings — branch managers only ever see their own branch.
        </p>
      </div>

      {/* Org totals */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-whatsapp-200 bg-gradient-to-br from-whatsapp-50 to-white p-4 shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">Profile views (7 days)</p>
          <p className="text-2xl font-extrabold text-whatsapp-700 mt-1">{totals.views}</p>
          <p className="text-[11px] text-text-secondary">All locations combined</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">WhatsApp clicks (7 days)</p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{totals.chats}</p>
          <p className="text-[11px] text-text-secondary">All locations combined</p>
        </div>
      </div>

      {/* Branch table */}
      <div className="space-y-2.5">
        {branches.map(b => (
          <div
            key={b.id}
            className={`rounded-2xl border p-4 shadow-card ${
              b.isHq ? 'bg-gradient-to-br from-whatsapp-50/80 to-white border-whatsapp-300' : 'bg-white border-gray-200/80'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-text-primary truncate">
                    {b.name}
                    {b.branchLabel ? ` · ${b.branchLabel}` : ''}
                  </p>
                  {b.isHq && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wide bg-whatsapp-500 text-white rounded-full px-2 py-0.5">
                      HQ
                    </span>
                  )}
                  {b.verified && (
                    <span className="text-[10px] font-semibold text-whatsapp-700">✓ Verified</span>
                  )}
                </div>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  {[b.area, b.city].filter(Boolean).join(', ') || 'Location not set'} · {b.phone}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  href={`/portal/ranking?branch=${b.id}`}
                  className="h-8 px-3 rounded-xl text-[11px] font-semibold bg-whatsapp-500 text-white flex items-center hover:bg-whatsapp-600 transition-colors"
                >
                  Promote
                </Link>
                <Link
                  href={`/portal/billing?branch=${b.id}`}
                  className="h-8 px-3 rounded-xl text-[11px] font-semibold bg-white border border-gray-200 text-text-secondary flex items-center hover:bg-surface transition-colors"
                >
                  Billing
                </Link>
                <Link
                  href={`/portal/conversations?branch=${b.id}`}
                  className="h-8 px-3 rounded-xl text-[11px] font-semibold bg-white border border-gray-200 text-text-secondary flex items-center hover:bg-surface transition-colors"
                >
                  Chats
                </Link>
                {b.slug && (
                  <Link
                    href={`/business/${b.slug}`}
                    className="h-8 px-3 rounded-xl text-[11px] font-semibold bg-white border border-gray-200 text-text-secondary flex items-center hover:bg-surface transition-colors"
                  >
                    Profile
                  </Link>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-100">
              <p className="text-[11px] text-text-secondary">
                <b className="text-text-primary text-xs">{b.views7d}</b> views · 7d
              </p>
              <p className="text-[11px] text-text-secondary">
                <b className="text-text-primary text-xs">{b.chats7d}</b> WhatsApp clicks · 7d
              </p>
              <p className="text-[11px] text-text-secondary">
                <b className="text-text-primary text-xs">{b.lifetimeViews}</b> lifetime views
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface/60 border border-gray-200/70 rounded-2xl p-4">
        <p className="text-xs text-text-secondary leading-relaxed">
          <b className="text-text-primary">Adding a new branch:</b> list it as a normal business (or ask the admin to add it), then have the admin link it to {orgName}.
          Each branch gets its own login on its own phone number — branch managers never see HQ or other branches.
        </p>
      </div>
    </div>
  )
}
