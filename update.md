# update.md — Business Portals, Statistics & Paid Ranking

Plan saved 2026-08-16. Scope approved by the owner via the Q&A. Execution starts after the admin dashboard work.

## Decisions (from Q&A)
1. **Login:** WhatsApp phone + password; forgot-password = one-time code sent via WhatsApp (magic-link fallback).
2. **Free portal:** views/clicks counts, QR download, edit listing, basic improvement tips. **Paid monthly sub:** full history charts, chat log, bidding, competitor insights.
3. **Counted events:** profile views, clicks (chat/call/website), impressions (appeared in search), QR scans, bot searches, bot chat opens, shares (bot + web).
4. **Conversations in portal:** customer list + full bot chat history. Private WhatsApp chats outside our bot stay invisible (WhatsApp's rule).
5. **Payments:** admin confirms manually (no payment code yet); auto-expiry reminders; real gateway later.
6. **Bidding:** top 3 spots per category+location; higher bid wins #1; lower bids can take #2/#3; admin approves → pays → spot for the month; bidding for next month is live during the current month; holders contacted & confirmed near month-end.
7. **Default order (no payment):** shuffle every search with boost for rarely-seen businesses in that category.
8. **QR:** on every profile → counts scan via redirect → opens their WhatsApp chat with pre-typed message; logo mid-branding; downloadable.
9. **Profile page:** popularity bar, details grid, QR card, similar businesses, ratings & reviews.
10. **Scale:** small start, fast & solid.

## Phase 1 — Database
New tables (append to `supabase/schema.sql`, apply via `scripts/run-sql.mjs`):
- `business_accounts` (business_id FK, password_hash bcrypt, otp_hash, otp_expires_at, created_at)
- `stats_events` (business_id, type CHECK, category, city, created_at) — append-only
- `daily_stats` (business_id, date, type, count; UNIQUE business_id+date+type) — rollup for fast reads
- `chat_logs` (business_id nullable, customer_phone, messages JSONB transcript, found_via, created_at, updated_at)
- `ratings` (business_id, customer_phone, rating 1-5, comment, created_at)
- `subscriptions` (business_id, status pending/active/expired/cancelled, started_at, expires_at, amount, admin_note)
- `rank_spots` (business_id, category, city, position 1/2/3, monthly_fee, period_start, period_end, status, payment_confirmed_at)
- `bids` (business_id, category, city, position, amount, period, status pending/approved/rejected/outbid/expired, admin_feedback)

Indexes: events (business_id, created_at); rank_spots (category, city, status); daily_stats (business_id, date).

## Phase 2 — Accounts & auth
- Password step at listing (optional) + `/account/setup?token=` for existing businesses (edit token).
- `/login` page (phone + password), cookie `business_session` (HMAC) via `lib/business-auth.ts`.
- Forgot password: 6-digit OTP via existing WhatsApp sender; verify + reset.
- Middleware protects `/portal/*`; navbar gets two buttons: "List your business" + "Log in your account" (or "My Portal").

## Phase 3 — Statistics
- `POST /api/stats/event` (fire-and-forget, single indexed insert, never blocks rendering).
- Hooks: profile page view, whatsapp/call/website clicks, search + category impressions, share button, bot webhook (bot_search, bot_chat_open, share_bot), QR redirect route.
- Nightly cron (`/api/cron/rollup`) aggregates events → daily_stats; expiry + month-end notification cron.
- Portal "Overview": 7/30/90/all ranges, totals + simple SVG charts, day table, CSV export. Free = 7 days + lifetime totals; paid = full.
- Admin "Statistics" tab: macro overview + per-business drill-down with rank among same-category businesses.
- Portal "Improve": rule-based suggestions; 3 basic tips free, full + category comparison when paid.

## Phase 4 — Conversations (paid)
- Webhook appends every bot message to `chat_logs.messages` (JSONB).
- Opening a business chat via bot records chat_logs with business_id + phone + found_via.
- Portal "Conversations": customer list → expand full transcript.

## Phase 5 — Paid ranking & bidding
- Admin "Rankings & Bids": grid per category+location (current 1/2/3, fee, expiry); admin override placement (any business, any position, extra category/location allowed); pending bids approve → payment pending → mark paid; reject with feedback.
- Portal "Ranking": see current top 3 + fees; bid for position 1/2/3 (rules: #1 > current #1 fee; #2 < #1; #3 < #2); bids target next month; status + admin feedback visible.
- No-screenshot: overlay layer, user-select none, block copy/print/context/screenshot keys, dim on blur. (Caveat: cannot truly block camera screenshots.)
- Search application: rank_spots first (1→2→3), then weighted shuffle with rarely-seen boost, deterministic per query.
- Nightly cron: expiry deactivation + holder notifications; month-end confirmation flow.

## Phase 6 — QR + profile redesign
- `/qr/[slug]`: count qr_scan → 302 to wa.me with pre-typed message.
- QrCard points at `/qr/[slug]`, logo mid-branding, downloadable `business-name-qr.png`.
- Profile rebuild: popularity bar, details grid, QR card, ratings & reviews, similar businesses, main card kept.
- Ratings via bot prompt after business chat (1-5 or skip).

## Phase 7 — Subscriptions & admin tabs
- Admin tabs: Statistics, Rankings & Bids, Subscriptions (mark paid/extend/cancel), Accounts (reset/disable).
- Portal "Billing": subscription status, request upgrade, expiry.

## Phase 8 — Performance & reliability
- Server-side reads only (service role), static/ISR pages, single-insert event API, nightly rollups, no heavy deps (bcryptjs only, hand-rolled SVG charts), final tsc + build + deploy + verify.