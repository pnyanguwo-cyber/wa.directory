-- 034_product_embeddings.sql
-- Semantic product search: pgvector column on `business_items` + a KNN match
-- function used by visual search and by typed product search.
--
-- Why pgvector is justified here (the earlier audit deliberately avoided it):
-- visual search shipped as "vision -> keyword/category search", which cannot
-- match a photo of a red leather handbag to a listing called "Tote bag" or
-- "Ladies purse". Keyword recall on a small catalogue is the bottleneck, so
-- similarity over a shared vector space is the fix, not a larger synonym table.
--
-- The vector is built from TEXT, not from pixels: the vision model already
-- describes the photo, and `gemini-embedding-001` embeds that description into
-- the same space as the product's own text. That means one embedding per
-- product, no image pipeline, and no dependency on a multimodal embedding model
-- that the Gemini generative API does not expose.
--
-- Requires 033 (the status/availability columns this filter reads).
-- Additive and safe to re-run. Follows the 005 lockdown convention (RLS on, no
-- policies; server-side service role only).

-- Supabase installs extensions into the `extensions` schema. On a project where
-- pgvector is not yet available this statement fails loudly rather than
-- silently degrading search, so enable "vector" in the dashboard if it does.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

SET search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- 1. Embedding storage
-- ---------------------------------------------------------------------------
-- `embedding_text` is the exact text that produced the vector. Keeping it makes
-- re-embedding cheap and correct: a write compares the newly composed text with
-- this value and only calls the model when it actually changed.

ALTER TABLE business_items ADD COLUMN IF NOT EXISTS embedding vector(768);
ALTER TABLE business_items ADD COLUMN IF NOT EXISTS embedding_text TEXT NOT NULL DEFAULT '';
ALTER TABLE business_items ADD COLUMN IF NOT EXISTS embedding_model TEXT NOT NULL DEFAULT '';
ALTER TABLE business_items ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN business_items.embedding IS
  'L2-normalised 768-dim text embedding of name/brand/category/condition/description. NULL until embedded.';

-- HNSW gives fast approximate nearest-neighbour lookup as the catalogue grows.
-- Cosine distance matches the normalised vectors written by lib/embeddings.ts.
CREATE INDEX IF NOT EXISTS idx_business_items_embedding
  ON business_items USING hnsw (embedding vector_cosine_ops);

-- Rows still waiting for an embedding (used by scripts/backfill-embeddings.mjs).
CREATE INDEX IF NOT EXISTS idx_business_items_embedding_pending
  ON business_items (updated_at)
  WHERE embedding IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Discovery-scoped similarity search
-- ---------------------------------------------------------------------------
-- Mirrors DISCOVERABLE_PRODUCT_FILTERS in lib/products.ts so a semantic hit can
-- never surface a draft product, an inactive seller or a delisted listing. The
-- function returns ids + similarity only; the caller hydrates rows through the
-- normal product query so every response shape stays identical to text search.

CREATE OR REPLACE FUNCTION match_business_items(
  p_embedding TEXT,
  p_match_count INTEGER DEFAULT 24,
  -- Matches SEMANTIC_MIN_SIMILARITY in lib/embeddings.ts (calibrated 0.70).
  p_min_similarity DOUBLE PRECISION DEFAULT 0.70,
  p_category TEXT DEFAULT NULL
)
RETURNS TABLE (id UUID, similarity DOUBLE PRECISION)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT i.id,
         (1 - (i.embedding <=> p_embedding::vector))::DOUBLE PRECISION AS similarity
    FROM business_items i
    JOIN businesses b ON b.id = i.business_id
   WHERE i.embedding IS NOT NULL
     AND i.status = 'active'
     AND i.availability_status <> 'out_of_stock'
     AND b.payment_status = 'active'
     AND (p_category IS NULL OR p_category = '' OR i.category = p_category)
     AND (1 - (i.embedding <=> p_embedding::vector)) >= COALESCE(p_min_similarity, 0)
   ORDER BY i.embedding <=> p_embedding::vector
   LIMIT GREATEST(1, LEAST(COALESCE(p_match_count, 24), 100));
$$;

-- Locked down like the other service-role-only surfaces.
REVOKE ALL ON FUNCTION match_business_items(TEXT, INTEGER, DOUBLE PRECISION, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION match_business_items(TEXT, INTEGER, DOUBLE PRECISION, TEXT) TO service_role;
