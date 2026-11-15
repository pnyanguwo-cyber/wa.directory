'use client'

/* ------------------------------------------------------------------ */
/* Atlas — High-Tech Hardware & Gadget Store Theme                     */
/*                                                                     */
/* Artistic gadget aesthetic: Cyber-slate surfaces, electric neon      */
/* accents, dynamic pointer-reactive ambient lighting, real-time      */
/* product search, category filtering, interactive Quick-Inspect      */
/* hardware drawer with live quantity steppers & WhatsApp orders,     */
/* gallery lightbox, and live store telemetry.                         */
/*                                                                     */
/* All styling scoped under [data-theme="atlas"] in ./theme.css.       */
/* No Tailwind classes in JSX. Plain <img> tags only.                  */
/* ------------------------------------------------------------------ */

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react'
import './theme.css'
import {
  SOCIAL_ICONS,
  SOCIAL_LABELS,
  Placeholder,
  StarRating,
  formatTimestamp,
  getOpenStatus,
  itemOrderHref,
  itemOrderHrefWithQty,
  itemStatus,
  money,
  safeUrl,
  socialHref,
  washStyle,
  whatsappOrderHref,
} from './lib'
import type { ThemeItem, ThemeProps } from './types'

const FALLBACK_INK = '#E6EDF3'

/* ------------------------------------------------------------------ */
/* Icons (Pure inline SVGs — zero external icon dependencies)          */
/* ------------------------------------------------------------------ */

