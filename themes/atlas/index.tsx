/* ------------------------------------------------------------------ */
/* Atlas — split editorial layout                                      */
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
    <svg className="atlas-verified" viewBox="0 0 20 20" aria-hidden="true">
      <circle className="atlas-verified__bg" cx="10" cy="10" r="10" />
      <path
        className="atlas-verified__check"
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
    <div className="atlas-section__head">
      {eyebrow ? <p className="atlas-eyebrow">{eyebrow}</p> : null}
      <h2 className="atlas-section__title">{title}</h2>
      {lede ? <p className="atlas-section__lede">{lede}</p> : null}
    </div>
  )
}

function ItemCard({ site, item }: { site: ThemeProps['site']; item: ThemeItem }): ReactNode {
  const status = itemStatus(item)
  const orderHref = itemOrderHref(site, item)
  return (
    <article className="atlas-item">
      <div className="atlas-item__media">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} loading="lazy" />
        ) : (
          <Placeholder label={item.name} category={item.category} tone="dark" />
        )}
      </div>
      <div className="atlas-item__body">
        {item.category ? <span className="atlas-chip">{item.category}</span> : null}
        <h3 className="atlas-item__name">{item.name}</h3>
        {item.description ? <p className="atlas-item__desc">{item.description}</p> : null}
      </div>
      <div className="atlas-item__foot">
        <span className="atlas-item__price">{money(item)}</span>
        {status ? (
          <span className={`atlas-chip atlas-chip--${status.tone}`}>{status.label}</span>
        ) : null}
        {orderHref ? (
          <a className="atlas-btn atlas-btn--soft atlas-item__order" href={orderHref}>
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

export default function AtlasTheme({
  site,
  orientation = 'split',
  mode = 'preview',
}: ThemeProps): ReactNode {
  const orient = orientation === 'stacked' ? 'stacked' : 'split'
  const shopItems = site.items.slice(0, SHOP_LIMIT)
  const shopHasMore = site.items.length > SHOP_LIMIT
  const orderHref = whatsappOrderHref(site)
  const openStatus = getOpenStatus(site.hours)
  const openTone = openStatus.startsWith('Open') ? 'ok' : 'off'

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
    '--atlas-head': site.fontPair.head,
    '--atlas-body': site.fontPair.body,
    '--atlas-accent': site.accent,
    '--atlas-soft': site.accentSoftBg,
    '--atlas-muted': site.accentMutedBg,
    '--atlas-glow': site.accentGlow,
    '--atlas-cta-ink': site.accentCtaText,
    '--atlas-header-bg': site.headerBg,
    '--atlas-header-ink': site.isHeaderDark ? '#FFFFFF' : FALLBACK_INK,
    '--atlas-hero-bg': site.heroBg,
    '--atlas-shop-bg': site.shopBg,
    '--atlas-shop-ink': site.isShopDark ? '#FFFFFF' : FALLBACK_INK,
    '--atlas-contact-bg': site.contactBg,
    '--atlas-contact-ink': site.contactDark ? '#FFFFFF' : FALLBACK_INK,
    '--atlas-contact-cta': site.contactCtaText,
  } as CSSProperties

  return (
    <div className="atlas-root" id="top" data-theme="atlas" data-mode={mode} style={themeVars}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(site.jsonLd) }}
      />

      {/* ---------------------------------------------------------- */}
      {/* Header                                                      */}
      {/* ---------------------------------------------------------- */}
      <header className="atlas-header">
        <div className="atlas-header__inner">
          <a className="atlas-brand" href="#top">
            {site.logoUrl ? (
              <img className="atlas-brand__logo" src={site.logoUrl} alt="" />
            ) : (
              <span className="atlas-brand__monogram">{site.initials}</span>
            )}
            <span className="atlas-brand__name">{site.name}</span>
            {site.verified ? <VerifiedBadge /> : null}
          </a>
          <nav className="atlas-nav" aria-label="Primary">
            {nav.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
          {orderHref ? (
            <a className="atlas-btn atlas-btn--cta atlas-header__cta" href={orderHref}>
              {site.voiceOnly ? 'Call now' : 'Order on WhatsApp'}
            </a>
          ) : null}
        </div>
      </header>

      {/* ---------------------------------------------------------- */}
      {/* Hero                                                        */}
      {/* ---------------------------------------------------------- */}
      <section
        className={`atlas-hero${site.isHeroDark ? ' atlas-hero--dark' : ''}${
          orient === 'stacked' ? ' atlas-hero--stacked' : ''
        }`}
      >
        <div className="atlas-hero__inner">
          <div className="atlas-hero__content">
            <p className="atlas-eyebrow">{[site.category, site.city].filter(Boolean).join(' · ')}</p>
            <h1 className="atlas-hero__title">
              {site.name}
              {site.verified ? <VerifiedBadge /> : null}
            </h1>
            {site.tagline ? <p className="atlas-hero__lede">{site.tagline}</p> : null}
            {site.reviewCount > 0 ? (
              <p className="atlas-hero__rating">
                <StarRating value={site.rating} />
                <span>
                  {site.rating.toFixed(1)} · {site.reviewCount} reviews
                </span>
              </p>
            ) : null}
            <div className="atlas-hero__actions">
              {orderHref ? (
                <a className="atlas-btn atlas-btn--cta" href={orderHref}>
                  {site.voiceOnly ? 'Call now' : 'Order on WhatsApp'}
                </a>
              ) : null}
              {site.profileHref ? (
                <a className="atlas-btn atlas-btn--soft" href={site.profileHref}>
                  View profile
                </a>
              ) : null}
            </div>
          </div>
          <div className={`atlas-hero__media${site.coverImage ? '' : ' atlas-hero__media--bare'}`}>
            {site.coverImage ? (
              <>
                <img src={site.coverImage} alt={site.name} loading="eager" />
                <div className="atlas-hero__wash" style={washStyle(site)} aria-hidden="true" />
              </>
            ) : (
              <Placeholder label={site.name} category={site.category} tone="dark" />
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Stats                                                       */}
      {/* ---------------------------------------------------------- */}
      {site.stats.length > 0 ? (
        <section className="atlas-section atlas-section--stats">
          <div className="atlas-stats">
            {site.stats.map((stat) => (
              <div className="atlas-stat" key={stat.label}>
                <span className="atlas-stat__value">{stat.value}</span>
                <span className="atlas-stat__label">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Services                                                    */}
      {/* ---------------------------------------------------------- */}
      {site.menuServices.length > 0 ? (
        <section id="services" className="atlas-section">
          <SectionHead eyebrow="Services" title={`What ${site.name} offers`} />
          <ul className="atlas-services">
            {site.menuServices.map((service) => (
              <li className="atlas-service" key={service}>
                <span className="atlas-service__dot" aria-hidden="true" />
                {service}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Shop                                                        */}
      {/* ---------------------------------------------------------- */}
      {site.items.length > 0 ? (
        <section id="shop" className={`atlas-section atlas-section--shop${site.isShopDark ? ' atlas-shop--dark' : ''}`}>
          <SectionHead
            eyebrow="Shop"
            title="Browse the range"
            lede="Every item can be ordered directly over WhatsApp or by phone."
          />
          <div className="atlas-shop">
            {shopItems.map((item) => (
              <ItemCard site={site} item={item} key={item.id} />
            ))}
          </div>
          {shopHasMore ? (
            <div className="atlas-shop__more">
              <a className="atlas-btn atlas-btn--soft" href={site.profileHref}>
                View all {site.items.length} items
              </a>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Gallery                                                     */}
      {/* ---------------------------------------------------------- */}
      {site.gallery.length > 0 ? (
        <section id="gallery" className="atlas-section">
          <SectionHead eyebrow="Gallery" title="Inside the business" />
          <div className="atlas-gallery">
            {site.gallery.map((photo, index) => (
              <figure className="atlas-gallery__frame" key={photo}>
                <img src={photo} alt={`${site.name} photo ${index + 1}`} loading="lazy" />
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Reviews                                                     */}
      {/* ---------------------------------------------------------- */}
      {site.testimonials.length > 0 ? (
        <section id="reviews" className="atlas-section">
          <SectionHead eyebrow="Reviews" title="What customers say" />
          <div className="atlas-reviews">
            {site.testimonials.map((review) => (
              <blockquote className="atlas-review" key={`${review.name}-${review.created_at}`}>
                <StarRating value={review.rating} />
                <p className="atlas-review__comment">{review.comment}</p>
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
      {/* FAQ                                                         */}
      {/* ---------------------------------------------------------- */}
      {site.faq.length > 0 ? (
        <section id="faq" className="atlas-section">
          <SectionHead eyebrow="FAQ" title="Questions & answers" />
          <div className="atlas-faq">
            {site.faq.map((entry) => (
              <details className="atlas-faq__entry" key={entry.q}>
                <summary>{entry.q}</summary>
                <p>{entry.a}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Hours                                                       */}
      {/* ---------------------------------------------------------- */}
      {site.hours && site.hours.length > 0 ? (
        <section id="hours" className="atlas-section">
          <SectionHead eyebrow="Hours" title="Opening times" />
          <div className="atlas-hours">
            {openStatus ? (
              <span className={`atlas-chip atlas-chip--${openTone}`}>{openStatus}</span>
            ) : null}
            <ul className="atlas-hours__list">
              {site.hours.map((entry) => (
                <li className="atlas-hours__row" key={entry.day}>
                  <span className="atlas-hours__day">{entry.day}</span>
                  <span className="atlas-hours__time">
                    {entry.open} – {entry.close}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Contact                                                     */}
      {/* ---------------------------------------------------------- */}
      <section id="contact" className={`atlas-section atlas-section--contact${site.contactDark ? ' atlas-contact--dark' : ''}`}>
        <SectionHead
          eyebrow="Contact"
          title={`Get in touch with ${site.name}`}
          lede="Reach out and we will get back to you as soon as we can."
        />
        <div className="atlas-contact__card">
          <ul className="atlas-contact__rows">
            {site.voicePhone || site.phoneClean ? (
              <li className="atlas-contact__row">
                <span className="atlas-contact__label">Phone</span>
                <a
                  className="atlas-contact__value"
                  href={`tel:${site.voicePhone || site.phoneClean}`}
                >
                  {site.voicePhone || site.phoneClean}
                </a>
              </li>
            ) : null}
            {!site.voiceOnly && site.orderDigits ? (
              <li className="atlas-contact__row">
                <span className="atlas-contact__label">WhatsApp</span>
                <a className="atlas-contact__value" href={site.whatsappHref}>
                  +{site.orderDigits}
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
                <span className="atlas-contact__label">Address</span>
                <a className="atlas-contact__value" href={site.mapsHref}>
                  {site.address}
                </a>
                <a className="atlas-contact__action" href={site.mapsHref}>
                  Get directions
                </a>
              </li>
            ) : null}
            {site.website ? (
              <li className="atlas-contact__row">
                <span className="atlas-contact__label">Website</span>
                {safeUrl(site.website) ? (
                  <a className="atlas-contact__value" href={safeUrl(site.website)}>
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
              {[site.category, site.city].filter(Boolean).join(' · ')}
            </span>
          </div>
          <nav className="atlas-footer__nav" aria-label="Footer">
            {nav.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
          <div className="atlas-footer__legal">
            <span>© {new Date().getFullYear()} {site.name}</span>
            <span>Hosted on wa.directory</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
