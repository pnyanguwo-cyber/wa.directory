/*
  Market — warm market layout with collage hero.

  Self-contained theme: all styling lives in ./theme.css, all helpers in
  ./lib.tsx, and cart state in ./cart.tsx. Rendered inside wa.directory's
  registry with a real SiteView, or standalone via app/page.tsx with
  buildSampleSiteView().
*/

import type { CSSProperties, ReactNode } from 'react';
import './theme.css';
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
} from './lib';
import { CartProvider, AddToCartButton, CartBar, CartDrawer } from './cart';
import type { ThemeItem, ThemeProps } from './types';

const WA_ICON =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.898 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z';

const CALL_ICON =
  'M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z';

const SHOP_LIMIT = 6;

const FALLBACK_INK = '#221A14';

function VerifiedBadge(): ReactNode {
  return (
    <span className="market-verified" title="Verified business">
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
      <span className="market-verified__sr">Verified</span>
    </span>
  );
}

function SectionHead({ eyebrow, title, lede }: { eyebrow?: string; title: string; lede?: string }): ReactNode {
  return (
    <div className="market-section__head">
      {eyebrow ? <p className="market-eyebrow">{eyebrow}</p> : null}
      <h2 className="market-section__title">{title}</h2>
      {lede ? <p className="market-section__lede">{lede}</p> : null}
    </div>
  );
}

function HeroContent({ site, orderHref }: { site: ThemeProps['site']; orderHref: string }): ReactNode {
  const eyebrow = [site.category, site.city].filter(Boolean).join(' · ');
  return (
    <div className="market-hero__content">
      {eyebrow ? <p className="market-eyebrow">{eyebrow}</p> : null}
      <h1 className="market-hero__title">
        {site.name}
        {site.verified ? <VerifiedBadge /> : null}
      </h1>
      {site.tagline ? <p className="market-hero__lede">{site.tagline}</p> : null}
      {site.reviewCount > 0 ? (
        <div className="market-hero__rating">
          <StarRating value={site.rating} />
          <span>
            {site.rating.toFixed(1)} · {site.reviewCount} reviews
          </span>
        </div>
      ) : null}
      <div className="market-hero__actions">
        {orderHref ? (
          <a
            className="market-btn market-btn--cta"
            href={orderHref}
            target={site.voiceOnly ? undefined : '_blank'}
            rel="noopener noreferrer"
          >
            {site.voiceOnly ? 'Call now' : 'Order on WhatsApp'}
          </a>
        ) : null}
        {site.profileHref ? (
          <a className="market-btn market-btn--soft" href={site.profileHref}>
            View profile
          </a>
        ) : null}
      </div>
    </div>
  );
}

