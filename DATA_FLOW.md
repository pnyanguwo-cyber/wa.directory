# WA Directory — Data Flow Diagrams

**End-to-end data flow for the webapp and the WhatsApp chatbot**, from first touch to a live,
monetized listing — including the automatic website / portfolio / shop generation that happens
in between.

Companion docs: [`PROJECT.md`](PROJECT.md) (overview), [`PROFILE.md`](PROFILE.md) (deep reference),
[`report.md`](report.md) (feature narrative).

---

## 0. The cast

| Actor | Enters through | Talks to |
|---|---|---|
| **Visitor** (web) | Browser → Next.js pages | `/api/search`, `/api/stats/event`, ISR pages |
| **Customer** (WhatsApp) | WhatsApp app → Meta **Cloud API** | `POST /api/webhook` (signed webhook) |
| **Business owner** (web) | `/list`, `/edit`, `/portal/*` | `/api/businesses/create`, `/api/edit`, `/api/portal/*` |
| **Business owner** (WhatsApp) | Same bot as the customer | `/api/webhook` (register, pay, stock shelf) |
| **Admin** | `/admin` (HMAC cookie) | `/api/admin/*` + WhatsApp alerts |
| **Paynow (EcoCash)** | Server-to-server | `POST /api/paynow/result` |
| **Vercel cron** | `02:00 UTC` daily + hourly | `/api/cron/daily`, `/api/cron/hourly` |

**External services:** Supabase (Postgres + Storage), Meta WhatsApp Cloud API, Google Gemini,
Paynow (EcoCash), Vercel (host, edge middleware, cron).

---

## 1. System context — one picture

```
                        ┌───────────────────────────────┐
     Browser ───────────►                               │
   (webapp pages,        │      NEXT.JS 14 APP         │      supabase-js        ┌──────────────────────┐
    portal, admin)       │                             │  (service role)         │   SUPABASE           │
                         │  /search  /business  /site  ├────────────────────────►│   Postgres           │
  WhatsApp user ────────►│  /list    /edit    /portal  │                         │   + Storage (logos,  │
   (Cloud API webhook)   │  /admin   /qr     /go       │                         │   photos)            │
                         │                             │                         └──────────────────────┘
  Meta Cloud API ◄──────►│  /api/webhook   ← inbound  │
   (messages, media,     │  /api/cron/*    ← cron     │─── HTTPS ───► Google Gemini (copy, search
    templates, lists)    │  /api/paynow/*  ← Paynow   │               expansion, AI form patching,
                         └─────────────────────────────┘               media perception — cached in ai_cache)
                                   │
                                   └── HTTPS ──► Paynow EcoCash (push payment → result webhook)
```

Everything that persists lives in Supabase. The webhook, the webapp routes and the cron all share
the same **service-role** client (`lib/supabase-server.ts`); browsers only ever get the anon key.

### Core tables touched by the flows below

| Domain | Tables |
|---|---|
| Directory | `businesses`, `categories`, `areas`, `banners`, `business_items` (shop shelf) |
| Auto-site | `businesses.site_hero`, `site_services`, `site_theme`, `site_content`, `generate_site`, `site_cover_luminance` |
| AI cache | `ai_cache` |
| Bot state | `chat_sessions`, `bot_contacts`, `bot_messages`, `chat_logs` |
| Payments | `listing_subscriptions`, `payment_events`, `subscriptions`, `rank_spots`, `bids` |
| Marketplace | `needs`, `need_quotes`, `supply_orders` |
| Trust | `ratings`, `reviews` |
| Analytics | `stats_events` → `daily_stats` (rollup) |
| Broadcasts | casts queue (via `lib/casts.ts`), `bot_settings` |

---

## 2. TRACK A — Webapp flows

### A1. Discovery & trust loop (visitor)

```mermaid
flowchart TD
    V[Visitor] --> S["/search, /category/[slug]"]
    S -->|q| G["Gemini expandSearchQuery<br/>cached in ai_cache"]
    S --> DB[("Supabase<br/>businesses")]
    S --> R["orderSearchResults()<br/>rank_spots 1-2-3 first,<br/>then weighted shuffle"]
    V --> P["/business/[slug]<br/>profile page (ISR 300s)"]
    V --> QR["/qr/[slug] scan"] -->|records qr_scan| EV[(stats_events)]
    P -->|"WhatsApp / Call / Website buttons"| T["/api/stats/event<br/>sendBeacon"]
    T --> EV
    P -->|one tap| WA["wa.me with pre-filled message"]
```

