-- 033_products_ai_listing_registration.sql
-- Products as a first-class discovery mode, AI listing drafts and AI-assisted
-- business registration drafts.
--
-- Reuse over duplication: the existing mini-shop table `business_items` already
-- holds seller-owned, priced, imaged items and is rendered on the profile, the
-- auto-site and the bot's browse flow. It is extended in place rather than
-- replaced by a parallel `products` table, so every existing reader keeps
-- working and no listing data is migrated or copied.
--
-- Additive and safe to re-run. Follows the 005 lockdown convention:
-- RLS on + no policies (the service role keeps full access server-side).

-- ---------------------------------------------------------------------------
-- 1. business_items -> product record
-- ---------------------------------------------------------------------------

ALTER TABLE business_items ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE business_items ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '';
ALTER TABLE business_items ADD COLUMN IF NOT EXISTS subcategory TEXT NOT NULL DEFAULT '';
ALTER TABLE business_items ADD COLUMN IF NOT EXISTS brand TEXT NOT NULL DEFAULT '';
-- free_text | new | used | refurbished  (empty string = not stated)
ALTER TABLE business_items ADD COLUMN IF NOT EXISTS item_condition TEXT NOT NULL DEFAULT '';
ALTER TABLE business_items ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'USD';
-- fixed | on_request
ALTER TABLE business_items ADD COLUMN IF NOT EXISTS price_type TEXT NOT NULL DEFAULT 'fixed';
-- in_stock | available_on_order | out_of_stock | availability_unknown
ALTER TABLE business_items ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'availability_unknown';
ALTER TABLE business_items ADD COLUMN IF NOT EXISTS stock_quantity INTEGER;
-- draft | active | inactive | archived  (canonical; is_active is kept in sync)
ALTER TABLE business_items ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE business_items ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE business_items ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN NOT NULL DEFAULT FALSE;

-- Preserve the meaning of the existing boolean before status becomes canonical.
UPDATE business_items
   SET status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END
 WHERE status = 'active' AND is_active = FALSE;

UPDATE business_items
   SET published_at = created_at
 WHERE published_at IS NULL AND is_active = TRUE;

-- Validation (added only when absent, so a re-run is a no-op).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_items_status_check') THEN
    ALTER TABLE business_items
      ADD CONSTRAINT business_items_status_check
      CHECK (status IN ('draft', 'active', 'inactive', 'archived'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_items_availability_check') THEN
    ALTER TABLE business_items
      ADD CONSTRAINT business_items_availability_check
      CHECK (availability_status IN ('in_stock', 'available_on_order', 'out_of_stock', 'availability_unknown'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_items_price_type_check') THEN
    ALTER TABLE business_items
      ADD CONSTRAINT business_items_price_type_check
      CHECK (price_type IN ('fixed', 'on_request'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_items_currency_check') THEN
    ALTER TABLE business_items
      ADD CONSTRAINT business_items_currency_check
      CHECK (currency_code IN ('USD', 'ZAR', 'GBP', 'EUR'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_items_condition_check') THEN
    ALTER TABLE business_items
      ADD CONSTRAINT business_items_condition_check
      CHECK (item_condition IN ('', 'new', 'used', 'refurbished'));
  END IF;
END $$;

-- `is_active` stays truthful for existing queries (business profile, auto-site,
-- bot browse, search) without touching any of them.
CREATE OR REPLACE FUNCTION sync_business_item_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_active := (NEW.status = 'active');
  IF NEW.is_active AND NEW.published_at IS NULL THEN
    NEW.published_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_business_items_active ON business_items;
CREATE TRIGGER trg_business_items_active
  BEFORE INSERT OR UPDATE ON business_items
  FOR EACH ROW EXECUTE FUNCTION sync_business_item_active();

UPDATE business_items SET is_active = (status = 'active');

CREATE INDEX IF NOT EXISTS idx_business_items_status ON business_items (status, availability_status);
CREATE INDEX IF NOT EXISTS idx_business_items_category ON business_items (category);
CREATE INDEX IF NOT EXISTS idx_business_items_desc_trgm ON business_items USING gin (description gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 2. Multiple images per product
-- ---------------------------------------------------------------------------
-- business_items.image_url remains the primary-image denormalisation so the
-- profile, auto-site and ItemCard keep rendering without a join.

CREATE TABLE IF NOT EXISTS business_item_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES business_items(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_item_images_item ON business_item_images (item_id, position);

ALTER TABLE business_item_images ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON business_item_images FROM anon, authenticated;

-- Backfill: every existing single image becomes the first gallery row.
INSERT INTO business_item_images (item_id, url, position)
SELECT i.id, i.image_url, 0
  FROM business_items i
 WHERE COALESCE(i.image_url, '') <> ''
   AND NOT EXISTS (SELECT 1 FROM business_item_images g WHERE g.item_id = i.id);

-- ---------------------------------------------------------------------------
-- 3. AI product-listing drafts
-- ---------------------------------------------------------------------------
-- AI output is a suggestion, never a product. Drafts are private (RLS on, no
-- policies), expire, and are only promoted by the seller submitting the normal
-- product form.

CREATE TABLE IF NOT EXISTS product_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'web',
  source_image_urls TEXT[] NOT NULL DEFAULT '{}',
  suggestions JSONB NOT NULL DEFAULT '{}'::jsonb,
  missing_fields TEXT[] NOT NULL DEFAULT '{}',
  warnings TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open',
  model TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_drafts_status_check') THEN
    ALTER TABLE product_drafts
      ADD CONSTRAINT product_drafts_status_check
      CHECK (status IN ('open', 'submitted', 'discarded', 'expired'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_drafts_business ON product_drafts (business_id, status);
CREATE INDEX IF NOT EXISTS idx_product_drafts_expiry ON product_drafts (expires_at);

ALTER TABLE product_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON product_drafts FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. AI business-registration drafts
-- ---------------------------------------------------------------------------
-- Prefill evidence for a business profile. Never a businesses row. The owner
-- still submits through /api/businesses/create and the existing verification,
-- payment and activation gates.

CREATE TABLE IF NOT EXISTS registration_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by_business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'web',
  source_image_urls TEXT[] NOT NULL DEFAULT '{}',
  fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  missing_fields TEXT[] NOT NULL DEFAULT '{}',
  warnings TEXT[] NOT NULL DEFAULT '{}',
  duplicate_candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',
  model TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registration_drafts_status_check') THEN
    ALTER TABLE registration_drafts
      ADD CONSTRAINT registration_drafts_status_check
      CHECK (status IN ('open', 'submitted', 'discarded', 'expired'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_registration_drafts_expiry ON registration_drafts (expires_at);

ALTER TABLE registration_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON registration_drafts FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Duplicate-candidate lookup for registration (name similarity)
-- ---------------------------------------------------------------------------
-- Mirrors the existing trigram indexes used by /search, scoped for a cheap
-- "is this business already listed?" check.

CREATE INDEX IF NOT EXISTS idx_businesses_name_trgm ON businesses USING gin (name gin_trgm_ops);
