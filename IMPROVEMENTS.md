# WA Directory — Improvements, Fixes & Feature Roadmap

A prioritized, actionable audit of the current codebase covering **security**, **correctness**, and **UI/UX**, followed by a **feature roadmap** for both system and UI. Findings cite `file:line`. Severity: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low.

> **Headline:** the product is feature-complete and polished, but it currently ships with **authentication and data-access holes that allow full admin takeover, account takeover, and public reads of customer PII.** These must be fixed before any growth push. Nothing else on this list matters until §1 is done.

> **✅ Status (security sprint, in progress):** **C1, C2, H2, H3, H4, and L3 are now fixed in code** (see the per-item ✅ notes below) and typecheck clean. **The one remaining P0/P1 item is C3 + H1 — the RLS lockdown** (edit_token / public INSERT / PII tables), which needs a DB migration plus moving the last two client-side anon reads/writes server-side. **Before deploying these changes you MUST:** set `WHATSAPP_APP_SECRET` (Meta App dashboard → Settings → Basic → App Secret) or the webhook rejects all messages; set a strong `WEBHOOK_VERIFY_TOKEN` and `BUSINESS_AUTH_SECRET` (no more hard-coded fallbacks); and **rotate** the previously-committed `ADMIN_PASSWORD` and Supabase anon key.

---

## 1. 🔴 Critical — fix before doing anything else (security)

| # | Issue | Where | Impact |
|---|---|---|---|
| C1 | **Admin auth is a static, forgeable cookie.** The admin "session" is the literal string `admin_token=true` — no signature. `httpOnly` only blocks JS reads, not crafted requests. | `lib/admin-auth.ts:5`, `middleware.ts:40`, every `app/api/admin/*` route | Anyone runs `curl -H 'Cookie: admin_token=true' .../api/admin/delete` → full admin: delete/verify/edit any listing, approve bids & subscriptions, reset owner passwords. **Total compromise.** |
| C2 | **Account takeover via listing creation.** `/api/account/create` looks up a business by attacker-supplied `business_id`/`edit_token`; the phone "ownership" check only runs `if (phone)` and can be omitted; `upsert` overwrites any existing `password_hash`, then returns a valid session. | `app/api/account/create/route.ts:25-56` | `POST {"business_id":"<id>","password":"x"}` (no phone) hijacks **any** business portal, including already-secured ones. |
| C3 | **`edit_token` is publicly readable + public INSERT.** `businesses` has `SELECT USING(true)` over all columns (incl. secret `edit_token`) and `INSERT WITH CHECK(true)`. The anon key is public (and committed in `.env.local.example:2`). | `supabase/schema.sql:74-75`, `edit_token` col `:51` | Anyone reads every `edit_token` via PostgREST → edits any listing (`/api/edit`) and takes over any account (chains into C2). Public insert = mass spam listings. |

**Fixes:**
- **C1 — ✅ FIXED.** Login now issues a signed, expiring HMAC admin token (`lib/admin-auth.ts`), verified in `isAdmin()`, in Edge middleware, and in the three routes that previously inline-checked the cookie (`verify`/`delete`/`add`). Password compare is constant-time (`crypto.timingSafeEqual` over SHA-256 digests) — closes L3 too.
- **C2 — ✅ FIXED.** `/api/account/create` now requires the listing's `edit_token` (bare `business_id` is rejected), requires the entered phone to match the listing, and refuses to overwrite an existing `password_hash` (secured accounts must use the OTP-verified `reset` flow). The new-listing form now sends its `edit_token`. *Residual:* until C3 lands, `edit_token` is still publicly readable, so a first-time claim on a never-secured listing remains possible — C3 closes this fully.
- **C3 — ⏳ REMAINING (do next).** Stop exposing `edit_token` to anon (revoke the column from `anon`/`authenticated`, or move it to a side table). Remove the public `INSERT` policy; route the listing-form insert through a server (service role) route with validation/anti-abuse.

---

## 2. 🟠 High — security & correctness

