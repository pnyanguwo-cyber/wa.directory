'use client';

/* ------------------------------------------------------------------ */
/* Monolith — Architectural Brutalist / Editorial Flagship Theme      */
/*                                                                     */
/* Monolithic basalt stone aesthetic, full-screen 100vh cover hero    */
/* with overlaid typography, dual counter-rolling marquee tracks,      */
/* kinetic rolling seals, scroll depth gauge, real-time catalogue     */
/* search, sharp architectural index tabs, interactive quick-inspect  */
/* hardware/bakery drawer, and photo gallery lightbox.                */
/*                                                                     */
/* ZERO PILLS: Strictly 0px radius, sharp geometric slabs, monospace  */
/* indexes, and architectural bracket tags.                            */
/* All styling scoped under .mono-root in ./theme.css.                 */
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
import type { ThemeItem, ThemeProps } from './types';

const FALLBACK_INK = '#FFFFFF';

/* ------------------------------------------------------------------ */
/* Inline SVG Atoms (Zero external icon dependencies)                 */
/* ------------------------------------------------------------------ */

function SearchIcon(): ReactNode {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
      <path
        d="M9 15A6 6 0 1 0 9 3a6 6 0 0 0 0 12zm8 2l-4.35-4.35"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

function CloseIcon(): ReactNode {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
      <path
        d="M4 4l12 12M16 4L4 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
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
        strokeLinecap="square"
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
        strokeLinecap="square"
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
        strokeLinecap="square"
      />
    </svg>
  );
}

const WA_ICON =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.898 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z';

const CALL_ICON =
  'M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z';

/* ------------------------------------------------------------------ */
/* Visual Atoms (Sharp Architectural Brackets — NO PILLS)             */
/* ------------------------------------------------------------------ */

function VerifiedBadge(): ReactNode {
  return (
    <span className="mono-tag mono-tag--accent" title="Verified Monolith Archive">
      <span style={{ color: '#2dd4bf', fontWeight: 900 }}>✓</span>
      <span>VERIFIED // ARCHIVE</span>
    </span>
  );
}

