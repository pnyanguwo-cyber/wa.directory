# WA Directory

**Zimbabwe's AI-powered, WhatsApp-first business directory.**

Find and connect with verified local businesses through the web or a WhatsApp chatbot — then chat, get a quote, or browse a catalog without ever leaving WhatsApp. Businesses get a free listing, a shareable public profile with a printable QR code, and a self-service portal with analytics, paid premium subscriptions, and a bidding system for top search placement.

- **Live:** https://wadirectory.vercel.app · https://wadirectory.co.zw
- **Repo:** github.com/pnyanguwo-cyber/wa.directory
- **Status:** Production, single-market (Zimbabwe), early-stage
- **Version:** 1.0.0

> This is the canonical project overview. Companion docs: [`PROFILE.md`](PROFILE.md) (deep system reference), [`report.md`](report.md) (feature-by-feature narrative), [`update.md`](update.md) (monetization build plan), and [`IMPROVEMENTS.md`](IMPROVEMENTS.md) (prioritized fixes, hardening, and roadmap).

---

## 1. The problem

In Zimbabwe, WhatsApp *is* the internet for commerce. The overwhelming majority of small businesses sell through WhatsApp — catalogs, quotes, orders, and payments all happen in chat. But there is **no reliable way to discover those businesses**:

- Customers rely on word-of-mouth, Facebook groups, and screenshots of phone numbers passed around in chats.
- There is no trust layer — no verification, no ratings, no way to tell a real vendor from a scam.
- Businesses have no discovery surface and no analytics; they can't tell how customers found them or measure demand.
- Google Maps / traditional directories are thin here (low formal-address coverage, low listing density, poor local-language search).

## 2. The solution

WA Directory is the **discovery, trust, and analytics layer on top of WhatsApp commerce.**

1. **Discover** — Search the web or ask the WhatsApp bot in plain English or Shona ("solar installer in Avondale", "cheap plumber Bulawayo"). AI interprets the query and returns relevant, verified businesses.
2. **Connect** — One tap opens a WhatsApp chat with the vendor (pre-filled message), or scan a printed QR code that jumps straight into the chat.
3. **Trust** — Verified badges, star ratings and reviews (collected automatically by the bot after a chat), and clear business details.
4. **Grow** — Owners get a free listing plus a portal with real visitor analytics, and can pay for premium visibility (subscriptions + monthly bidding for the top 3 search spots in their category and city).

The wedge is **zero-friction connection** (no app install, no account needed to buy) combined with a **trust layer** that doesn't exist today, monetized through visibility rather than transactions.

---

## 3. Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, React 18, TypeScript 5.5) |
| Styling | Tailwind CSS 3 (custom WhatsApp-green design system, dark mode via `next-themes`) |
| Database & Storage | Supabase (PostgreSQL + Storage bucket for logos) |
| DB client | `@supabase/supabase-js` — service-role on the server, anon key on the client |
| WhatsApp | Meta WhatsApp Cloud API (webhook, message templates, interactive messages) |
| AI | Google Gemini 2.0 Flash — natural-language search interpretation, auto-generated bios, SEO copy |
| Auth | Self-signed HMAC-SHA256 token in an HttpOnly cookie (no external auth provider) |
| Passwords | `bcryptjs` |
| QR codes | `qrcode.react` + a tracked server redirect route |
| OG images | `@vercel/og` (edge-generated share images) |
| Charts | `recharts` (admin) + hand-rolled SVG (portal) |
| Hosting | Vercel (Edge middleware, cron) |
| PWA | Installable, offline shell (`manifest.ts`, `public/sw.js`) |

### Environment variables

