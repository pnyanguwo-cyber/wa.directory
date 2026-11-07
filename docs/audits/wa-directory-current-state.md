# WA Directory — Current State Audit

**Scope:** evidence-based audit of the existing application, performed before any feature work.
**Method:** read the source, migrations and docs in this repository; every claim below cites a file.
**Date:** 2026-11-07

Status vocabulary is the brief's: *Implemented and working* / *Implemented but incomplete* /
*UI-only or mocked* / *Backend-only* / *Not implemented* / *Blocked or needs decision*.

---

## 1. System shape

| Layer | Reality | Evidence |
|---|---|---|
| Framework | Next.js 14 App Router, React 18, TypeScript 5.5, Tailwind 3 | `package.json`, `app/layout.tsx` |
| Hosting | Vercel, GitHub Actions deploy on `master` | `.github/workflows/deploy.yml` |
| Database | Supabase Postgres, service-role client on the server only | `lib/supabase-server.ts` |
| Storage | Supabase Storage bucket `logos`, **public**, one flat folder `public/` | `supabase/schema.sql:164`, `lib/image-storage.ts` |
| Auth | Self-signed HMAC token in an HttpOnly cookie (no sessions table) | `lib/business-auth.ts`, `lib/admin-auth.ts`, `lib/org-auth.ts` |
| AI | Google Gemini via `generateContent`; text + **multimodal** helper | `lib/gemini.ts` (`callGemini`, `callGeminiParts`) |
| Maps | MapLibre GL 5.24 with clustering, custom SVG pins, provider abstraction | `components/business-map.tsx`, `lib/map-providers.ts`, `lib/map-styles.ts` |
| Payments | Paynow / EcoCash, hash-verified result webhook | `lib/paynow.ts`, `app/api/paynow/result/route.ts` |
| WhatsApp | **Not in this repository** — see §2 | `WADSHIFT_MIGRATION.md` |

### 1.1 Important architectural fact: the chatbot is a separate deployment

`WADSHIFT_MIGRATION.md` records the extraction of the WhatsApp webhook and bot modules into a
separate repository (`wa-directory-bot`), sharing code through the npm package
`@wa-directory/shared` (installed at `node_modules/@wa-directory/shared`, containing copies of
`lib/gemini.ts`, `lib/image-storage.ts`, `lib/listing-create.ts`, etc.).

Consequences for this plan:

- There is **no `app/api/webhook` route** in this project, no WhatsApp signature verification and
  no conversation-state handlers here. `chat_sessions` is read/written only by the bot repo and by
  the admin transcript viewer (`app/api/admin/chat-sessions/route.ts`).
- The bot's own step machine is visible only indirectly: `lib/gemini.ts` documents bot steps
  (`list_form`, `item_photo`, `item_pick`, `need_form`, `pay_search`, …) in `INTENT_ASKS`.
- Therefore Sections 6.4, 6.5, 6.7, 10, 15 and the WhatsApp half of 19.3–19.5 of the brief
  **cannot be implemented in this repository**. What this repo can do — and what this change does —
  is provide the shared, channel-agnostic services the bot calls, and document the contract.

---

## 2. Directory and discovery

| Capability | Status | Evidence / notes |
|---|---|---|
| Business search (text, category, city) | Implemented and working | `app/(directory)/search/page.tsx` — `.or()` over `name/bio/category`, `matchCategory`, `expandSearchQuery`, ranked by `orderSearchResults` |
| Search-as-you-type suggestions | Implemented and working | `app/api/search/route.ts`, `components/search-bar.tsx` |
| AI query expansion | Implemented and working | `lib/gemini.ts::expandSearchQuery`, cached in `ai_cache` |
| Paid ranking / bids | Implemented and working | `lib/ranking.ts`, `rank_spots`, `bids`, `app/api/portal/ranking/*` |
| Business profile | Implemented and working | `app/(directory)/business/[slug]/page.tsx` (ISR 300s) |
| Reviews / ratings | Implemented and working | `app/api/reviews/route.ts`, `components/review-*` |
| Category taxonomy | Implemented but incomplete for products | `data/categories.ts` — 44 service/business categories with keyword lists and emoji `icon`; **no product taxonomy** |
| Map | Implemented and working | `components/business-map.tsx` (1,760 lines): MapLibre, GeoJSON source with `cluster: true`, `clusterMaxZoom: 14`, `clusterRadius: 55`, custom pin images, list↔marker sync, mobile list sheet |
| Marker clustering | Implemented and working | same file, `wa-clusters*` layers |
| Map marker glyphs | Implemented and working | `components/map/category-pin.tsx`, `components/map/category-icon.tsx` (SVG pins, not emoji) |
| Map coordinate fallback | Implemented, approximate | `app/(directory)/map/page.tsx` stores a deterministic ~±0.015° jitter around `CITY_COORDS` when `lat/lng` are missing |
| Products / Services mode switch | **Not implemented** | No mode state anywhere; `/search` and `/map` are services-only |

