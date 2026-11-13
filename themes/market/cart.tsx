'use client';

// Market cart — a self-contained variant of the wa.directory order cart. The
// compiled WhatsApp order text mirrors lib/order-message.ts exactly; context,
// storage and drawer styling live inside the theme so it never touches host
// state. The localStorage key (wad-cart-<slug>) is the documented exception
// to the theme's no-global-state rule.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ThemeItem } from './types';

interface CartBusiness {
  slug: string;
  name: string;
  digits: string;
  voiceOnly: boolean;
}

interface OrderLine {
  name: string;
  qty: number;
  price: number | null;
}

interface CompiledOrder {
  text: string;
  lines: string[];
  total: number | null;
}

interface CartEntry {
  item: ThemeItem;
  qty: number;
}

interface BusinessCart {
  business: CartBusiness;
  counts: Record<string, number>;
  items: ThemeItem[];
  qtyOf: (id: string) => number;
  add: (item: ThemeItem) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  note: string;
  setNote: (note: string) => void;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}

const MAX_LINES = 25;
const MAX_TEXT = 1200;
const NOTE_MAX = 140;
const MAX_QTY = 99;

const CartContext = createContext<BusinessCart | null>(null);

function isPriced(item: ThemeItem): boolean {
  return item.price_type === 'fixed' && item.price != null;
}