Server secrets live in `.env.local` (git-ignored); `.env.local.example` documents them.

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WEBHOOK_VERIFY_TOKEN`, `GEMINI_API_KEY`, `ADMIN_PASSWORD`, `ADMIN_WHATSAPP`, `BUSINESS_AUTH_SECRET`, `CRON_SECRET`, `SITE_URL`, `WHATSAPP_TEMPLATE_APPROVED`. `SUPABASE_PAT` + `PROJECT_REF` are used only by the SQL-runner script.

---

## 4. Architecture

```
        Browser ─┐
                 ├─►  Next.js 14 on Vercel
     WhatsApp ───┤      • App Router pages / server components (read via service role)
   (Cloud API)   │      • /api/webhook        ← inbound WhatsApp messages
                 │      • /api/stats/event    ← client tracking (sendBeacon)
                 │      • /api/cron/daily      ← Vercel cron, 02:00 UTC
                 │      • middleware (Edge)    → cookie checks for /portal, /admin
                 └──────────────┬───────────────────────────────
                                │ supabase-js (service role)
                                ▼
                     ┌──────────────────────┐
                     │  Supabase (Postgres) │  businesses, stats_events,
                     │  + Storage (logos)   │  daily_stats, chat_logs, ratings,
                     └──────────────────────┘  subscriptions, rank_spots, bids …
