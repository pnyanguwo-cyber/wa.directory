# Target Architecture — Products, Services, AI Listing & Visual Search

**Status:** implemented for the web app; WhatsApp contract documented (bot lives in `wa-directory-bot`).

---

## 1. One shell, two modes

```
/search?mode=products|services      /map?mode=products|services
        │                                     │
        └──────── DiscoveryModeSwitch ────────┘
                        │
        products ───────┴─────── services
            │                        │
   searchProducts()          orderSearchResults()
   (business_items)          (businesses + rank_spots)
```

- The mode is a URL parameter, so it survives refresh, back/forward and sharing. `services` is
  the default, which keeps every existing link working.
- One map component (`components/business-map.tsx`) serves both modes. It receives a `mode` prop;
  in products mode the markers are **sellers** (deduplicated by business) carrying a `products`
  array and `productCount`.
- Clustering is the existing MapLibre GeoJSON cluster source. Products mode does not add a second
  marker type, so cluster zoom/expand behaviour is identical.

### Why the seller is the map unit

A product has no location of its own. `business_items.business_id` is the only location authority,
so ten phones from one shop are one pin. This is enforced in `searchSellersWithProducts()`.

---

## 2. Data model

```
businesses ──1:N── business_items ──1:N── business_item_images
    │                    │
    │                    └── status/availability/currency/price_type
    │
    ├──1:N── product_drafts        (private AI suggestions, 7-day expiry)
    └──1:N── registration_drafts   (private AI prefill, 7-day expiry)
```

Reuse decisions:

| Need | Decision | Why |
|---|---|---|
| Product table | Extend `business_items` | Already seller-owned, imaged, priced, rendered on profile/site and read by the bot |
| Product category | Reuse `data/categories.ts` + optional `subcategory` | 44 categories with keyword lists already drive search and filters; a second taxonomy would fragment search |
| Availability | Text enum + check constraint | No moderation enum infra exists; text keeps migrations additive |
| `is_active` | Kept, synced by trigger from `status` | Every existing reader (`business/[slug]`, `site/[slug]`, `fetchBusinessItems`, `ItemCard`) keeps working unchanged |
| Price | `price NUMERIC` + `currency_code` + `price_type` | Never a float division of currency; `on_request` is explicit, not `0` |
| Images | `image_url` (primary) + `business_item_images` gallery | One denormalised primary keeps old renderers fast; the gallery enables multi-image listings |
| Ownership | Cookie-derived `business_id`, never request body | Same rule as every existing portal route |

### Eligibility

Products inherit their parent business's eligibility (decision #2 in the gap matrix):

```sql
business_items.status = 'active' AND businesses.payment_status = 'active'
```

No product-level subscription system was introduced. `rank_spots`/`bids` deliberately do **not**
affect product ordering: bidding is a business-surface product and must not let a paid listing
outrank a more relevant product (brief §11.4).

---

## 3. Shared services

These are the channel-agnostic services. The web routes call them directly; the bot imports the
same modules through `@wa-directory/shared`.

| Service | Module | Writes? |
|---|---|---|
| `searchProducts` | `lib/products.ts` | read only |
| `searchSellersWithProducts` | `lib/products.ts` | read only |
| `getSellerProducts` | `lib/products.ts` | read only |
| `validateProductInput` | `lib/products.ts` | pure |
| `analyseListingImage` | `lib/ai-listing.ts` | no (returns suggestion) |
| `saveProductDraft` / `getProductDraft` / `discardProductDraft` | `lib/ai-listing.ts` | `product_drafts` |
| `analyseSearchReference` | `lib/ai-listing.ts` | no |
| `analyseBusinessMaterial` | `lib/ai-registration.ts` | no |
| `findDuplicateCandidates` | `lib/ai-registration.ts` | read only |
| `saveRegistrationDraft` | `lib/ai-registration.ts` | `registration_drafts` |
| `toPrefill` / `nextQuestionsFor` | `lib/ai-registration.ts` | pure |

### HTTP surface

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/portal/products/analyse` | portal cookie | product photo → suggestion + private draft |
| `POST /api/products/search-by-image` | public (rate limited 10/min/IP) | photo → product search results |
| `POST /api/registration/analyse` | public (rate limited 8/min/IP) | banner/flyer/card → registration prefill |
| `POST/PATCH/DELETE /api/portal/shop[/:id]` | portal cookie | product CRUD incl. new fields |

### WhatsApp contract (bot repo)

The bot must call the same services rather than re-implementing prompts:

1. **Listing flow:** bot persists `create_product_listing` state → on image, downloads media →
   `analyseListingImage` → `saveProductDraft(channel: 'whatsapp')` → asks only
   `missing_required_fields` → on explicit confirmation `validateProductInput` → insert
   `business_items` with the business id resolved from the linked account.
2. **Visual search:** chat state `visual_product_search` → `analyseSearchReference` →
   `searchProducts` → concise result list.
3. **Registration:** `analyseBusinessMaterial` → `saveRegistrationDraft` → submit via the existing
   `lib/listing-create.ts` path.
4. **Intent resolution stays in the bot**, in this order: persisted workflow state → explicit
   instruction → recent context → role → classifier → clarification. An image from a registered
   supplier must not become a listing without an explicit listing workflow.

---

## 4. AI pipeline

```
upload ──► magic-byte sniff ──► store original ──► downscale to 1024px JPEG (sharp, metadata stripped)
                  │                                        │
             reject SVG/oversize                     callGeminiJson(schema)
                                                           │
                                              validate + coerce every field
                                                           │
                                          usable (confidence ≥ 0.5) else "missing"
                                                           │
                                             suggestion + private draft
                                                           │
                                        seller edits ──► existing form ──► publish
