'use client'

// S18 customer cart: floated bar + checkout drawer, scoped to ONE business.
// Persisted in localStorage under wad-cart-<slug> so a reload keeps drafts.
// Checkout compiles an order text (lib/order-message.ts) and hands the
// customer to the supplier's WhatsApp via wa.me with the order prefilled.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { compileOrderText, orderWaHref, type OrderLine } from '@/lib/order-message'

export interface CartItem {
  id: string
  name: string
  price: number | null
}

export interface CartCtx {
  items: CartItem[]
  counts: Record<string, number>
  add: (item: CartItem) => void
  remove: (id: string) => void
  setQty: (id: string, qty: number) => void
  clear: () => void
  total: number | null
  countAll: number
  open: boolean
  setOpen: (v: boolean) => void
  note: string
  setNote: (v: string) => void
  business: CartBusiness
  whatsappDigits: string
  voiceOnly: boolean
}

interface CartBusiness {
  slug: string
  name: string
  city?: string
  // WhatsApp-capable digits (business.phone or voice with whatsapp_link)
  whatsappDigits?: string
}

const NO_CART: CartCtx = {
  items: [], counts: {}, add: () => {}, remove: () => {}, setQty: () => {}, clear: () => {},
  total: null, countAll: 0, open: false, setOpen: () => {}, note: '', setNote: () => {},
  business: { slug: '', name: '' }, whatsappDigits: '', voiceOnly: true,
}

const CartContext = createContext<CartCtx>(NO_CART)

export function useBusinessCart(): CartCtx {
  return useContext(CartContext)
}