- Events written: `profile_view`, `click_whatsapp`, `click_call`, `click_website`, `impression`,
  `qr_scan`, `share_web`, `bot_search`, `bot_chat_open`.
- `/qr/[slug]` and `/go/[id]` are tracked redirects: they insert an event, then bounce into
  WhatsApp (QR → chat with the vendor, `/go/<id>` → chat opened from a bot result, `go/o/<token>` → order checkout).

### A2. Listing creation (web form → row → AI website copy)

```mermaid
sequenceDiagram
    participant U as Owner (/list form)
    participant API as /api/businesses/create
    participant CL as lib/listing-create
    participant AI as Gemini (site-generation)
    participant DB as Supabase
    participant WA as WhatsApp Cloud API
    participant AD as Admin

    U->>API: POST business details (+ logo upload via /api/upload)
    API->>CL: createListing(body)
    CL->>DB: validate against approved categories/areas
    CL->>DB: INSERT businesses (verified:false, payment_status:pending,<br/>slug, business_id, username, edit_token, generate_site:true)
    CL->>AI: generateSiteContent(name, category, bio, city)
    AI-->>CL: {hero, services} (cache hit → ai_cache, else Gemini, else fallback)
    CL->>DB: UPDATE businesses.site_hero / site_services
    CL-->>API: id, slug, editToken, businessId
    API-->>U: success + edit link
    CL--)WA: "LISTING CREATED — pay USD 1 to go live" + /edit?token= + /pay
    AD--)WA: (Yellow Pages only) priority verification alert
```

**Same engine, three doors:** the web form (`/api/businesses/create`), the WhatsApp bot
(`✎ Register`), and admin `add` all call `lib/listing-create.ts`, so validation, DB shape,
AI site copy and confirmations are identical.

- `generate_site` defaults to **true** for businesses (personal contacts pass `false`).
- The row lands `verified:false`, `payment_status:'pending'` (Yellow Pages / emergency categories
  skip straight to `active` + a priority admin alert).

### A3. Payment → activation (the gate to everything public)

```mermaid
sequenceDiagram
    participant P as Payer (web /api/pay or bot pay)
    participant LP as lib/listing-pay
    participant DB as Supabase
    participant PN as Paynow (EcoCash)
    participant AD as Admin
    participant WA as WhatsApp

    P->>LP: createListingPayment(businessId, payerPhone, plan)
    LP->>DB: upsert listing_subscriptions (status pending, idempotent)
    LP->>DB: UPDATE businesses.payment_status = 'pending'
    LP->>PN: EcoCash remote transaction (ref LISTING-subId,<br/>resultUrl /api/paynow/result)
    LP->>DB: save paynow_poll_url + log payment_events.payment_initiated
    LP--)WA: admin alert "PAYMENT REQUEST / AUTOMATIC PAYMENT IN PROGRESS"
    PN-->>LP: /api/paynow/result (hash-verified)
    alt payer entered PIN (paid)
        LP->>DB: activateListingSubscription →<br/>payment_status 'active', subscription active
        LP--)WA: "✅ LIVE" + link to /site/[slug] + /business/[slug]
    else pending / failed / replay
        LP->>DB: payment_events.payment_pending|webhook_rejected
        LP->>AD: manual confirm via /api/admin/payment-status
    end
```

- Audit trail: `payment_events` records `payment_initiated`, `payment_init_failed`,
  `payment_confirmed`, `payment_pending`, `webhook_rejected`, `activation_failed`, `activation`
  (IPs stored only as a SHA-256 hash).
- Admin path and Paynow path both funnel through the same activation helper, so a listing can
  never be `active` without a `listing_subscriptions` row behind it (Yellow Pages excepted).
- Renewals: the daily cron sends 3-day and 1-day WhatsApp reminders, then flips expired rows to `expired`
  (the listing and its auto-site drop out of public views until re-paid).

### A4. Automatic website / portfolio generation — `/site/[slug]`

