# WA Directory — Feature Gap Matrix

Companion to `wa-directory-current-state.md`. One row per requirement in brief §5, plus the
decisions recorded in §22. Status uses the brief's six labels.

| # | Capability | Status | Evidence | Gap / action taken |
|---|---|---|---|---|
| 1 | Products/Services switch | Not implemented | no mode state in `app/(directory)/search/page.tsx` or `map/page.tsx` | Added `?mode=products\|services` to both, one shared `DiscoveryModeSwitch`, no duplicate map |
| 2 | Products search | Implemented but incomplete | `search/page.tsx` "Items" section, `ilike name` only, 20 rows | Added `lib/products.ts` search: name/description/category, availability, price range, pagination |
| 3 | Services search | Implemented and working | `search/page.tsx`, `lib/ranking.ts` | Untouched |
| 4 | Product categories | Not implemented | no column | Reuses `data/categories.ts` taxonomy + optional `subcategory`; AI guesses mapped server-side |
| 5 | Product records / CRUD | Implemented but incomplete | `business_items` | Extended in place (no new table) with description, category, currency, availability, status, brand, condition, stock |
| 6 | Product images | Implemented but incomplete | single `image_url` | Added `business_item_images`, kept `image_url` as the primary denormalisation so existing renderers keep working |
| 7 | Product prices | Implemented but incomplete | `price numeric`, `$` hard-coded | Added `currency_code` + `price_type` (`fixed`/`on_request`); `formatMoney` renders the stored currency |
| 8 | Product availability | Not implemented | `is_active` only | Added `availability_status` (`in_stock`, `available_on_order`, `out_of_stock`, `availability_unknown`) |
| 9 | Seller ownership | Implemented and working | cookie-scoped writes | Preserved; new routes re-derive `business_id` from `getActingPortalBusiness` |
| 10 | Product map results | Not implemented | map loads `businesses` only | `/map?mode=products` loads sellers with matching products; one marker per seller |
| 11 | Map clustering | Implemented and working | `cluster: true` in `business-map.tsx` | Reused unchanged for product sellers |
| 12 | Product result cards | Implemented but incomplete | `item-card.tsx` | New `product-card.tsx` with image, price, availability, seller, city, contact |
| 13 | Business result cards | Implemented and working | `business-card.tsx` | Untouched |
| 14 | AI image analysis | Not implemented | `callGeminiParts` has no caller | `lib/ai-listing.ts` with schema-constrained JSON + defensive validation |
| 15 | AI business registration (upload-first) | Not implemented | form opens at Business Name | New upload-first panel at the top of `/list` with an always-visible "Continue without an image" |
| 16 | Banner/flyer/card OCR | Not implemented | — | `lib/ai-registration.ts` extracts name, contacts, address, category, hours, offerings |
| 17 | Registration draft + provenance | Not implemented | — | `registration_drafts` table; every field carries `value/confidence/evidence/status` |
| 18 | Category-aware follow-up | Not implemented | category never drives questions | Server returns `next_questions` chosen from the extracted category |
| 19 | Shared registration engine | Not implemented | — | Logic lives in `lib/ai-registration.ts`, exported via `/api/registration/analyse`; the bot repo imports the same lib |
| 20 | Owner review/approval | Implemented and working for the row itself | `ListBusinessForm` review step 3 | AI only prefills step 1; existing review + submit path unchanged |
| 21 | Duplicate detection | Implemented but incomplete | unique `username`/`business_id` only | Added name/phone candidate lookup, returned as warnings; never auto-merges |
| 22 | AI description generation | Implemented but incomplete | `generate-bio` expands user text | Listing assistant drafts a description from the photo only, marked `needs_confirmation` |
| 23 | OCR of price labels | Not implemented | — | Price/currency extracted only when legible; otherwise `null` + listed in `missing_required_fields` |
| 24 | Field-level confidence | Not implemented | — | Per-field confidence + evidence in every AI contract |
| 25 | Listing drafts | Not implemented | — | `product_drafts` (private, RLS locked, 7-day expiry) |
| 26 | Seller approval before publish | Not implemented (no drafts existed) | — | AI never writes `business_items`; the seller submits the existing form |
| 27 | Image intent detection | **Blocked** | chatbot not in this repo | Documented contract; bot repo owns state machine |
| 28 | Chatbot state | **Blocked** | `chat_sessions` is bot-owned | Out of scope here |
| 29 | WhatsApp image search | **Blocked** | no webhook in this repo | Bot calls `POST /api/products/search-by-image` |
| 30 | WhatsApp product listing | **Blocked** | no webhook in this repo | Bot calls `POST /api/products/analyse-image` |
| 31 | Ambiguous image handling | **Blocked** | — | Bot responsibility; contract documented |
| 32 | Visual similarity search | Not implemented | no `pgvector`, no embeddings in any migration | Done in 034: vision description → `gemini-embedding-001` (768d) → `match_business_items()` KNN, appended after keyword hits. Justification and rejected alternatives in the architecture doc |
| 33 | Text + image search | Not implemented | — | Image upload yields extracted attributes that feed the same text search |
| 34 | Location ranking | Implemented and working | `map-locations.ts`, city fallback | Product results carry seller city/coords; no invented distances |
| 35 | Eligibility rules | Implemented and working | `payment_status='active'`, `is_active` | Product queries `.eq('businesses.payment_status','active')` and `status='active'` |
| 36 | Security (RLS, ownership, storage) | Implemented and working | `005_rls_lockdown.sql`, portal auth | New tables follow the same pattern; drafts never public |
| 37 | Monitoring | Not implemented | — | AI failures logged with a stable prefix; no dashboards (documented limitation) |

## Decisions (§22) — safe defaults chosen, all documented

| # | Decision | Default taken | Rationale |
|---|---|---|---|
| 1 | Which tiers allow products | Any business with `payment_status='active'` | The existing shop is already free for all listings; no new gate invented |
| 2 | Product eligibility vs parent business | Inherits parent business | Simplest consistent rule; matches current shop behaviour |
| 3 | Listing limits per business | None enforced | No existing limit; not invented |
| 4 | Currencies | USD (default), ZAR, GBP, EUR | Zimbabwe trades in USD and ZAR; GBP/EUR for imports. Validated server-side |
| 5 | Price mandatory? | No — `price_type='on_request'` allowed | Existing UI already accepted free items (`price` defaults 0) |
| 6 | Stock quantity | Optional integer, nullable | Availability is the MVP; quantity is additive |
| 7 | Moderation | Seller approval only; `status` supports `draft`/`inactive` | No moderation queue exists to hook into |
| 8 | Prohibited categories | None | Business policy not defined; not invented |
| 9 | Multiple businesses per user | Already supported via orgs/branches | `lib/org-auth.ts`, `getActingPortalBusiness(branch)` |
| 10 | Multiple pickup locations | Business location only | Existing model; branches exist per listing |
| 11 | Product ranking + bidding | Relevance only, no bids | `rank_spots` is a business-surface concept; reusing it would let bids outrank relevance |
| 12 | AI provider | Existing Google Gemini integration | Already configured; no new vendor |
| 13 | Image retention | Draft sources kept until draft expiry (7 days); unreferenced uploads not reclaimed | No retention job exists yet |
| 14 | Map tile provider | Unchanged (existing `map-providers.ts`) | Brief forbids replacing a working engine without cause |
| 15 | WhatsApp message types | Bot repo concern | Documented, not assumed |
