'use client';

/* ------------------------------------------------------------------ */
/* Market — Grand Flagship Storefront Theme                           */
/*                                                                     */
/* Cinematic full-screen cover hero, pointer-reactive ambient         */
/* lighting, multi-orb animated background, dynamic sticky header      */
/* with scroll depth progress, real-time catalogue search & category   */
/* filtering, interactive Quick-Inspect hardware modal with live       */
/* quantity steppers, photo gallery lightbox, infinite marquee ticker, */
/* live store telemetry clock, and full WhatsApp cart integration.    */
/*                                                                     */
/* Self-contained theme: all styling scoped under .market-root in      */
/* ./theme.css, all helpers in ./lib.tsx, cart in ./cart.tsx.          */
/* ------------------------------------------------------------------ */

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react';
import './theme.css';
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
} from './lib';
import { CartProvider, AddToCartButton, CartBar, CartDrawer, useCart } from './cart';
import type { ThemeItem, ThemeProps } from './types';

const FALLBACK_INK = '#FFFFFF';

/* ------------------------------------------------------------------ */
/* Pure Inline SVG Icons (Zero external dependencies)                 */
/* ------------------------------------------------------------------ */

function SearchIcon(): ReactNode {
  return (
    <svg className="market-search-box__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M9 15A6 6 0 1 0 9 3a6 6 0 0 0 0 12zm8 2l-4.35-4.35"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon(): ReactNode {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
      <path
        d="M5 5l10 10M15 5L5 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon(): ReactNode {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
      <path
        d="M5 7.5l5 5 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronLeftIcon(): ReactNode {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="18" height="18" aria-hidden="true">
      <path
        d="M12.5 15l-5-5 5-5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon(): ReactNode {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="18" height="18" aria-hidden="true">
      <path
        d="M7.5 5l5 5-5 5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowUpIcon(): ReactNode {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="18" height="18" aria-hidden="true">
      <path
        d="M10 16V4m-5 5l5-5 5 5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon(): ReactNode {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true">
      <path
        d="M10 4.5C5.5 4.5 1.7 7.6 1 10c.7 2.4 4.5 5.5 9 5.5s8.3-3.1 9-5.5c-.7-2.4-4.5-5.5-9-5.5z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function CheckIcon(): ReactNode {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
      <path
        d="M4 10.5l4 4 8-8"
        stroke="#25d366"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const WA_ICON =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.898 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z';

const CALL_ICON =
  'M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z';

/* ------------------------------------------------------------------ */
/* Visual Atoms                                                        */
/* ------------------------------------------------------------------ */

function VerifiedBadge(): ReactNode {
  return (
    <span className="market-verified" title="Verified Emporium">
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <circle className="market-verified__bg" cx="10" cy="10" r="10" />
        <path
          className="market-verified__check"
          d="M5.8 10.3l2.7 2.7L14.2 7.5"
          fill="none"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="market-verified__text">VERIFIED</span>
    </span>
  );
}

function SectionHead({
  eyebrow,
  title,
  lede,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
}): ReactNode {
  return (
    <div className="market-section__head">
      {eyebrow ? <p className="market-eyebrow">{eyebrow}</p> : null}
      <h2 className="market-section__title">{title}</h2>
      {lede ? <p className="market-section__lede">{lede}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Interactive Item Card with Quick View & Cart                       */
/* ------------------------------------------------------------------ */

function ItemCard({
  site,
  item,
  onQuickView,
}: {
  site: ThemeProps['site'];
  item: ThemeItem;
  onQuickView: (item: ThemeItem) => void;
}): ReactNode {
  const status = itemStatus(item);
  const orderHref = itemOrderHref(site, item);
  const cart = useCart();
  const inCart = cart.qtyOf(item.id);

  return (
    <article className="market-item">
      <div className="market-item__media" onClick={() => onQuickView(item)} style={{ cursor: 'pointer' }}>
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} loading="lazy" />
        ) : (
          <Placeholder label={item.name} category={item.category ?? site.category} tone="dark" />
        )}

        <div className="market-item__tags">
          {item.category ? <span className="market-chip">{item.category}</span> : null}
          {status ? (
            <span className={`market-chip market-chip--${status.tone}`}>{status.label}</span>
          ) : null}
        </div>

        {inCart > 0 ? (
          <span className="market-item__in-cart-badge">In Basket ({inCart})</span>
        ) : null}

        <button
          type="button"
          className="market-item__quickview"
          onClick={(e) => {
            e.stopPropagation();
            onQuickView(item);
          }}
          aria-label={`Quick view ${item.name}`}
        >
          <EyeIcon />
          <span>Quick View</span>
        </button>
      </div>

      <div className="market-item__body">
        <div className="market-item__info">
          <h3 className="market-item__name" onClick={() => onQuickView(item)} style={{ cursor: 'pointer' }}>
            {item.name}
          </h3>
          {item.description ? <p className="market-item__desc">{item.description}</p> : null}
        </div>

        <div className="market-item__foot">
          <div className="market-item__price-wrap">
            <span className="market-item__price-label">Price</span>
            <span className="market-item__price">{money(item)}</span>
          </div>

          <div className="market-item__action">
            {orderHref ? (
              site.voiceOnly ? (
                <a className="market-add market-add--call" href={orderHref}>
                  Call to order
                </a>
              ) : (
                <AddToCartButton item={item} />
              )
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Quick-View / Hardware Inspect Modal                                */
/* ------------------------------------------------------------------ */

function QuickViewModal({
  site,
  item,
  qty,
  onQtyChange,
  onClose,
  onAddToCart,
}: {
  site: ThemeProps['site'];
  item: ThemeItem | null;
  qty: number;
  onQtyChange: (newQty: number) => void;
  onClose: () => void;
  onAddToCart: (item: ThemeItem, quantity: number) => void;
}): ReactNode {
  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const cart = useCart();
  const status = itemStatus(item);
  const directOrderUrl = itemOrderHrefWithQty(site, item, qty);
  const numPrice = typeof item.price === 'number' ? item.price : null;
  const subtotal = numPrice !== null ? (numPrice * qty).toFixed(2) : null;

  return (
    <div className="market-modal" role="dialog" aria-modal="true" aria-label={item.name}>
      <div className="market-modal__backdrop" onClick={onClose} />
      <div className="market-modal__dialog">
        <button
          type="button"
          className="market-modal__close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <CloseIcon />
        </button>

        <div className="market-modal__body">
          <div className="market-modal__media">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} />
            ) : (
              <Placeholder label={item.name} category={item.category ?? site.category} tone="dark" />
            )}
          </div>

          <div className="market-modal__details">
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {item.category ? <span className="market-chip">{item.category}</span> : null}
              {status ? (
                <span className={`market-chip market-chip--${status.tone}`}>{status.label}</span>
              ) : null}
            </div>

            <h2 className="market-modal__title">{item.name}</h2>
            <div className="market-modal__price">{money(item)}</div>

            {item.description ? <p className="market-modal__desc">{item.description}</p> : null}

            {/* Quantity Stepper & Subtotal */}
            <div className="market-modal__stepper-wrap">
              <div>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--market-ink-muted)', fontWeight: 750 }}>
                  Quantity
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <div className="market-stepper">
                    <button
                      type="button"
                      className="market-stepper__btn"
                      onClick={() => onQtyChange(Math.max(1, qty - 1))}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="market-stepper__val">{qty}</span>
                    <button
                      type="button"
                      className="market-stepper__btn"
                      onClick={() => onQtyChange(Math.min(99, qty + 1))}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {subtotal !== null ? (
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--market-ink-muted)', fontWeight: 750 }}>
                    Estimated Total
                  </span>
                  <div style={{ fontFamily: 'var(--market-head, sans-serif)', fontSize: '1.35rem', fontWeight: 900, color: '#ffffff' }}>
                    ${subtotal}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Direct Action Buttons */}
            <div className="market-modal__actions">
              {!site.voiceOnly ? (
                <button
                  type="button"
                  className="market-btn market-btn--primary"
                  onClick={() => {
                    cart.setQty(item.id, cart.qtyOf(item.id) + qty);
                    onAddToCart(item, qty);
                    onClose();
                  }}
                >
                  <span>Add {qty} to WhatsApp Basket</span>
                </button>
              ) : null}

              {directOrderUrl ? (
                <a
                  className="market-btn market-btn--secondary"
                  href={directOrderUrl}
                  target={site.voiceOnly ? undefined : '_blank'}
                  rel="noopener noreferrer"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d={site.voiceOnly ? CALL_ICON : WA_ICON} />
                  </svg>
                  <span>{site.voiceOnly ? 'Call to order now' : `Order on WhatsApp (${qty}x)`}</span>
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Interactive Photo Gallery Lightbox                                 */
/* ------------------------------------------------------------------ */

function GalleryLightbox({
  photos,
  siteName,
  activeIndex,
  onClose,
  onPrev,
  onNext,
}: {
  photos: string[];
  siteName: string;
  activeIndex: number | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}): ReactNode {
  useEffect(() => {
    if (activeIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, onClose, onPrev, onNext]);

  if (activeIndex === null || photos.length === 0) return null;

  return (
    <div className="market-lightbox" role="dialog" aria-modal="true" aria-label="Photo Lightbox">
      <div className="market-lightbox__backdrop" onClick={onClose} />
      <button
        type="button"
        className="market-modal__close"
        onClick={onClose}
        aria-label="Close Lightbox"
        style={{ top: '1.5rem', right: '1.5rem', zIndex: 310 }}
      >
        <CloseIcon />
      </button>

      {photos.length > 1 ? (
        <>
          <button
            type="button"
            className="market-lightbox__nav-btn market-lightbox__prev"
            onClick={onPrev}
            aria-label="Previous image"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            className="market-lightbox__nav-btn market-lightbox__next"
            onClick={onNext}
            aria-label="Next image"
          >
            <ChevronRightIcon />
          </button>
        </>
      ) : null}

      <div className="market-lightbox__content">
        <img
          className="market-lightbox__img"
          src={photos[activeIndex]}
          alt={`${siteName} visual capture ${activeIndex + 1}`}
        />
        <div className="market-lightbox__caption">
          <span>{siteName} Showcase</span>
          <span>•</span>
          <span>
            {activeIndex + 1} of {photos.length}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header Cart Button Island Component                                 */
/* ------------------------------------------------------------------ */

function HeaderCartButton(): ReactNode {
  const cart = useCart();
  const totalCount = Object.values(cart.counts).reduce((sum, n) => sum + (n || 0), 0);

  return (
    <button
      type="button"
      className="market-header__cart-btn"
      onClick={() => cart.setOpen(true)}
      aria-label={`Open WhatsApp cart: ${totalCount} items`}
    >
      <span>🧺 Basket</span>
      {totalCount > 0 ? (
        <span className="market-header__cart-count">{totalCount}</span>
      ) : null}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Main Theme Component                                                */
/* ------------------------------------------------------------------ */

export default function MarketTheme({
  site,
  orientation = 'catalogue',
  mode = 'preview',
}: ThemeProps): ReactNode {
  const orient = orientation === 'stacked' ? 'stacked' : 'catalogue';
  const orderHref = whatsappOrderHref(site);
  const openStatus = getOpenStatus(site.hours);

  /* Scroll depth & sticky header state */
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('top');
  const [showScrollTop, setShowScrollTop] = useState(false);

  /* Pointer ambient lighting coordinates */
  const rootRef = useRef<HTMLDivElement>(null);
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    rootRef.current.style.setProperty('--mouse-x', `${x.toFixed(2)}%`);
    rootRef.current.style.setProperty('--mouse-y', `${y.toFixed(2)}%`);
  }, []);

  /* Scroll event listener */
  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      setScrollProgress(scrolled);
      setIsScrolled(winScroll > 60);
      setShowScrollTop(winScroll > 450);

      /* Active section detection */
      const sections = ['shop', 'services', 'gallery', 'reviews', 'faq', 'hours', 'contact'];
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && el.getBoundingClientRect().top <= 140) {
          setActiveSection(sections[i]);
          return;
        }
      }
      setActiveSection('top');
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* Real-time local time ticker */
  const [currentTime, setCurrentTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const formatted = new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'Africa/Harare',
        }).format(now);
        setCurrentTime(formatted);
      } catch {
        setCurrentTime('');
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  /* Catalogue Search, Category Filter, and Sorting */
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');

  const categories = useMemo(() => {
    const set = new Set<string>();
    site.items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set).sort();
  }, [site.items]);

  const filteredItems = useMemo(() => {
    let result = site.items.filter((item) => {
      const matchCategory =
        selectedCategory === 'ALL' || item.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSearch;
    });

    if (sortBy === 'price-asc') {
      result = [...result].sort((a, b) => (a.price ?? 999999) - (b.price ?? 999999));
    } else if (sortBy === 'price-desc') {
      result = [...result].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    } else if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [site.items, selectedCategory, searchQuery, sortBy]);

  /* Quick View Modal State */
  const [quickViewItem, setQuickViewItem] = useState<ThemeItem | null>(null);
  const [quickViewQty, setQuickViewQty] = useState(1);

  const handleOpenQuickView = useCallback((item: ThemeItem) => {
    setQuickViewItem(item);
    setQuickViewQty(1);
  }, []);

  /* Toast Notification State */
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  /* Gallery Lightbox State */
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const handleOpenLightbox = useCallback((idx: number) => {
    setLightboxIndex(idx);
  }, []);

  /* Testimonials Carousel State */
  const [activeReviewIdx, setActiveReviewIdx] = useState(0);

  /* Current day for Opening Hours table */
  const currentWeekday = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        timeZone: 'Africa/Harare',
      }).format(new Date());
    } catch {
      return '';
    }
  }, []);

  const themeVars = {
    '--market-head': site.fontPair.head,
    '--market-body': site.fontPair.body,
    '--market-accent': site.accent || '#B4531F',
    '--market-soft': site.accentSoftBg,
    '--market-muted': site.accentMutedBg,
    '--market-glow': site.accentGlow,
    '--market-cta-ink': site.accentCtaText,
    '--market-header-bg': site.headerBg,
    '--market-header-ink': site.isHeaderDark ? '#FFFFFF' : FALLBACK_INK,
    '--market-hero-bg': site.heroBg,
    '--market-shop-bg': site.shopBg,
    '--market-shop-ink': site.isShopDark ? '#FFFFFF' : FALLBACK_INK,
    '--market-contact-bg': site.contactBg,
    '--market-contact-ink': site.contactDark ? '#FFFFFF' : FALLBACK_INK,
    '--market-contact-cta': site.contactCtaText,
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className="market-root"
      id="top"
      data-theme="market"
      data-mode={mode}
      style={themeVars}
      onPointerMove={handlePointerMove}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(site.jsonLd) }}
      />

      {/* ---------------------------------------------------------- */}
      {/* Scroll Depth Progress Bar                                  */}
      {/* ---------------------------------------------------------- */}
      <div className="market-scroll-progress" aria-hidden="true">
        <div className="market-scroll-progress__bar" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Animated Ambient Background (Orbs + Spotlight + Grid)      */}
      {/* ---------------------------------------------------------- */}
      <div className="market-ambient-bg" aria-hidden="true">
        <div className="market-ambient-spotlight" />
        <div className="market-ambient-orb market-ambient-orb--1" />
        <div className="market-ambient-orb market-ambient-orb--2" />
        <div className="market-ambient-orb market-ambient-orb--3" />
        <div className="market-ambient-grid" />
      </div>

      <CartProvider
        business={{
          slug: site.slug,
          name: site.name,
          digits: site.orderDigits,
          voiceOnly: site.voiceOnly,
        }}
      >
        {/* ---------------------------------------------------------- */}
        {/* Dynamic Sticky Glassmorphism Header                        */}
        {/* ---------------------------------------------------------- */}
        <header className={`market-header${isScrolled ? ' market-header--scrolled' : ''}`}>
          <div className="market-header__inner">
            <a className="market-header__brand" href="#top">
              {site.logoUrl ? (
                <img className="market-header__logo" src={site.logoUrl} alt={site.name} />
              ) : (
                <span className="market-header__monogram">{site.initials}</span>
              )}
              <span className="market-header__name">{site.name}</span>
            </a>

            <nav className="market-header__nav" aria-label="Store Sections">
              {site.navItems.map((nav) => {
                const targetId = nav.href.replace('#', '');
                const isActive = activeSection === targetId;
                return (
                  <a
                    className={`market-header__link${isActive ? ' market-header__link--active' : ''}`}
                    href={nav.href}
                    key={nav.href}
                  >
                    {nav.label}
                  </a>
                );
              })}
            </nav>

            <div className="market-header__actions">
              {!site.voiceOnly ? <HeaderCartButton /> : null}

              {orderHref ? (
                <a
                  className="market-btn market-btn--header"
                  href={orderHref}
                  target={site.voiceOnly ? undefined : '_blank'}
                  rel="noopener noreferrer"
                >
                  {site.voiceOnly ? 'Call desk' : 'Order on WhatsApp'}
                </a>
              ) : null}
            </div>
          </div>
        </header>

        {/* ---------------------------------------------------------- */}
        {/* Full-Screen Cover Hero (Image Covers Entire Screen)        */}
        {/* ---------------------------------------------------------- */}
        <section className={`market-hero market-hero--${orient}`}>
          <div className="market-hero__backdrop">
            {site.coverImage ? (
              <>
                <img
                  className="market-hero__cover"
                  src={site.coverImage}
                  alt={site.name}
                  loading="eager"
                />
                <div
                  className="market-hero__scrim"
                  style={washStyle(site)}
                  aria-hidden="true"
                />
              </>
            ) : (
              <div className="market-hero__cover market-hero__cover--bare">
                <div className="market-hero__bare-glow" aria-hidden="true" />
                <span className="market-hero__bare-monogram">{site.initials}</span>
              </div>
            )}
          </div>

          <div className="market-hero__inner">
            <div className="market-hero__content">
              <div className="market-hero__meta">
                <span className="market-eyebrow">
                  {[site.category, site.city].filter(Boolean).join(' · ')}
                </span>
                {site.verified ? <VerifiedBadge /> : null}
                {openStatus ? (
                  <span className="market-telemetry">
                    <span className="market-telemetry__dot" />
                    <span>{openStatus}</span>
                  </span>
                ) : null}
              </div>

              <h1 className="market-hero__title">{site.name}</h1>

              {site.tagline ? <p className="market-hero__lede">{site.tagline}</p> : null}

              {site.reviewCount > 0 ? (
                <div className="market-hero__rating">
                  <StarRating value={site.rating} />
                  <span className="market-hero__rating-text">
                    <strong>{site.rating.toFixed(1)}</strong> ({site.reviewCount} customer reviews)
                  </span>
                </div>
              ) : null}

              <div className="market-hero__actions">
                {orderHref ? (
                  <a
                    className="market-btn market-btn--primary"
                    href={orderHref}
                    target={site.voiceOnly ? undefined : '_blank'}
                    rel="noopener noreferrer"
                  >
                    {site.voiceOnly ? (
                      <>
                        <svg className="market-btn__icon" viewBox="0 0 24 24" fill="currentColor">
                          <path d={CALL_ICON} />
                        </svg>
                        <span>Call to Order</span>
                      </>
                    ) : (
                      <>
                        <svg className="market-btn__icon" viewBox="0 0 24 24" fill="currentColor">
                          <path d={WA_ICON} />
                        </svg>
                        <span>Order on WhatsApp</span>
                      </>
                    )}
                  </a>
                ) : null}

                {site.items.length > 0 ? (
                  <a className="market-btn market-btn--secondary" href="#shop">
                    <span>Explore Catalogue</span>
                    <span className="market-btn__arrow" aria-hidden="true">
                      ↓
                    </span>
                  </a>
                ) : site.profileHref ? (
                  <a className="market-btn market-btn--secondary" href={site.profileHref}>
                    View Profile
                  </a>
                ) : null}
              </div>
            </div>

            {/* Scroll Indicator Prompt */}
            <a href="#shop" className="market-hero__scroll-prompt" aria-label="Scroll to catalogue">
              <span className="market-hero__scroll-text">Explore Collection</span>
              <span className="market-hero__scroll-arrow" aria-hidden="true">
                ↓
              </span>
            </a>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Infinite Looping Store Guarantees Marquee Ticker           */}
        {/* ---------------------------------------------------------- */}
        <div className="market-marquee" aria-hidden="true">
          <div className="market-marquee__track">
            <span className="market-marquee__item">
              <span className="market-marquee__icon">⚡</span> Same-Day Delivery Across Chitungwiza & Makoni
            </span>
            <span className="market-marquee__item">
              <span className="market-marquee__icon">🎨</span> Free Precision Paint Colour Matching
            </span>
            <span className="market-marquee__item">
              <span className="market-marquee__icon">🔨</span> Contractor & Builder Bulk Rates Available
            </span>
            <span className="market-marquee__item">
              <span className="market-marquee__icon">💬</span> Instant WhatsApp Ordering & Quotes
            </span>
            <span className="market-marquee__item">
              <span className="market-marquee__icon">⭐</span> 4.9 Rated by Over 60+ Satisfied Customers
            </span>
            <span className="market-marquee__item">
              <span className="market-marquee__icon">🔒</span> Verified Storefront & Genuine Materials
            </span>

            {/* Duplicate for seamless infinite loop */}
            <span className="market-marquee__item">
              <span className="market-marquee__icon">⚡</span> Same-Day Delivery Across Chitungwiza & Makoni
            </span>
            <span className="market-marquee__item">
              <span className="market-marquee__icon">🎨</span> Free Precision Paint Colour Matching
            </span>
            <span className="market-marquee__item">
              <span className="market-marquee__icon">🔨</span> Contractor & Builder Bulk Rates Available
            </span>
            <span className="market-marquee__item">
              <span className="market-marquee__icon">💬</span> Instant WhatsApp Ordering & Quotes
            </span>
            <span className="market-marquee__item">
              <span className="market-marquee__icon">⭐</span> 4.9 Rated by Over 60+ Satisfied Customers
            </span>
            <span className="market-marquee__item">
              <span className="market-marquee__icon">🔒</span> Verified Storefront & Genuine Materials
            </span>
          </div>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* Stats Strip                                                */}
        {/* ---------------------------------------------------------- */}
        {site.stats.length > 0 ? (
          <section className="market-section market-section--stats">
            <div className="market-stats">
              {site.stats.map((stat) => (
                <div className="market-stat" key={stat.label}>
                  <span className="market-stat__value">{stat.value}</span>
                  <span className="market-stat__label">{stat.label}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* Catalogue & Services Flow (Honours Orientation)           */}
        {/* ---------------------------------------------------------- */}
        {(() => {
          const shopSection =
            site.items.length > 0 ? (
              <section
                id="shop"
                className={`market-section market-section--shop${
                  site.isShopDark ? ' market-shop--dark' : ''
                }`}
              >
                <SectionHead
                  eyebrow="The Curated Collection"
                  title="From the Shelves"
                  lede="Select items to add to your order basket for seamless WhatsApp checkout."
                />

                {/* Dynamic Catalogue Console (Search, Categories, Sort) */}
                <div className="market-catalogue-console">
                  <div className="market-console__row">
                    <div className="market-search-box">
                      <SearchIcon />
                      <input
                        type="text"
                        className="market-search-box__input"
                        placeholder="Search power tools, paint, tiles, hardware..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search catalogue"
                      />
                      {searchQuery ? (
                        <button
                          type="button"
                          className="market-search-box__clear"
                          onClick={() => setSearchQuery('')}
                          aria-label="Clear search"
                        >
                          ✕
                        </button>
                      ) : null}
                    </div>

                    <div className="market-sort-box">
                      <span className="market-sort-box__label">Sort:</span>
                      <select
                        className="market-sort-box__select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        aria-label="Sort catalogue items"
                      >
                        <option value="featured">Featured Stock</option>
                        <option value="price-asc">Price: Low to High</option>
                        <option value="price-desc">Price: High to Low</option>
                        <option value="name">Product Name (A-Z)</option>
                      </select>
                    </div>
                  </div>

                  {/* Category Pills */}
                  {categories.length > 0 ? (
                    <div className="market-categories" role="tablist" aria-label="Product Categories">
                      <button
                        type="button"
                        className={`market-cat-pill${selectedCategory === 'ALL' ? ' market-cat-pill--active' : ''}`}
                        onClick={() => setSelectedCategory('ALL')}
                        role="tab"
                        aria-selected={selectedCategory === 'ALL'}
                      >
                        <span>All Products</span>
                        <span className="market-cat-pill__count">{site.items.length}</span>
                      </button>

                      {categories.map((cat) => {
                        const count = site.items.filter(
                          (i) => i.category?.toLowerCase() === cat.toLowerCase()
                        ).length;
                        const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                        return (
                          <button
                            key={cat}
                            type="button"
                            className={`market-cat-pill${isSelected ? ' market-cat-pill--active' : ''}`}
                            onClick={() => setSelectedCategory(cat)}
                            role="tab"
                            aria-selected={isSelected}
                          >
                            <span>{cat}</span>
                            <span className="market-cat-pill__count">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                {/* Items Grid */}
                {filteredItems.length > 0 ? (
                  <div className="market-items">
                    {filteredItems.map((item) => (
                      <ItemCard
                        key={item.id}
                        site={site}
                        item={item}
                        onQuickView={handleOpenQuickView}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="market-empty-state">
                    <span style={{ fontSize: '2.5rem' }}>🔍</span>
                    <h3 className="market-empty-state__title">No matching catalogue items</h3>
                    <p className="market-empty-state__desc">
                      We couldn't find anything matching &quot;{searchQuery}&quot; in the selected category.
                    </p>
                    <button
                      type="button"
                      className="market-btn market-btn--secondary"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('ALL');
                      }}
                    >
                      Reset Filters
                    </button>
                  </div>
                )}

                {site.profileHref ? (
                  <div className="market-shop__all">
                    <a className="market-btn market-btn--outline" href={site.profileHref}>
                      View Complete Range ({site.items.length} items)
                    </a>
                  </div>
                ) : null}
              </section>
            ) : null;

          const servicesSection =
            site.menuServices.length > 0 ? (
              <section id="services" className="market-section market-section--services">
                <SectionHead
                  eyebrow="Store Capabilities"
                  title="Services & Assistance"
                  lede="Expert support, bespoke requests, and dedicated customer fulfillment."
                />
                <ul className="market-services">
                  {site.menuServices.map((service, index) => (
                    <li className="market-service" key={index}>
                      <span className="market-service__num">0{index + 1}</span>
                      <div className="market-service__body">
                        <h3 className="market-service__title">{service}</h3>
                        <span className="market-service__tag">Active Store Service</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null;

          return orient === 'catalogue' ? (
            <>
              {shopSection}
              {servicesSection}
            </>
          ) : (
            <>
              {servicesSection}
              {shopSection}
            </>
          );
        })()}

        {/* ---------------------------------------------------------- */}
        {/* Gallery Showcase with Lightbox                             */}
        {/* ---------------------------------------------------------- */}
        {site.gallery.length > 0 ? (
          <section id="gallery" className="market-section market-section--gallery">
            <SectionHead
              eyebrow="Storefront Visuals"
              title="Inside the Emporium"
              lede="A glimpse of our space, fresh inventory, and daily craftsmanship. Click any frame to enlarge."
            />
            <div className="market-gallery">
              {site.gallery.map((photo, index) => (
                <figure
                  className="market-gallery__frame"
                  key={photo}
                  onClick={() => handleOpenLightbox(index)}
                  style={{ cursor: 'pointer' }}
                >
                  <img
                    src={photo}
                    alt={`${site.name} visual capture ${index + 1}`}
                    loading="lazy"
                  />
                  <figcaption className="market-gallery__caption">
                    <span>Frame 0{index + 1} • Click to Inspect</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* Customer Reviews & Testimonials Carousel                   */}
        {/* ---------------------------------------------------------- */}
        {site.testimonials.length > 0 ? (
          <section id="reviews" className="market-section market-section--reviews">
            <SectionHead
              eyebrow="Client Testimonials"
              title="What Customers Say"
              lede="Genuine reviews from patrons shopping in-store and over WhatsApp."
            />
            <div className="market-reviews">
              {site.testimonials.map((review) => (
                <figure className="market-review" key={review.comment}>
                  <div className="market-review__stars">
                    <StarRating value={review.rating} />
                  </div>
                  <blockquote className="market-review__comment">“{review.comment}”</blockquote>
                  <figcaption className="market-review__foot">
                    <span className="market-review__name">{review.name}</span>
                    <span className="market-review__date">
                      {formatTimestamp(review.created_at)}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* FAQ Accordions                                             */}
        {/* ---------------------------------------------------------- */}
        {site.faq.length > 0 ? (
          <section id="faq" className="market-section market-section--faq">
            <SectionHead
              eyebrow="Store Inquiries"
              title="Frequently Asked Questions"
              lede="Ordering on WhatsApp, delivery rates, and in-person store visits."
            />
            <div className="market-faq">
              {site.faq.map((entry) => (
                <details className="market-faq__entry" key={entry.q}>
                  <summary>
                    <span>{entry.q}</span>
                    <span className="market-faq__icon" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <div className="market-faq__body">
                    <p>{entry.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* Opening Hours Schedule with Live Telemetry Clock           */}
        {/* ---------------------------------------------------------- */}
        {site.hours && site.hours.length > 0 ? (
          <section id="hours" className="market-section market-section--hours">
            <SectionHead
              eyebrow="Availability"
              title="Opening Schedule"
              lede="Visit our store or message our team during our active trading hours."
            />
            <div className="market-hours">
              <div className="market-hours__status-bar">
                <span className="market-hours__status">
                  <span className="market-telemetry__dot" style={{ display: 'inline-block', marginRight: '6px' }} />
                  {openStatus || 'Trading Hours'}
                </span>
                <span className="market-hours__tz">
                  {currentTime ? `${currentTime} ` : ''}Harare Time
                </span>
              </div>
              <ul className="market-hours__list">
                {site.hours.map((row) => {
                  const isToday = currentWeekday.toLowerCase().startsWith(row.day.toLowerCase().slice(0, 3));
                  return (
                    <li
                      className={`market-hours__row${isToday ? ' market-hours__row--today' : ''}`}
                      key={row.day}
                    >
                      <span className="market-hours__day">
                        {row.day}
                        {isToday ? <span className="market-hours__today-badge">Today</span> : null}
                      </span>
                      <span className="market-hours__time">
                        {row.open && row.close ? `${row.open} – ${row.close}` : 'Closed'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* Contact Concierge                                          */}
        {/* ---------------------------------------------------------- */}
        <section id="contact" className="market-section market-section--contact">
          <SectionHead
            eyebrow="Get In Touch"
            title="Direct Concierge"
            lede="Questions about catalogue items, quotes, or bulk deliveries? Reach out directly."
          />
          <div className="market-contact__card">
            <ul className="market-contact__rows">
              {site.phoneClean ? (
                <li className="market-contact__row" key="phone">
                  <span className="market-contact__label">Phone / WhatsApp</span>
                  <a
                    className="market-contact__value market-contact__value--accent"
                    href={site.whatsappHref || `tel:${site.voicePhone || site.phoneClean}`}
                  >
                    {site.voiceOnly
                      ? site.voicePhone || site.phoneClean
                      : `+${site.phoneClean}`}
                  </a>
                </li>
              ) : null}
              {site.email ? (
                <li className="market-contact__row" key="email">
                  <span className="market-contact__label">Email</span>
                  <a className="market-contact__value" href={`mailto:${site.email}`}>
                    {site.email}
                  </a>
                </li>
              ) : null}
              {site.website ? (
                <li className="market-contact__row" key="website">
                  <span className="market-contact__label">Website</span>
                  {safeUrl(site.website) ? (
                    <a
                      className="market-contact__value"
                      href={safeUrl(site.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {site.website}
                    </a>
                  ) : (
                    <span className="market-contact__value">{site.website}</span>
                  )}
                </li>
              ) : null}
              {site.showLocation && site.address ? (
                <li className="market-contact__row" key="address">
                  <span className="market-contact__label">Location</span>
                  <span className="market-contact__value">{site.address}</span>
                  {site.mapsHref ? (
                    <a
                      className="market-contact__action"
                      href={site.mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open in Google Maps →
                    </a>
                  ) : null}
                </li>
              ) : null}
            </ul>

            <div className="market-contact__bottom">
              {orderHref ? (
                <a
                  className="market-btn market-btn--primary"
                  href={orderHref}
                  target={site.voiceOnly ? undefined : '_blank'}
                  rel="noopener noreferrer"
                >
                  {site.voiceOnly ? 'Call Tech Hotline' : 'Chat on WhatsApp'}
                </a>
              ) : null}

              {site.socialLinks.length > 0 ? (
                <div className="market-contact__socials">
                  {site.socialLinks.map((link) => (
                    <a
                      key={link.key}
                      className="market-social"
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
              ) : null}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Footer                                                     */}
        {/* ---------------------------------------------------------- */}
        <footer className="market-footer">
          <div className="market-footer__inner">
            <div className="market-footer__brand">
              {site.logoUrl ? (
                <img className="market-footer__logo" src={site.logoUrl} alt={site.name} />
              ) : (
                <span className="market-footer__monogram" aria-hidden="true">
                  {site.initials}
                </span>
              )}
              <div>
                <span className="market-footer__name">{site.name}</span>
                <p className="market-footer__meta">
                  {[site.category, site.city].filter(Boolean).join(' · ') ||
                    'Storefront on wa.directory'}
                </p>
              </div>
            </div>

            <nav className="market-footer__nav" aria-label="Footer">
              {site.navItems.map((nav) => (
                <a href={nav.href} key={nav.href}>
                  {nav.label}
                </a>
              ))}
            </nav>

            <div className="market-footer__legal">
              <span>© {new Date().getFullYear()} {site.name}. All rights reserved.</span>
              <span>POWERED BY WA.DIRECTORY</span>
            </div>
          </div>
        </footer>

        {/* ---------------------------------------------------------- */}
        {/* Quick View Modal                                           */}
        {/* ---------------------------------------------------------- */}
        <QuickViewModal
          site={site}
          item={quickViewItem}
          qty={quickViewQty}
          onQtyChange={setQuickViewQty}
          onClose={() => setQuickViewItem(null)}
          onAddToCart={(item, count) => {
            showToast(`Added ${count}x ${item.name} to WhatsApp cart!`);
          }}
        />

        {/* ---------------------------------------------------------- */}
        {/* Photo Gallery Lightbox                                     */}
        {/* ---------------------------------------------------------- */}
        <GalleryLightbox
          photos={site.gallery}
          siteName={site.name}
          activeIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() =>
            setLightboxIndex((prev) =>
              prev !== null ? (prev - 1 + site.gallery.length) % site.gallery.length : null
            )
          }
          onNext={() =>
            setLightboxIndex((prev) =>
              prev !== null ? (prev + 1) % site.gallery.length : null
            )
          }
        />

        {/* ---------------------------------------------------------- */}
        {/* Floating Scroll to Top Button                              */}
        {/* ---------------------------------------------------------- */}
        {showScrollTop ? (
          <button
            type="button"
            className="market-scroll-top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll to top"
          >
            <ArrowUpIcon />
          </button>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* Toast Notification Banner                                  */}
        {/* ---------------------------------------------------------- */}
        {toastMessage ? (
          <div className="market-toast" role="status" aria-live="polite">
            <CheckIcon />
            <span>{toastMessage}</span>
          </div>
        ) : null}

        {/* Cart Bar & Cart Drawer Island */}
        <CartBar />
        <CartDrawer />

        {/* Floating WhatsApp Action Button */}
        {orderHref ? (
          <a
            className={`market-fab${site.voiceOnly ? ' market-fab--call' : ''}`}
            href={orderHref}
            aria-label={site.voiceOnly ? 'Call now' : 'Chat on WhatsApp'}
            target={site.voiceOnly ? undefined : '_blank'}
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={site.voiceOnly ? CALL_ICON : WA_ICON} fill="currentColor" />
            </svg>
          </a>
        ) : null}
      </CartProvider>
    </div>
  );
}