```

Guarantees:

- The stored original is the seller's file; analysis never mutates it.
- Model output is parsed defensively (`lib/ai-vision.ts`) and is never written to a publishable
  column.
- `business_id` is never read from AI output.
- Prices/currency are only used when visibly printed; otherwise `null` + listed as missing.
- Low-confidence values are dropped to "missing" rather than inserted as facts.
- Image text is treated as content. Explicit prompt-injection instructions are reported as
  warnings and ignored.

### Semantic (visual) search — migration 034

The first cut shipped as `vision → phrase + category + attributes → text search`, which only finds
listings that share words with the photo. That is the wrong bottleneck for this catalogue: a photo
of a handbag returns nothing from a listing called "Ladies tote", and no synonym table fixes that
generally. So `pgvector` is now used, with the justification written down because the brief (§11.3)
warns against adding it casually:

- **The vector is made from text, not pixels.** The vision model already describes the photo
  (`visual_description`, one factual sentence), and `gemini-embedding-001` embeds that into the same
  space as the product's own text. No image encoder, no second model vendor, one embedding per
  product.
- **One column, one model, no lock-in surprise.** `business_items.embedding vector(768)`,
  `embedding_model`, and `embedding_text` (the exact text embedded). A model change is detected by
  comparing text and re-embedded by the backfill script; nothing silently mixes vector spaces.
- **Ranking stays honest.** Keyword hits are never demoted. Semantic neighbours are appended after
  them, filtered through the same discoverability gate (active product, live seller, not
  out-of-stock) inside `match_business_items()`, so a semantic hit cannot leak a draft or a delisted
  seller. It never claims two products are the same item, only that they are close.
- **Degrades cleanly.** No `GEMINI_API_KEY`, missing function, or a failed match all fall back to
  keyword search; `match_mode` in the response says which path ran.

Embedding text is `name → brand → category/subcategory → condition → description`. Price, stock and
seller name are excluded on purpose: they change constantly and must not move the vector.

Rejected alternatives: a `products`-table rebuild (the rows already exist and are already read by
the profile, auto-site and bot), and keyword synonym expansion (unbounded maintenance, still
cannot bridge "tote" and "handbag").

### Cost controls

- One analysis copy at ≤1024px, quality 72.
- Vision timeout 25s, bounded; text helpers stay at 8s.
- Per-IP limits on the two public AI endpoints.
- Nothing is analysed on pan, keystroke or repeat view.
- AI unavailability degrades to manual entry with the upload preserved.

---

## 5. Security posture

| Control | Implementation |
|---|---|
| Draft isolation | `product_drafts`/`registration_drafts`: RLS on, no policies, `REVOKE ALL` from anon/authenticated; reads go through scoped service-role queries |
| Ownership | `business_id` from the signed cookie (`getActingPortalBusiness`), branch-aware |
| Publication | Only the seller's `POST /api/portal/shop` writes `business_items`; AI cannot publish |
| Client cannot forge status | `status` whitelisted server-side; `is_active` synced by trigger |
| Upload safety | Magic-byte sniff, 2MB cap, PNG/JPEG/WebP only, randomised path, no client MIME trust |
| Search injection | PostgREST `.or()` terms stripped of `, ( ) * % \` in `sanitizeSearchTerm` |
| Rate limiting | In-memory windows (`lib/rate-limit.ts`); per-instance, documented limitation |
| Prompt injection | Content-vs-instruction rule in every prompt + warnings surfaced to the user |

### Known storage caveat

Analysis sources are stored in the existing public `logos` bucket, because the product form needs a
hosted URL immediately and that bucket is already public for product photos. For registration
material this means prefilled banner/flyer images are publicly addressable by URL (randomised, not
listed). A private bucket for draft/registration media is the correct follow-up and is recorded as
an open item.

---

## 6. Bot-repo integration checklist

1. Add `lib/products.ts`, `lib/product-format.ts`, `lib/ai-listing.ts`, `lib/ai-registration.ts`,
   `lib/ai-vision.ts`, `lib/rate-limit.ts` to `@wa-directory/shared` and publish.
2. Never inline prompts or category lists in the bot; import them.
3. Persist workflow state server-side (already `chat_sessions`); add expiry.
4. Deduplicate webhook events before any AI call (a retried image must not cost twice or create a
   second draft).
5. Render results as text/lists, not the web product cards.
