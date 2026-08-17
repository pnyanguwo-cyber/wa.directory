# WA Directory — System Profile

A Zimbabwean business directory where users find businesses through the web and through a WhatsApp chatbot. Businesses get free listings, a public profile with a QR code, and a self-service portal with analytics, paid premium subscriptions, and a bidding system for top search placements.

Live: `https://wadirectory.vercel.app` (also `https://wadirectory.co.zw`)

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, React 18, TypeScript) |
| Styling | Tailwind CSS 3 |
| Database | Supabase (PostgreSQL) |
| ORM/Client | `@supabase/supabase-js` (service-role on server, anon on client) |
| WhatsApp | Meta WhatsApp Cloud API (webhook + templates + interactive messages) |
| AI | Google Gemini 2.0 Flash (`gemini-2.0-flash`) for auto-generated descriptions and smart search fallback |
| Auth | Signed token in HttpOnly cookie (HMAC-SHA256, own implementation, no external provider) |
| QR codes | `qrcode.react` + server-side `/qr/[slug]` redirect route |
| OG images | `@vercel/og` |
| Passwords | `bcryptjs` |
| Deployment | Vercel (cron via `vercel.json`, Edge middleware) |
| Migrations | Raw SQL in `supabase/schema.sql`, applied via `scripts/run-sql.mjs` (Supabase Management API) |

### Environment variables (`.env.local`)