---

## 3. Products ("mini shop") today

| Capability | Status | Evidence |
|---|---|---|
| Product table | Implemented but incomplete | `supabase/migrations/018_business_items_site.sql` — `business_items(id, business_id, name, slug, price NUMERIC(10,2), is_active, created_at, updated_at)` |
| Product image | Implemented but incomplete | `021_business_item_images.sql` — a single `image_url` TEXT column, plus `image_luminance` |
| Product CRUD (seller) | Implemented and working | `app/api/portal/shop/route.ts` (GET/POST), `app/api/portal/shop/[id]/route.ts` (PATCH/DELETE), `components/portal/shop.tsx` |
| Product cards on storefront | Implemented but incomplete | `components/item-card.tsx` (thumbnail, name, seller, price only) |
| Products in search results | Implemented but incomplete | `app/(directory)/search/page.tsx` — a secondary "Items" section, `ilike` name only, capped at 20 |
| Products on profile / auto-site | Implemented and working | `app/(directory)/business/[slug]/page.tsx:197`, `app/site/[slug]/page.tsx:105` |
| Currency | **Not implemented** | `price` is a bare number; `formatPrice` hard-codes `$` (`lib/utils.ts`) |
| Availability / stock | **Not implemented** | Only `is_active` boolean |
| Lifecycle states | **Not implemented** | No draft/pending/archived; `is_active` only |
| Product category | **Not implemented** | No category column |
| Product description | **Not implemented** | No description column |
| Multiple images per product | **Not implemented** | One `image_url`, no image table |
| Product ownership check | Implemented and working | Every portal write is scoped `.eq('business_id', businessId)` from the signed cookie |
| Product map markers | **Not implemented** | The map only ever loads `businesses` |
| Image derivatives (thumb/medium/large) | **Not implemented** | Original only; `sharp` is used solely for luminance (`lib/image-luminance.ts`) |

---

## 4. AI capabilities today

| Capability | Status | Evidence |
|---|---|---|
| Text generation (SEO blurb) | Implemented and working | `lib/gemini.ts::generateSEOBlurb` |
| Query expansion | Implemented and working | `lib/gemini.ts::expandSearchQuery` |
| Mid-flow intent classification | Backend-only (for the bot repo) | `lib/gemini.ts::classifyIntent` — not called from this repo |
| Multimodal (image/audio) call helper | Backend-only, unused here | `lib/gemini.ts::callGeminiParts` — **no caller in this repo** |
| Vision analysis of a product photo | **Not implemented** | no prompt, no schema, no route |
| OCR of business material | **Not implemented** | — |
| Listing draft from AI output | **Not implemented** | — |
| Image intent detection (search vs listing) | **Not implemented** here (bot-only concern) | — |
| AI result caching | Implemented and working | `lib/ai-cache.ts` → `ai_cache` table |
| AI cost/usage tracking | **Not implemented** | no token or cost accounting |
| Structured/schema-constrained output | Implemented but incomplete | Only `classifyIntent` sets `responseMimeType: application/json` + `maxOutputTokens: 64`; no `responseSchema`, no validation |

**AI provider note.** `GEMINI_MODEL` defaults to `gemini-3.8-flash` (`lib/gemini.ts:3`), but the
`.env.local.example` documents a free consumer key. Vision-capable structured output is assumed
available on that model; if it is not, the pipeline degrades to "manual entry" (required behaviour
in both cases).

---

## 5. Business registration today

| Capability | Status | Evidence |
|---|---|---|
| Registration form (3-step wizard) | Implemented and working | `app/(directory)/list/page.tsx` → `components/list-business-form.tsx` (2,121 lines) |
| Validation + row creation | Implemented and working | `app/api/businesses/create/route.ts` → `lib/listing-create.ts`, shared with admin add and the bot |
| Logo upload | Implemented and working | `app/api/upload/route.ts`, `lib/image-storage.ts` — magic-byte sniffing, 2 MB cap, PNG/JPEG/WebP |
| Upload-first invitation (banner/flyer/card) | **Not implemented** | the form opens straight into Business Name |
| OCR / vision prefill | **Not implemented** | — |
| Field-level provenance & confidence | **Not implemented** | — |
| Category-aware follow-up questions | **Not implemented** | category is chosen, never used to drive questions |
| Registration draft that survives abandonment | **Not implemented** | state is component-local; wizard state is lost on reload |
| Duplicate business detection | Implemented but incomplete | uniqueness is enforced on `username` and `business_id` only; no name/phone candidate matching |
| Payment / verification gate | Implemented and working | `listing_subscriptions`, `payment_status`, `expire_ranks()`, `lib/listing-activation.ts` |

