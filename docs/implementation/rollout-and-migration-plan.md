# Rollout and Migration Plan

## What was implemented (this change)

| Area | Deliverable |
|---|---|
| Audit | `docs/audits/wa-directory-current-state.md`, `docs/audits/feature-gap-matrix.md` |
| Data model | `supabase/migrations/033_products_ai_listing.sql` |
| Semantic search | `supabase/migrations/034_product_embeddings.sql`, `lib/embeddings.ts`, `scripts/backfill-embeddings.mjs` |
| Shared services | `lib/products.ts`, `lib/product-format.ts`, `lib/ai-vision.ts`, `lib/ai-listing.ts`, `lib/ai-registration.ts`, `lib/rate-limit.ts` |
| AI plumbing | `callGeminiJson` / `hasGeminiKey` added to `lib/gemini.ts` |
| APIs | `/api/portal/products/analyse`, `/api/products/search-by-image`, `/api/registration/analyse`; `portal/shop` extended |
| Discovery UI | Products/Services switch on `/search` and `/map`; `product-card`, `product-results`, `product-search-by-image`, seller preview with products on the map |
| Product form | `components/portal/shop.tsx`: AI photo prefill, currency, price type, availability, stock, category, brand, condition |
| Registration | `components/registration-ai-panel.tsx` mounted at the top of step 1 in `components/list-business-form.tsx` |

Verification performed: `npx tsc --noEmit` (clean), `npm run build` (clean).

## Migration steps

1. **Back up** the Supabase project (schema + data) before applying.
2. Apply `supabase/migrations/033_products_ai_listing.sql` in staging.
3. Sanity checks after the migration:

```sql
-- Every existing item kept its visibility.
SELECT status, COUNT(*) FROM business_items GROUP BY status;

-- Primary images backfilled into the gallery.
SELECT COUNT(*) FROM business_item_images;

-- The trigger keeps the legacy boolean truthful.
SELECT COUNT(*) FROM business_items WHERE is_active <> (status = 'active'); -- expect 0
```

4. **Embedding search (034).** Enable the `vector` extension if the project does not have it
   (Dashboard → Database → Extensions → `vector`), then apply
   `supabase/migrations/034_product_embeddings.sql`. Confirm the function exists:

```sql
SELECT proname FROM pg_proc WHERE proname = 'match_business_items';
SELECT COUNT(*) FROM business_items WHERE embedding IS NOT NULL; -- 0 until the backfill runs
```

5. **Backfill existing products** so photo search can match listings that predate 034:

```bash
npm run backfill-embeddings          # only rows with no embedding; safe to re-run
npm run backfill-embeddings -- --all # force re-embed after a model change
```

   Run it after 033/034, not before. It is idempotent: unchanged text is skipped, and a row that
   fails is reported rather than half-written. New and edited products embed automatically on save,
   so the backfill is a one-time catch-up for the existing catalogue.

6. Deploy the application code (the code degrades safely if either migration has not run: product
   queries log an error and return an empty result rather than crashing a page, and semantic
   search quietly falls back to keyword search).
7. Smoke-test on staging:
   - `/search?mode=products` lists real items; `/search` still lists businesses.
   - `/map?mode=products` shows one pin per seller with a product count in the preview.
   - Portal → Shop → "Fill from a photo" prefills and publishes.
   - `/list` → upload a banner → fields prefill; "Continue without an image" still works.
   - Photo search returns exact keyword hits first, then similar items; a listing that shares no
     word with the photo (a "Ladies tote" found from a handbag photo) proves the semantic pass.
     With `GEMINI_API_KEY` unset, the same endpoint must still return keyword results.

## Rollback

The migration is additive, so application rollback is enough for a behaviour rollback: redeploy the
previous commit; the new columns and tables are ignored by old code.

If the schema itself must be reverted:

For 034 specifically, dropping the function reverts search to keyword-only and the column can be
left in place harmlessly:

```sql
DROP FUNCTION IF EXISTS match_business_items(TEXT, INTEGER, DOUBLE PRECISION, TEXT);
-- Optional, reclaims space. Dropping the column also drops the HNSW index.
-- ALTER TABLE business_items DROP COLUMN IF EXISTS embedding;
```

The `vector` extension itself should not be dropped if anything else in the project might use it.

```sql
DROP TRIGGER IF EXISTS trg_business_items_active ON business_items;
DROP FUNCTION IF EXISTS sync_business_item_active();
DROP TABLE IF EXISTS business_item_images;
DROP TABLE IF EXISTS product_drafts;
DROP TABLE IF EXISTS registration_drafts;
ALTER TABLE business_items
  DROP CONSTRAINT IF EXISTS business_items_status_check,
  DROP CONSTRAINT IF EXISTS business_items_availability_check,
  DROP CONSTRAINT IF EXISTS business_items_price_type_check,
  DROP CONSTRAINT IF EXISTS business_items_currency_check,
  DROP CONSTRAINT IF EXISTS business_items_condition_check;
-- Columns may be dropped individually if desired; leaving them is harmless.
```

Because `is_active` is preserved (never dropped) and only kept in sync, reverting cannot hide or
expose listings.

## Environment variables

No new variables are required. The AI endpoints use the existing `GEMINI_API_KEY` (absent → manual
entry) and `GEMINI_MODEL` (default `gemini-3.8-flash`, unchanged). Embeddings reuse `GEMINI_API_KEY`
and accept an optional `GEMINI_EMBEDDING_MODEL` (default `gemini-embedding-001`). Changing that
model changes the vector space, so it requires `npm run backfill-embeddings -- --all` and a matching
`vector(n)` dimension on the column.

## Open items and limitations (not silently decided)

1. **Migration not applied.** The schema change is committed but has not been run against the
   production database — that requires explicit approval.
2. **WhatsApp work is out of this repository.** The webhook, conversation state and interactive
   messages live in `wa-directory-bot`. The shared services are written to be importable; the bot
   still needs the wiring described in the architecture doc.
3. **Embedding quality is spot-checked, not evaluated.** `SEMANTIC_MIN_SIMILARITY = 0.70` came from
   measuring real vectors: a handbag photo scored 0.78 against a matching listing and 0.52-0.56
   against a stove, an iPhone and a cake. That separates the sample cleanly, but there is no
   labelled relevance set, so treat the floor as a starting point rather than a tuned threshold.
4. **No tests in the repo.** There is no test runner; verification is typecheck + build. The brief's
   §19 suites are not automated.
5. **Rate limiting is per-instance.** Adequate for burst control, not a global quota.
6. **Public storage for draft/registration media.** A private bucket and a retention job are the
   correct follow-up.
7. **Registration material beyond images.** PDFs are not accepted; only PNG/JPEG/WebP.
8. **Opening hours / offerings from a flyer** are extracted but not mapped into the form (the
   registration form has no hours field). They are shown as evidence only.
9. **Moderation.** No moderation queue exists; products are live on seller publish, matching the
   current shop behaviour.
10. **Analytics.** No AI cost/latency metrics are emitted beyond logs; product search events use the
    existing `stats_events` pipeline only where the UI already tracks impressions.

## Next phases (in the brief's order)

- **Phase 6–7 (bot):** durable state machine, ambiguity prompt, idempotency, listing and search
  flows calling the services above.
- **Phase 8:** relevance evaluation for embeddings with a labelled photo→product set, then tune
  `SEMANTIC_MIN_SIMILARITY` and decide whether semantic hits should rank above keyword hits.
- **Phase 9:** security review, regression suite, cost dashboards, staged rollout.
