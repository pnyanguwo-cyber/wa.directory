# WA Directory — Detailed Project Analysis

A deep-dive into the **WA Directory** codebase: a Zimbabwean business directory that lets users discover businesses on the web and through a WhatsApp chatbot, while businesses get free listings, public profiles with QR codes, a self-service analytics portal, paid subscriptions, and a bidding system for top search placements.

**Live:** `https://wadirectory.vercel.app` / `https://wadirectory.co.zw`
**Type:** Next.js 14 App Router application, TypeScript, Supabase backend, deployed on Vercel.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, React 18, TypeScript) |
| Styling | Tailwind CSS 3 (custom `whatsapp` / `surface` / `text-*` theme in `tailwind.config.ts`) |
| Database | Supabase (PostgreSQL) via `@supabase/supabase-js` |
| Keys | Service-role key server-side (`lib/supabase-server.ts`), anon key for public client routes |
| WhatsApp | Meta WhatsApp Cloud API (Graph v18.0) — webhook, templates, interactive flows |
| AI | Google Gemini 2.0 Flash (`gemini-2.0-flash`) for SEO blurbs + search-query expansion, cached in `ai_cache` |
| Auth | Self-implemented HMAC-SHA256 signed tokens in HttpOnly cookies (no external provider) |
| Passwords | `bcryptjs` |
| QR codes | `qrcode.react` (client card) + server redirect routes `/qr/[slug]`, `/go/[id]` |
| OG images | `@vercel/og` (`app/business/[slug]/opengraph-image.tsx`) |
| PWA | Web manifest (`app/manifest.ts`), service worker (`public/sw.js`), install prompt |
| Deployment | Vercel — daily cron via `vercel.json`, Edge middleware, static/ISR pages |
| Migrations | Raw SQL in `supabase/schema.sql` + `supabase/migrations/*.sql`, applied with `scripts/run-sql.mjs` (Supabase Management API) |

### Environment variables (`.env.local`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged key |
| `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Cloud API sending |
| `WEBHOOK_VERIFY_TOKEN` | Meta webhook `hub.verify_token` challenge |
| `GEMINI_API_KEY` | Gemini for bios + search expansion |
| `ADMIN_PASSWORD` | `/admin-login` password |
| `ADMIN_WHATSAPP` | Admin notification recipient (+263…) |
| `BUSINESS_AUTH_SECRET` | HMAC secret for business portal session cookies |
| `CRON_SECRET` | Bearer token protection for `/api/cron/daily` |
| `SITE_URL` | Canonical URL (default `https://wadirectory.co.zw`) |
| `WHATSAPP_TEMPLATE_APPROVED` | Template name for "you're live" messages (default `you_are_live`) |
| `SUPABASE_PAT`, `PROJECT_REF` | Only used by `scripts/run-sql.mjs` |

---

## 2. Directory Map

```
wa.directory/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # Root layout: navbar, banners, PWA, footer, background art
│   ├── page.tsx              # Home: hero, search, category chips, featured, recent, show-more
│   ├── globals.css           # Tailwind + custom theme utilities
│   ├── manifest.ts           # PWA web manifest
│   ├── icon.png              # App icon
│   ├── sitemap.xml/route.ts  # Generated sitemap
│   ├── search/page.tsx       # Search results (Gemini expansion + paid ranking)
│   ├── business/[slug]/      # Profile page + opengraph-image.tsx
│   ├── category/[slug]/      # Category listing page
│   ├── list/page.tsx         # "List your business" form page
│   ├── edit/page.tsx         # Self-service edit via ?token=
│   ├── my-qr/[slug]/         # Printable QR page (chat + portal QR)
│   ├── login/page.tsx        # Business portal login
│   ├── account-setup/        # First-time portal password setup via token
│   ├── admin/page.tsx        # Admin dashboard (10 tabs)
│   ├── admin-login/          # Admin password login
│   ├── portal/               # Business portal (overview, ranking, conversations, billing, improve)
│   ├── go/[id]/route.ts      # Bot deep link → wa.me (tracks bot_chat_open + chat log)
│   ├── qr/[slug]/route.ts    # QR scan → wa.me (tracks qr_scan)
│   └── api/                  # 40+ API routes (see §7)
├── components/               # 25 shared UI components
│   ├── admin/                # 10 admin tab components + shared.tsx
│   └── portal/               # Portal: overview, ranking, conversations, billing
├── lib/                      # Server/client logic modules
├── data/                     # Static taxonomy & locations
├── supabase/                 # schema.sql, seed-data.sql, migrations/
├── scripts/                  # Node maintenance scripts
├── public/                   # sw.js, robots.txt, webp art, icons
└── middleware.ts             # Edge route protection (admin + portal)
```

