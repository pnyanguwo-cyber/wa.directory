'use client'

export function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-slide-up border border-white">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-sm text-text-primary font-medium leading-snug">{message}</p>
        </div>
        <div className="flex gap-2.5 justify-end pt-2">
          <button onClick={onCancel} className="btn-secondary h-9 px-4 text-xs font-semibold">
            Cancel
          </button>
          <button onClick={onConfirm} className="h-9 px-4 bg-red-500 hover:bg-red-600 active:scale-95 text-white text-xs font-semibold rounded-2xl transition-all shadow-md">
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export async function adminFetch(url: string, options?: RequestInit): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  })
  let data: any = null
  try {
    data = await res.json()
  } catch {
  }
  return { ok: res.ok, status: res.status, data }
}

export function AdminSectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-text-primary">{title}</h2>
        {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}