This is the "in-between" artifact: every active business with `generate_site:true` gets a
public site at `SITE_URL/site/<slug>` (ISR, revalidated hourly, plus explicit
`revalidatePath` when the owner edits).

```mermaid
flowchart TD
    subgraph "Built at listing time"
        CL[createListing] --> AI1["Gemini: hero + services<br/>→ site_hero, site_services"]
        AI1 --> DB[(businesses)]
    end

    subgraph "Owner edits via portal"
        PO["/portal/site → /api/portal/site<br/>(HMAC cookie auth)"] -->|"site_hero, site_theme<br/>design + fonts + accent"| DB
        PO -->|"site_content: tagline, FAQ,<br/>hours, gallery"| DB
        PO -->|generate_ai: true| AI2["Gemini: generateSiteSections<br/>tagline + FAQ (manual hours/gallery kept)"]
        AI2 --> DB
        PO -->|"revalidatePath /site and /business"| ISR
        SH["/portal/shop → /api/portal/shop"] -->|"business_items<br/>(name, price, image)"| DB
    end

    subgraph "Render"
        ISR["/site/[slug] page (revalidate 3600)"] -->|"gated: generate_site AND payment_status=active"| GET[404 otherwise]
        DB --> ISR
        ISR -->|fallback if empty| AI3["Gemini generateSiteContent"]
        ISR --> ITEMS["business_items → shop / catalog section"]
        ISR --> TEST["ratings 4-5★ with comments → testimonials"]
        ISR --> STYLE["site_design preset + site-fonts +<br/>category accent + cover luminance wash"]
        ISR --> HTML["SSR page: hero, services, gallery,<br/>hours (live open/closed), FAQ, shop,<br/>testimonials, WhatsApp CTA, socials"]
    end
```

**What the auto-site is made of:**

| Block | Source | Data |
|---|---|---|
| Hero headline + intro | Gemini at creation (`site_hero`) | `businesses.site_hero` |
| Services overview | Gemini at creation (`site_services`) | `businesses.site_services` |
| Tagline / FAQ / hours / gallery | Portal editor or AI regen | `businesses.site_content` (JSON) |
| Logo, contact, map, socials | Listing data | `businesses.*` |
| **Shop / portfolio shelf** | Bot photo + "bread $2" or portal shop | `business_items` |
| Testimonials | Bot-captured ratings | `ratings` (4–5★, non-empty comment) |
| Theme, fonts, accent | Portal / category default | `site_theme`, `site-fonts`, `category-style` |
| SEO | `generateMetadata` + `opengraph-image` | dynamic OG image, JSON-LD |

The profile page (`/business/[slug]`) links to the site (`generate_site && active` shows the
"Visit website" card), so directory → profile → website → WhatsApp chat is the intended funnel.

### A5. Analytics pipeline (web + bot, one funnel)

```
web clicks ──► /api/stats/event ─┐
bot searches ─► stats_events rows ├─► stats_events (append-only, 92-day retention)
QR / go scans ─► /qr, /go ───────┘         │
                                            ▼  daily cron → rollup_stats()
                                    daily_stats (per business × day × type)
                                            │
                        ┌───────────────────┴────────────────────┐
                        ▼                                        ▼
              /portal (overview, improve, CSV)          /admin statistics tab
```

### A6. Admin approval loop

```mermaid
flowchart LR
    N["New listing<br/>(pending)"] --> A["/admin → Listings tab<br/>or WhatsApp bot admin commands"]
    A -->|reject| X[deleted / message sent]
    A -->|approve| V["verify: true<br/>activateListingForDays / notifyBusinessLive"]
    V --> DB[(businesses)]
    V--)|WhatsApp| O["Owner: ✅ LIVE +<br/>/business/[slug] + /site/[slug]"]
    DB --> PUB["Appears in search, categories,<br/>sitemap, OG images"]
```

Admin actions also fire WhatsApp notifications for verification, payment confirmation,
subscription activation, bid confirmation and password resets — all routed through
`lib/whatsapp.ts` templates when an approved template exists.

---

## 3. TRACK B — WhatsApp chatbot flows

### B0. Inbound pipeline (every message)