function SectionHead({
  idx,
  eyebrow,
  title,
  lede,
}: {
  idx: string;
  eyebrow?: string;
  title: string;
  lede?: string;
}): ReactNode {
  return (
    <div className="mono-section__head">
      <div className="mono-eyebrow">
        <span>// {idx}</span>
        {eyebrow ? (
          <>
            <span>—</span>
            <span>{eyebrow}</span>
          </>
        ) : null}
      </div>
      <h2 className="mono-section__title">{title}</h2>
      {lede ? <p className="mono-section__lede">{lede}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Monolithic Item Card (Sharp Rectilinear Geometry)                  */
/* ------------------------------------------------------------------ */

function ItemCard({
  site,
  item,
  onInspect,
}: {
  site: ThemeProps['site'];
  item: ThemeItem;
  onInspect: (item: ThemeItem) => void;
}): ReactNode {
  const status = itemStatus(item);
  const orderHref = itemOrderHref(site, item);

  return (
    <article className="mono-card">
      <div
        className="mono-card__media"
        onClick={() => onInspect(item)}
        style={{ cursor: 'pointer' }}
      >
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} loading="lazy" />
        ) : (
          <Placeholder label={item.name} category={item.category ?? site.category} tone="dark" />
        )}

        <div className="mono-card__corner-tags">
          {item.category ? <span className="mono-tag">{item.category}</span> : null}
          {status ? (
            <span className={`mono-tag mono-tag--${status.tone}`}>[{status.label}]</span>
          ) : null}
        </div>

        <button
          type="button"
          className="mono-card__inspect-btn"
          onClick={(e) => {
            e.stopPropagation();
            onInspect(item);
          }}
          aria-label={`Inspect ${item.name}`}
        >
          [ INSPECT SPECIFICATION ]
        </button>
      </div>

      <div className="mono-card__body">
        <h3
          className="mono-card__title"
          onClick={() => onInspect(item)}
          style={{ cursor: 'pointer' }}
        >
          {item.name}
        </h3>
        {item.description ? <p className="mono-card__desc">{item.description}</p> : null}

        <div className="mono-card__foot">
          <span className="mono-card__price">{money(item)}</span>

          {orderHref ? (
            <a
              className="mono-btn mono-btn--cta"
              href={orderHref}
              target={site.voiceOnly ? undefined : '_blank'}
              rel="noopener noreferrer"
              style={{ padding: '0.55rem 1.15rem', fontSize: '0.76rem' }}
            >
              {site.voiceOnly ? 'Call' : 'Order'}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Quick-Inspect Monolithic Modal (Strictly NO Pills)                 */
/* ------------------------------------------------------------------ */

function QuickInspectModal({
  site,
  item,
  qty,
  onQtyChange,
  onClose,
}: {
  site: ThemeProps['site'];
  item: ThemeItem | null;
  qty: number;
  onQtyChange: (newQty: number) => void;
  onClose: () => void;
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

  const status = itemStatus(item);
  const directOrderUrl = itemOrderHrefWithQty(site, item, qty);
  const numPrice = typeof item.price === 'number' ? item.price : null;
  const subtotal = numPrice !== null ? (numPrice * qty).toFixed(2) : null;

  return (
    <div className="mono-modal" role="dialog" aria-modal="true" aria-label={item.name}>
      <div className="mono-modal__backdrop" onClick={onClose} />
      <div className="mono-modal__dialog">
        <button
          type="button"
          className="mono-modal__close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <CloseIcon />
        </button>

        <div className="mono-modal__body">
          <div className="mono-modal__media">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} />
            ) : (
              <Placeholder label={item.name} category={item.category ?? site.category} tone="dark" />
            )}
          </div>

          <div className="mono-modal__details">
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {item.category ? <span className="mono-tag">{item.category}</span> : null}
              {status ? (
                <span className={`mono-tag mono-tag--${status.tone}`}>[{status.label}]</span>
              ) : null}
              <span className="mono-tag">SKU: {item.slug.slice(0, 16)}</span>
            </div>

            <h2 className="mono-modal__title">{item.name}</h2>
            <div className="mono-modal__price">{money(item)}</div>

            {item.description ? (
              <p style={{ color: 'var(--mono-ink-muted)', fontSize: '0.94rem', lineHeight: 1.6 }}>
                {item.description}
              </p>
            ) : null}

            {/* Stepper with Live Calculation */}
            <div className="mono-modal__stepper-row">
              <div>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--mono-ink-muted)' }}>
                  Unit Allocation
                </span>
                <div style={{ marginTop: '0.35rem' }}>
                  <div className="mono-stepper">
                    <button
                      type="button"
                      className="mono-stepper__btn"
                      onClick={() => onQtyChange(Math.max(1, qty - 1))}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="mono-stepper__val">{qty}</span>
                    <button
                      type="button"
                      className="mono-stepper__btn"
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
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--mono-ink-muted)' }}>
                    Total Evaluation
                  </span>
                  <div style={{ fontFamily: 'var(--mono-head, sans-serif)', fontSize: '1.45rem', fontWeight: 950, color: '#ffffff' }}>
                    ${subtotal}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Direct WhatsApp Ordering */}
            <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.5rem' }}>
              {directOrderUrl ? (
                <a
                  className="mono-btn mono-btn--cta"
                  href={directOrderUrl}
                  target={site.voiceOnly ? undefined : '_blank'}
                  rel="noopener noreferrer"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d={site.voiceOnly ? CALL_ICON : WA_ICON} />
                  </svg>
                  <span>{site.voiceOnly ? 'Call to place order' : `Dispatch Order on WhatsApp (${qty}x)`}</span>
                </a>
              ) : null}

              <button
                type="button"
                className="mono-btn mono-btn--outline"
                onClick={onClose}
              >
                [ Return to Archive ]
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Full-Screen Architectural Lightbox (Strictly NO Pills)             */
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
    <div className="mono-lightbox" role="dialog" aria-modal="true" aria-label="Visual Archive">
      <div className="mono-lightbox__backdrop" onClick={onClose} />
      <button
        type="button"
        className="mono-modal__close"
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
            className="mono-lightbox__nav-btn mono-lightbox__prev"
            onClick={onPrev}
            aria-label="Previous image"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            className="mono-lightbox__nav-btn mono-lightbox__next"
            onClick={onNext}
            aria-label="Next image"
          >
            <ChevronRightIcon />
          </button>
        </>
      ) : null}

      <div className="mono-lightbox__content">
        <img
          className="mono-lightbox__img"
          src={photos[activeIndex]}
          alt={`${siteName} visual plate ${activeIndex + 1}`}
        />
        <div className="mono-lightbox__caption">
          <span>// {siteName.toUpperCase()} ARCHIVE</span>
          <span>•</span>
          <span>
            PLATE {activeIndex + 1} OF {photos.length}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rolling Circular Seal / Compass Emblem                             */