function money(v: number): string {
  const rounded = Math.round(v * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function compileOrder(input: {
  businessName: string;
  lines: OrderLine[];
  note?: string | null;
}): CompiledOrder {
  const name = input.businessName?.trim() || 'the shop';
  const note = input.note?.trim();

  const lines = input.lines
    .filter((l) => l.qty > 0)
    .slice(0, MAX_LINES)
    .map((l, i) => {
      const price = l.price != null ? ` — $${money(l.price)}` : '';
      return `${i + 1}. ${l.name.split('\n')[0].slice(0, 60)} ×${l.qty}${price}`;
    });

  const known = input.lines.filter((l) => l.qty > 0 && l.price != null);
  const total = known.length ? known.reduce((s, l) => s + (l.price || 0) * l.qty, 0) : null;

  const out: string[] = [];
  out.push(`🧺 *Order — ${name}*`);
  out.push(...lines.map((s) => s.slice(0, 90)));
  if (total != null) out.push(`*Total: $${money(total)}*`);
  if (note) out.push(`📝 Note: ${note.slice(0, NOTE_MAX)}`);
  out.push('(sent via WA Directory)');

  let text = out.join('\n');
  if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT - 1) + '…';
  return { text, lines, total };
}

function orderWaHref(digits: string, order: string): string {
  const clean = digits.replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(order)}`;
}

const WA_ICON =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.898 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z';

export function CartProvider({
  business,
  children,
}: {
  business: CartBusiness;
  children: ReactNode;
}) {
  const [map, setMap] = useState<Record<string, CartEntry>>({});
  const [note, setNote] = useState('');
  const [isOpen, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`wad-cart-${business.slug}`);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        const next: Record<string, CartEntry> = {};
        if (parsed && typeof parsed === 'object') {
          for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
            const entry = value as CartEntry | null;
            if (!entry || typeof entry !== 'object') continue;
            const item = entry.item;
            const qty = Number(entry.qty);
            if (
              !item ||
              typeof item !== 'object' ||
              typeof item.id !== 'string' ||
              typeof item.name !== 'string' ||
              !Number.isFinite(qty)
            ) {
              continue;
            }
            next[id] = { item, qty: Math.max(1, Math.min(MAX_QTY, Math.round(qty))) };
          }
        }
        if (Object.keys(next).length > 0) setMap(next);
      }
    } catch {
      // Corrupt or unavailable storage: start with an empty cart
    }
    setHydrated(true);
  }, [business.slug]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(`wad-cart-${business.slug}`, JSON.stringify(map));
    } catch {
      // Storage full or blocked: the cart still works in memory
    }
  }, [map, hydrated, business.slug]);

  const add = useCallback((item: ThemeItem) => {
    setMap((prev) => {
      const qty = Math.min(MAX_QTY, (prev[item.id]?.qty || 0) + 1);
      return { ...prev, [item.id]: { item, qty } };
    });
    setOpen(true);
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setMap((prev) => {
      if (qty <= 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      const entry = prev[id];
      if (!entry) return prev;
      return { ...prev, [id]: { item: entry.item, qty: Math.min(MAX_QTY, Math.round(qty)) } };
    });
  }, []);

  const remove = useCallback((id: string) => setQty(id, 0), [setQty]);

  const clear = useCallback(() => {
    setMap({});
    setNote('');
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const entries = useMemo(() => Object.values(map), [map]);

  const ctx = useMemo<BusinessCart>(
    () => ({
      business,
      counts: Object.fromEntries(entries.map((e) => [e.item.id, e.qty])),
      items: entries.map((e) => e.item),
      qtyOf: (id: string) => map[id]?.qty ?? 0,
      add,
      setQty,
      remove,
      clear,
      note,
      setNote,
      isOpen,
      setOpen,
    }),
    [business, entries, map, add, setQty, remove, clear, note, isOpen],
  );

  return <CartContext.Provider value={ctx}>{children}</CartContext.Provider>;
}

function useCart(): BusinessCart {
  const ctx = useContext(CartContext);
  return (
    ctx ?? {
      business: { slug: '', name: '', digits: '', voiceOnly: false },
      counts: {},
      items: [],
      qtyOf: () => 0,
      add: () => undefined,
      setQty: () => undefined,
      remove: () => undefined,
      clear: () => undefined,
      note: '',
      setNote: () => undefined,
      isOpen: false,
      setOpen: () => undefined,
    }
  );
}

export function AddToCartButton({ item }: { item: ThemeItem }): ReactNode {
  const cart = useCart();
  const inCart = cart.qtyOf(item.id);
  return (
    <button type="button" className="market-add" onClick={() => cart.add(item)}>
      {inCart > 0 ? `In cart ×${inCart}` : '+ Add'}
    </button>
  );
}

export function CartBar(): ReactNode {
  const cart = useCart();
  const chosen = cart.items.filter((i) => cart.qtyOf(i.id) > 0);
  if (chosen.length === 0) return null;
  const count = chosen.reduce((s, i) => s + cart.qtyOf(i.id), 0);
  const lines: OrderLine[] = chosen.map((i) => ({
    name: i.name,
    qty: cart.qtyOf(i.id),
    price: isPriced(i) ? i.price : null,
  }));
  const total = lines.every((l) => l.price != null)
    ? lines.reduce((s, l) => s + (l.price || 0) * l.qty, 0)
    : null;
  return (
    <button
      type="button"
      className="market-cartbar"
      onClick={() => cart.setOpen(true)}
      aria-label={`View cart: ${count} item${count === 1 ? '' : 's'}`}
    >
      <span className="market-cartbar__info">
        🧺 {count} item{count === 1 ? '' : 's'}
        {total != null ? <b> · ${money(total)}</b> : null}
      </span>
      <span className="market-cartbar__view">View cart →</span>
    </button>
  );
}

export function CartDrawer(): ReactNode {
  const cart = useCart();
  if (!cart.isOpen) return null;
  const chosen = cart.items.filter((i) => cart.qtyOf(i.id) > 0);
  const lines: OrderLine[] = chosen.map((i) => ({
    name: i.name,
    qty: cart.qtyOf(i.id),
    price: isPriced(i) ? i.price : null,
  }));
  const compiled = compileOrder({ businessName: cart.business.name, lines, note: cart.note });
  const hasUnpriced = lines.some((l) => l.price == null);
  const sendHref = cart.business.voiceOnly ? '' : orderWaHref(cart.business.digits, compiled.text);

  return (
    <div className="market-cartdrawer" role="dialog" aria-modal="true" aria-label="Your order">
      <div className="market-cartdrawer__overlay" onClick={() => cart.setOpen(false)} />
      <div className="market-cartdrawer__panel">
        <div className="market-cartdrawer__head">
          <div>
            <h3 className="market-cartdrawer__title">Your order 🧺</h3>
            <p>{cart.business.name}</p>
          </div>
          <button
            type="button"
            className="market-cartdrawer__close"
            onClick={() => cart.setOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {chosen.length === 0 ? (
          <p className="market-cartdrawer__empty">Your cart is empty — add items from the shelves.</p>
        ) : (
          <>
            <ul className="market-cartdrawer__list">
              {chosen.map((item) => (
                <li className="market-cartdrawer__item" key={item.id}>
                  <div>
                    <p className="market-cartdrawer__itemname">{item.name}</p>
                    <p className="market-cartdrawer__itemprice">
                      {isPriced(item) ? `$${money(item.price ?? 0)}` : 'Price on request'}
                    </p>
                  </div>
                  <div className="market-cartdrawer__qty">
                    <button
                      type="button"
                      className="market-cartdrawer__qtybtn"
                      onClick={() => cart.setQty(item.id, cart.qtyOf(item.id) - 1)}
                      aria-label={`Remove one ${item.name}`}
                    >
                      −
                    </button>
                    <span>{cart.qtyOf(item.id)}</span>
                    <button
                      type="button"
                      className="market-cartdrawer__qtybtn market-cartdrawer__qtybtn--plus"
                      onClick={() => cart.setQty(item.id, cart.qtyOf(item.id) + 1)}
                      aria-label={`Add one more ${item.name}`}
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <label className="market-cartdrawer__notewrap">
              Note (optional)
              <input
                type="text"
                className="market-cartdrawer__note"
                value={cart.note}
                onChange={(e) => cart.setNote(e.target.value)}
                placeholder="Delivery address, time, colours…"
                maxLength={NOTE_MAX}
              />
            </label>

            {compiled.total != null ? (
              <p className="market-cartdrawer__total">Total: ${money(compiled.total)}</p>
            ) : null}
            {hasUnpriced ? (
              <p className="market-cartdrawer__unpriced">
                Some items need a quote — the shop will confirm prices and the final total.
              </p>
            ) : null}
            <p className="market-cartdrawer__unpriced">
              {cart.business.voiceOnly
                ? 'This supplier is not on WhatsApp here — call them or copy the order.'
                : 'Opens WhatsApp with your order ready — you just press send.'}
            </p>

            <div className="market-cartdrawer__actions">
              {sendHref ? (
                <a
                  className="market-cartdrawer__send"
                  href={sendHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    cart.clear();
                    cart.setOpen(false);
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d={WA_ICON} fill="currentColor" />
                  </svg>
                  Send order on WhatsApp
                </a>
              ) : (
                <button type="button" disabled className="market-cartdrawer__ghost">
                  Copy order below ⤵
                </button>
              )}
              <button
                type="button"
                className="market-cartdrawer__ghost"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(compiled.text);
                  } catch {
                    // Clipboard denied: the order stays visible below anyway
                  }
                }}
              >
                Copy order
              </button>
            </div>

            {cart.business.voiceOnly ? (
              <pre className="market-cartdrawer__pre">{compiled.text}</pre>
            ) : null}

            <button
              type="button"
              className="market-cartdrawer__ghost market-cartdrawer__ghost--clear"
              onClick={cart.clear}
            >
              Clear cart
            </button>
          </>
        )}
      </div>
    </div>
  );
}