```mermaid
sequenceDiagram
    participant U as User's phone
    participant M as Meta Cloud API
    participant W as /api/webhook
    participant S as chat_sessions
    participant DB as Supabase
    participant G as Gemini
    participant O as Outbound sends

    U->>M: text / voice note / photo / list tap / location
    M->>W: POST payload + X-Hub-Signature-256
    W->>W: HMAC verify (WHATSAPP_APP_SECRET, fail closed)
    W->>W: GET verify handshake (WEBHOOK_VERIFY_TOKEN)
    W->>S: getSession(phone)  (step + JSON data)
    W->>DB: upsert bot_contacts, log bot_messages
    W->>W: route by session step / intent (menu, search, register,<br/>pay, need, order, rating, shelf, admin, help)
    alt needs AI
        W->>G: expandSearchQuery / aiPatchListing / perceiveMedia<br/>(voice transcription, photo → term)
        G-->>W: structured result (cached in ai_cache)
    end
    W->>DB: queries (businesses, business_items, needs, supply_orders…)
    W->>S: saveSession / clearSession
    W->>O: text | interactive list | buttons | CTA url | location request<br/>| document | reaction | template
    O->>M: Graph API
    M->>U: message
```

- **Fail-closed security:** no valid signature → payload rejected (anti toll-fraud, fake
  listings/ratings). Every outbound send is mirrored to `bot_messages` for transcripts.
- Session state (`chat_sessions`) is what lets a multi-step flow — form filling, order building,
  need drafting, rating — survive across messages.

### B1. Search (the core loop)

```mermaid
flowchart TD
    Q["User: 'plumber harare', voice note, or photo"] --> DS[dispatchSearch]
    DS --> PQ["parseQuery → term + city / nationwide"]
    PQ --> GM["Gemini expandSearchQuery<br/>aliases (cached)"]
    GM --> DB[("businesses + business_items<br/>active listings only")]
    DB --> RS["orderSearchResults():<br/>1. paid rank_spots (pos 1→2→3)<br/>2. weighted shuffle, low-view boost<br/>(location → haversine km ordering)"]
    RS -->|no matches| EM["empty-result card + 'post a need' nudge"]
    RS --> LG["logBotSearch + stats_events.bot_search"]
    RS --> OUT["Interactive result list (tap a card)"]
    OUT --> DET["Detail card → CTA 'Chat' → /go/[id]"]
    DET -->|tracked redirect| CHAT["wa.me chat with the vendor<br/>(bot_chat_open event + chat_logs marker)"]
    CHAT --> RATE["Later: rating prompt (48h window)"]
```

Tiered results: service/business match → cheapest matching shelf item
(`business_items`, price-sorted) → "price not listed" fallback card.

### B2. Media becomes intent

```
voice note ──► fetchWhatsAppMedia ──► Gemini perceiveMedia (transcript) ─┐
photo ───────► fetchWhatsAppMedia ──► Gemini perceiveMedia (term+city) ──┤
                                                                          ▼
                                        mid-registration? ─► fills form fields / logo
                                        otherwise ─────────► dispatchSearch (B1)
rate limit: 3 media tries/hour per phone, always with a text fallback
```

### B3. Registration from chat (✎ Register)

```mermaid
flowchart TD
    M[Main menu] -->    CHOICE{"Which are you adding?"}
    CHOICE -->|Business $1/mo| FORM["list_form session:<br/>free-text 'name …', 'city …', 'prices $5-$20'…"]
    CHOICE -->|Personal $1-$10| ONE["One message: 'Tendai Ncube 0771… Harare IG @x'"]
    FORM -->    PARSER["parseListingMessage rules"]
    PARSER -->|parser stalls| AIGEN["aiPatchListing (Gemini)"]
    PARSER --> LIVING["Living form re-rendered<br/>+ missing-field list"]
    LIVING -->|tap ↗ Publish| GATE["missingRequired gate<br/>(name + approved category + phone)"]
    GATE -->    CL["createListing — same engine as A2"]
    ONE --> GUARDS["cap: 3 active personal / payer<br/>block if number already a business"]
    GUARDS --> CL
    CL --> PAY["createListingPayment → EcoCash prompt (B4)"]
```

### B4. Pay from chat (`$ Pay (EcoCash)`)