---

## 3. Data Model (Supabase)

All in `supabase/schema.sql` (idempotent, safe to re-run). RLS is enabled with public read policies; writes go through the service role.

### Core directory
- **`businesses`** — `id` (uuid), `name`, `slug` (unique), `bio`, `category` (text[]), `location`, `country_code` (default `+263`), `city`, `area`, `areas` (text[]), `phone`, `whatsapp_link`, `whatsapp_username`, `website`, `catalog_link`, `logo_url`, `price_range`, `verified`, `rating`, `review_count`, `edit_token` (secret self-edit key), `created_at`. Trigram GIN indexes on name/bio; indexes on category, verified, rating.
- **`categories`** — admin-managed taxonomy: `name` (unique), `icon` (emoji), `keywords` (text[]), `active`.
- **`areas`** — per-city service areas: `city` + `name` (unique pair), `active`.
- **`feature_requests`** — user suggestions for new categories/areas, status workflow (pending/approved/rejected), `corrected_name`.
- **`banners`** — site-wide announcement strip: `text`, `link`, `link_label`, `active`.
- **`ai_cache`** — JSONB cache keyed by `cache_key` for Gemini results (7-day TTL enforced in code).
- **`chat_sessions`** — WhatsApp bot conversation state: `phone` (PK), `step`, `data` (JSONB).

### Business portal / monetisation
- **`business_accounts`** — `business_id` (unique, FK cascade), `password_hash` (bcrypt), `otp_hash`/`otp_expires_at` (OTP login), `disabled`.
- **`stats_events`** — append-only raw event log: `business_id`, `type` (10 allowed types), `category`, `city`, `created_at`.
- **`daily_stats`** — per-business-per-day rollup (`business_id`, `date`, `type`, `count` — composite PK), built nightly by cron.
- **`chat_logs`** — bot transcripts: `customer_phone` + `business_id` (unique pair), `messages` (JSONB), `found_via`.
- **`ratings`** — 1–5 star + comment, one per customer/business (app-side dedup); refreshes `businesses.rating`.
- **`subscriptions`** — status (pending/active/expired/cancelled), `amount`, `started_at`, `expires_at`, `admin_note`.
- **`rank_spots`** — paid top-3 placements per (category, city): `position` (1–3), `monthly_fee`, `period_start/end`, `status`, `renewal_notified_at`. Unique (category, city, position, period_start).
- **`bids`** — monthly bidding ledger: `period` (YYYY-MM), `amount`, status (pending/approved/rejected/outbid/expired), `admin_feedback`.

### SQL functions (called by cron)
- `rollup_stats()` — aggregates `stats_events` into `daily_stats`, prunes raw events older than 92 days.
- `expire_ranks()` — expires `rank_spots` past `period_end` and `subscriptions` past `expires_at`.

### Migrations
- `001_add_whatsapp_username.sql` — adds `whatsapp_username` (schema drift fix).
- `002_add_chat_sessions.sql` — creates `chat_sessions` table.
- `003_add_website.sql` — adds `website` column.

---

## 4. Architecture & Data Flow

```
Browser ──► Next.js 14 (Vercel)
              ├─ Server components → supabase-js (service role) → Postgres
              ├─ Client components → /api/stats/event (sendBeacon tracking)
              ├─ /api/search (anon key, type-ahead)
              └─ /api/webhook ◄── Meta WhatsApp Cloud API
Vercel cron (02:00 UTC) ──► /api/cron/daily ──► RPCs + WhatsApp reminders
Edge middleware ──► guards /admin/* and /portal/* via cookie checks
```

- **Server components** fetch directly with the service-role key; public pages are cached (ISR: `revalidate` = 300–3600s, `force-dynamic` on search).
- **Client tracking** uses `navigator.sendBeacon` (fallback `fetch keepalive`) via `lib/track.ts`.
- **Auth is stateless**: `businessId.expiry.HMAC` token in an HttpOnly cookie — verified in Edge middleware (WebCrypto) and in API routes (Node `crypto`). No sessions table.

