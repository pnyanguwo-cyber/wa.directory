'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog, adminFetch, AdminSectionHeader } from './shared'

interface BannerRow {
  id: string
  text: string
  link: string
  link_label: string
  active: boolean
  created_at: string
}

export default function AdminBanners() {
  const router = useRouter()
  const [rows, setRows] = useState<BannerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [link, setLink] = useState('')
  const [linkLabel, setLinkLabel] = useState('Learn more')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<BannerRow | null>(null)
  const [editing, setEditing] = useState<BannerRow | null>(null)
  const [editText, setEditText] = useState('')
  const [editLink, setEditLink] = useState('')
  const [editLabel, setEditLabel] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { ok, status, data } = await adminFetch('/api/admin/banners')
    if (!ok) {
      if (status === 401) router.push('/admin-login')
      return
    }
    setRows(data.banners || [])
    setLoading(false)
  }

  async function createBanner(e: React.FormEvent) {
    e.preventDefault()
    if (text.trim().length < 2) return
    setBusy(true)
    setMessage('')
    const { ok, data } = await adminFetch('/api/admin/banners', {
      method: 'POST',
      body: JSON.stringify({ text: text.trim(), link: link.trim(), link_label: linkLabel.trim() }),
    })
    setBusy(false)
    if (!ok) {
      setMessage(data?.error || 'Failed to create banner')
      return
    }
    setText('')
    setLink('')
    setLinkLabel('Learn more')
    setMessage('Banner created. Toggle it active to show it on the site.')
    load()
  }

  async function toggleActive(b: BannerRow) {
    const { ok } = await adminFetch('/api/admin/banners', {
      method: 'PATCH',
      body: JSON.stringify({ id: b.id, active: !b.active }),
    })
    if (ok) load()
  }

  function openEdit(b: BannerRow) {
    setEditing(b)
    setEditText(b.text)
    setEditLink(b.link)
    setEditLabel(b.link_label)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setBusy(true)
    const { ok, data } = await adminFetch('/api/admin/banners', {
      method: 'PATCH',
      body: JSON.stringify({ id: editing.id, text: editText.trim(), link: editLink.trim(), link_label: editLabel.trim() }),
    })
    setBusy(false)
    if (!ok) {
      setMessage(data?.error || 'Failed to save')
      return
    }
    setEditing(null)
    load()
  }

  async function removeBanner(b: BannerRow) {
    setConfirmDelete(null)
    const { ok } = await adminFetch('/api/admin/banners', {
      method: 'DELETE',
      body: JSON.stringify({ id: b.id }),
    })
    if (ok) load()
  }

  return (
    <div className="space-y-6">
      {confirmDelete && (
        <ConfirmDialog
          message={`Delete this banner? It will stop showing immediately.`}
          onConfirm={() => removeBanner(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-up border border-white">
            <h2 className="text-lg font-bold text-text-primary">Edit Banner</h2>
            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Text</label>
                <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2} className="input-field text-sm resize-none" required />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Link (optional)</label>
                <input value={editLink} onChange={e => setEditLink(e.target.value)} className="input-field text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Button Label</label>
                <input value={editLabel} onChange={e => setEditLabel(e.target.value)} className="input-field text-sm" />
              </div>
              <div className="flex gap-2.5 justify-end pt-2">
                <button type="button" onClick={() => setEditing(null)} className="btn-secondary h-10 px-4 text-xs font-semibold">Cancel</button>
                <button type="submit" disabled={busy} className="btn-primary h-10 px-5 text-xs font-semibold">{busy ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdminSectionHeader
        title="Notification Banners"
        subtitle={`${rows.filter(r => r.active).length} active of ${rows.length}. Active banners show in a strip under the navbar on every page.`}
      />

      {message && (
        <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 animate-fade-in">{message}</p>
      )}

      <form onSubmit={createBanner} className="neo-card p-4 space-y-3">
        <h3 className="text-sm font-bold text-text-primary">New Banner</h3>
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1 block">Message</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={2}
            className="input-field text-sm resize-none"
            placeholder="e.g. New: solar installers now listed in Harare!"
            required
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-text-secondary mb-1 block">Link (optional)</label>
            <input value={link} onChange={e => setLink(e.target.value)} className="input-field text-sm" placeholder="https://..." />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Button Label</label>
            <input value={linkLabel} onChange={e => setLinkLabel(e.target.value)} className="input-field text-sm" placeholder="Learn more" />
          </div>
        </div>
        <button type="submit" disabled={busy} className="btn-primary h-10 px-5 text-xs font-semibold">
          {busy ? 'Creating...' : 'Create Banner'}
        </button>
      </form>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="skeleton h-14 w-full rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-text-secondary text-sm py-10">No banners yet.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map(b => (
            <div key={b.id} className="neo-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{b.text}</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {b.link ? `${b.link_label || 'Learn more'} → ${b.link} · ` : ''}
                  {new Date(b.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(b)}
                  className={`text-xs font-semibold rounded-full px-3 py-1.5 transition-all ${
                    b.active ? 'bg-whatsapp-100 text-whatsapp-800' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {b.active ? '● Live' : '○ Off'}
                </button>
                <button onClick={() => openEdit(b)} className="text-xs font-medium text-blue-700 hover:underline">Edit</button>
                <button onClick={() => setConfirmDelete(b)} className="text-xs font-medium text-red-600 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}