```
menu_pay → searchPayBusinesses (find the listing by name/username)
        → createListingPayment (identical engine to A3)
        → Paynow push to the payer's phone → /api/paynow/result auto-activates
        → admin gets a WhatsApp alert either way
        → user gets "enter your PIN → live automatically" (or manual-confirm wording)
```

### B5. Orders — "🧺 Order items" (chat → shop shelf → suppliers)

```mermaid
sequenceDiagram
    participant B as Buyer
    participant W as Bot
    participant DB as Supabase
    participant S as Supplier

    B->>W: "order 2 bread" (+ more lines)
    W->>W: parseOrderLine → matchOrder against<br/>business_items + active listings
    W->>B: order verify card (grouped shop by shop)
    B->>W: ✅ Send order
    W->>DB: createSupplyOrder → one supply_orders row<br/>per shop (group_id, token, lines, status)
    W->>B: CTA per shop: /go/o/&lt;token&gt; (one-tap checkout)
    W->>S: push: DM if they messaged the bot in 24h,<br/>else approved template, else silent
    S->>W: tap "✅ I can supply"
    W->>DB: claimSupplyOrder (status open → sent → claimed)
    W->>B: "Shop confirmed (2 × bread)" + wa.me chat CTA
    Note over W,DB: hourly cron sweeps stale orders (sent → expired)
```

### B6. Needs & quotes — "🛒 Post a need"

```
buyer: "50 bags cement harare $40-60"
   → need_form session → confirm → createNeed (needs row, RQ-xxxx id)
   → buyer gets posted card + quick replies (quotes / close / post)
   → EVERY admin gets the need + a copy-paste channel post
   → suppliers reply "<RQ-id> quote $55" → need_quotes row
   → buyer gets quote cards → taps ✅ → need closed with winner,
     other suppliers notified, buyer + winner numbers shared
```

### B7. Trust capture — ratings & reviews

```
chat opened via /go/[id] (marker in chat_logs, 48h window)
   → next message triggers "Did you chat with X? Rate 1-5"
   → ratings row (customer_phone, name from bot_contacts, comment)
   → refreshBusinessRating() → businesses.rating + review_count
   → shown on /business/[slug] and as testimonials on /site/[slug]
   (a mid-rating message that reads like a search exits and searches instead)
```

### B8. Shelf stocking from chat → feeds the auto-site shop

```mermaid
flowchart LR
    P["Owner sends a photo<br/>(no flow in progress)"] --> FIND["findActiveListingsForPhone<br/>(payment_status: active)"]
    FIND -->|1 shop| ST["Ask name + price<br/>or caption 'bread $2'"]
    FIND -->|several shops| PICK[Pick which shop]
    ST --> INS["insertShelfItem → business_items<br/>(image → Storage, image_luminance computed)"]
    PICK --> INS
    INS --> SITE["Appears in the shop section of<br/>/site/[slug] and in bot search results"]
```

Caption parsing: `bread $2`, `2kg cement 7.50` → name + price. Same table is edited from
`/portal/shop`. Luminance drives text contrast on the site card.

### B9. Admin-in-chat, broadcasts, handoff

| Capability | Flow |
|---|---|
| Admin commands | `adminNumbers()` = `ADMIN_WHATSAPP` + `bot_settings.admin_allowlist`: list/unverified listings, approve, payment-status, CSV exports (businesses / people / chats), channel link, digest |
| Casts (broadcasts) | `enqueueCast(audience, text)` → hourly cron `releaseDueCasts` → chunked sends (`SYNC_MAX_SENDS`, `MAX_AUDIENCE` cap) |
| Weekly digest | `compileDigest` + cursor → admin digests of activity |
| Human handoff | bot can't help → messages forwarded to admin WhatsApp, admin replies through the bot |
| Contact consent | `bot_contacts` opt-in/opt-out, idle nudge sweeps (`sweepIdleNudges`) |
| Help / menu | deterministic fallback: unknown interactive payload never traps the user |

---

## 4. Cron flows (the metronome)

```mermaid
flowchart TD
    subgraph "Hourly"
        H1[sweepStaleOrders] --> H2["supply_orders open/sent → expired"]
        H3[releaseDueCasts] --> H4["queued broadcasts → WhatsApp"]
    end
    subgraph "Daily 02:00 UTC (/api/cron/daily, CRON_SECRET)"
        D1["rollup_stats: stats_events → daily_stats,<br/>prune raw events older than 92 days"]
        D2[expire_ranks / expire subscriptions]
        D3["Renewal WhatsApp:<br/>listing 3-day and 1-day, subscription, rank spot"]
        D4[Digest / weekly stats to admin]
    end
```