---

## 5. Modules — `lib/`

| File | Purpose |
|---|---|
| `supabase-server.ts` | `getSupabase()` — service-role client for server context |
| `supabase-client.ts` | Anon-key client for public/client contexts |
| `business-select.ts` | Column projections: `BUSINESS_CARD_COLUMNS`, `BUSINESS_PROFILE_COLUMNS` |
| `approved-data.ts` | Cached approved categories/areas (`unstable_cache`, 5-min revalidate); `matchCategoryAgainst()` scoring vs. DB + static taxonomy |
| `whatsapp.ts` | `sendWhatsAppMessage` (text) + `sendWhatsAppTemplate` via Graph v18.0 |
| `gemini.ts` | `generateSEOBlurb()` + `expandSearchQuery()` with `ai_cache` (7-day TTL) |
| `ai-cache.ts` | `getCached` / `setCached` JSONB cache in Supabase |
| `chat-session.ts` | Bot state machine persistence (get/save/clear) |
| `track.ts` | `trackEvent(businessId, type, extra)` — sendBeacon |
| `stats-format.ts` | Event types, labels, colors, `csvEscape()` |
| `portal.ts` | Portal data: business, subscription, paid status, daily stats, lifetime totals, ranking data, chart builder, memoization |
| `ranking.ts` | `orderSearchResults()` — paid spots first + deterministic weighted shuffle |
| `memo.ts` | In-memory promise memoizer with TTL |
| `business-auth.ts` | Sign/verify/set/clear business session cookie, `normalizePhone()` |
| `admin-auth.ts` | `isAdmin()` — admin cookie check |

### Search ranking (`lib/ranking.ts`)
1. **Paid spots first** — active `rank_spots` for the (category, city); nationwide spots (`city = ''`) as fallback; order by position 1→2→3.
2. **Weighted shuffle** — deterministic (seeded by query) mulberry32 PRNG; businesses with fewer 30-day `profile_view`s get a higher weight (recency/fairness boost).
3. Applied on both `/search` and `/category/[slug]`.

---

## 6. Data — `data/`

- **`categories.ts`** — ~42 static categories with Shona/English keywords (`magetsi`, `mota`, `chikoro`…) and emoji icons, plus `matchCategory()` keyword scorer. DB `categories` table overrides/extends this via `approved-data.ts`.
- **`zimbabwe-locations.ts`** — ~75 towns/cities with their areas (Harare, Bulawayo, Chitungwiza, Mutare… down to rural districts), used by the bot's city/area detection and the search URL parsing.
- **`countries.ts`** — 28 country dial codes (default Zimbabwe `+263`, mobile prefix `7`, 9 digits) + `validatePhone()`.

---

## 7. API Route Map

```
Public:
  GET  /api/search                 Type-ahead suggestions (anon key)
  GET  /api/businesses             Public business listings
  POST /api/stats/event            Event ingestion (validated types)
  POST /api/feature-request        Suggest new category/area
  POST /api/generate-bio           Gemini-generated bio for listing form
  POST /api/upload                 Logo upload → Supabase Storage ('logos' bucket)
  GET/POST /api/webhook            WhatsApp Cloud API verification + inbound messages
  GET  /api/debug                  DB connectivity diagnostic

Listing / Edit:
  POST /api/business/create        Create listing (web form)
  POST /api/edit                   Edit listing via edit_token
  POST /api/admin/notify-new-business  Internal notification helper

Accounts (business portal):
  POST /api/account/create         Create account (from edit token)
  POST /api/account/login          Password login → session cookie
  POST /api/account/otp-login      OTP login (WhatsApp-delivered code)
  POST /api/account/logout
  GET  /api/account/session        Session check
  POST /api/account/forgot         Request reset (WhatsApp link)
  POST /api/account/reset          Reset password

Portal:
  POST /api/portal/ranking         Place a bid
  POST /api/portal/billing/upgrade Request subscription upgrade

Admin (cookie-gated):
  /api/admin/login | logout | add | verify | delete | update-business
  /api/admin/listings | stats | rankings | subscriptions | accounts
  /api/admin/categories | areas | banners | chat-sessions | feature-requests

Cron:
  GET  /api/cron/daily             Requires x-vercel-cron:1 or Bearer CRON_SECRET
```

---

