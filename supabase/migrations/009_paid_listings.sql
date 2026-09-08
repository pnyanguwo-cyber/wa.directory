-- Migration 009: Paid listings, unique business IDs, usernames, name contests.
-- 1. business_id: WA-XXXXXX unique identifier for each listing
-- 2. username: unique handle (lowercase, underscores), auto-normalized
-- 3. payment_status: tracks listing payment (unpaid/pending/active/expired)
-- 4. listing_activated_at: when listing first went live
-- 5. listing_subscriptions: monthly subscription tracking with payer phone
-- 6. name_contests: dispute system for taken usernames
-- Safe to re-run (IF NOT EXISTS).

-- ============================================================
-- 1. Add columns to businesses
-- ============================================================
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS listing_activated_at TIMESTAMPTZ;

-- ============================================================
-- 2. Generate unique business_id (WA-XXXXXX) for existing rows
--    Uses a DO block to avoid collisions.
-- ============================================================
DO $$
DECLARE
  row RECORD;
  new_id TEXT;
  collision INT;
BEGIN
  FOR row IN SELECT id FROM businesses WHERE business_id IS NULL LOOP
    collision := 0;
    LOOP
      new_id := 'WA-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM businesses WHERE business_id = new_id);
      collision := collision + 1;
      EXIT WHEN collision > 10; -- safety valve
    END LOOP;
    UPDATE businesses SET business_id = new_id WHERE id = row.id;
  END LOOP;
END $$;

-- ============================================================
-- 3. Generate unique usernames from existing business names
--    Format: lowercase, spaces->underscores, strip special chars
-- ============================================================
DO $$
DECLARE
  row RECORD;
  base_name TEXT;
  candidate TEXT;
  suffix INT;
BEGIN
  FOR row IN SELECT id, name FROM businesses WHERE username IS NULL LOOP
    -- Normalize: lowercase, strip non-alphanumeric except underscores
    base_name := lower(regexp_replace(row.name, '[^a-z0-9]+', '_', 'g'));
    base_name := regexp_replace(base_name, '(^_|_$)', '', 'g');
    base_name := substr(base_name, 1, 30);
    IF length(base_name) < 3 THEN
      base_name := base_name || '_biz';
    END IF;

    candidate := base_name;
    suffix := 1;
    WHILE EXISTS (SELECT 1 FROM businesses WHERE username = candidate AND id != row.id) LOOP
      suffix := suffix + 1;
      candidate := base_name || '_' || suffix::text;
    END LOOP;

    UPDATE businesses SET username = candidate WHERE id = row.id;
  END LOOP;
END $$;

-- ============================================================
-- 4. Create indexes
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_business_id ON businesses(business_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_username ON businesses(username);
CREATE INDEX IF NOT EXISTS idx_businesses_payment_status ON businesses(payment_status);

-- ============================================================
-- 5. Listing subscriptions table
-- ============================================================
CREATE TABLE IF NOT EXISTS listing_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  amount NUMERIC(10,2) DEFAULT 1.00,
  payer_phone TEXT DEFAULT '',
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  renewal_notified_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_subscriptions_business ON listing_subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_listing_subscriptions_status ON listing_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_listing_subscriptions_expires ON listing_subscriptions(expires_at);

ALTER TABLE listing_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON listing_subscriptions FROM anon, authenticated;

-- ============================================================
-- 6. Name contests table
-- ============================================================
CREATE TABLE IF NOT EXISTS name_contests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contestant_name TEXT NOT NULL,
  contestant_phone TEXT NOT NULL,
  contested_username TEXT NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  reason TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_name_contests_status ON name_contests(status);

ALTER TABLE name_contests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON name_contests FROM anon, authenticated;