function HeroCollage({ site }: { site: ThemeProps['site'] }): ReactNode {
  const photos = site.gallery.slice(0, 3);
  return (
    <div className="market-collage">
      <div className="market-collage__main">
        {photos[0] ? (
          <img src={photos[0]} alt={site.name} loading="eager" />
        ) : (
          <Placeholder label={site.name} category={site.category} tone="dark" />
        )}
      </div>
      <div className="market-collage__side">
        {[photos[1], photos[2]].map((photo, index) => (
          <div className="market-collage__cell" key={photo ?? `slot-${index + 2}`}>
            {photo ? (
              <img src={photo} alt={`${site.name} photo ${index + 2}`} loading="lazy" />
            ) : (
              <Placeholder label={site.name} category={site.category} tone="dark" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ItemCard({ site, item }: { site: ThemeProps['site']; item: ThemeItem }): ReactNode {
  const status = itemStatus(item);
  const orderHref = itemOrderHref(site, item);
  return (
    <article className="market-item">
      <div className="market-item__media">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} loading="lazy" />
        ) : (
          <Placeholder label={item.name} category={item.category ?? site.category} tone="dark" />
        )}
      </div>
      <div className="market-item__body">
        {item.category ? <span className="market-chip">{item.category}</span> : null}
        <h3 className="market-item__name">{item.name}</h3>
        {item.description ? <p className="market-item__desc">{item.description}</p> : null}
      </div>
      <div className="market-item__foot">
        <span className="market-item__price">{money(item)}</span>
        {status ? (
          <span className={`market-chip market-chip--${status.tone}`}>{status.label}</span>
        ) : null}
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
    </article>
  );
}

export default function MarketTheme({
  site,
  orientation = 'catalogue',
  mode = 'preview',
}: ThemeProps): ReactNode {
  const orient = orientation === 'stacked' ? 'stacked' : 'catalogue';
  const orderHref = whatsappOrderHref(site);

  const themeVars = {
    '--market-head': site.fontPair.head,
    '--market-body': site.fontPair.body,
    '--market-accent': site.accent,
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
    <div className="market-root" id="top" data-theme="market" data-mode={mode} style={themeVars}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(site.jsonLd) }} />
      <CartProvider
        business={{ slug: site.slug, name: site.name, digits: site.orderDigits, voiceOnly: site.voiceOnly }}
      >
        <header className="market-header">
          <div className="market-header__inner">
            <a className="market-brand" href="#top">
              {site.logoUrl ? (
                <img className="market-brand__logo" src={site.logoUrl} alt={site.name} />
              ) : (
                <span className="market-brand__monogram" aria-hidden="true">
                  {site.initials}
                </span>
              )}
              <span className="market-brand__name">{site.name}</span>
            </a>
            <nav className="market-nav" aria-label="Sections">
              {site.navItems.map((nav) => (
                <a className="market-nav__link" href={nav.href} key={nav.href}>
                  {nav.label}
                </a>
              ))}
            </nav>
            {orderHref ? (
              <a
                className="market-btn market-btn--soft market-header__cta"
                href={orderHref}
                target={site.voiceOnly ? undefined : '_blank'}
                rel="noopener noreferrer"
              >
                {site.voiceOnly ? 'Call now' : 'Order on WhatsApp'}
              </a>
            ) : null}
          </div>
        </header>
        {orient === 'catalogue' ? (
          <section className={`market-hero market-hero--catalogue${site.isHeroDark ? ' market-hero--dark' : ''}`}>
            <div className="market-hero__inner">
              <HeroContent site={site} orderHref={orderHref} />
              <HeroCollage site={site} />
            </div>
          </section>
        ) : (
          <section className={`market-hero market-hero--stacked${site.isHeroDark ? ' market-hero--dark' : ''}`}>
            <div className={`market-hero__media${site.coverImage ? '' : ' market-hero__media--bare'}`}>
              {site.coverImage ? (
                <>
                  <img src={site.coverImage} alt={site.name} loading="eager" />
                  <div className="market-hero__wash" style={washStyle(site)} aria-hidden="true" />
                </>
              ) : (
                <Placeholder label={site.name} category={site.category} tone="dark" />
              )}
            </div>
            <div className="market-hero__band">
              <div className="market-hero__inner">
                <HeroContent site={site} orderHref={orderHref} />
              </div>
            </div>
          </section>
        )}
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
        {(() => {
          const shopSection = site.items.length > 0 ? (
            <section
              id="shop"
              className={`market-section market-section--shop${site.isShopDark ? ' market-shop--dark' : ''}`}
            >
              <SectionHead
                eyebrow="Shop"
                title="From the shelves"
                lede="Popular items ready to order — tap add to build your basket."
              />
              <div className="market-items">
                {site.items.slice(0, SHOP_LIMIT).map((item) => (
                  <ItemCard key={item.id} site={site} item={item} />
                ))}
              </div>
              {site.items.length > SHOP_LIMIT && site.profileHref ? (
                <div className="market-shop__all">
                  <a className="market-btn market-btn--soft" href={site.profileHref}>
                    View all {site.items.length} products
                  </a>
                </div>
              ) : null}
            </section>
          ) : null;

          const servicesSection = site.menuServices.length > 0 ? (
            <section id="services" className="market-section">
              <SectionHead eyebrow="Services" title="What we do" />
              <ul className="market-services">
                {site.menuServices.map((service, index) => (
                  <li className="market-service" key={index}>
                    <span className="market-service__dot" aria-hidden="true" />
                    {service}
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
        {site.gallery.length > 0 ? (
          <section id="gallery" className="market-section">
            <SectionHead eyebrow="Gallery" title="A look inside" />
            <div className="market-gallery">
              {site.gallery.map((photo) => (
                <figure className="market-gallery__frame" key={photo}>
                  <img src={photo} alt={`${site.name} photo`} loading="lazy" />
                </figure>
              ))}
            </div>
          </section>
        ) : null}
        {site.testimonials.length > 0 ? (
          <section id="reviews" className="market-section">
            <SectionHead eyebrow="Reviews" title="What customers say" />
            <div className="market-reviews">
              {site.testimonials.map((review) => (
                <figure className="market-review" key={review.comment}>
                  <blockquote className="market-review__comment">“{review.comment}”</blockquote>
                  <figcaption className="market-review__foot">
                    <StarRating value={review.rating} />
                    <span className="market-review__name">{review.name}</span>
                    <span className="market-review__date">{formatTimestamp(review.created_at)}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}
        {site.faq.length > 0 ? (
          <section id="faq" className="market-section">
            <SectionHead eyebrow="FAQ" title="Common questions" />
            <div className="market-faq">
              {site.faq.map((entry) => (
                <details className="market-faq__entry" key={entry.q}>
                  <summary>{entry.q}</summary>
                  <p>{entry.a}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}
        {site.hours ? (
          <section id="hours" className="market-section">
            <SectionHead eyebrow="Hours" title="Opening hours" />
            <div className="market-hours">
              <ul className="market-hours__list">
                {site.hours.map((row) => (
                  <li className="market-hours__row" key={row.day}>
                    <span className="market-hours__day">{row.day}</span>
                    <span className="market-hours__time">
                      {row.open && row.close ? `${row.open} – ${row.close}` : 'Closed'}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="market-hours__status">{getOpenStatus(site.hours)}</p>
            </div>
          </section>
        ) : null}
        <section id="contact" className="market-section market-section--contact">
          <div className="market-contact">
            <SectionHead
              eyebrow="Contact"
              title="Visit, call or write"
              lede="Questions about stock or delivery? Reach out — we reply fast."
            />
            <div className="market-contact__card">
              <ul className="market-contact__rows">
                {site.phoneClean ? (
                  <li className="market-contact__row" key="phone">
                    <span className="market-contact__label">Phone</span>
                    <span className="market-contact__value">
                      {site.voiceOnly ? site.voicePhone || site.phoneClean : site.phoneClean}
                    </span>
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
                      <a className="market-contact__value" href={safeUrl(site.website)} target="_blank" rel="noopener noreferrer">
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
                      <a className="market-contact__action" href={site.mapsHref} target="_blank" rel="noopener noreferrer">
                        Get directions
                      </a>
                    ) : null}
                  </li>
                ) : null}
              </ul>
              {orderHref ? (
                <a
                  className="market-btn market-btn--cta market-contact__cta"
                  href={orderHref}
                  target={site.voiceOnly ? undefined : '_blank'}
                  rel="noopener noreferrer"
                >
                  {site.voiceOnly ? 'Call now' : 'Chat on WhatsApp'}
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
                  {[site.category, site.city].filter(Boolean).join(' · ') || 'Listed on wa.directory'}
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
            <p className="market-footer__legal">Powered by wa.directory</p>
          </div>
        </footer>
        <CartBar />
        <CartDrawer />
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