## 8. The WhatsApp Bot (`app/api/webhook/route.ts`)

The core growth channel. Inbound text is routed through a step machine stored in `chat_sessions`:

1. **Commands** — `help` / `hi` / `hello` → help text; `register` / `list me` / `sign me up` → registration flow.
2. **Registration flow** (steps: `name → username → phone → category → description → city → area → confirm`):
   - Validates WhatsApp username format (`^[a-zA-Z0-9_]{3,}$`) and phone against Zimbabwe rules.
   - Matches category against approved list; unmatched → shows picker; auto-creates `feature_requests` for unapproved category/area.
   - On confirm → inserts unverified business (generates slug + `edit_token`) → sends WhatsApp message with links to `/edit?token=`, `/account-setup?token=`, `/my-qr/<slug>`.
   - Notifies `ADMIN_WHATSAPP` of the pending listing.
3. **Search** — natural-language: detects city from `zimbabweCities`, strips stopwords, matches category via `matchCategoryAgainst`, queries verified businesses (name/bio/category/city OR), returns top 5 with `wa.me` chat links and profile links; fires `bot_search` events; appends transcript to `chat_logs`.
4. **Rating flow** — after a business chat is opened via `/go/[id]`, the bot later prompts a 1–5 rating (+ optional comment, or `skip`); stores in `ratings` and recomputes `businesses.rating` (`refreshBusinessRating`).
5. **Transcripts** — every exchange is appended to `chat_logs` (`appendTranscript`), visible to businesses in the portal (paid feature) and to admins.

**Deep-link attribution:**
- `/go/[id]?f=<customerPhone>&via=<query>` — records `bot_chat_open`, upserts a chat log ("Customer opened your chat (found via …)"), then 302 → `wa.me/<businessPhone>`.
- `/qr/[slug]` — records `qr_scan`, then redirects to `wa.me` with a QR-specific message.

---

## 9. Business Portal (`/portal`)

Protected by middleware + `lib/business-auth.ts` (30-day session). Paid tier = active subscription (`isPaidSubscriber`).

| Feature | Free | Paid |
|---|---|---|
| Overview: 7-day stats, lifetime totals, SVG chart, CSV export | ✅ | ✅ (30/90-day/all ranges, per-event breakdown) |
| Improve: tips + comparison vs category averages | ✅ | ✅ (full competitor data) |
| Conversations: WhatsApp chat logs | ❌ | ✅ |
| Ranking: view top-3 fees, bid for spots | ✅ (view) | ✅ (bid + **anti-screenshot overlay**) |
| Billing: request/see subscription status | ✅ (request) | — |

- **Bidding rules** (per category+city, next month): bid for #1 must exceed current #1 fee; #2 must be < #1; #3 < #2 (with fallbacks to $1 floors). Bids notify the admin on WhatsApp; admin approves in `/admin`.
- **Login options**: password (bcrypt) or **OTP via WhatsApp** (`otp-login`, code delivered to the business phone).
- **Account setup** (`/account-setup?token=`): first-time password creation; token redemption links the business to a `business_accounts` row.
- **Password reset** (`/forgot`): short-lived token delivered via WhatsApp, consumed by `/reset`.

---

## 10. Admin Dashboard (`/admin`)

Password login (`ADMIN_PASSWORD`), cookie `admin_token=true`, middleware-protected. Ten tabs, each a client component backed by an admin API route:

1. **Listings** — review pending, approve (sends WhatsApp template `you_are_live`), reject, delete, edit.
2. **Statistics** — site-wide event counts from `daily_stats`.
3. **Rankings & Bids** — configure 3 spots per category/city + monthly fee + period; approve/reject/activate bids.
4. **Subscriptions** — activate/pause, set amount/expiry, admin note.
5. **Accounts** — list portal accounts, reset passwords (WhatsApp link), disable.
6. **Categories** — CRUD + icons + keywords.
7. **Areas** — CRUD per city.
8. **Requests** — approve/reject feature requests (new categories/areas).
9. **Banners** — CRUD announcement strip.
10. **Chat sessions** — live bot transcripts.

Admin actions push WhatsApp notifications to `ADMIN_WHATSAPP` (new listing, bid, upgrade request, feature request).

---

## 11. Tracking & Analytics Pipeline