### Security
- **H1 — ⏳ REMAINING (do next, with C3).** RLS never enabled on portal/PII tables. `business_accounts`, `stats_events`, `daily_stats`, `chat_logs`, `ratings`, `subscriptions`, `rank_spots`, `bids` have **no** `ENABLE ROW LEVEL SECURITY` and no `REVOKE` (`supabase/schema.sql:170+`). With the public anon key an attacker reads bcrypt hashes + OTPs (`business_accounts`), and **every customer phone number + private chat transcript** (`chat_logs`) — a PII breach. **Fix:** `ENABLE ROW LEVEL SECURITY` on all of them with no anon policy (default-deny), or `REVOKE ALL ... FROM anon, authenticated`. Server uses the service role, so nothing breaks — **except** `admin-listings.tsx`'s client-side `subscriptions` read, which must move server-side first (and `lib/supabase-server.ts` must stop falling back to the anon key).
- **H2 — ✅ FIXED.** `app/api/webhook/route.ts` POST now reads the raw body and rejects any request without a valid `X-Hub-Signature-256` = `HMAC-SHA256(rawBody, WHATSAPP_APP_SECRET)` (constant-time compare, fail-closed if the secret is unset). The GET verify token no longer falls back to a committed default. **Set `WHATSAPP_APP_SECRET` and `WEBHOOK_VERIFY_TOKEN` before deploy.**
- **H3 — ✅ FIXED (content-safety).** `app/api/upload/route.ts` now sniffs magic bytes and accepts only genuine PNG/JPEG/WebP (SVG rejected → no stored XSS), with a server-derived filename + content type. *Note:* the upload endpoint stays open to anonymous users because the listing funnel needs it; true auth-gating / rate-limiting is deferred to the abuse-infra work (M1/M2).
- **H4 — ✅ FIXED.** `BUSINESS_AUTH_SECRET` no longer falls back to `'wa-directory-dev-secret-change-me'` in either `lib/business-auth.ts` or `middleware.ts`; a missing secret now denies sessions (fail closed). **Replace the example password/token placeholders and rotate the real, previously-committed secrets.**

### Correctness
- **B1 — Today's stats are invisible until the next nightly rollup.** `getDailyStats`/`getLifetimeTotals` read **only** `daily_stats` (`lib/portal.ts:38-60`), which the cron populates for dates `<= CURRENT_DATE-1` (`schema.sql:288`). An owner who got 20 views today sees **0** until ~02:00 UTC tomorrow, and the "7-day" window is really 6 days ending yesterday. Feels broken. **Fix:** union `daily_stats` (history) with a live aggregate of today's `stats_events`.
- **B2 — Subscription-expiry reminders spam every night.** `notifyExpiringSubscriptions` (`app/api/cron/daily/route.ts:64-100`) has **no dedupe flag** (unlike `notifyExpiringSpots`, which uses `renewal_notified_at`). A sub expiring in 3 days sends a WhatsApp **every night** until it expires. **Fix:** add `renewal_notified_at` to `subscriptions` and filter on it.
- **B3 — Chart drops zero-activity days.** `buildChartData` (`lib/portal.ts:62-78`) only emits dates that have events, so the SVG chart shows uneven/misleading bars (2 bars for a 7-day range with activity on 2 days). **Fix:** fill the full date range with zero-days.
- **B4 — Analytics bucket by UTC, users are UTC+2.** `rollup_stats` uses `created_at::date` (`schema.sql:287`) and the portal computes "days ago" from `Date.now()` (UTC). Events near local midnight land on the wrong day. **Fix:** bucket at `America`—i.e. `(created_at AT TIME ZONE 'Africa/Harare')::date` and compute ranges in the same tz.
- **B5 — Bids are validated against the wrong month.** `POST /api/portal/ranking` validates a **next-month** bid against **this month's** active `rank_spots` fees (`route.ts:103-131`); with no active spot the caps default to `Infinity`/`$1`, so ladder rules effectively don't bind. Given payments are manual this is advisory, but the error messages imply hard rules. **Fix:** validate against the target period's spots/pending bids, or reframe the UI copy as "suggested minimum."
- **B6 — No timeout on Gemini calls in the search hot path.** `lib/gemini.ts` `fetch`es Gemini with no `AbortController`; a slow/hung Gemini stalls search-as-you-type. The SEO path also **caches empty fallbacks** permanently (`:29-30`). **Fix:** add a ~2s abort timeout; don't cache fallback text.

---

## 3. 🟡 Medium — security, correctness & UX

**Security / abuse**
- **M1 — Unauthenticated stats writes.** `app/api/stats/event/route.ts` accepts any `{business_id, type}` with no auth/rate limit → forge unlimited views/clicks (poisons ranking + analytics) and flood the table. Add per-IP/session rate limiting + basic origin checks.
- **M2 — No brute-force protection on OTP/login.** `forgot`/`otp-login`/`reset`/`admin/login` have no throttle or lockout; 6-digit OTP with a 10-min window is re-requestable indefinitely (also enables WhatsApp bombing). Add per-account + per-IP limits, OTP attempt caps, and re-request cooldown.
- **M3 — Cron endpoint trusts a spoofable header.** `app/api/cron/daily/route.ts:13` returns authorized on `x-vercel-cron: 1`, a client-suppliable header, so anyone can trigger rollups/prunes + renewal WhatsApps. (PROFILE.md:226 claims otherwise.) **Fix:** require only `CRON_SECRET`.