function SearchIcon(): ReactNode {
  return (
    <svg className="atlas-svg-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M9 15A6 6 0 1 0 9 3a6 6 0 0 0 0 12zm8 2l-4.35-4.35"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloseIcon(): ReactNode {
  return (
    <svg className="atlas-svg-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5 5l10 10M15 5L5 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BoltIcon(): ReactNode {
  return (
    <svg className="atlas-svg-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M11.3 1.5L4 10.5h5.4L8.7 18.5 16 9.5h-5.4l.7-8z" />
    </svg>
  )
}

function ChipIcon(): ReactNode {
  return (
    <svg className="atlas-svg-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="5" y="5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M2 8h3M2 12h3M15 8h3M15 12h3M8 2v3M12 2v3M8 15v3M12 15v3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ShieldCheckIcon(): ReactNode {
  return (
    <svg className="atlas-svg-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2l6 2.6v4.8c0 4.2-2.8 8.1-6 9.4-3.2-1.3-6-5.2-6-9.4V4.6L10 2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 10l2 2 3.5-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function WhatsAppIcon(): ReactNode {
  return (
    <svg className="atlas-svg-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.898 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  )
}

function PhoneIcon(): ReactNode {
  return (
    <svg className="atlas-svg-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 4a1 1 0 0 1 1-1h3.2a1 1 0 0 1 1 .75l.8 3.2a1 1 0 0 1-.25.95l-1.8 1.8a12.8 12.8 0 0 0 5.2 5.2l1.8-1.8a1 1 0 0 1 .95-.25l3.2.8a1 1 0 0 1 .75 1V16a1 1 0 0 1-1 1A14 14 0 0 1 3 4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ArrowRightIcon(): ReactNode {
  return (
    <svg className="atlas-svg-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 10h12M11 5l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ArrowLeftIcon(): ReactNode {
  return (
    <svg className="atlas-svg-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M16 10H4M9 5l-5 5 5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronDownIcon(): ReactNode {
  return (
    <svg className="atlas-svg-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5 7.5l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Visual Atoms                                                        */
/* ------------------------------------------------------------------ */

function VerifiedBadge(): ReactNode {
  return (
    <span className="atlas-verified" title="Verified Hardware Merchant">
      <svg className="atlas-verified__svg" viewBox="0 0 24 24" aria-hidden="true">
        <path
          className="atlas-verified__shield"
          d="M12 2L3 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4z"
        />
        <path
          className="atlas-verified__check"
          d="M8.5 12.5l2.5 2.5 5-5"
          fill="none"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="atlas-verified__text">VERIFIED</span>
    </span>
  )
}

function SectionHead({
  eyebrow,
  title,
  lede,
  code,
}: {
  eyebrow?: string
  title: string
  lede?: string
  code?: string
}): ReactNode {
  return (
    <div className="atlas-section__head">
      <div className="atlas-section__meta">
        {eyebrow ? <span className="atlas-eyebrow">{eyebrow}</span> : null}
        {code ? <span className="atlas-tech-code">[{code}]</span> : null}
      </div>
      <h2 className="atlas-section__title">{title}</h2>
      {lede ? <p className="atlas-section__lede">{lede}</p> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Reactive Gadget Card                                                */
/* ------------------------------------------------------------------ */

function GadgetCard({
  site,
  item,
  qty,
  onQtyChange,
  onInspect,
}: {
  site: ThemeProps['site']
  item: ThemeItem
  qty: number
  onQtyChange: (id: string, newQty: number) => void
  onInspect: (item: ThemeItem) => void
}): ReactNode {
  const status = itemStatus(item)
  const isOutOfStock = item.availability_status === 'out_of_stock'
  const orderUrl = itemOrderHrefWithQty(site, item, qty)

  return (
    <article className="atlas-item">
      {/* Corner Crosshairs */}
      <span className="atlas-crosshair atlas-crosshair--tl" aria-hidden="true" />
      <span className="atlas-crosshair atlas-crosshair--tr" aria-hidden="true" />
      <span className="atlas-crosshair atlas-crosshair--bl" aria-hidden="true" />
      <span className="atlas-crosshair atlas-crosshair--br" aria-hidden="true" />

      {/* Media Frame with Hover Zoom & Quick-Inspect Trigger */}
      <div
        className="atlas-item__media"
        onClick={() => onInspect(item)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onInspect(item)
          }
        }}
        title={`Inspect ${item.name}`}
      >
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} loading="lazy" />
        ) : (
          <Placeholder label={item.name} category={item.category} tone="dark" />
        )}

        <div className="atlas-item__badge-row">
          {item.category ? <span className="atlas-chip atlas-chip--tech">{item.category}</span> : null}
          {status ? (
            <span className={`atlas-chip atlas-chip--${status.tone}`}>{status.label}</span>
          ) : (
            <span className="atlas-chip atlas-chip--ok">AVAILABLE</span>
          )}
        </div>

        <div className="atlas-item__inspect-overlay">
          <span className="atlas-item__inspect-btn">
            <SearchIcon />
            <span>QUICK INSPECT</span>
          </span>
        </div>
      </div>

      {/* Item Body */}
      <div className="atlas-item__body">
        <div className="atlas-item__header">
          <h3 className="atlas-item__name" onClick={() => onInspect(item)}>
            {item.name}
          </h3>
          <span className="atlas-item__sku">SKU: {item.id.slice(-6).toUpperCase()}</span>
        </div>

        {item.description ? <p className="atlas-item__desc">{item.description}</p> : null}
      </div>

      {/* Item Foot: Reactive Quantity Stepper & Direct WhatsApp Order */}
      <div className="atlas-item__foot">
        <div className="atlas-item__pricing">
          <span className="atlas-item__price-label">UNIT PRICE</span>
          <span className="atlas-item__price">{money(item)}</span>
        </div>

        {!site.voiceOnly && !isOutOfStock && item.price_type !== 'on_request' ? (
          <div className="atlas-stepper" aria-label="Order Quantity">
            <button
              type="button"
              className="atlas-stepper__btn"
              onClick={() => onQtyChange(item.id, Math.max(1, qty - 1))}
              disabled={qty <= 1}
              aria-label="Decrease quantity"
            >
              –
            </button>
            <span className="atlas-stepper__value">{qty}</span>
            <button
              type="button"
              className="atlas-stepper__btn"
              onClick={() => onQtyChange(item.id, Math.min(99, qty + 1))}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        ) : null}

        {orderUrl ? (
          <a
            className={`atlas-btn ${isOutOfStock ? 'atlas-btn--soft' : 'atlas-btn--cta'} atlas-item__order`}
            href={orderUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {site.voiceOnly ? (
              <>
                <PhoneIcon />
                <span>Call to Order</span>
              </>
            ) : isOutOfStock ? (
              <span>Notify on WhatsApp</span>
            ) : (
              <>
                <WhatsAppIcon />
                <span>{qty > 1 ? `Order (${qty})` : 'Order'}</span>
              </>
            )}
          </a>
        ) : null}
      </div>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* Interactive Hardware Inspector Modal (Quick View)                   */
/* ------------------------------------------------------------------ */

function HardwareInspectModal({
  site,
  item,
  qty,
  onQtyChange,
  onClose,
}: {
  site: ThemeProps['site']
  item: ThemeItem | null
  qty: number
  onQtyChange: (id: string, newQty: number) => void
  onClose: () => void
}): ReactNode {
  useEffect(() => {
    if (!item) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [item, onClose])

  if (!item) return null

  const status = itemStatus(item)
  const isOutOfStock = item.availability_status === 'out_of_stock'
  const orderUrl = itemOrderHrefWithQty(site, item, qty)
  const numericPrice = typeof item.price === 'number' ? item.price : null
  const subtotal = numericPrice !== null ? (numericPrice * qty).toFixed(2) : null

  return (
    <div
      className="atlas-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="atlas-modal-title"
      onClick={onClose}
    >
      <div className="atlas-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="atlas-modal__head">
          <div className="atlas-modal__meta">
            <span className="atlas-tech-code">HARDWARE SPECIFICATION HUD</span>
            <span className="atlas-chip atlas-chip--tech">
              SYS-ID: {item.id.slice(-8).toUpperCase()}
            </span>
          </div>
          <button
            type="button"
            className="atlas-modal__close"
            onClick={onClose}
            aria-label="Close specification modal"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Modal Body */}
        <div className="atlas-modal__body">
          {/* Left: Device Imagery */}
          <div className="atlas-modal__media">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} />
            ) : (
              <Placeholder label={item.name} category={item.category} tone="dark" />
            )}
            <div className="atlas-modal__scangrid" aria-hidden="true" />
            <div className="atlas-modal__scanline" aria-hidden="true" />
          </div>

          {/* Right: Technical Specs & Reactive Order Builder */}
          <div className="atlas-modal__details">
            <div className="atlas-modal__tags">
              {item.category ? (
                <span className="atlas-chip atlas-chip--tech">{item.category}</span>
              ) : null}
              {status ? (
                <span className={`atlas-chip atlas-chip--${status.tone}`}>{status.label}</span>
              ) : null}
              <span className="atlas-chip atlas-chip--ok">
                <ShieldCheckIcon /> 12M LOCAL WARRANTY
              </span>
            </div>

            <h3 id="atlas-modal-title" className="atlas-modal__title">
              {item.name}
            </h3>

            <div className="atlas-modal__pricing-row">
              <span className="atlas-modal__price">{money(item)}</span>
              {item.price_type === 'on_request' ? (
                <span className="atlas-modal__price-sub">Custom Quote on WhatsApp</span>
              ) : (
                <span className="atlas-modal__price-sub">Tax Included · Instant Dispatch</span>
              )}
            </div>

            {item.description ? (
              <div className="atlas-modal__section">
                <h4 className="atlas-modal__section-title">ENGINEERING OVERVIEW</h4>
                <p className="atlas-modal__desc">{item.description}</p>
              </div>
            ) : null}

            {/* Hardware Telemetry Spec Grid */}
            <div className="atlas-modal__specs">
              <div className="atlas-spec-item">
                <span className="atlas-spec-item__label">AUTHENTICITY</span>
                <span className="atlas-spec-item__val">100% Genuine Sealed</span>
              </div>
              <div className="atlas-spec-item">
                <span className="atlas-spec-item__label">VERIFICATION</span>
                <span className="atlas-spec-item__val">Bench Tested in Lab</span>
              </div>
              <div className="atlas-spec-item">
                <span className="atlas-spec-item__label">FULFILLMENT</span>
                <span className="atlas-spec-item__val">Express Courier or Pickup</span>
              </div>
              <div className="atlas-spec-item">
                <span className="atlas-spec-item__label">TECH SUPPORT</span>
                <span className="atlas-spec-item__val">Direct WhatsApp Concierge</span>
              </div>
            </div>

            {/* Reactive Quantity Picker & Total */}
            {!site.voiceOnly && !isOutOfStock && subtotal !== null ? (
              <div className="atlas-modal__order-config">
                <div className="atlas-modal__stepper-row">
                  <span className="atlas-modal__stepper-label">SELECT QUANTITY:</span>
                  <div className="atlas-stepper">
                    <button
                      type="button"
                      className="atlas-stepper__btn"
                      onClick={() => onQtyChange(item.id, Math.max(1, qty - 1))}
                      disabled={qty <= 1}
                    >
                      –
                    </button>
                    <span className="atlas-stepper__value">{qty}</span>
                    <button
                      type="button"
                      className="atlas-stepper__btn"
                      onClick={() => onQtyChange(item.id, Math.min(99, qty + 1))}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="atlas-modal__subtotal-row">
                  <span>ESTIMATED ORDER TOTAL:</span>
                  <strong className="atlas-modal__total-amount">${subtotal} USD</strong>
                </div>
              </div>
            ) : null}

            {/* Order Action */}
            <div className="atlas-modal__actions">
              {orderUrl ? (
                <a
                  className="atlas-btn atlas-btn--cta atlas-modal__cta"
                  href={orderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {site.voiceOnly ? (
                    <>
                      <PhoneIcon />
                      <span>Call Tech Desk to Order</span>
                    </>
                  ) : (
                    <>
                      <WhatsAppIcon />
                      <span>
                        {qty > 1 ? `Order ${qty}x on WhatsApp` : 'Order on WhatsApp'}
                      </span>
                    </>
                  )}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Interactive Gallery Lightbox                                        */
/* ------------------------------------------------------------------ */

function GalleryLightbox({
  site,
  photos,
  activeIndex,
  onClose,
  onPrev,
  onNext,
}: {
  site: ThemeProps['site']
  photos: string[]
  activeIndex: number | null
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}): ReactNode {
  useEffect(() => {
    if (activeIndex === null) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, onClose, onPrev, onNext])

  if (activeIndex === null || !photos[activeIndex]) return null

  return (
    <div
      className="atlas-modal-backdrop atlas-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Gallery photo viewer"
      onClick={onClose}
    >
      <div className="atlas-lightbox__inner" onClick={(e) => e.stopPropagation()}>
        <div className="atlas-lightbox__bar">
          <span className="atlas-tech-code">
            PHOTO TELEMETRY // [{activeIndex + 1} OF {photos.length}]
          </span>
          <button
            type="button"
            className="atlas-lightbox__close"
            onClick={onClose}
            aria-label="Close viewer"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="atlas-lightbox__stage">
          {photos.length > 1 ? (
            <button
              type="button"
              className="atlas-lightbox__nav atlas-lightbox__nav--prev"
              onClick={onPrev}
              aria-label="Previous photo"
            >
              <ArrowLeftIcon />
            </button>
          ) : null}

          <figure className="atlas-lightbox__figure">
            <img
              src={photos[activeIndex]}
              alt={`${site.name} showcase capture ${activeIndex + 1}`}
            />
          </figure>

          {photos.length > 1 ? (
            <button
              type="button"
              className="atlas-lightbox__nav atlas-lightbox__nav--next"
              onClick={onNext}
              aria-label="Next photo"
            >
              <ArrowRightIcon />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Main Theme Component                                                */
/* ------------------------------------------------------------------ */

export default function AtlasTheme({
  site,
  orientation = 'split',
  mode = 'preview',
}: ThemeProps): ReactNode {
  const orient = orientation === 'stacked' ? 'stacked' : 'split'
  const rootRef = useRef<HTMLDivElement>(null)

  /* Dynamic screen element: pointer spotlight tracking */
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!rootRef.current) return
    const rect = rootRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    rootRef.current.style.setProperty('--atlas-pointer-x', `${x.toFixed(2)}%`)
    rootRef.current.style.setProperty('--atlas-pointer-y', `${y.toFixed(2)}%`)
  }, [])

  /* Reactive state: item order quantities */
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const handleQtyChange = useCallback((id: string, newQty: number) => {
    setQuantities((prev) => ({ ...prev, [id]: newQty }))
  }, [])

  /* Reactive state: hardware inspect drawer */
  const [activeInspectItem, setActiveInspectItem] = useState<ThemeItem | null>(null)

  /* Reactive state: gallery lightbox */
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null)

  /* Reactive state: gadget category and search filters */
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')

  /* Derive unique categories from site.items */
  const categories = useMemo(() => {
    const set = new Set<string>()
    site.items.forEach((item) => {
      if (item.category && item.category.trim()) {
        set.add(item.category.trim())
      }
    })
    return ['ALL', ...Array.from(set)]
  }, [site.items])

  /* Reactive filtered items */
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return site.items.filter((item) => {
      const matchCat =
        selectedCategory === 'ALL' ||
        (item.category && item.category.toLowerCase() === selectedCategory.toLowerCase())
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q))
      return matchCat && matchQuery
    })
  }, [site.items, selectedCategory, searchQuery])

  const orderHref = whatsappOrderHref(site)
  const openStatus = getOpenStatus(site.hours)
  const openTone = openStatus.startsWith('Open') ? 'ok' : 'off'

  /* Section anchors */
  const nav = [
    site.items.length > 0 ? { href: '#shop', label: 'Gadgets' } : null,
    site.menuServices.length > 0 ? { href: '#services', label: 'Lab Services' } : null,
    site.gallery.length > 0 ? { href: '#gallery', label: 'Hardware Lab' } : null,
    site.testimonials.length > 0 ? { href: '#reviews', label: 'Telemetry' } : null,
    site.faq.length > 0 ? { href: '#faq', label: 'Tech FAQ' } : null,
    site.hours && site.hours.length > 0 ? { href: '#hours', label: 'Hours' } : null,
    { href: '#contact', label: 'Dispatch Desk' },
  ].filter(Boolean) as { href: string; label: string }[]

  const themeVars = {
    '--atlas-head': site.fontPair.head,
    '--atlas-body': site.fontPair.body,
    '--atlas-accent': site.accent || '#00E5FF',
    '--atlas-soft': site.accentSoftBg,
    '--atlas-muted': site.accentMutedBg,
    '--atlas-glow': site.accentGlow,
    '--atlas-cta-ink': site.accentCtaText,
    '--atlas-header-bg': site.headerBg || '#080C12',
    '--atlas-header-ink': site.isHeaderDark ? '#E6EDF3' : FALLBACK_INK,
    '--atlas-hero-bg': site.heroBg || '#0B0F17',
    '--atlas-shop-bg': site.shopBg || '#080C12',
    '--atlas-shop-ink': site.isShopDark ? '#E6EDF3' : FALLBACK_INK,
    '--atlas-contact-bg': site.contactBg || '#0B0F17',
    '--atlas-contact-ink': site.contactDark ? '#E6EDF3' : FALLBACK_INK,
    '--atlas-contact-cta': site.contactCtaText,
  } as CSSProperties

  return (
    <div
      ref={rootRef}
      className="atlas-root"
      id="top"
      data-theme="atlas"
      data-mode={mode}
      style={themeVars}
      onPointerMove={handlePointerMove}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(site.jsonLd) }}
      />

      {/* ---------------------------------------------------------- */}
      {/* Dynamic Telemetry Marquee / HUD Status Bar                  */}
      {/* ---------------------------------------------------------- */}
      <div className="atlas-hud-ribbon" aria-label="Store Telemetry Feed">
        <div className="atlas-hud-ribbon__track">
          <span className="atlas-hud-ticker-item">
            <span className="atlas-led-dot atlas-led-dot--live" /> STORE STATUS:{' '}
            {openStatus || 'ONLINE & DISPATCHING'}
          </span>
          <span className="atlas-hud-ticker-item">⚡ 100% AUTHENTIC GUARANTEED</span>
          <span className="atlas-hud-ticker-item">🛡️ 12-MONTH LOCAL HARDWARE WARRANTY</span>
          <span className="atlas-hud-ticker-item">📦 SAME-DAY HARARE EXPRESS DISPATCH</span>
          <span className="atlas-hud-ticker-item">💬 DIRECT WHATSAPP TECH CONCIERGE</span>
          <span className="atlas-hud-ticker-item">🔧 BENCH-TESTED BEFORE DISPATCH</span>
          {/* Loop duplicates for smooth infinite ticker */}
          <span className="atlas-hud-ticker-item" aria-hidden="true">
            <span className="atlas-led-dot atlas-led-dot--live" /> STORE STATUS:{' '}
            {openStatus || 'ONLINE & DISPATCHING'}
          </span>
          <span className="atlas-hud-ticker-item" aria-hidden="true">
            ⚡ 100% AUTHENTIC GUARANTEED
          </span>
          <span className="atlas-hud-ticker-item" aria-hidden="true">
            🛡️ 12-MONTH LOCAL HARDWARE WARRANTY
          </span>
          <span className="atlas-hud-ticker-item" aria-hidden="true">
            📦 SAME-DAY HARARE EXPRESS DISPATCH
          </span>
          <span className="atlas-hud-ticker-item" aria-hidden="true">
            💬 DIRECT WHATSAPP TECH CONCIERGE
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Header                                                      */}
      {/* ---------------------------------------------------------- */}
      <header className="atlas-header">
        <div className="atlas-header__inner">
          <a className="atlas-brand" href="#top">
            {site.logoUrl ? (
              <img className="atlas-brand__logo" src={site.logoUrl} alt="" />
            ) : (
              <span className="atlas-brand__monogram">
                <span className="atlas-brand__mono-bracket">[</span>
                {site.initials}
                <span className="atlas-brand__mono-bracket">]</span>
              </span>
            )}
            <div className="atlas-brand__text">
              <span className="atlas-brand__name">{site.name}</span>
              <span className="atlas-brand__tag">HARDWARE LAB & STORE</span>
            </div>
            {site.verified ? <VerifiedBadge /> : null}
          </a>

          <nav className="atlas-nav" aria-label="Primary Navigation">
            {nav.map((link) => (
              <a key={link.href} href={link.href} className="atlas-nav__link">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="atlas-header__actions">
            {orderHref ? (
              <a
                className="atlas-btn atlas-btn--cta atlas-header__cta"
                href={orderHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                {site.voiceOnly ? (
                  <>
                    <PhoneIcon />
                    <span>Call Desk</span>
                  </>
                ) : (
                  <>
                    <WhatsAppIcon />
                    <span>WhatsApp Concierge</span>
                  </>
                )}
              </a>
            ) : null}
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------- */}
      {/* Hero (Hardware Showcase Stage)                              */}
      {/* ---------------------------------------------------------- */}
      <section
        className={`atlas-hero${site.isHeroDark ? ' atlas-hero--dark' : ''}${
          orient === 'stacked' ? ' atlas-hero--stacked' : ''
        }`}
      >
        <div className="atlas-hero__ambient" aria-hidden="true" />
        <div className="atlas-hero__inner">
          <div className="atlas-hero__content">
            <div className="atlas-hero__telemetry-badge">
              <span className="atlas-led-dot atlas-led-dot--live" />
              <span>
                {[site.category || 'GADGETS', site.city || 'STORE'].filter(Boolean).join(' // ')}
              </span>
              <span className="atlas-tech-code">NODE.01</span>
            </div>

            <h1 className="atlas-hero__title">
              {site.name}
              {site.verified ? <VerifiedBadge /> : null}
            </h1>

            {site.tagline ? <p className="atlas-hero__lede">{site.tagline}</p> : null}

            {site.reviewCount > 0 ? (
              <div className="atlas-hero__rating">
                <StarRating value={site.rating} />
                <span className="atlas-hero__rating-text">
                  <strong>{site.rating.toFixed(1)}</strong> / 5.0 ({site.reviewCount} Verified
                  Reviews)
                </span>
              </div>
            ) : null}

            <div className="atlas-hero__actions">
              {site.items.length > 0 ? (
                <a className="atlas-btn atlas-btn--cta" href="#shop">
                  <BoltIcon />
                  <span>Browse Gadgets</span>
                </a>
              ) : null}
              {orderHref ? (
                <a
                  className="atlas-btn atlas-btn--soft"
                  href={orderHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {site.voiceOnly ? (
                    <>
                      <PhoneIcon />
                      <span>Call Tech Desk</span>
                    </>
                  ) : (
                    <>
                      <WhatsAppIcon />
                      <span>Chat on WhatsApp</span>
                    </>
                  )}
                </a>
              ) : null}
            </div>

            {/* Quick Guarantees Strip */}
            <div className="atlas-hero__guarantees">
              <div className="atlas-guarantee-pill">
                <ShieldCheckIcon />
                <span>12M Local Warranty</span>
              </div>
              <div className="atlas-guarantee-pill">
                <BoltIcon />
                <span>Same-Day Dispatch</span>
              </div>
              <div className="atlas-guarantee-pill">
                <ChipIcon />
                <span>Bench Tested</span>
              </div>
            </div>
          </div>

          {/* Hero Media: High-Tech Stage Card */}
          <div className={`atlas-hero__stage${site.coverImage ? '' : ' atlas-hero__stage--bare'}`}>
            <span className="atlas-crosshair atlas-crosshair--tl" aria-hidden="true" />
            <span className="atlas-crosshair atlas-crosshair--tr" aria-hidden="true" />
            <span className="atlas-crosshair atlas-crosshair--bl" aria-hidden="true" />
            <span className="atlas-crosshair atlas-crosshair--br" aria-hidden="true" />

            <div className="atlas-hero__media">
              {site.coverImage ? (
                <>
                  <img src={site.coverImage} alt={site.name} loading="eager" />
                  <div className="atlas-hero__wash" style={washStyle(site)} aria-hidden="true" />
                  <div className="atlas-hero__scanline" aria-hidden="true" />
                </>
              ) : (
                <Placeholder label={site.name} category={site.category} tone="dark" />
              )}
            </div>

            {/* Interactive Floating HUD Badge */}
            <div className="atlas-hero__hud-tag">
              <span className="atlas-hud-tag__icon">
                <ChipIcon />
              </span>
              <div className="atlas-hud-tag__info">
                <span className="atlas-hud-tag__label">AUTHENTIC HARDWARE</span>
                <span className="atlas-hud-tag__sub">SEALED INVENTORY</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Stats Section (Telemetry Modules)                           */}
      {/* ---------------------------------------------------------- */}
      {site.stats.length > 0 ? (
        <section className="atlas-section atlas-section--stats">
          <div className="atlas-stats">
            {site.stats.map((stat) => (
              <div className="atlas-stat" key={stat.label}>
                <span className="atlas-crosshair atlas-crosshair--tl" aria-hidden="true" />
                <span className="atlas-crosshair atlas-crosshair--tr" aria-hidden="true" />
                <span className="atlas-stat__value">{stat.value}</span>
                <span className="atlas-stat__label">{stat.label}</span>
                <span className="atlas-stat__indicator" aria-hidden="true" />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Shop Section (The Gadget Showcase Console)                  */}
      {/* ---------------------------------------------------------- */}
      {site.items.length > 0 ? (
        <section
          id="shop"
          className={`atlas-section atlas-section--shop${
            site.isShopDark ? ' atlas-shop--dark' : ''
          }`}
        >
          <div className="atlas-shop-header-row">
            <SectionHead
              eyebrow="GADGET CATALOG"
              code="SYS.INVENTORY"
              title="Explore Hardware & Gear"
              lede="Every device is individually inspected and ready for instant WhatsApp order."
            />

            {/* Reactive Filter & Search Console */}
            <div className="atlas-filter-console">
              {/* Search Bar */}
              <div className="atlas-search-box">
                <SearchIcon />
                <input
                  type="text"
                  className="atlas-search-input"
                  placeholder="Search gadgets, specs, gear..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Filter gadgets by keyword"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    className="atlas-search-clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search query"
                  >
                    <CloseIcon />
                  </button>
                ) : null}
              </div>

              {/* Category Pills */}
              {categories.length > 1 ? (
                <div className="atlas-category-pills" role="tablist" aria-label="Category filter">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      role="tab"
                      aria-selected={selectedCategory === cat}
                      className={`atlas-cat-btn ${
                        selectedCategory === cat ? 'atlas-cat-btn--active' : ''
                      }`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                      {cat === 'ALL' ? (
                        <span className="atlas-cat-btn__count">{site.items.length}</span>
                      ) : (
                        <span className="atlas-cat-btn__count">
                          {site.items.filter((i) => i.category === cat).length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* Results Telemetry Counter */}
          <div className="atlas-results-bar">
            <span className="atlas-results-text">
              SHOWING <strong>{filteredItems.length}</strong> OF {site.items.length} HARDWARE ITEMS
            </span>
            {searchQuery || selectedCategory !== 'ALL' ? (
              <button
                type="button"
                className="atlas-reset-filter-btn"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('ALL')
                }}
              >
                Reset Filters
              </button>
            ) : null}
          </div>

          {/* Product Grid */}
          {filteredItems.length > 0 ? (
            <div className="atlas-shop">
              {filteredItems.map((item) => (
                <GadgetCard
                  key={item.id}
                  site={site}
                  item={item}
                  qty={quantities[item.id] || 1}
                  onQtyChange={handleQtyChange}
                  onInspect={setActiveInspectItem}
                />
              ))}
            </div>
          ) : (
            <div className="atlas-empty-filter">
              <ChipIcon />
              <h3>No Gadgets Match Criteria</h3>
              <p>Try resetting the search query or selecting a different category.</p>
              <button
                type="button"
                className="atlas-btn atlas-btn--cta"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('ALL')
                }}
              >
                Clear All Filters
              </button>
            </div>
          )}

          {site.profileHref ? (
            <div className="atlas-shop__more">
              <a className="atlas-btn atlas-btn--soft" href={site.profileHref}>
                View Complete Catalog ({site.items.length} items)
              </a>
            </div>
          ) : null}
        </section>
      ) : (
        <section id="shop" className="atlas-section atlas-section--shop">
          <SectionHead
            eyebrow="INVENTORY"
            code="OFFLINE"
            title="Custom Hardware On Demand"
            lede="Currently accepting custom orders through our direct tech hotline."
          />
          <div className="atlas-empty-card">
            <p>Call or message our desk with your required hardware specifications.</p>
            {orderHref ? (
              <a className="atlas-btn atlas-btn--cta" href={orderHref}>
                {site.voiceOnly ? 'Call Tech Desk' : 'Inquire on WhatsApp'}
              </a>
            ) : null}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- */}
      {/* Services Section (Tech Lab & Support Capabilities)          */}
      {/* ---------------------------------------------------------- */}
      {site.menuServices.length > 0 ? (
        <section id="services" className="atlas-section">
          <SectionHead
            eyebrow="CAPABILITIES"
            code="LAB.SERVICES"
            title={`Technical Services by ${site.name}`}
            lede="Full-lifecycle tech concierge, diagnostics, warranty assurance and fast fulfillment."
          />
          <ul className="atlas-services">
            {site.menuServices.map((service, index) => (
              <li className="atlas-service" key={service}>
                <span className="atlas-crosshair atlas-crosshair--tl" aria-hidden="true" />
                <span className="atlas-crosshair atlas-crosshair--tr" aria-hidden="true" />
                <span className="atlas-service__num">0{index + 1}</span>
                <div className="atlas-service__content">
                  <h3 className="atlas-service__title">{service}</h3>
                  <span className="atlas-service__status">
                    <span className="atlas-led-dot" /> ACTIVE SERVICE
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Gallery Section (Interactive Hardware Lightbox)             */}
      {/* ---------------------------------------------------------- */}
      {site.gallery.length > 0 ? (
        <section id="gallery" className="atlas-section">
          <SectionHead
            eyebrow="HARDWARE LAB"
            code="MEDIA.TELEMETRY"
            title="Inside the Studio & Gear Vault"
            lede="Click any capture to inspect high-resolution hardware photography."
          />
          <div className="atlas-gallery">
            {site.gallery.map((photo, index) => (
              <figure
                className="atlas-gallery__frame"
                key={photo}
                onClick={() => setActivePhotoIndex(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setActivePhotoIndex(index)
                  }
                }}
                title={`Inspect photo ${index + 1}`}
              >
                <img src={photo} alt={`${site.name} hardware photo ${index + 1}`} loading="lazy" />
                <div className="atlas-gallery__overlay">
                  <span className="atlas-tech-code">FRAME 0{index + 1} // VIEW</span>
                </div>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Reviews Section (Verified Customer Feedback)                */}
      {/* ---------------------------------------------------------- */}
      {site.testimonials.length > 0 ? (
        <section id="reviews" className="atlas-section">
          <SectionHead
            eyebrow="COMMUNITY"
            code="REVIEWS.FEED"
            title="Verified Buyer Telemetry"
            lede="Real feedback from tech enthusiasts and clients ordering directly via WhatsApp."
          />
          <div className="atlas-reviews">
            {site.testimonials.map((review) => (
              <blockquote className="atlas-review" key={`${review.name}-${review.created_at}`}>
                <span className="atlas-crosshair atlas-crosshair--tl" aria-hidden="true" />
                <span className="atlas-crosshair atlas-crosshair--tr" aria-hidden="true" />
                <div className="atlas-review__head">
                  <StarRating value={review.rating} />
                  <span className="atlas-chip atlas-chip--ok">VERIFIED BUYER</span>
                </div>
                <p className="atlas-review__comment">“{review.comment}”</p>
                <footer className="atlas-review__foot">
                  <span className="atlas-review__name">{review.name}</span>
                  <span className="atlas-review__date">{formatTimestamp(review.created_at)}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* FAQ Section (Interactive Hardware Questions)               */}
      {/* ---------------------------------------------------------- */}
      {site.faq.length > 0 ? (
        <section id="faq" className="atlas-section">
          <SectionHead
            eyebrow="DOCUMENTATION"
            code="TECH.FAQ"
            title="Frequently Asked Questions"
            lede="Warranty details, payment methods, delivery schedules, and WhatsApp ordering."
          />
          <div className="atlas-faq">
            {site.faq.map((entry) => (
              <details className="atlas-faq__entry" key={entry.q}>
                <summary>
                  <span className="atlas-faq__question">{entry.q}</span>
                  <span className="atlas-faq__toggle" aria-hidden="true">
                    <ChevronDownIcon />
                  </span>
                </summary>
                <div className="atlas-faq__content">
                  <p>{entry.a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Hours Section (Operating Status)                            */}
      {/* ---------------------------------------------------------- */}
      {site.hours && site.hours.length > 0 ? (
        <section id="hours" className="atlas-section">
          <SectionHead
            eyebrow="AVAILABILITY"
            code="STORE.TIMINGS"
            title="Operating & Dispatch Schedule"
            lede="Orders placed after operating hours are confirmed first thing next morning."
          />
          <div className="atlas-hours">
            <div className="atlas-hours__status-row">
              <span className={`atlas-chip atlas-chip--${openTone}`}>
                <span className={`atlas-led-dot atlas-led-dot--${openTone}`} />
                {openStatus || 'Store Schedule'}
              </span>
              <span className="atlas-tech-code">TIMEZONE: AFRICA/HARARE</span>
            </div>
            <ul className="atlas-hours__list">
              {site.hours.map((entry) => (
                <li className="atlas-hours__row" key={entry.day}>
                  <span className="atlas-hours__day">{entry.day}</span>
                  <span className="atlas-hours__time">
                    {entry.open && entry.close ? `${entry.open} – ${entry.close}` : 'Closed'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Contact Section (Command Console)                           */}
      {/* ---------------------------------------------------------- */}
      <section
        id="contact"
        className={`atlas-section atlas-section--contact${
          site.contactDark ? ' atlas-contact--dark' : ''
        }`}
      >
        <SectionHead
          eyebrow="COMMUNICATIONS"
          code="DIRECT.DESK"
          title={`Connect with ${site.name}`}
          lede="Reach our hardware technicians directly for orders, tech advice, or courier tracking."
        />
        <div className="atlas-contact__card">
          <span className="atlas-crosshair atlas-crosshair--tl" aria-hidden="true" />
          <span className="atlas-crosshair atlas-crosshair--tr" aria-hidden="true" />
          <span className="atlas-crosshair atlas-crosshair--bl" aria-hidden="true" />
          <span className="atlas-crosshair atlas-crosshair--br" aria-hidden="true" />

          <ul className="atlas-contact__rows">
            {!site.voiceOnly && site.orderDigits ? (
              <li className="atlas-contact__row atlas-contact__row--highlight">
                <span className="atlas-contact__label">
                  <WhatsAppIcon /> Direct WhatsApp
                </span>
                <a
                  className="atlas-contact__value"
                  href={site.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  +{site.orderDigits}
                </a>
              </li>
            ) : null}

            {site.voicePhone || site.phoneClean ? (
              <li className="atlas-contact__row">
                <span className="atlas-contact__label">
                  <PhoneIcon /> Tech Hotline
                </span>
                <a
                  className="atlas-contact__value"
                  href={`tel:${site.voicePhone || site.phoneClean}`}
                >
                  {site.voicePhone || site.phoneClean}
                </a>
              </li>
            ) : null}

            {site.email ? (
              <li className="atlas-contact__row">
                <span className="atlas-contact__label">Email</span>
                <a className="atlas-contact__value" href={`mailto:${site.email}`}>
                  {site.email}
                </a>
              </li>
            ) : null}

            {site.showLocation && site.address ? (
              <li className="atlas-contact__row">
                <span className="atlas-contact__label">Lab Location</span>
                <a
                  className="atlas-contact__value"
                  href={site.mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {site.address}
                </a>
                <a
                  className="atlas-contact__action"
                  href={site.mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in Maps →
                </a>
              </li>
            ) : null}

            {site.website ? (
              <li className="atlas-contact__row">
                <span className="atlas-contact__label">Website</span>
                {safeUrl(site.website) ? (
                  <a
                    className="atlas-contact__value"
                    href={safeUrl(site.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {site.website}
                  </a>
                ) : (
                  <span className="atlas-contact__value">{site.website}</span>
                )}
              </li>
            ) : null}
          </ul>

          {site.socialLinks.length > 0 ? (
            <div className="atlas-contact__socials">
              <span className="atlas-tech-code">CHANNELS:</span>
              <div className="atlas-social-cluster">
                {site.socialLinks.map((link) => (
                  <a
                    key={link.key}
                    className="atlas-social"
                    href={socialHref(link.key, link.url)}
                    aria-label={SOCIAL_LABELS[link.key] ?? link.key}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d={SOCIAL_ICONS[link.key]} fill="currentColor" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Footer                                                      */}
      {/* ---------------------------------------------------------- */}
      <footer className="atlas-footer">
        <div className="atlas-footer__inner">
          <div className="atlas-footer__brand">
            <span className="atlas-footer__name">{site.name}</span>
            <span className="atlas-footer__meta">
              {[site.category, site.city].filter(Boolean).join(' · ')} // HARDWARE DIRECTORY
            </span>
          </div>

          <nav className="atlas-footer__nav" aria-label="Footer Navigation">
            {nav.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="atlas-footer__legal">
            <span>
              © {new Date().getFullYear()} {site.name}. All hardware specifications verified.
            </span>
            <span className="atlas-footer__badge">POWERED BY WA.DIRECTORY</span>
          </div>
        </div>
      </footer>

      {/* ---------------------------------------------------------- */}
      {/* Floating Reactive WhatsApp Concierge Dock                   */}
      {/* ---------------------------------------------------------- */}
      {orderHref ? (
        <aside className="atlas-float-dock" aria-label="Quick WhatsApp Concierge">
          <a
            href={orderHref}
            className="atlas-float-btn"
            target="_blank"
            rel="noopener noreferrer"
            title="Chat with Tech Support on WhatsApp"
          >
            <span className="atlas-led-dot atlas-led-dot--live" />
            <WhatsAppIcon />
            <span className="atlas-float-btn__text">Order Concierge</span>
          </a>
        </aside>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Interactive Modal: Quick Hardware Spec Inspector            */}
      {/* ---------------------------------------------------------- */}
      <HardwareInspectModal
        site={site}
        item={activeInspectItem}
        qty={activeInspectItem ? quantities[activeInspectItem.id] || 1 : 1}
        onQtyChange={handleQtyChange}
        onClose={() => setActiveInspectItem(null)}
      />

      {/* ---------------------------------------------------------- */}
      {/* Interactive Modal: Gallery Lightbox                         */}
      {/* ---------------------------------------------------------- */}
      <GalleryLightbox
        site={site}
        photos={site.gallery}
        activeIndex={activePhotoIndex}
        onClose={() => setActivePhotoIndex(null)}
        onPrev={() =>
          setActivePhotoIndex((prev) =>
            prev === null ? null : (prev - 1 + site.gallery.length) % site.gallery.length,
          )
        }
        onNext={() =>
          setActivePhotoIndex((prev) =>
            prev === null ? null : (prev + 1) % site.gallery.length,
          )
        }
      />
    </div>
  )
}