1. Client fires `POST /api/stats/event` (sendBeacon) — event types: `profile_view`, `click_whatsapp`, `click_call`, `click_website`, `impression`, `qr_scan`, `bot_search`, `bot_chat_open`, `share_bot`, `share_web`.
2. Rows land in `stats_events` (validated whitelist).
3. **Nightly cron** (02:00 UTC, `vercel.json`):
   - `rollup_stats()` → `daily_stats`, prune raw events (>92 days).
   - `expire_ranks()` → expire past-due spots/subscriptions.
   - `notifyExpiringSpots()` — WhatsApp reminder 7 days before spot expiry (deduped via `renewal_notified_at`).
   - `notifyExpiringSubscriptions()` — WhatsApp reminder 3 days before subscription expiry.
4. Portal reads `daily_stats`; charts render as inline SVG client-side; CSV export via `csvEscape`.

---

## 12. Key Pages & UX Highlights

- **Home** (`/`) — hero with glass-mesh gradient + background art (`wad1/wad2.webp`), typing headline (`TypingHeadline`), large search bar, popular category chips, "Over N verified businesses" count, **FeaturedScroll** (continuous auto-advancing marquee, never pauses on hover), **FeaturedBusinesses** (top-3), **ShowMoreSection** (paged grid, 6/click).
- **Search** (`/search`) — full-text with Gemini query expansion (`expandSearchQuery`), paid-rank ordering, `ImpressionPing`, `FilterBar` (verified toggle, newest/rating sort).
- **Profile** (`/business/[slug]`) — static-generated (ISR 1h) with `generateStaticParams` (up to 5000), JSON-LD `LocalBusiness` schema, popularity bar (30-day views), verified badge, pending-category grey chips, QR card, ratings & reviews (masked phone numbers), similar businesses, tracked WhatsApp/call/website buttons, mobile sticky CTA, "Report this business" mailto.
- **Category pages** (`/category/[slug]`) — filtered listings with Gemini SEO blurb + ranking.
- **PWA** — manifest with theme `#25D366`, service worker v3, install button, offline shell.
- **Banner strip** — site-wide announcements loaded via `banner-strip-loader`.
- **Sitemap** — generated in `app/sitemap.xml/route.ts`.

---

## 13. Scripts & Maintenance (`scripts/`)

| Script | Purpose |
|---|---|
| `run-sql.mjs` | Apply SQL via Supabase Management API (`SUPABASE_PAT`, `PROJECT_REF`) |
| `seed.ts` / `seed.mjs` / `seed-admin-data.mjs` | Seed businesses, categories, areas, banners |
| `migrate.mjs` | Copy businesses between old/new Supabase projects (skip by slug) |
| `backfill-usernames.mjs` / `sync-whatsapp-usernames.mjs` | Backfill/sync `whatsapp_username` across projects |
| `update-wa-token.mjs` | Rotate WhatsApp access token |
| `migrate.mjs` | Data migration tooling |

`npm run lint` (next lint), `npm run build`, `npx tsc --noEmit` for typecheck.

---

## 14. Security Notes

- Service-role key is **never exposed to the browser** (server components/API only; public routes use the anon key).
- Portal cookies: HMAC-SHA256-signed `businessId.expiry`, HttpOnly, `sameSite=lax`, 30-day max age, expiry re-checked in Edge middleware and API routes.
- Passwords bcrypt-hashed; OTP codes and reset links delivered only via WhatsApp to the registered business phone.
- Cron endpoint gated by `x-vercel-cron: 1` (Vercel-injected) or `Authorization: Bearer CRON_SECRET`.
- Admin APIs require the `admin_token` cookie; middleware blocks `/admin` and `/portal` paths.
- `/portal/ranking` has an anti-screenshot overlay (blur + print/screenshot/copy blocked).
- `.env.local` is gitignored; only `.env.local.example` with placeholders is committed.
- Event ingestion validates the `type` whitelist before insert.

---

## 15. Monetisation Model

1. **Rank spots** — top-3 paid placements per (category, city), monthly fee set by admin, sold via monthly bidding (position-based price ladder). Renewal reminders via cron.
2. **Subscriptions** — monthly premium tier unlocking full stats ranges, conversations (bot chat logs), and ranking/bidding. Upgrade requests flow to admin via WhatsApp.
3. **Feature requests / verification** — frictionless onboarding (bot registration, web form, admin WhatsApp notifications) that funnels businesses into the paid funnel.
