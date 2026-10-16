-- 018: Business auto-website + mini shop (items)

-- Business auto-website controls.
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS generate_site BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS site_hero TEXT NOT NULL DEFAULT '';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS site_services TEXT NOT NULL DEFAULT '';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS site_contact_email TEXT NOT NULL DEFAULT '';

-- Mini shop: items a business lists for sale.
CREATE TABLE IF NOT EXISTS business_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_business_items_business ON business_items (business_id);
CREATE INDEX IF NOT EXISTS idx_business_items_name_trgm ON business_items USING gin (name gin_trgm_ops);

-- Service-role only access (all app reads/writes go through the service client).
ALTER TABLE business_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON business_items FROM anon, authenticated;