/* ------------------------------------------------------------------ */

function RollingSeal({ initials }: { initials: string }): ReactNode {
  return (
    <div className="mono-rolling-seal" aria-hidden="true">
      <svg className="mono-rolling-seal__svg" viewBox="0 0 160 160">
        <path
          id="monoSealCircle"
          d="M 80, 80 m -62, 0 a 62,62 0 1,1 124,0 a 62,62 0 1,1 -124,0"
          fill="none"
        />
        <text fill="rgba(255, 255, 255, 0.75)" fontSize="9.5" fontFamily="ui-monospace, monospace" letterSpacing="2.8">
          <textPath href="#monoSealCircle" startOffset="0%">
            ✦ SMALL BATCH COFFEE ROASTERY ✦ HARARE AVONDALE ✦
          </textPath>
        </text>
      </svg>
      <div className="mono-rolling-seal__center">
        <span>{initials}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Monolith Theme Component                                      */
/* ------------------------------------------------------------------ */

export default function MonolithTheme({
  site,
  orientation = 'immersive',
  mode = 'preview',
}: ThemeProps): ReactNode {
  const orient = orientation === 'stacked' ? 'stacked' : 'immersive';
  const orderHref = whatsappOrderHref(site);
  const openStatus = getOpenStatus(site.hours);

  /* Scroll depth tracking */
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  /* Pointer ambient lighting */
  const rootRef = useRef<HTMLDivElement>(null);
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    rootRef.current.style.setProperty('--mouse-x', `${x.toFixed(2)}%`);
    rootRef.current.style.setProperty('--mouse-y', `${y.toFixed(2)}%`);
  }, []);

  /* Scroll listener */
  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      setScrollProgress(scrolled);
      setIsScrolled(winScroll > 60);
      setShowScrollTop(winScroll > 450);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* Live local time ticker */
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

  /* Catalogue Search & Category Filter */
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

  /* Quick-Inspect Modal State */
  const [inspectItem, setInspectItem] = useState<ThemeItem | null>(null);
  const [inspectQty, setInspectQty] = useState(1);

  const handleOpenInspect = useCallback((item: ThemeItem) => {
    setInspectItem(item);
    setInspectQty(1);
  }, []);

  /* Lightbox State */
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  /* Current Day of Week for Hours Table */
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

  /* Navigation Items */
  const navItems = useMemo(() => {
    return [
      site.menuServices.length > 0 ? { href: '#services', label: 'Services', id: 'services' } : null,
      site.items.length > 0 ? { href: '#shop', label: 'Catalogue', id: 'shop' } : null,
      site.gallery.length > 0 ? { href: '#gallery', label: 'Visuals', id: 'gallery' } : null,
      site.testimonials.length > 0 ? { href: '#reviews', label: 'Reviews', id: 'reviews' } : null,
      site.faq.length > 0 ? { href: '#faq', label: 'Inquiries', id: 'faq' } : null,
      site.hours && site.hours.length > 0 ? { href: '#hours', label: 'Schedule', id: 'hours' } : null,
      { href: '#contact', label: 'Contact', id: 'contact' },
    ].filter(Boolean) as { href: string; label: string; id: string }[];
  }, [site]);

  const themeVars = {
    '--mono-head': site.fontPair.head,
    '--mono-body': site.fontPair.body,
    '--mono-accent': site.accent || '#0F766E',
    '--mono-soft': site.accentSoftBg,
    '--mono-muted': site.accentMutedBg,
    '--mono-glow': site.accentGlow,
    '--mono-cta-ink': site.accentCtaText,
    '--mono-header-bg': site.headerBg,
    '--mono-header-ink': '#FFFFFF',
    '--mono-hero-bg': site.heroBg,
    '--mono-hero-ink': '#FFFFFF',
    '--mono-shop-bg': site.shopBg,
    '--mono-shop-ink': site.isShopDark ? '#FFFFFF' : FALLBACK_INK,
    '--mono-contact-bg': site.contactBg,
    '--mono-contact-ink': site.contactDark ? '#FFFFFF' : FALLBACK_INK,
    '--mono-contact-cta': site.contactCtaText,
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className="mono-root"
      id="top"
      data-theme="monolith"
      data-mode={mode}
      data-orient={orient}
      style={themeVars}
      onPointerMove={handlePointerMove}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(site.jsonLd) }}
      />

      {/* ---------------------------------------------------------- */}
      {/* Scroll Depth Progress Gauge (Top Ruler)                   */}
      {/* ---------------------------------------------------------- */}
      <div className="mono-scroll-progress" aria-hidden="true">
        <div className="mono-scroll-progress__bar" style={{ width: `${scrollProgress}%` }} />
      </div>

      <div className="mono-scroll-depth-tag" aria-hidden="true">
        [ DEPTH // {String(Math.round(scrollProgress)).padStart(3, '0')}% ]
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Architectural Background Grid & Spotlight                 */}
      {/* ---------------------------------------------------------- */}
      <div className="mono-ambient-bg" aria-hidden="true">
        <div className="mono-ambient-grid" />
        <div className="mono-ambient-spotlight" />
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Architectural Monolithic Header (Strictly NO Pills)        */}
      {/* ---------------------------------------------------------- */}
      <header className={`mono-header${isScrolled ? ' mono-header--scrolled' : ''}`}>
        <div className="mono-header__inner">
          <a className="mono-brand" href="#top">
            {site.logoUrl ? (
              <img className="mono-brand__logo" src={site.logoUrl} alt="" />
            ) : (
              <span className="mono-brand__monogram">{site.initials}</span>
            )}
            <span className="mono-brand__name">{site.name}</span>
          </a>

        </div>
      </header>

      {/* ---------------------------------------------------------- */}
      {/* FULL-SCREEN COVER HERO (Image Fills Screen, Copy Overlaid) */}
      {/* ---------------------------------------------------------- */}
      <section className="mono-hero">
        <div className="mono-hero__backdrop">
          {site.coverImage ? (
            <>
              <img
                className="mono-hero__cover"
                src={site.coverImage}
                alt={site.name}
                loading="eager"
              />
              <div
                className="mono-hero__scrim"
                style={washStyle(site)}
                aria-hidden="true"
              />
            </>
          ) : (
            <div className="mono-hero__cover mono-hero__cover--bare">
              <span className="mono-hero__bare-monogram">{site.initials}</span>
            </div>
          )}
        </div>

        <div className="mono-hero__inner">
          <div className="mono-hero__stage">
            <div className="mono-hero__copy">
              <div className="mono-hero__meta">
                <span className="mono-tag mono-tag--accent">
                  {[site.category, site.city].filter(Boolean).join(' // ')}
                </span>
                {site.verified ? <VerifiedBadge /> : null}
                <span className="mono-hero__coordinates">
                  [ 17.7861° S // 31.0269° E ]
                </span>
              </div>

              <h1 className="mono-hero__title">{site.name}</h1>

              {site.tagline ? <p className="mono-hero__lede">{site.tagline}</p> : null}

              {site.reviewCount > 0 ? (
                <div className="mono-hero__rating-bar">
                  <StarRating value={site.rating} />
                  <span>
                    <strong>{site.rating.toFixed(1)}</strong> // ({site.reviewCount} VERIFIED REVIEWS)
                  </span>
                </div>
              ) : null}

              <div className="mono-hero__actions">
                {orderHref ? (
                  <a
                    className="mono-btn mono-btn--cta"
                    href={orderHref}
                    target={site.voiceOnly ? undefined : '_blank'}
                    rel="noopener noreferrer"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                      <path d={site.voiceOnly ? CALL_ICON : WA_ICON} />
                    </svg>
                    <span>{site.voiceOnly ? 'CALL TO ORDER' : 'ORDER ON WHATSAPP'}</span>
                  </a>
                ) : null}

                {site.items.length > 0 ? (
                  <a className="mono-btn mono-btn--outline" href="#shop">
                    <span>EXPLORE ARCHIVE</span>
                    <span>↓</span>
                  </a>
                ) : site.profileHref ? (
                  <a className="mono-btn mono-btn--outline" href={site.profileHref}>
                    [ VIEW PROFILE ]
                  </a>
                ) : null}
              </div>
            </div>

            {/* Rolling Kinetic Circular Seal */}
            <RollingSeal initials={site.initials} />
          </div>
        </div>

        {/* Hero Bottom Telemetry & Scroll Prompt */}
        <div className="mono-hero__bottom-bar">
          <div className="mono-hero__bottom-inner">
            <div className="mono-telemetry-bar">
              <span className="mono-telemetry-beacon">
                <span className="mono-telemetry-beacon__dot" />
                <span>{openStatus || 'OPERATIONAL'}</span>
              </span>
              <span>•</span>
              <span>{currentTime ? `${currentTime} HARARE LOCAL` : 'CATALOGUE ACTIVE'}</span>
            </div>

            <a href="#services" className="mono-hero__scroll-link" aria-label="Scroll to discover">
              <span>EXPLORE MONOLITH</span>
              <span className="mono-hero__scroll-arrow">↓</span>
            </a>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* DUAL COUNTER-ROLLING KINETIC TYPOGRAPHY TRACKS             */}
      {/* Track 1 rolls left, Track 2 rolls right                   */}
      {/* ---------------------------------------------------------- */}
      <div className="mono-rolling-container" aria-hidden="true">
        {/* Track 1 (Rolling Left) */}
        <div className="mono-rolling-track-wrap">
          <div className="mono-rolling-track mono-rolling-track--left">
            <span className="mono-rolling-item">
              <span className="mono-rolling-item__dot">✦</span> {site.name.toUpperCase()}
            </span>
            <span className="mono-rolling-item">
              <span className="mono-rolling-item__dot">✦</span> SMALL-BATCH COFFEE ROASTERY
            </span>
            <span className="mono-rolling-item">
              <span className="mono-rolling-item__dot">✦</span> AVONDALE HARARE
            </span>
            <span className="mono-rolling-item">
              <span className="mono-rolling-item__dot">✦</span> MORNING BAKES AT SUNRISE
            </span>
            <span className="mono-rolling-item">
              <span className="mono-rolling-item__dot">✦</span> NOSTALGIC COMFORT FOOD
            </span>
            <span className="mono-rolling-item">
              <span className="mono-rolling-item__dot">✦</span> DIRECT WHATSAPP DESK
            </span>

            {/* Duplicate for seamless infinite loop */}
            <span className="mono-rolling-item">
              <span className="mono-rolling-item__dot">✦</span> {site.name.toUpperCase()}
            </span>
            <span className="mono-rolling-item">
              <span className="mono-rolling-item__dot">✦</span> SMALL-BATCH COFFEE ROASTERY
            </span>
            <span className="mono-rolling-item">
              <span className="mono-rolling-item__dot">✦</span> AVONDALE HARARE
            </span>
            <span className="mono-rolling-item">
              <span className="mono-rolling-item__dot">✦</span> MORNING BAKES AT SUNRISE
            </span>
            <span className="mono-rolling-item">
              <span className="mono-rolling-item__dot">✦</span> NOSTALGIC COMFORT FOOD
            </span>
            <span className="mono-rolling-item">
              <span className="mono-rolling-item__dot">✦</span> DIRECT WHATSAPP DESK
            </span>
          </div>
        </div>

        {/* Track 2 (Rolling Right) */}
        <div className="mono-rolling-track-wrap mono-rolling-track-wrap--reverse">
          <div className="mono-rolling-track mono-rolling-track--right">
            <span className="mono-rolling-item mono-rolling-item--alt">
              — 12 KING GEORGE ROAD AVONDALE — SLOW MORNINGS & HONEST PLATES — WOOD-FIRED ROASTS — ARTISANAL PRESERVES & BLENDS — ESTABLISHED 2023 —
            </span>
            <span className="mono-rolling-item mono-rolling-item--alt">
              — 12 KING GEORGE ROAD AVONDALE — SLOW MORNINGS & HONEST PLATES — WOOD-FIRED ROASTS — ARTISANAL PRESERVES & BLENDS — ESTABLISHED 2023 —
            </span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Stats Slabs                                                */}
      {/* ---------------------------------------------------------- */}
      {site.stats.length > 0 ? (
        <section className="mono-section" style={{ paddingBlock: '3.5rem' }}>
          <div className="mono-container">
            <div className="mono-stats-grid">
              {site.stats.map((stat, i) => (
                <div className="mono-stat-slab" key={stat.label}>
                  <div className="mono-stat-slab__head">
                    <span className="mono-stat-slab__idx">// 0{i + 1}</span>
                    <span className="mono-tag">[ METRIC ]</span>
                  </div>
                  <div className="mono-stat-slab__value">{stat.value}</div>
                  <div className="mono-stat-slab__label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Services Section                                           */}
      {/* ---------------------------------------------------------- */}
      {site.menuServices.length > 0 ? (
        <section id="services" className="mono-section">
          <div className="mono-container">
            <SectionHead
              idx="01"
              eyebrow="Specialized Capabilities"
              title="Roastery & Kitchen Services"
              lede="Every plate prepared with honest craftsmanship, from morning dough to custom event platters."
            />
            <div className="mono-services-grid">
              {site.menuServices.map((service, index) => (
                <div className="mono-service-slab" key={index}>
                  <span className="mono-service-slab__num">0{index + 1}</span>
                  <div className="mono-service-slab__body">
                    <h3 className="mono-service-slab__title">{service}</h3>
                    <span className="mono-tag mono-tag--accent">ACTIVE CRAFT SERVICE</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Shop / Catalogue Section (NO PILLS, Sharp Index Tabs)     */}
      {/* ---------------------------------------------------------- */}
      {site.items.length > 0 ? (
        <section id="shop" className="mono-section">
          <div className="mono-container">
            <SectionHead
              idx="02"
              eyebrow="Provision Inventory"
              title="Catalogue & Roastery Store"
              lede="Browse our small-batch blends, fresh morning bakes, and house provisions."
            />

            {/* Catalogue Console */}
            <div className="mono-console">
              <div className="mono-console__top">
                <div className="mono-search-box">
                  <input
                    type="text"
                    className="mono-search-box__input"
                    placeholder="SEARCH COFFEE, BAKES, PRESERVES..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search provisions"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      className="mono-search-box__clear"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear query"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>

                <div className="mono-sort-box">
                  <span className="mono-sort-box__label">ARRANGE:</span>
                  <select
                    className="mono-sort-box__select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    aria-label="Sort provisions"
                  >
                    <option value="featured">Featured Archive</option>
                    <option value="price-asc">Price: Ascending</option>
                    <option value="price-desc">Price: Descending</option>
                    <option value="name">Index: A-Z</option>
                  </select>
                </div>
              </div>

              {/* Sharp Rectangular Category Index Tabs (NO PILLS) */}
              {categories.length > 0 ? (
                <div className="mono-categories" role="tablist" aria-label="Provision Categories">
                  <button
                    type="button"
                    className={`mono-cat-tab${selectedCategory === 'ALL' ? ' mono-cat-tab--active' : ''}`}
                    onClick={() => setSelectedCategory('ALL')}
                    role="tab"
                    aria-selected={selectedCategory === 'ALL'}
                  >
                    <span>[ 00 // ALL PROVISIONS ]</span>
                    <span className="mono-cat-tab__count">({site.items.length})</span>
                  </button>

                  {categories.map((cat, idx) => {
                    const count = site.items.filter(
                      (i) => i.category?.toLowerCase() === cat.toLowerCase()
                    ).length;
                    const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                    return (
                      <button
                        key={cat}
                        type="button"
                        className={`mono-cat-tab${isSelected ? ' mono-cat-tab--active' : ''}`}
                        onClick={() => setSelectedCategory(cat)}
                        role="tab"
                        aria-selected={isSelected}
                      >
                        <span>[ 0{idx + 1} // {cat.toUpperCase()} ]</span>
                        <span className="mono-cat-tab__count">({count})</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* Items Grid */}
            {filteredItems.length > 0 ? (
              <div className="mono-items-grid">
                {filteredItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    site={site}
                    item={item}
                    onInspect={handleOpenInspect}
                  />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 1.5rem', border: '1px dashed var(--mono-hairline-bright)', background: 'var(--mono-surface)' }}>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '1.25rem', color: 'var(--mono-accent)' }}>[ ZERO MATCHES FOUND ]</span>
                <p style={{ marginTop: '0.75rem', color: 'var(--mono-ink-muted)' }}>
                  No archive provisions match &quot;{searchQuery}&quot;.
                </p>
                <button
                  type="button"
                  className="mono-btn mono-btn--outline"
                  style={{ marginTop: '1.25rem' }}
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('ALL');
                  }}
                >
                  [ RESET ARCHIVE FILTERS ]
                </button>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Gallery Showcase (Click for Fullscreen Lightbox)          */}
      {/* ---------------------------------------------------------- */}
      {site.gallery.length > 0 ? (
        <section id="gallery" className="mono-section">
          <div className="mono-container">
            <SectionHead
              idx="03"
              eyebrow="Visual Documentation"
              title="Avondale Roastery & Garden Plates"
              lede="A documentary glimpse of morning preparations, courtyard seating, and oven pulls."
            />
            <div className="mono-gallery-grid">
              {site.gallery.map((photo, index) => (
                <div
                  className="mono-gallery-frame"
                  key={photo}
                  onClick={() => setLightboxIndex(index)}
                >
                  <img
                    src={photo}
                    alt={`${site.name} documentation ${index + 1}`}
                    loading="lazy"
                  />
                  <div className="mono-gallery-frame__overlay">
                    <span className="mono-gallery-frame__caption">
                      [ PLATE 0{index + 1} // CLICK TO INSPECT ]
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Testimonials / Reviews                                     */}
      {/* ---------------------------------------------------------- */}
      {site.testimonials.length > 0 ? (
        <section id="reviews" className="mono-section">
          <div className="mono-container">
            <SectionHead
              idx="04"
              eyebrow="Patron Endorsements"
              title="What Harare Says"
              lede="Word of mouth from our regulars across Harare."
            />
            <div className="mono-reviews-grid">
              {site.testimonials.map((review) => (
                <div className="mono-review-card" key={review.comment}>
                  <div className="mono-review-card__stars">
                    <StarRating value={review.rating} />
                  </div>
                  <blockquote className="mono-review-card__comment">
                    “{review.comment}”
                  </blockquote>
                  <div className="mono-review-card__foot">
                    <span className="mono-review-card__author">{review.name}</span>
                    <span className="mono-review-card__date">
                      {formatTimestamp(review.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* FAQ Accordions                                             */}
      {/* ---------------------------------------------------------- */}
      {site.faq.length > 0 ? (
        <section id="faq" className="mono-section">
          <div className="mono-container">
            <SectionHead
              idx="05"
              eyebrow="Common Inquiries"
              title="Orders, Catering & Parking"
              lede="Everything you need to know before visiting or messaging our counter."
            />
            <div className="mono-faq-list">
              {site.faq.map((entry) => (
                <details className="mono-faq-item" key={entry.q}>
                  <summary className="mono-faq-summary">
                    <span>{entry.q}</span>
                    <span className="mono-faq-indicator">+</span>
                  </summary>
                  <div className="mono-faq-body">
                    <p>{entry.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Hours Schedule & Live Harare Clock                         */}
      {/* ---------------------------------------------------------- */}
      {site.hours && site.hours.length > 0 ? (
        <section id="hours" className="mono-section">
          <div className="mono-container">
            <SectionHead
              idx="06"
              eyebrow="Operational Calendar"
              title="Service Hours"
              lede="Join us at King George Road during our active service hours."
            />
            <div className="mono-hours-block">
              <div className="mono-hours-head">
                <span className="mono-tag mono-tag--accent">
                  <span className="mono-telemetry-beacon__dot" style={{ display: 'inline-block', marginRight: '6px' }} />
                  {openStatus || 'OPERATING'}
                </span>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.78rem', color: 'var(--mono-ink-muted)' }}>
                  {currentTime ? `${currentTime} ` : ''}HARARE (UTC+2)
                </span>
              </div>

              <div>
                {site.hours.map((row) => {
                  const isToday = currentWeekday.toLowerCase().startsWith(row.day.toLowerCase().slice(0, 3));
                  return (
                    <div
                      key={row.day}
                      className={`mono-hours-row${isToday ? ' mono-hours-row--today' : ''}`}
                    >
                      <span className="mono-hours-day">
                        {row.day}
                        {isToday ? <span style={{ marginLeft: '0.65rem', color: 'var(--mono-accent)' }}>[ TODAY ]</span> : null}
                      </span>
                      <span className="mono-hours-time">
                        {row.open && row.close ? `${row.open} — ${row.close}` : '[ CLOSED ]'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Contact Concierge                                          */}
      {/* ---------------------------------------------------------- */}
      <section id="contact" className="mono-section">
        <div className="mono-container">
          <SectionHead
            idx="07"
            eyebrow="Direct Concierge"
            title="Dispatch & Inquiries"
            lede="Pre-order counter pickups, private event menus, or bulk roasted beans."
          />
          <div className="mono-contact-card">
            <div className="mono-contact-rows">
              {site.phoneClean ? (
                <div className="mono-contact-row">
                  <span className="mono-contact-label">WHATSAPP / PHONE</span>
                  <a
                    className="mono-contact-val mono-contact-val--accent"
                    href={site.whatsappHref || `tel:${site.voicePhone || site.phoneClean}`}
                  >
                    {site.voiceOnly
                      ? site.voicePhone || site.phoneClean
                      : `+${site.phoneClean}`}
                  </a>
                </div>
              ) : null}

              {site.email ? (
                <div className="mono-contact-row">
                  <span className="mono-contact-label">ELECTRONIC MAIL</span>
                  <a className="mono-contact-val" href={`mailto:${site.email}`}>
                    {site.email}
                  </a>
                </div>
              ) : null}

              {site.address ? (
                <div className="mono-contact-row">
                  <span className="mono-contact-label">PHYSICAL STAND</span>
                  <div>
                    <span className="mono-contact-val">{site.address}</span>
                    {site.mapsHref ? (
                      <div style={{ marginTop: '0.5rem' }}>
                        <a
                          className="mono-tag mono-tag--accent"
                          href={site.mapsHref}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          [ OPEN GOOGLE MAPS → ]
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1.25rem', borderTop: '1px solid var(--mono-hairline)' }}>
              {orderHref ? (
                <a
                  className="mono-btn mono-btn--cta"
                  href={orderHref}
                  target={site.voiceOnly ? undefined : '_blank'}
                  rel="noopener noreferrer"
                >
                  {site.voiceOnly ? '[ CALL DESK ]' : '[ MESSAGE WHATSAPP ]'}
                </a>
              ) : null}

              {site.socialLinks.length > 0 ? (
                <div className="mono-contact__socials">
                  {site.socialLinks.map((link) => (
                    <a
                      key={link.key}
                      className="mono-social"
                      href={socialHref(link.key, link.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={SOCIAL_LABELS[link.key] ?? link.key}
                    >                      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
                        <path
                          d={SOCIAL_ICONS[link.key] ?? SOCIAL_ICONS.twitter}
                          fill="currentColor"
                        />
                      </svg>
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Footer                                                     */}
      {/* ---------------------------------------------------------- */}
      <footer className="mono-footer">
        <div className="mono-footer__inner">
          <div className="mono-footer__top">
            <div className="mono-brand">
              <span className="mono-brand__monogram">{site.initials}</span>
              <div>
                <span className="mono-brand__name">{site.name}</span>
                <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.74rem', color: 'var(--mono-ink-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {[site.category, site.city].filter(Boolean).join(' // ') || 'MONOLITH ARCHIVE'}
                </p>
              </div>
            </div>

            <nav className="mono-footer__nav" aria-label="Footer Nav">
              {navItems.map((nav) => (
                <a key={nav.href} href={nav.href} className="mono-nav__link">
                  {nav.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="mono-footer__legal">
            <span>© {new Date().getFullYear()} {site.name.toUpperCase()}. ALL ARCHIVAL RIGHTS RESERVED.</span>
            <span>POWERED BY WA.DIRECTORY // MONOLITH CORE</span>
          </div>
        </div>
      </footer>

      {/* ---------------------------------------------------------- */}
      {/* Quick-Inspect Monolithic Modal (NO PILLS)                  */}
      {/* ---------------------------------------------------------- */}
      <QuickInspectModal
        site={site}
        item={inspectItem}
        qty={inspectQty}
        onQtyChange={setInspectQty}
        onClose={() => setInspectItem(null)}
      />

      {/* ---------------------------------------------------------- */}
      {/* Photo Gallery Fullscreen Lightbox                          */}
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
      {/* Floating Scroll to Top Button (Sharp Slabs)                */}
      {/* ---------------------------------------------------------- */}
      {showScrollTop ? (
        <button
          type="button"
          className="mono-scroll-top-btn"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll to top"
        >
          <ArrowUpIcon />
        </button>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Floating WhatsApp Action Button (Sharp Rectangular Slab)   */}
      {/* ---------------------------------------------------------- */}
      {orderHref ? (
        <a
          className="mono-fab"
          href={orderHref}
          target={site.voiceOnly ? undefined : '_blank'}
          rel="noopener noreferrer"
          aria-label={site.voiceOnly ? 'Call desk' : 'Message on WhatsApp'}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d={site.voiceOnly ? CALL_ICON : WA_ICON} />
          </svg>
          <span>{site.voiceOnly ? 'CALL NOW' : 'WHATSAPP'}</span>
        </a>
      ) : null}
    </div>
  );
}