```

- **Server components** read data directly with the service-role key (`lib/supabase-server.ts`). Public pages are ISR-cached (`revalidate = 300`).
- **Client components** fire tracking events to `/api/stats/event` via `navigator.sendBeacon` and hit `/api/search` for search-as-you-type.
- **Business portal auth** is a self-signed token (`businessId.expiry.hmac`) in an HttpOnly cookie, verified both in Edge middleware (WebCrypto) and in Node API routes (`lib/business-auth.ts`). No sessions table.
- **Admin auth** is a shared password that, on success, issues a signed, expiring HMAC token (`expiry.hmac`) in an HttpOnly cookie — verified in Edge middleware (WebCrypto) and in every admin API route (`lib/admin-auth.ts`), with a constant-time password compare.
- **Daily cron** rolls raw events into per-day aggregates, expires rank spots and subscriptions, and sends WhatsApp renewal reminders.

---

## 5. Data model (Supabase / PostgreSQL)

**Directory core**
- `businesses` — the listing: name, slug, `category text[]`, city/area(s), bio, phone, whatsapp link + username, email, website, address, hours, logo, price range, `verified`, `featured_eligible`, `rating`, `review_count`, `edit_token` (self-service edit link), `created_at`. GIN trigram indexes on name/bio, GIN on category. RLS: public read **and public insert** (see §10).
- `categories`, `areas` — admin-managed taxonomy + city/town lists with `active` flags.
- `banners` — home-page notification strip.
- `feature_requests` — user-submitted category/area suggestions with an approval workflow.
- `ai_cache` — caches Gemini results by key to avoid re-billing.
- `chat_sessions` — WhatsApp bot conversation state (step + JSON data).

**Portal & monetization**
- `business_accounts` — bcrypt password hash + OTP fields, one per business. Powers `/login`.
- `stats_events` — append-only raw event log (10 event types).
- `daily_stats` — per-business-per-day-per-type rollup for fast reads.
- `chat_logs` — bot conversation transcripts attributed to a business (`messages` JSONB).
- `ratings` — 1–5 stars + comment captured by the bot; `businesses.rating` kept in sync.
- `subscriptions` — status (pending/active/expired/cancelled), amount, period, admin note.
- `rank_spots` — sellable top-3 positions per (category, city), monthly fee, period, status.
- `bids` — monthly bids for next month's spots, with status workflow and fallback position.

**SQL functions (run nightly by the cron)**
- `rollup_stats()` — aggregate `stats_events` → `daily_stats`, prune raw events older than 92 days.
- `expire_ranks()` — expire rank spots and subscriptions past their period.

---

## 6. Features by audience

### Public visitors (web)
- **AI search** (`/search`) — text + city + category filters; search-as-you-type; Gemini interprets natural language and expands queries; results cached.
- **Home** — hero search, animated typing headline, live verified-count, recently-added carousel, top-rated featured grid, category explorer, FAQ, load-more grid.
- **Business profile** (`/business/[slug]`) — details grid, 30-day popularity bar, tracked WhatsApp/call/website buttons, QR card, ratings & reviews, similar businesses, share button, verified badge, JSON-LD + dynamic OG image for SEO.
- **Category/location pages** (`/category/[slug]`) — SEO landing pages with AI-written intro copy, ranked listings, structured data.
- **QR flow** — printed QR → `/qr/[slug]` (records a scan) → redirects into the WhatsApp chat with a pre-typed message.
- **Self-service listing** (`/list`) — 3-step form, optional portal password, logo upload, AI bio generation; manual admin approval.
- **PWA** — installable, offline shell.

### WhatsApp chatbot users
- Message the bot → natural-language search → results as tap-to-chat links (attributed via `/go/[id]`).
- Automatic **rating prompt** after a chat; replies parsed into `ratings`.
- **Human handoff** to the admin WhatsApp when the bot can't help.
- Every conversation is logged to `chat_logs` (surfaced to owners as a paid feature).

### Business owners (`/portal`)
| Capability | Free | Paid (active subscription) |
|---|---|---|
| Overview: 7-day stats, lifetime totals, SVG chart, CSV export | ✅ | ✅ + 30/90-day & all-time, per-event breakdown |
| Improve: performance tips vs category averages | ✅ (basic) | ✅ (full competitor data) |
| Conversations: bot chat logs | — | ✅ |
| Ranking: view top-3 fees, bid for positions | — | ✅ |
| Billing: request upgrade, see status/expiry | ✅ | — |

- **Bidding** (monthly, per category+city): #1 must beat the current #1 fee; #2 < #1; #3 < #2. Bids notify the admin, who confirms and activates.
- **Onboarding** — approval WhatsApp message includes an `/account-setup?token=` link; password reset delivered via WhatsApp.

### Admin (`/admin`)
Password-gated panel with ~10 tabs: **Listings** (approve/reject/delete), **Statistics**, **Rankings & Bids**, **Subscriptions**, **Accounts**, **Categories / Areas / Banners**, **Chat sessions**, **Feature requests**, plus manual **Add** and **Verify**. Admin actions push real-time WhatsApp notifications to the admin and to end users (approval, verification, resets).

---

## 7. Monetization

1. **Premium subscriptions** — monthly fee unlocks conversations, full analytics, competitor insights, and bidding eligibility. Amount set by admin at activation.
2. **Ranked placement (auction)** — the top 3 positions in each (category, city) are sold monthly via a bidding system; higher bids win position 1, lower bids take 2/3.
3. **Payments today are confirmed manually** by the admin (EcoCash / bank transfer out of band); an integrated gateway is on the roadmap.
4. Non-paying listings still rank fairly via a deterministic weighted shuffle that boosts rarely-seen businesses, so the free tier stays valuable and the directory stays useful.

---

## 8. Search ranking (`lib/ranking.ts`)

`orderSearchResults()`:
1. **Paid spots first** — active `rank_spots` for the matched (category, city), positions 1→2→3, with nationwide spots as fallback.
2. **Weighted shuffle** for everyone else — deterministic per (query, city, day) seed; businesses with fewer recent profile views get a boost so the same names don't always dominate.

Applied to both `/search` and `/category/[slug]`.

---

## 9. Project structure

```
app/
  page.tsx                     Home
  search/  category/[slug]/    Discovery
  business/[slug]/             Public profile (+ opengraph-image)
  list/  edit/  account-setup/ Listing & self-service
  login/  portal/*             Owner portal (overview, improve, conversations, ranking, billing)
  admin/  admin-login/         Admin panel
  qr/[slug]/  go/[id]/         Tracked redirects into WhatsApp
  api/                         REST routes (account, admin, portal, webhook, cron, search, stats, upload…)
  sitemap.xml/  manifest.ts    SEO / PWA
components/                    UI (public, portal/, admin/)
lib/                           supabase clients, auth, ranking, portal stats, gemini, whatsapp, tracking
data/                          categories, countries, zimbabwe-locations
supabase/                      schema.sql, migrations/, seed data
scripts/                       migrate / seed / SQL-runner / username backfill
middleware.ts                  Edge cookie checks for /portal and /admin
```

---

## 10. Security model & known gaps

**In place**
- Service-role key is server-only; browsers only ever receive the anon key.
- Business portal cookie is HMAC-SHA256-signed, HttpOnly, expiry-enforced in both middleware and API routes.
- **Admin auth is now a signed, expiring HMAC token** (no longer a static `admin_token=true`); verified in both middleware and every admin API route, with a constant-time password compare.
- **Auth secrets fail closed** — a missing `BUSINESS_AUTH_SECRET` denies sessions instead of falling back to a hard-coded default.
- **Account creation requires the listing's `edit_token` + matching phone and never overwrites an existing password** — closes the account-takeover vector.
- **Inbound WhatsApp webhooks require a valid `X-Hub-Signature-256`** (HMAC over the raw body with `WHATSAPP_APP_SECRET`); the verify token has no hard-coded fallback.
- **Uploads are validated by magic bytes** (PNG/JPEG/WebP only; SVG rejected) with server-derived filename and content type.
- Owner passwords are bcrypt-hashed; reset tokens are short-lived and delivered via WhatsApp.
- Cron endpoint requires `CRON_SECRET` or the Vercel-injected header.
- Secrets are git-ignored.

**Known gaps (tracked in [`IMPROVEMENTS.md`](IMPROVEMENTS.md) — address before scaling)**
- 🔴 **RLS not enabled on portal/PII tables** (`business_accounts`, `chat_logs`, `ratings`, `subscriptions`, `rank_spots`, `bids`, `stats_events`, `daily_stats`) and **`edit_token` + public INSERT are exposed** on `businesses` via the public anon key. This is the top remaining item (C3/H1) — needs the RLS migration plus moving the two remaining client-side anon reads/writes server-side. **Do next.**
- ⚠️ New required env vars must be set before deploy: `WHATSAPP_APP_SECRET` (webhook now rejects unsigned payloads) and a strong, rotated `BUSINESS_AUTH_SECRET` / `WEBHOOK_VERIFY_TOKEN`. Rotate the previously-committed `ADMIN_PASSWORD` and anon key.
- No rate limiting on public endpoints (search, event, upload, OTP, webhook).

---

## 11. Running locally

```bash
npm install
cp .env.local.example .env.local   # then fill in real values
npm run dev                         # http://localhost:3000
```

Apply the schema by running `supabase/schema.sql` in the Supabase SQL editor (idempotent), or via `node scripts/run-sql.mjs` (needs `SUPABASE_PAT` + `PROJECT_REF`). Seed sample data with `node scripts/seed.mjs`.

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` / `lint` | Standard Next.js workflow |
| `npm run migrate` | Move data between Supabase projects |
| `npm run backfill-usernames` | Backfill WhatsApp usernames |
| `scripts/run-sql.mjs` | Apply SQL via Supabase Management API |
| `scripts/seed*.mjs` | Seed businesses / admin data |

**Deployment:** push to `master` → Vercel auto-deploys. Cron is registered in `vercel.json` (`/api/cron/daily`, 02:00 UTC).

---

## 12. Roadmap (summary)

Near-term hardening and high-leverage features are detailed in [`IMPROVEMENTS.md`](IMPROVEMENTS.md). Headlines:

- **Security first:** real admin auth, lock down RLS, fail-closed secrets, rate limiting.
- **Payments:** integrate EcoCash / a local gateway so subscriptions and bids self-serve.
- **Growth loops:** richer bot conversations, review depth, referral/QR virality, WhatsApp broadcast opt-ins.
- **UX:** Shona localization, faster low-bandwidth experience, clearer owner onboarding, trust signals.
- **Data moat:** demand analytics ("what are people searching for that has no supply?") as a product for businesses.