---

## 6. Security and data-access posture

| Control | Status | Evidence |
|---|---|---|
| RLS on all domain tables | Implemented and working | `005_rls_lockdown.sql`, `schema.sql`; new tables follow "RLS on, no policies, service role only" |
| Public read on `businesses` | Implemented and working (by design) | `schema.sql:138` |
| Ownership on every portal write | Implemented and working | cookie-derived `businessId`; never taken from the request body |
| Image MIME validation | Implemented and working | `lib/image-storage.ts` sniffs magic bytes, ignores client MIME/filename |
| Upload size cap | Implemented and working | 2 MB (`MAX_LOGO_BYTES`) |
| Storage bucket public | Implemented (accepted risk) | bucket `logos` is `public: true`; brief §18 wants signed/controlled delivery — noted as a gap for private draft media, **not** for published product photos |
| Retention policy for abandoned uploads | **Not implemented** | uploads are permanent and unreferenced files are never reclaimed |
| Rate limiting | **Not implemented** | no limiter on `/api/upload`, `/api/generate-bio`, AI calls |
| Prompt-injection defence on AI output | **Not implemented** | no AI output currently influences persisted business data, so the risk is currently latent |
| Audit trail for listing changes | Implemented but incomplete | `payment_events` covers payments; `business_items` edits are not audited |

---

## 7. Testing and observability

| Capability | Status | Evidence |
|---|---|---|
| Automated tests | **Not implemented** | no test runner in `package.json`; `playwright` is a dev dependency but there are no specs or scripts |
| CI | Implemented but incomplete | `deploy.yml` deploys on push; it does not run typecheck, lint or tests |
| App-level logging | Implemented but incomplete | `console.error` in route handlers; no structured logging or error reporting service |
| Product/discovery analytics | Implemented and working | `stats_events` → `daily_stats` rollup via `rollup_stats()`; `ImpressionPing` |
| AI analytics | **Not implemented** | — |

---

## 8. What must not be broken

1. `businesses` discovery, profile, ratings and review flows.
2. `rank_spots` / `bids` ranking order in `lib/ranking.ts` — products must not inherit bidding.
3. Paynow payment and activation (`payment_events`, `listing_subscriptions`).
4. The single `business_items` write path (`/api/portal/shop`) and its consumers
   (`business/[slug]`, `site/[slug]`, `ItemCard`, `fetchBusinessItems` used by the bot).
5. Public `logos` bucket URLs already stored in `businesses.logo_url` / `business_items.image_url`.
6. `lib/image-storage.ts` magic-byte validation as the only intake for uploads.

## 9. Reusable building blocks (do not duplicate)

- `lib/listing-create.ts` — single validated creator for businesses (web/admin/bot).
- `lib/portal.ts::getActingPortalBusiness` — cookie → authorised business, branch-aware.
- `lib/image-storage.ts::uploadLogoImage` / `sniffImage` — validated image intake.
- `lib/gemini.ts::callGeminiParts` — the multimodal call to build vision on.
- `lib/ai-cache.ts` — result caching by key.
- `lib/map-providers.ts` / `lib/map-styles.ts` — replaceable tile/style configuration.
- `components/map/category-pin.tsx` — existing SVG pin factory (product markers reuse it).
- `data/categories.ts::matchCategory` — keyword taxonomy for mapping AI category guesses.
- `supabase` migration convention: additive, `IF NOT EXISTS`, RLS on + `REVOKE ALL`.

## 10. Risks

- **Registration form is 2,121 lines with 40+ state variables.** AI prefill must call the existing
  `setForm`/`setCategories` setters; a parallel copy of the form would immediately drift.
- **Public storage bucket.** Draft/registration media must not land in `logos/public/*` until the
  owner confirms. This change stores prefill sources in a separate private prefix pending a
  bucket-policy decision.
- **Gemini model name is unverified** (`gemini-3.8-flash`). Vision schema adherence must be
  validated defensively at runtime, not assumed.
- **No tests.** Every change is verified by typecheck/build plus manual reasoning; this is recorded
  as a limitation in the handover.