---

## 5. Start to finish — the whole story in one line per stage

1. **Discover** — visitor searches the web (`/search`, Gemini-expanded, rank-ordered) or messages
   the bot ("plumber harare" / voice / photo → same query pipeline).
2. **Connect** — profile card or bot result → tracked link (`/qr`, `/go/[id]`) → WhatsApp chat with
   the vendor; a `stats_events` row is written on the way.
3. **Onboard** — owner registers on `/list` **or** by chatting `✎ Register`; both hit
   `createListing`, which inserts the row, mints slug/business-id/username/edit-token, and asks
   Gemini for the site hero + services copy.
4. **Pay** — `createListingPayment` opens a pending `listing_subscriptions` row and pushes an
   EcoCash prompt via Paynow; `/api/paynow/result` verifies the hash and activates
   (admin manual confirmation is the fallback; `payment_events` audits everything).
5. **Publish** — `payment_status: active` + admin verification unlock search/category/sitemap
   placement, the `/business/[slug]` profile, and the auto-site.
6. **Auto-website** — `/site/[slug]` renders the generated hero/services, portal-edited
   tagline/FAQ/hours/gallery, theme/fonts/accent, live-open hours, the shop shelf
   (`business_items`), testimonials (`ratings`), OG image and JSON-LD — ISR-cached, revalidated
   on every portal save.
7. **Stock the shop** — owner sends a product photo + "bread $2" in chat (or uses `/portal/shop`);
   the item appears on the website and in bot search results with its price.
8. **Get found & transact** — buyers search, chat, place orders (`supply_orders` pushed to
   suppliers), or post needs (`needs` → supplier quotes → winner introduction).
9. **Get trusted** — bot prompts for a 1–5 rating after the chat; averages sync to the listing
   and 4–5★ comments become website testimonials.
10. **Grow & renew** — portal reads rolled-up analytics; premium subscriptions and monthly
    rank-spot bids monetize visibility; cron expires and reminds owners on WhatsApp; payment
    re-opens step 4.

---

## 6. Quick reference — which route writes what

| Trigger | Route / lib | Writes |
|---|---|---|
| Web form submit | `POST /api/businesses/create` → `listing-create` | `businesses`, `ai_cache` |
| Bot `✎ Register` | `webhook` → `listing-create` | `businesses`, `chat_sessions` |
| Logo / photo upload | `POST /api/upload`, bot `uploadLogoImage` | Supabase Storage |
| Pay (web or bot) | `/api/pay`, `listing-pay` | `listing_subscriptions`, `payment_events`, `businesses.payment_status` |
| EcoCash result | `POST /api/paynow/result` | activation (`businesses`, subscriptions), `payment_events` |
| Admin approve | `/api/admin/verify`, `admin-verify` | `businesses.verified`, WhatsApp notifies |
| Portal site save | `POST /api/portal/site` | `site_hero`, `site_theme`, `site_content`, `revalidatePath` |
| Portal shop | `/api/portal/shop` | `business_items` |
| Bot shelf photo | `webhook` → `insertShelfItem` | `business_items` |
| Web tracking | `POST /api/stats/event` | `stats_events` |
| Bot search | `webhook` → `dispatchSearch` | `stats_events`, `bot_searches`/logs, `chat_sessions` |
| Chat opened from result | `/go/[id]` | `stats_events`, `chat_logs` marker |
| Order | `webhook` → `commitPendingOrder` | `supply_orders` |
| Need / quote | `webhook` → `createNeed` / `addNeedQuote` | `needs`, `need_quotes` |
| Rating | `webhook` → `handleRatingReply` | `ratings`, `businesses.rating` |
| Cron | `/api/cron/daily`, `/api/cron/hourly` | `daily_stats`, expiries, reminders, casts, order sweep |

---

*Diagram convention: solid arrows = synchronous request/response, `--)` = fire-and-forget
notification (never blocks the primary flow), Mermaid blocks render on GitHub.*