| Variable | Used for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (client + server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side privileged key |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp Cloud API token |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp bot phone number |
| `WEBHOOK_VERIFY_TOKEN` | Webhook verification challenge |
| `GEMINI_API_KEY` | Gemini for bios + AI search |
| `ADMIN_PASSWORD` | `/admin-login` password |
| `ADMIN_WHATSAPP` | Admin notifications + bot handoff |
| `BUSINESS_AUTH_SECRET` | HMAC secret for business portal cookies |
| `CRON_SECRET` | Auth header for the daily cron endpoint |
| `SITE_URL` | Canonical site URL (falls back to `wadirectory.co.zw`) |
| `WHATSAPP_TEMPLATE_APPROVED` | Template name for approval message (default `you_are_live`) |
| `SUPABASE_PAT`, `PROJECT_REF` | Only for `scripts/run-sql.mjs` (Management API) |

---

## 2. Architecture Overview

```
                    ┌────────────────────────────────────────────┐
                    │              Next.js 14 (Vercel)           │
   Browser  ──────► │  Pages/Components (App Router)             │
   WhatsApp ──────► │  /api/webhook  ← Cloud API webhooks        │
                    │  /api/cron/daily ← Vercel cron (02:00 UTC) │
                    │  middleware (Edge) → portal cookie checks  │
                    └──────────────┬─────────────────────────────┘
                                   │ supabase-js (service role)
                                   ▼
                        ┌─────────────────────┐
                        │  Supabase (Postgres)│
                        │  businesses, stats, │
                        │  chat_logs, bids…   │
                        └─────────────────────┘
```

- **Server components** read data directly with the service-role key (`lib/supabase-server.ts`).
- **Client components** ping `/api/stats/event` with `navigator.sendBeacon` for tracking and `/api/search` for search-as-you-type.
- **Public pages** use the anon key only where needed (search API, businesses API).
- **Business portal auth** is a self-signed token: `businessId.expiry.hmac` in an HttpOnly cookie, verified in Edge `middleware.ts` (WebCrypto — Edge runtime) and in API routes (`lib/business-auth.ts`, Node runtime). No sessions table.
- **Admin auth** is a plain password (`ADMIN_PASSWORD`) stored in an HttpOnly cookie via `api/admin/login`.
- **Cron protection**: `/api/cron/daily` accepts `x-vercel-cron: 1` (Vercel-injected) or `Authorization: Bearer <CRON_SECRET>`.

---

## 3. Data Model (Supabase tables)

### Core directory
- **`businesses`** — id (uuid), slug, name, category (text[]), city, areas, description/bio, phone, whatsapp, email, website, address, logo, hours, featured, verified, rating (updated by ratings), review_count, edit_token (for self-service edits), whatsapp_username, whatsapp_link, share_token, created_at. GIN trigram indexes on name/bio, category, city. Open read policy; the app is write-through API (service role).
- **`categories`** / **`areas`** — taxonomy + city/town lists, `active` flags, used for search filters and `category/[slug]` pages.
- **`banners`** — home page banner strip (active + expiry).
- **`feature_requests`** — user suggestions, status workflow, WhatsApp notifications to admin.
- **`ai_cache`** — caches Gemini results (per business or per search query) to avoid re-billing.
- **`chat_sessions`** — state for the WhatsApp bot conversation (step, data JSON, rating_pending).

### Business portal / monetisation
- **`business_accounts`** — password_hash (bcrypt), business_id, created_at. Powers `/login` + portal cookie.
- **`stats_events`** — raw event log: business_id, type, category, city, created_at.
- **`daily_stats`** — materialised per-business-per-day event counts (built by the cron).
- **`chat_logs`** — WhatsApp bot conversations per business (customer_phone, business_id UNIQUE pair, message_count, started_at, last_message_at).
- **`ratings`** — 1–5 star ratings + feedback text captured from the WhatsApp bot; business.rating is kept in sync.
- **`subscriptions`** — business_id, status (pending/active/expired), amount (USD, set by admin at activation), starts_at, expires_at, admin_note.
- **`rank_spots`** — sellable top-3 positions per (category, city): position 1/2/3, amount/month, status, period_start/end, business_id, city (or nationwide), renewal_notified_at.
- **`bids`** — monthly bidding attempts: business_id, rank_spot_id, period (YYYY-MM), amount, status (pending/active/expired), notified.

### SQL functions (called by cron)
- `rollup_stats()` — aggregates `stats_events` into `daily_stats`, prunes old raw events.
- `expire_ranks()` — expires rank spots + related bids past `period_end`.

---

## 4. Features by Perspective

### A. Public visitors (web)
- **Search** — `/search` with query + city + category filters; search-as-you-type API (`/api/search`) using Supabase text search (`to_tsquery`/trigram) with **Gemini fallback** that interprets natural language ("cheap plumbers near Avondale") into structured queries; results cached in `ai_cache`.
- **Home** — hero search, typing headline, featured businesses carousel, banner strip, categories, areas, popular listings.
- **Business profile** (`/business/[slug]`) — details grid, **popularity bar** (30-day views from `daily_stats`), WhatsApp/call/website action buttons (each tracked), **QR card** (QR → `/qr/[slug]`), **ratings & reviews** section, similar businesses, share buttons, verified badge, AI-generated bio.
- **Category pages** (`/category/[slug]`) — filtered listings, ordered by paid ranking (see below), "rarely seen" businesses boosted.
- **QR code flow** — scanning the printed QR goes to `/qr/[slug]` (counts a `qr_scan` event, then redirects to `wa.me` chat) or `/go/[id]` (used in bot links — records `bot_chat_open` + chat log, then redirects to WhatsApp).
- **List a business** (`/list`) — public form with **optional portal password** (auto-creates a `business_accounts` row), WhatsApp number for approval notifications, logo upload to Supabase Storage, AI bio generation button. Approval is manual via admin.
- **Claim/edit** (`/edit?token=`) — self-service edits via secret `edit_token` link.
- **PWA** — installable, offline-capable shell (`manifest.webmanifest`, service worker, `icon.png`).

### B. WhatsApp chatbot users
- Message the directory bot on WhatsApp; `chat_sessions` tracks multi-step conversations:
  - Natural-language business search → structured query → results with `/go/<id>?f=<phone>&via=<query>` links (each click recorded as `bot_chat_open`, creating a chat log).
  - **Rating flow** — after a chat, the bot prompts a 1–5 rating + optional feedback; replies are parsed into `ratings` and `businesses.rating` is recalculated (`refreshBusinessRating`).
  - **Handoff** — when the bot can't help, the conversation is escalated to the human admin WhatsApp.
  - Every session appends messages to `chat_logs` (`appendTranscript`).
- Businesses see these conversations in their portal (paid feature).

### C. Business owners (portal — `/portal`)
Protected by cookie auth (`/login`). The portal is split **free vs paid** (paid = active subscription):

| Feature | Free | Paid (subscription) |
|---|---|---|
| Overview: 7-day stats + lifetime totals, SVG chart, CSV export | ✅ | ✅ (adds 30-day / 90-day / all-time ranges, per-event breakdown) |
| Improve: performance tips + comparison vs category averages | ✅ | ✅ (full competitors' data) |
| Conversations: WhatsApp bot chat logs | ❌ | ✅ |
| Ranking: see top-3 fees, bid for positions, **no-screenshot overlay** | ❌ | ✅ |
| Billing: upgrade request (status pending/active/expired) | ✅ (start upgrade) | — |

- **Bidding rules** (monthly): bid for position 1 > current #1's fee (or ≥ $1 if empty); position 2 must be < #1's fee; position 3 < #2's (falls back to #1's). Submitted bids notify the admin on WhatsApp; the admin confirms/activates in the admin panel.
- **Account setup** — new businesses get an `/account-setup?token=` link in their approval WhatsApp message; the edit page and listing form surface the portal signup; password reset via `/forgot` (WhatsApp-delivered reset link).

### D. Admin (`/admin`, `/admin-login`)
Password-protected panel with 10 tabs, each backed by an API route:

1. **Listings** — review pending, approve/reject (sends WhatsApp approval), delete.
2. **Statistics** — site-wide event counts per type and day (from `daily_stats`).
3. **Rankings & Bids** — configure the 3 rank spots per category/city + monthly fee; approve/reject/activate bids; see expiring spots.
4. **Subscriptions** — activate/pause paid subscriptions, set amount and expiry, add admin notes.
5. **Accounts** — business portal accounts, reset passwords (WhatsApp link), disable.
6. **Categories / Areas / Banners** — CRUD for taxonomy, cities, and banner strip.
7. **Chat sessions** — live WhatsApp bot conversations.
8. **Feature requests** — triage user suggestions.
9. **Admin add** — manually add businesses.
10. **Verify** — toggle verified badge (WhatsApp template message).

Admin actions push real-time WhatsApp notifications to `ADMIN_WHATSAPP` (new listing, bid, upgrade request, feature request) and to end users (approval, verification, password reset).

---

## 5. Tracking & Analytics Pipeline

1. Client events fire `navigator.sendBeacon('POST /api/stats/event')` from `lib/track.ts` — types: `profile_view`, `click_whatsapp`, `click_call`, `click_website`, `impression`, `qr_scan`, `bot_search`, `bot_chat_open`, `share_bot`, `share_web` (`lib/stats-format.ts` for labels/colors).
2. Raw rows go into `stats_events`.
3. **Daily cron (02:00 UTC)**:
   - `rollup_stats()` → aggregates into `daily_stats`, prunes raw events.
   - `expire_ranks()` → ends expired rank spots.
   - **`notifyExpiringSpots`** — WhatsApp reminder to ranked businesses 7 days before `period_end` (deduped via `renewal_notified_at`).
   - **`notifyExpiringSubscriptions`** — WhatsApp reminder 3 days before subscription expiry.
4. Portal reads `daily_stats` via `lib/portal.ts` (`getDailyStats`, `getLifetimeTotals`, `buildChartData`) and renders an SVG chart client-side; CSV export is generated with `csvEscape`.

---

## 6. Search Ranking System

`lib/ranking.ts` `orderSearchResults()`:
1. **Active paid spots first** — top-3 `rank_spots` for the matched (category, city) with nationwide spots as fallback, in position order.
2. **Weighted shuffle** for the rest — deterministic per (query, city, day) seed; rarely-seen businesses (fewer profile views) get a boost so listings don't always surface the same names.
3. Applied on both `/search` and `/category/[slug]`.

---

## 7. WhatsApp Integration (`/api/webhook`)

- **GET** — verification challenge (`hub.challenge` + `WEBHOOK_VERIFY_TOKEN`).
- **POST** — receives messages, reactions, and status updates; core helpers:
  - `recordBotEvents` — writes `bot_search` / `bot_chat_open` events.
  - `appendTranscript` — chat log creation/updates on `chat_logs`.
  - `refreshBusinessRating` — recompute `businesses.rating` after ratings changes.
  - `handleRatingReply` / `promptRatingIfDue` — the in-chat rating flow.
- Bot replies use templates + interactive messages; deep links go through `/go/[id]` for attribution.
- New-listing approval includes the `/account-setup` token link.

---

## 8. API Route Map

```
Public:        /api/search            /api/businesses        /api/stats/event
               /api/feature-request   /api/generate-bio      /api/upload
               /api/webhook           /api/debug
Listing/Edit:  /api/edit              /api/admin/notify-new-business (internal)
Accounts:      /api/account/{create,login,logout,forgot,reset}
Portal:        /api/portal/ranking    /api/portal/billing/upgrade
Admin:         /api/admin/{login,logout,add,verify,delete,update-business,areas,
                            categories,banners,stats,rankings,subscriptions,accounts,
                            chat-sessions,feature-requests,notify-new-business}
Cron:          /api/cron/daily
```

Special pages: `/qr/[slug]` (QR scan → wa.me, tracked), `/go/[id]` (bot link → wa.me, tracked + chat log), `/account-setup`, `/login`, `/admin-login`, `/portal/*`.

---

## 9. Scripts & Maintenance

| Script | Purpose |
|---|---|
| `scripts/run-sql.mjs` | Apply SQL to Supabase via Management API (`SUPABASE_PAT`, `PROJECT_REF`) |
| `scripts/seed.mjs` / `seed.ts` / `seed-admin-data.mjs` | Seed businesses / admin data |
| `scripts/migrate.mjs` | Move data between old/new Supabase projects (`SUPABASE_OLD_URL`…, `SUPABASE_NEW_URL`…) |
| `scripts/backfill-usernames.mjs` / `sync-whatsapp-usernames.mjs` | Backfill/sync WhatsApp usernames across projects |
| `npm run lint` / `build` / `dev` | Standard Next.js workflow; typecheck via `npx tsc --noEmit` |

Deployment: `vercel deploy --prod` (GitHub `master` → auto-deploy). Cron registered in `vercel.json`. Supabase migrations live in `supabase/migrations/*.sql`.

---

## 10. Security Notes

- Service-role key is **server-only** (`lib/supabase-server.ts`, API routes, cron); browsers only ever get the anon key.
- Business portal cookie: HMAC-SHA256-signed `businessId.expiry` (expiry enforced in middleware and API routes), HttpOnly.
- Passwords bcrypt-hashed (`bcryptjs`); reset links are short-lived tokens delivered via WhatsApp.
- Cron endpoint requires `CRON_SECRET` or the Vercel-injected header; no RLS bypass from public traffic.
- Admin panel password-checked; admin APIs require the admin cookie.
- `/portal/ranking` renders under an anti-screenshot overlay (blur + blocked print/screenshot/copy) as a deterrent for scraping bid amounts.
- Secrets never committed (`.env.local` gitignored; only `.env.local.example` committed with placeholders).