/* ------------------------------------------------------------------ */
/* Monolith — immersive single-brand layout                            */
/* Self-contained theme: all styling lives in ./theme.css, all helpers */
/* in ./lib.tsx. Rendered inside wa.directory's registry with a real   */
/* SiteView, or standalone via app/page.tsx with buildSampleSiteView.  */
/* ------------------------------------------------------------------ */

import type { CSSProperties, ReactNode } from 'react'
import './theme.css'
import {
  SOCIAL_ICONS,
  SOCIAL_LABELS,
  Placeholder,
  StarRating,
  formatTimestamp,
  getOpenStatus,
  itemOrderHref,
  itemStatus,
  money,
  safeUrl,
  socialHref,
  washStyle,
  whatsappOrderHref,
} from './lib'
import type { ThemeItem, ThemeProps } from './types'

const SHOP_LIMIT = 6
const FALLBACK_INK = '#111B21'

/* ------------------------------------------------------------------ */
/* Local atoms                                                         */
/* ------------------------------------------------------------------ */

function VerifiedBadge(): ReactNode {
  return (
    <svg className="mono-verified" viewBox="0 0 20 20" aria-hidden="true">
      <circle className="mono-verified__bg" cx="10" cy="10" r="10" />
      <path
        className="mono-verified__check"
        d="M5.8 10.3l2.7 2.7L14.2 7.5"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SectionHead({
  eyebrow,
  title,
  lede,
}: {
  eyebrow?: string
  title: string
  lede?: string
}): ReactNode {
  return (
    <div className="mono-section__head">
      {eyebrow ? <p className="mono-eyebrow">{eyebrow}</p> : null}
      <h2 className="mono-section__title">{title}</h2>
      {lede ? <p className="mono-section__lede">{lede}</p> : null}
    </div>
  )
}

function ItemCard({ site, item }: { site: ThemeProps['site']; item: ThemeItem }): ReactNode {
  const status = itemStatus(item)
  const orderHref = itemOrderHref(site, item)
  return (
    <article className="mono-item">
      <div className="mono-item__media">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} loading="lazy" />
        ) : (
          <Placeholder label={item.name} category={item.category} tone="dark" />
        )}
      </div>
      <div className="mono-item__body">
        {item.category ? <span className="mono-chip">{item.category}</span> : null}
        <h3 className="mono-item__name">{item.name}</h3>
        {item.description ? <p className="mono-item__desc">{item.description}</p> : null}
      </div>
      <div className="mono-item__foot">
        <span className="mono-item__price">{money(item)}</span>
        {status ? (
          <span className={`mono-chip mono-chip--${status.tone}`}>{status.label}</span>
        ) : null}
        {orderHref ? (
          <a className="mono-btn mono-btn--soft mono-item__order" href={orderHref}>
            {site.voiceOnly ? 'Call to order' : 'Order'}
          </a>
        ) : null}
      </div>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

export default function MonolithTheme({
  site,
  orientation = 'immersive',
  mode = 'preview',
}: ThemeProps): ReactNode {
  const orient = orientation === 'stacked' ? 'stacked' : 'immersive'
  const shopItems = site.items.slice(0, SHOP_LIMIT)
  const shopHasMore = site.items.length > SHOP_LIMIT
  const orderHref = whatsappOrderHref(site)
  const openStatus = getOpenStatus(site.hours)
  const openTone = openStatus.startsWith('Open') ? 'ok' : 'off'
  const heroDark = orient === 'immersive' ? true : site.isHeroDark
  const heroInk = heroDark ? '#FFFFFF' : FALLBACK_INK
  const headerInk =
    orient === 'immersive' ? '#FFFFFF' : site.isHeaderDark ? '#FFFFFF' : FALLBACK_INK

  /* Section anchors are derived from what the data actually contains. */
  const nav = [
    site.menuServices.length > 0 ? { href: '#services', label: 'Services' } : null,
    site.items.length > 0 ? { href: '#shop', label: 'Shop' } : null,
    site.gallery.length > 0 ? { href: '#gallery', label: 'Gallery' } : null,
    site.testimonials.length > 0 ? { href: '#reviews', label: 'Reviews' } : null,
    site.faq.length > 0 ? { href: '#faq', label: 'FAQ' } : null,
    site.hours && site.hours.length > 0 ? { href: '#hours', label: 'Hours' } : null,
    { href: '#contact', label: 'Contact' },
  ].filter(Boolean) as { href: string; label: string }[]

  const themeVars = {
    '--mono-head': site.fontPair.head,
    '--mono-body': site.fontPair.body,
    '--mono-accent': site.accent,
    '--mono-soft': site.accentSoftBg,
    '--mono-muted': site.accentMutedBg,
    '--mono-glow': site.accentGlow,
    '--mono-cta-ink': site.accentCtaText,
    '--mono-header-bg': site.headerBg,
    '--mono-header-ink': headerInk,
    '--mono-hero-bg': site.heroBg,
    '--mono-hero-ink': heroInk,
    '--mono-shop-bg': site.shopBg,
    '--mono-shop-ink': site.isShopDark ? '#FFFFFF' : FALLBACK_INK,
    '--mono-contact-bg': site.contactBg,
    '--mono-contact-ink': site.contactDark ? '#FFFFFF' : FALLBACK_INK,
    '--mono-contact-cta': site.contactCtaText,
  } as CSSProperties

  return (
    <div
      className="mono-root"
      id="top"
      data-theme="monolith"
      data-mode={mode}
      data-orient={orient}
      style={themeVars}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(site.jsonLd) }}
      />

      {/* ---------------------------------------------------------- */}
      {/* Header                                                      */}
      {/* ---------------------------------------------------------- */}
      <header className="mono-header">
        <div className="mono-header__inner">
          <a className="mono-brand" href="#top">
            {site.logoUrl ? (
              <img className="mono-brand__logo" src={site.logoUrl} alt="" />
            ) : (
              <span className="mono-brand__monogram">{site.initials}</span>
            )}
            <span className="mono-brand__name">{site.name}</span>
            {site.verified ? <VerifiedBadge /> : null}
          </a>
          <nav className="mono-nav" aria-label="Primary">
            {nav.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
          {orderHref ? (
            <a className="mono-btn mono-btn--cta mono-header__cta" href={orderHref}>
              {site.voiceOnly ? 'Call now' : 'Order on WhatsApp'}
            </a>
          ) : null}
        </div>
      </header>
      {/* ---------------------------------------------------------- */}
      {/* Hero — full-bleed statement (immersive) or media block      */}
      {/* ---------------------------------------------------------- */}
      <section className={`mono-hero${heroDark ? ' mono-hero--dark' : ''}`}>
        <div className="mono-hero__media">
          {site.coverImage ? (
            <>
              <img src={site.coverImage} alt={site.name} loading="eager" />
              <div className="mono-hero__wash" style={washStyle(site)} aria-hidden="true" />
            </>
          ) : (
            <Placeholder label={site.name} category={site.category} tone="dark" />
          )}
        </div>
        <div className="mono-hero__inner">
          <div className="mono-hero__content">
            <p className="mono-eyebrow">{[site.category, site.city].filter(Boolean).join(' · ')}</p>
            <h1 className="mono-hero__title">
              {site.name}
              {site.verified ? <VerifiedBadge /> : null}
            </h1>
            {site.tagline ? <p className="mono-hero__lede">{site.tagline}</p> : null}
            {site.reviewCount > 0 ? (
              <p className="mono-hero__rating">
                <StarRating value={site.rating} />
                <span>
                  {site.rating.toFixed(1)} · {site.reviewCount} reviews
                </span>
              </p>
            ) : null}
            <div className="mono-hero__actions">
              {orderHref ? (
                <a className="mono-btn mono-btn--cta" href={orderHref}>
                  {site.voiceOnly ? 'Call now' : 'Order on WhatsApp'}
                </a>
              ) : null}
              {site.profileHref ? (
                <a
                  className={`mono-btn ${heroDark ? 'mono-btn--ghost' : 'mono-btn--soft'}`}
                  href={site.profileHref}
                >
                  View profile
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Stats strip                                                 */}
      {/* ---------------------------------------------------------- */}
      {site.stats.length > 0 ? (
        <section className="mono-section mono-section--stats">
          <div className="mono-container">
            <div className="mono-stats">
              {site.stats.map((stat) => (
                <div className="mono-stat" key={stat.label}>
                  <span className="mono-stat__value">{stat.value}</span>
                  <span className="mono-stat__label">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Services — numbered editorial rows                          */}
      {/* ---------------------------------------------------------- */}
      {site.menuServices.length > 0 ? (
        <section className="mono-section" id="services">
          <div className="mono-container">
            <SectionHead eyebrow="Services" title="What we do" />
            <ol className="mono-services">
              {site.menuServices.map((service, index) => (
                <li className="mono-service" key={service}>
                  <span className="mono-service__num" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="mono-service__label">{service}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Shop — per-item WhatsApp ordering, no cart                  */}
      {/* ---------------------------------------------------------- */}
      {site.items.length > 0 ? (
        <section
          className={`mono-section mono-section--shop${site.isShopDark ? ' mono-shop--dark' : ''}`}
          id="shop"
        >
          <div className="mono-container">
            <SectionHead
              eyebrow="Shop"
              title="Buy direct"
              lede="Every item is ordered one-on-one over WhatsApp. No cart, no checkout."
            />
            <div className="mono-shop__grid">
              {shopItems.map((item) => (
                <ItemCard site={site} item={item} key={item.id} />
              ))}
            </div>
            {shopHasMore ? (
              <p className="mono-shop__more">
                <a className="mono-btn mono-btn--soft" href={site.profileHref}>
                  See all {site.items.length} items
                </a>
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Gallery — uniform grid, tight gutters, no masonry           */}
      {/* ---------------------------------------------------------- */}
      {site.gallery.length > 0 ? (
        <section className="mono-section mono-section--gallery" id="gallery">
          <div className="mono-container">
            <SectionHead eyebrow="Gallery" title="Inside the shop" />
          </div>
          <div className="mono-gallery">
            {site.gallery.map((photo, index) => (
              <figure className="mono-gallery__frame" key={`${photo}-${index}`}>
                <img src={photo} alt={`${site.name} photo ${index + 1}`} loading="lazy" />
              </figure>
            ))}
          </div>
        </section>
      ) : null}
      {/* ---------------------------------------------------------- */}
      {/* Reviews — plain editorial blockquotes                        */}
      {/* ---------------------------------------------------------- */}
      {site.testimonials.length > 0 ? (
        <section className="mono-section" id="reviews">
          <div className="mono-container">
            <SectionHead eyebrow="Reviews" title="What customers say" />
            <div className="mono-reviews">
              {site.testimonials.map((review) => (
                <blockquote className="mono-review" key={`${review.name}-${review.created_at}`}>
                  <StarRating value={review.rating} />
                  <p className="mono-review__comment">{review.comment}</p>
                  <footer className="mono-review__foot">
                    <span className="mono-review__name">{review.name}</span>
                    <span className="mono-review__date">{formatTimestamp(review.created_at)}</span>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* FAQ                                                          */}
      {/* ---------------------------------------------------------- */}
      {site.faq.length > 0 ? (
        <section className="mono-section" id="faq">
          <div className="mono-container">
            <SectionHead eyebrow="FAQ" title="Good to know" />
            <div className="mono-faq">
              {site.faq.map((entry) => (
                <details className="mono-faq__entry" key={entry.q}>
                  <summary>{entry.q}</summary>
                  <p>{entry.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Hours                                                        */}
      {/* ---------------------------------------------------------- */}
      {site.hours && site.hours.length > 0 ? (
        <section className="mono-section" id="hours">
          <div className="mono-container">
            <SectionHead eyebrow="Hours" title="Opening times" />
            <div className="mono-hours">
              {openStatus ? (
                <span className={`mono-chip mono-chip--${openTone}`}>{openStatus}</span>
              ) : null}
              <ul className="mono-hours__list">
                {site.hours.map((entry) => (
                  <li className="mono-hours__row" key={entry.day}>
                    <span className="mono-hours__day">{entry.day}</span>
                    <span className="mono-hours__time">
                      {entry.open} – {entry.close}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Contact                                                      */}
      {/* ---------------------------------------------------------- */}
      <section
        className={`mono-section mono-section--contact${site.contactDark ? ' mono-contact--dark' : ''}`}
        id="contact"
      >
        <div className="mono-container">
          <SectionHead
            eyebrow="Contact"
            title={`Get in touch with ${site.name}`}
            lede="Reach out and we will get back to you as soon as we can."
          />
          <div className="mono-contact__card">
            <ul className="mono-contact__rows">
              {site.voicePhone || site.phoneClean ? (
                <li className="mono-contact__row">
                  <span className="mono-contact__label">Phone</span>
                  <a
                    className="mono-contact__value"
                    href={`tel:${site.voicePhone || site.phoneClean}`}
                  >
                    {site.voicePhone || site.phoneClean}
                  </a>
                </li>
              ) : null}
              {!site.voiceOnly && site.orderDigits ? (
                <li className="mono-contact__row">
                  <span className="mono-contact__label">WhatsApp</span>
                  <a className="mono-contact__value" href={site.whatsappHref}>
                    +{site.orderDigits}
                  </a>
                </li>
              ) : null}
              {site.email ? (
                <li className="mono-contact__row">
                  <span className="mono-contact__label">Email</span>
                  <a className="mono-contact__value" href={`mailto:${site.email}`}>
                    {site.email}
                  </a>
                </li>
              ) : null}
              {site.showLocation && site.address ? (
                <li className="mono-contact__row">
                  <span className="mono-contact__label">Address</span>
                  <a className="mono-contact__value" href={site.mapsHref}>
                    {site.address}
                  </a>
                  <a className="mono-contact__action" href={site.mapsHref}>
                    Get directions
                  </a>
                </li>
              ) : null}
              {site.website ? (
                <li className="mono-contact__row">
                  <span className="mono-contact__label">Website</span>
                  {safeUrl(site.website) ? (
                    <a className="mono-contact__value" href={safeUrl(site.website)}>
                      {site.website}
                    </a>
                  ) : (
                    <span className="mono-contact__value">{site.website}</span>
                  )}
                </li>
              ) : null}
            </ul>
            {site.socialLinks.length > 0 ? (
              <div className="mono-contact__socials">
                {site.socialLinks.map((link) => (
                  <a
                    key={link.key}
                    className="mono-social"
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
      {/* Footer                                                       */}
      {/* ---------------------------------------------------------- */}
      <footer className="mono-footer">
        <div className="mono-footer__inner">
          <div className="mono-footer__brand">
            <span className="mono-footer__name">{site.name}</span>
            <span className="mono-footer__meta">
              {[site.category, site.city].filter(Boolean).join(' · ')}
            </span>
          </div>
          <nav className="mono-footer__nav" aria-label="Footer">
            {nav.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mono-footer__legal">
            <span>© {new Date().getFullYear()} {site.name}</span>
            <span>Hosted on wa.directory</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