**UI/UX (high-impact for this audience)**
- **U1 — Pinch-zoom disabled site-wide.** `app/layout.tsx:46-47` sets `maximumScale: 1` → WCAG 1.4.4 failure; low-vision users can't zoom to read prices/phone numbers on small Androids. Remove `maximumScale`/`userScalable:false`.
- **U2 — Dark mode is half-implemented.** Many containers/cards hard-code `bg-white`/`from-white`/`text-gray-*` with no `dark:` variant: `app/search`, `app/category/[slug]`, `app/list`, `app/edit`, `app/business/[slug]` (mobile CTA bar renders white-on-white), `list-business-form`, `edit-business-form`, `portal/overview`, `portal/ranking`, `portal-tabs`, `splash`. The toggle is prominent, so users hit broken white flashes. Use the existing theme tokens (`--bg-card`, `.card`, `.input-field`); `app/page.tsx` is the correct reference.
- **U3 — Business card can crash a whole grid.** `components/business-card.tsx:~132` calls `business.phone.replace(...)` with no null guard; one listing with a null phone throws during render on the main discovery surface. Guard `(business.phone || '')` and hide the CTA when absent. (`whatsapp-button.tsx` already guards — the card is the outlier.)
- **U4 — No image optimization; full-page bg on every route.** `next/image` is used **nowhere**; plain `<img>` (no width/height → CLS) including a fixed full-screen `/wadbody.webp` on every page (`layout.tsx:75`) and hero flanks. Biggest perf lever for metered data. Migrate to `next/image`, gate decorative images behind larger breakpoints.
- **U5 — `alert()` errors + silent password drop in the listing funnel.** `list-business-form.tsx` uses blocking `alert()` for errors and **silently ignores** a password < 6 chars (owner thinks they set one, then can't log in). Replace with inline per-field errors (pattern already exists in `app/account-setup/page.tsx`).
- **U6 — Wrong canonical domain (SEO + trust).** `metadataBase`, sitemap, category JSON-LD, and a report `mailto:` point at `wadirectory.vercel.app` while the brand is `wadirectory.co.zw` (`layout.tsx:20`, `sitemap.xml/route.ts:4`, `category/[slug]/page.tsx:124`, `business/[slug]/page.tsx:555`); meanwhile `portal/overview.tsx:124` hard-codes `.co.zw` for QR values. Route everything through one `SITE_URL` constant. Splits SEO signal and breaks the report email today.
- **U7 — Hostile anti-screenshot UX on the ranking tab.** `components/portal/ranking.tsx:58-88` blacks out the tab on every `blur` (fires constantly on phones when switching to WhatsApp) and blocks copy/select/print. It's trivially bypassed yet punishes real owners — and the "protected" fees are sent as plain JSON anyway (`api/portal/ranking` returns `monthly_fee`). Remove the obstruction; enforce confidentiality server-side if it matters. (Also L1 in security.)

**Correctness (minor)**
- **B7 — Gemini JSON extraction is fragile.** `expandSearchQuery` regex `\[[\s\S]*?\]` is non-greedy and unvalidated; arrays containing `]` in a string break parsing (falls back to `[]`, acceptable but lossy). Validate the parsed value is a `string[]`.

---

## 4. 🟢 Low — polish & a11y

- **Form labels not associated** (`list-business-form`, `edit-business-form`, `login`, `search-select:83`, `multi-search-select:120`) — add `htmlFor`/`id`, `aria-invalid`/`aria-describedby`. `account-setup` is the template.
- **No `prefers-reduced-motion`** anywhere — perpetual marquee/typing/spinner drain battery on low-end phones and fail WCAG 2.3.3. Add a global reduce block in `globals.css`.
- **Custom dropdown positioning bug** — `multi-search-select.tsx:178` has conflicting `absolute … relative`; panel renders in-flow and shoves the form. Give the wrapper `relative`, drop the stray class; mirror `search-bar.tsx` ARIA.
- **Empty-star contrast** — `text-gray-200` empty stars are near-invisible on white (`business-card`, `featured-scroll:10`, `business/[slug]`); ratings are the key trust cue. Darken + add `dark:`.
- **Icon-only controls** — navbar theme toggle lacks `aria-label`; QR studio modal (`qr-card.tsx`) close button unlabeled, no Escape/backdrop-close/focus-trap; no global `:focus-visible` ring. 
- **WhatsApp deep-link race** — `whatsapp-button.tsx` sets `whatsapp://` then a 500ms `wa.me` fallback that can double-navigate. Prefer a plain `wa.me` `<a href>` (routes to the app when installed). This is the product's core action — make it bulletproof.
- **Perceived-perf** — `count-up` flashes "0" before animating; navbar fetches `/api/account/session` on every load causing Login↔Portal flicker; `banner-strip` reads `sessionStorage` in a `useState` initializer (hydration mismatch risk).
- **`/api/debug` public** — discloses which secrets are configured + recent listings. Delete or gate behind admin.
- **Account enumeration** — `api/account/login` returns distinct messages ("no account" vs "no password" vs "wrong password"); return one generic error.
- **Public "Admin Login" link in the footer** — increases attack surface; remove/obfuscate.
- **`admin/page.tsx` eagerly bundles all 10 tabs** (incl. recharts) though one shows at a time — lazy-load per tab to trim the admin bundle.

---

## 5. 🚀 Feature roadmap

New capabilities (beyond fixes), split into system and UI, ordered roughly by leverage.

### System / backend
1. **Payments integration (highest business value).** Replace manual EcoCash/bank confirmation with a real gateway (Paynow / EcoCash API / Stripe for diaspora) so subscriptions and bid wins self-serve, auto-activate, and auto-renew. This unblocks scaling revenue without admin bottleneck.
2. **Demand analytics as a product.** You already log every `bot_search`/search query. Aggregate "what people search for that has **no** matching supply, by category + city" — sell it to businesses ("142 people searched 'solar Gweru' last month, 0 verified vendors") and use it to recruit supply. This is the proprietary data moat.
3. **Lead attribution & receipts.** You track `bot_chat_open` and `qr_scan` per business — surface "we sent you N customers this month" in the portal and in renewal messages. Underpins pricing power for placement.
4. **Verification at scale.** A structured verification workflow (WhatsApp OTP to the listed number + optional document/location check) with tiers; make the verified badge a paid trust product.
5. **Notifications & re-engagement.** Opt-in WhatsApp broadcast for owners ("your weekly stats", "someone searched your category"); template-based, compliant with Meta's rules.
6. **Deduped, timezone-correct analytics** (fixes B1–B4) plus **weekly/monthly digests**.
7. **Search quality:** persist embeddings/synonyms so Gemini isn't in the hot path; add typo tolerance and Shona synonym expansion server-side.
8. **Multi-channel resilience** to reduce Meta dependence: SMS/Telegram fallback on the same data model; keep web+PWA+SEO as an independent surface.
9. **Rate limiting + abuse infra** (Upstash/Vercel KV) as shared middleware — also satisfies M1/M2.
10. **Admin observability:** audit log of admin actions, error monitoring (Sentry), and uptime alerts.

### UI / UX
1. **Shona (and localized) UI** — the home page already promises Shona search (`page.tsx:197`) but the UI is English-only. Deliver real i18n or soften the claim; a Shona toggle is a strong trust/differentiation signal for this market.
2. **City & category filters on `/search` and `/category`** — currently only a "verified" toggle + sort (`filter-bar.tsx`). City filtering is high value in a geographically spread market (Harare vs Bulawayo).
3. **Save / favorites** — let shoppers bookmark vendors to compare; drives return visits (works offline in the PWA).
4. **Offline fallback** — a service worker is registered but there's no offline page/messaging for a frequently-offline audience; cache recent listings.
5. **Owner onboarding polish** — inline validation, progress save/resume on the listing form, and a clear "what happens next" after submit; a first-login portal tour.
6. **Richer profiles** — business hours display, photo gallery, service/price list, map pin (optional, since addresses are informal), and "message templates" for common questions.
7. **Trust surface** — display review text (not just stars), "responds quickly" badges from `chat_logs` latency, and report/flag flow.
8. **Portal UX** — real charts with zero-day fill (B3), today's live numbers (B1), benchmark vs category, and a plain-language "how to get more customers" coach.
9. **QR everywhere** — printable A5 poster / shelf-talker templates and a "add to WhatsApp status" share, turning every owner into a distributor.
10. **Accessibility baseline** — the a11y items in §3–4 (zoom, labels, focus, reduced-motion, contrast) as one sweep; matters for an older, lower-literacy, low-end-device audience.

---

## 6. Suggested execution order

1. **Security sprint (P0 + P1 security):** C1 → C2 → C3 → H1 → H4 → H2 → H3. Rotate all committed secrets. *Do this before any marketing/growth.*
2. **Correctness sprint:** B1 (today's stats) → B2 (notify spam) → B3/B4 (chart + tz) → M1/M2/M3 (rate limiting + cron).
3. **UX-breaks sprint:** U1 (zoom) → U3 (card crash) → U2 (dark mode) → U5 (funnel) → U6 (domain) → U4 (images) → U7 (ranking UX).
4. **Payments + demand-data** (the two features that convert this from a nice product into a scalable business).
5. **Polish (§4) + remaining features (§5)** as ongoing.

> Positive note: the code has genuinely good patterns to standardize on — `app/account-setup/page.tsx` (forms), `components/search-bar.tsx` (combobox a11y), and `app/page.tsx` / `error.tsx` / `not-found.tsx` (dark mode + states). Most UI fixes are "apply the pattern you already have, consistently."