export function CartProvider({
  business,
  children,
}: {
  business: CartBusiness
  children: React.ReactNode
}) {
  const key = `wad-cart-${business.slug}`
  const [items, setItems] = useState<CartItem[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const saved = JSON.parse(raw) as { items?: CartItem[]; counts?: Record<string, number>; note?: string }
        setItems(Array.isArray(saved.items) ? saved.items : [])
        setCounts(saved.counts || {})
        setNote(saved.note || '')
      }
    } catch {
      // Corrupt cart: start fresh.
    }
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    if (!hydrated) return
    const alive = items.filter(i => (counts[i.id] || 0) > 0)
    try {
      if (!alive.length && !note) localStorage.removeItem(key)
      else localStorage.setItem(key, JSON.stringify({ items: alive, counts, note }))
    } catch {
      // Storage full/private: cart still works in-memory.
    }
  }, [items, counts, note, hydrated, key])

  const add = useCallback((item: CartItem) => {
    setItems(prev => (prev.some(p => p.id === item.id) ? prev : [...prev, item]))
    setCounts(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }))
  }, [])

  const remove = useCallback((id: string) => {
    setCounts(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const setQty = useCallback((id: string, qty: number) => {
    setCounts(prev => {
      if (qty <= 0) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: Math.min(qty, 99) }
    })
  }, [])

  const clear = useCallback(() => {
    setItems([])
    setCounts({})
    setNote('')
  }, [])

  useEffect(() => {
    setItems(prev => prev.filter(p => (counts[p.id] || 0) > 0))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts])

  const chosen = useMemo(() => items.filter(i => (counts[i.id] || 0) > 0), [items, counts])
  const countAll = chosen.reduce((s, i) => s + (counts[i.id] || 0), 0)
  const priced = chosen.filter(i => i.price != null)
  const total = chosen.length !== priced.length && chosen.length ? null : priced.reduce((s, i) => s + (i.price || 0) * (counts[i.id] || 0), 0)

  const digits = business.whatsappDigits?.replace(/\D/g, '') || ''
  const voiceOnly = !digits

  const ctx: CartCtx = {
    items, counts, add, remove, setQty, clear,
    total, countAll, open, setOpen, note, setNote,
    business, whatsappDigits: digits, voiceOnly,
  }

  return (
    <CartContext.Provider value={ctx}>
      {children}
      {countAll > 0 && <CartBar />}
    </CartContext.Provider>
  )
}

function money(v: number): string {
  const rounded = Math.round(v * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

function CartBar() {
  const cart = useBusinessCart()
  return (
    <>
      {/* Floating bar */}
      <button
        type="button"
        onClick={() => cart.setOpen(true)}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-full bg-[#111B21] text-white pl-5 pr-2 py-2 shadow-[0_6px_24px_rgba(0,0,0,0.35)] active:scale-[0.99] transition-transform"
        aria-label={`View cart: ${cart.countAll} items`}
      >
        <span className="text-sm font-bold">🧺 {cart.countAll} item{cart.countAll === 1 ? '' : 's'}</span>
        {cart.total != null && <span className="text-sm font-extrabold">$ {money(cart.total)}</span>}
        <span className="rounded-full bg-[#25D366] text-white text-sm font-extrabold px-4 py-2.5">Checkout →</span>
      </button>
      {cart.open && <CartDrawer />}
    </>
  )
}

function CartDrawer() {
  const cart = useBusinessCart()
  const lines: OrderLine[] = cart.items
    .filter(i => (cart.counts[i.id] || 0) > 0)
    .map(i => ({ name: i.name, qty: cart.counts[i.id] || 0, price: i.price }))
  const compiled = compileOrderText({
    businessName: cart.business.name,
    city: cart.business.city,
    lines,
    note: cart.note,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={() => cart.setOpen(false)} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[86vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-[#111B21]">Your order 🧺</h3>
            <p className="text-xs text-gray-500 mt-0.5">{cart.business.name}</p>
          </div>
          <button type="button" onClick={() => cart.setOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none" aria-label="Close">✕</button>
        </div>

        <div className="mt-4 divide-y divide-gray-100">
          {cart.items.filter(i => (cart.counts[i.id] || 0) > 0).map(i => (
            <div key={i.id} className="py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#111B21] truncate">{i.name}</p>
                <p className="text-xs text-gray-500">{i.price != null ? `$${money(i.price)}` : 'Price on request'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => cart.setQty(i.id, (cart.counts[i.id] || 0) - 1)} className="w-8 h-8 rounded-full border border-gray-200 text-lg font-bold text-[#111B21] active:scale-95" aria-label={`Remove one ${i.name}`}>−</button>
                <span className="w-6 text-center text-sm font-extrabold">{cart.counts[i.id]}</span>
                <button type="button" onClick={() => cart.setQty(i.id, (cart.counts[i.id] || 0) + 1)} className="w-8 h-8 rounded-full bg-[#25D366] text-white text-lg font-bold active:scale-95" aria-label={`Add one more ${i.name}`}>+</button>
              </div>
            </div>
          ))}
        </div>

        <label className="block mt-3">
          <span className="block text-xs font-bold text-gray-600 mb-1">Note (optional)</span>
          <input
            type="text"
            value={cart.note}
            onChange={(e) => cart.setNote(e.target.value)}
            placeholder="Delivery address, time, colours…"
            maxLength={140}
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm shadow-sm focus:border-[#25D366] focus:outline-none focus:ring-1 focus:ring-[#25D366]"
          />
        </label>

        {cart.total != null && (
          <p className="mt-3 text-right text-sm font-extrabold text-[#111B21]">Total: $ {money(cart.total)}</p>
        )}
        <p className="text-[11px] text-gray-400 mt-1.5">
          {cart.voiceOnly
            ? 'This supplier is not on WhatsApp here — call them or copy the order.'
            : 'Opens WhatsApp with your order ready — you just press send.'}
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2.5">
          {cart.voiceOnly ? (
            <button type="button" disabled className="rounded-2xl bg-gray-100 text-gray-400 px-5 py-3.5 font-extrabold text-[15px]">
              Copy order below ⤵
            </button>
          ) : (
            <a
              href={orderWaHref(cart.whatsappDigits, compiled.text)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { cart.clear(); cart.setOpen(false) }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-white px-5 py-3.5 font-extrabold text-[15px] hover:brightness-105 active:scale-[0.99]"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d={WA_SVG} /></svg>
              Send order on WhatsApp
            </a>
          )}
          <button
            type="button"
            onClick={async () => {
              try { await navigator.clipboard.writeText(compiled.text) } catch { /* Clipboard deny: visible below anyway */ }
            }}
            className="rounded-2xl border border-gray-200 px-5 py-3.5 font-bold text-[15px] text-[#111B21] hover:bg-gray-50"
          >
            Copy order
          </button>
        </div>

        {cart.voiceOnly && (
          <pre className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed bg-gray-50 border border-gray-100 rounded-xl p-3 text-gray-700">{compiled.text}</pre>
        )}

        <button type="button" onClick={cart.clear} className="mt-2 w-full text-center text-xs text-gray-400 hover:text-red-500">
          Clear cart
        </button>
      </div>
    </div>
  )
}

const WA_SVG = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 01 2.898 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z'

export function AddToCartChip({ item }: { item: CartItem }) {
  const cart = useBusinessCart()
  if (!cart.business.slug) return null
  const inCart = cart.counts[item.id] || 0
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        cart.add(item)
        cart.setOpen(true)
      }}
      className="inline-flex items-center gap-1 rounded-full border border-[#25D366]/40 bg-[#25D366]/10 px-3 py-1 text-xs font-bold text-[#075E54] hover:bg-[#25D366]/20 transition-colors"
    >
      {inCart > 0 ? `In cart ×${inCart}` : '+ Add'}
    </button>
  )
}
