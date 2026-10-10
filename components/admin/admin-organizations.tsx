'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch, AdminSectionHeader, ConfirmDialog } from './shared'

interface OrgBranch {
  id: string
  name: string
  slug: string | null
  phone: string
  city: string
  area: string
  is_hq: boolean
  branch_label: string
  verified: boolean
}

interface Org {
  id: string
  name: string
  slug: string | null
  created_at: string
  branches: OrgBranch[]
}

interface AllBusiness {
  id: string
  name: string
  phone: string
  city: string
  org_id: string | null
}

export default function AdminOrganizations() {
  const router = useRouter()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [businesses, setBusinesses] = useState<AllBusiness[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // create form
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [hqId, setHqId] = useState('')

  // link form (per-org)
  const [linkingOrg, setLinkingOrg] = useState<string | null>(null)
  const [linkBusinessId, setLinkBusinessId] = useState('')
  const [linkLabel, setLinkLabel] = useState('')

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const [orgsRes, listingsRes] = await Promise.all([
      adminFetch('/api/admin/organizations'),
      adminFetch('/api/admin/listings'),
    ])
    if (orgsRes.status === 401 || listingsRes.status === 401) {
      router.push('/admin-login')
      return
    }
    setOrgs(orgsRes.data?.organizations || [])
    setBusinesses(listingsRes.data?.businesses || [])
    setLoading(false)
  }

  const unlinked = useMemo(
    () => businesses.filter(b => !b.org_id),
    [businesses]
  )

  const unlinkedFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return unlinked.slice(0, 50)
    return unlinked.filter(b => b.name.toLowerCase().includes(q) || (b.phone || '').includes(q)).slice(0, 50)
  }, [unlinked, search])

  async function act(payload: Record<string, unknown>, successMsg: string) {
    setBusy(true)
    setError('')
    setMessage('')
    const { ok, status, data } = await adminFetch('/api/admin/organizations', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setBusy(false)
    if (!ok) {
      if (status === 401) router.push('/admin-login')
      setError(data?.error || 'Action failed')
      return false
    }
    setMessage(successMsg)
    await load()
    return true
  }

  async function createOrg(e: React.FormEvent) {
    e.preventDefault()
    if (await act({ action: 'create', name: newName.trim(), hqBusinessId: hqId }, 'Organization created')) {
      setShowCreate(false)
      setNewName('')
      setHqId('')
    }
  }

  return (
    <div className="space-y-5">
      <AdminSectionHeader
        title="Organizations & Branches"
        subtitle="Group listings under one HQ: the HQ portal manages every branch, branches only see themselves."
        action={
          <button
            onClick={() => setShowCreate(s => !s)}
            className="h-10 px-4 rounded-2xl bg-whatsapp-500 hover:bg-whatsapp-600 text-white text-xs font-semibold"
          >
            {showCreate ? 'Cancel' : '+ New organization'}
          </button>
        }
      />

      {message && (
        <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5">{message}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>
      )}

      {showCreate && (
        <form onSubmit={createOrg} className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-card space-y-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Organization name</label>
            <input
              className="input-field"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Zimbabwe Republic Police"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">HQ listing</label>
            <select className="input-field" value={hqId} onChange={e => setHqId(e.target.value)} required>
              <option value="">Pick the headquarters listing…</option>
              {unlinked.slice(0, 300).map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.phone})</option>
              ))}
            </select>
            <p className="text-[11px] text-text-secondary mt-1">
              The HQ listing keeps its own portal login — that account becomes the org control center.
            </p>
          </div>
          <button type="submit" disabled={busy} className="btn-primary h-10 px-5 text-xs font-semibold">
            {busy ? 'Creating…' : 'Create organization'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-text-secondary">Loading…</p>
      ) : orgs.length === 0 ? (
        <p className="text-xs text-text-secondary">No organizations yet. Create one to group HQ + branch listings.</p>
      ) : (
        <div className="space-y-3">
          {orgs.map(org => (
            <div key={org.id} className="bg-white border border-gray-200/80 rounded-2xl shadow-card overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-surface/60 border-b border-gray-100">
                <div>
                  <p className="text-sm font-bold text-text-primary">{org.name}</p>
                  <p className="text-[11px] text-text-secondary">
                    {org.branches.length} location{org.branches.length === 1 ? '' : 's'} · slug: {org.slug || '—'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setLinkingOrg(linkingOrg === org.id ? null : org.id); setLinkBusinessId(''); setLinkLabel('') }}
                    className="h-8 px-3 rounded-xl text-[11px] font-semibold bg-whatsapp-500 text-white hover:bg-whatsapp-600"
                  >
                    + Link branch
                  </button>
                  <button
                    onClick={() => setConfirmDelete(org.id)}
                    className="h-8 px-3 rounded-xl text-[11px] font-semibold bg-white border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {linkingOrg === org.id && (
                <div className="px-4 py-3 bg-whatsapp-50/50 border-b border-gray-100 space-y-2">
                  <input
                    className="input-field text-sm"
                    placeholder="Search unlinked listings by name or phone…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      className="input-field text-sm flex-1"
                      value={linkBusinessId}
                      onChange={e => setLinkBusinessId(e.target.value)}
                    >
                      <option value="">Pick a listing to link…</option>
                      {unlinkedFiltered.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.phone})</option>
                      ))}
                    </select>
                    <input
                      className="input-field text-sm sm:max-w-[180px]"
                      placeholder="Branch label (e.g. Chinhoyi)"
                      value={linkLabel}
                      onChange={e => setLinkLabel(e.target.value)}
                    />
                    <button
                      disabled={busy || !linkBusinessId}
                      onClick={async () => {
                        if (await act({ action: 'link', orgId: org.id, businessId: linkBusinessId, branchLabel: linkLabel }, 'Branch linked')) {
                          setLinkBusinessId('')
                          setLinkLabel('')
                          setSearch('')
                        }
                      }}
                      className="h-10 px-4 rounded-2xl bg-whatsapp-500 text-white text-xs font-semibold disabled:opacity-50"
                    >
                      Link
                    </button>
                  </div>
                </div>
              )}

              <div className="divide-y divide-gray-100">
                {org.branches.map(b => (
                  <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate">
                        {b.name}
                        {b.is_hq && <span className="ml-1.5 text-[9px] font-extrabold uppercase bg-whatsapp-500 text-white rounded-full px-1.5 py-0.5">HQ</span>}
                      </p>
                      <p className="text-[10px] text-text-secondary">
                        {[b.branch_label, b.area, b.city].filter(Boolean).join(' · ') || 'No label'} · {b.phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!b.is_hq && (
                        <>
                          <input
                            className="h-8 w-28 text-[11px] border border-gray-200 rounded-xl px-2"
                            defaultValue={b.branch_label}
                            placeholder="Label"
                            onBlur={e => {
                              const v = e.target.value.trim()
                              if (v !== b.branch_label) act({ action: 'set-label', businessId: b.id, branchLabel: v }, 'Label updated')
                            }}
                          />
                          <button
                            onClick={() => act({ action: 'unlink', businessId: b.id }, 'Branch unlinked')}
                            className="h-8 px-2.5 rounded-xl text-[11px] font-semibold bg-white border border-gray-200 text-text-secondary hover:bg-surface"
                          >
                            Unlink
                          </button>
                        </>
                      )}
                      {b.slug && (
                        <a
                          href={`/business/${b.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 px-2.5 rounded-xl text-[11px] font-semibold bg-white border border-gray-200 text-text-secondary hover:bg-surface inline-flex items-center"
                        >
                          View
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {org.branches.length === 0 && (
                  <p className="text-[11px] text-text-secondary px-4 py-3">No branches linked yet.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message="Delete this organization? All branches become standalone listings (their data is kept)."
          onConfirm={async () => {
            const id = confirmDelete
            setConfirmDelete(null)
            await act({ action: 'delete', orgId: id }, 'Organization deleted')
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
