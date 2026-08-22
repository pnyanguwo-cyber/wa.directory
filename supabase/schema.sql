-- Run this in your Supabase SQL editor
-- Safe to re-run (all IF NOT EXISTS)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  category TEXT[] DEFAULT '{}',
  location TEXT DEFAULT '',
  country_code TEXT DEFAULT '+263',
  city TEXT DEFAULT '',
  area TEXT DEFAULT '',
  slug TEXT,
  phone TEXT DEFAULT '',
  whatsapp_link TEXT DEFAULT '',
  verified BOOLEAN DEFAULT FALSE,
  rating FLOAT DEFAULT 0,
  review_count INT DEFAULT 0,
  catalog_link TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  price_range TEXT DEFAULT '',
  website TEXT DEFAULT '',
  address TEXT DEFAULT '',
  show_location BOOLEAN DEFAULT TRUE,
  featured_eligible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns (safe to re-run)
DO $$ BEGIN
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS category TEXT[] DEFAULT '{}';
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT '+263';
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS area TEXT DEFAULT '';
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS slug TEXT;
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS whatsapp_link TEXT DEFAULT '';
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS rating FLOAT DEFAULT 0;
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS catalog_link TEXT DEFAULT '';
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS price_range TEXT DEFAULT '';
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '';
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS edit_token TEXT;
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS whatsapp_username TEXT DEFAULT '';
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS areas TEXT[] DEFAULT '{}';
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS show_location BOOLEAN DEFAULT TRUE;
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS featured_eligible BOOLEAN DEFAULT TRUE;
  UPDATE businesses SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(id::text, 1, 8) WHERE slug IS NULL;
  UPDATE businesses SET edit_token = uuid_generate_v4()::text WHERE edit_token IS NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_slug ON businesses (slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_edit_token ON businesses (edit_token);
CREATE INDEX IF NOT EXISTS idx_businesses_name_trgm ON businesses USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_businesses_bio_trgm ON businesses USING gin (bio gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses USING gin (category);
CREATE INDEX IF NOT EXISTS idx_businesses_verified ON businesses (verified);
CREATE INDEX IF NOT EXISTS idx_businesses_rating ON businesses (rating DESC);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON businesses;
DROP POLICY IF EXISTS "Public insert access" ON businesses;
CREATE POLICY "Public read access" ON businesses FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON businesses FOR INSERT WITH CHECK (true);

-- Cache for AI-generated results (Gemini search expansions, SEO blurbs)
CREATE TABLE IF NOT EXISTS ai_cache (
  cache_key TEXT PRIMARY KEY,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp chatbot conversation state
CREATE TABLE IF NOT EXISTS chat_sessions (
  phone TEXT PRIMARY KEY,
  step TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storage bucket for logos
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Logos public read" ON storage.objects;
CREATE POLICY "Logos public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

-- Admin-managed categories (approved categories live here)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT '📋',
  keywords TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin-managed service areas per city
CREATE TABLE IF NOT EXISTS areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city TEXT NOT NULL,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (city, name)
);

-- Public requests for new categories / areas (pending admin approval)
CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('category', 'area')),
  name TEXT NOT NULL,
  city TEXT DEFAULT '',
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  corrected_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (business_id, type, name)
);

-- Site-wide notification banners
CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text TEXT NOT NULL,
  link TEXT DEFAULT '',
  link_label TEXT DEFAULT 'Learn more',
  active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_active ON categories (active);
CREATE INDEX IF NOT EXISTS idx_areas_city ON areas (city);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests (status);
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners (active);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read categories" ON categories;
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read areas" ON areas;
CREATE POLICY "Public read areas" ON areas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read feature_requests" ON feature_requests;
CREATE POLICY "Public read feature_requests" ON feature_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read banners" ON banners;
CREATE POLICY "Public read banners" ON banners FOR SELECT USING (true);

-- ============================================================
-- Business portals: accounts, statistics, chats, subscriptions
-- ============================================================

-- Login accounts for business owners (password hashed with bcrypt)
CREATE TABLE IF NOT EXISTS business_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  otp_hash TEXT DEFAULT '',
  otp_expires_at TIMESTAMPTZ,
  disabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (business_id)
);

-- Append-only log of every counted action
CREATE TABLE IF NOT EXISTS stats_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'profile_view', 'click_whatsapp', 'click_call', 'click_website',
    'impression', 'qr_scan', 'bot_search', 'bot_chat_open',
    'share_bot', 'share_web'
  )),
  category TEXT DEFAULT '',
  city TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-day rollups for fast portal/admin reads
CREATE TABLE IF NOT EXISTS daily_stats (
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  count BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (business_id, date, type)
);

-- Bot conversation transcripts attributed to a business
CREATE TABLE IF NOT EXISTS chat_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  customer_phone TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  found_via TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (customer_phone, business_id)
);

-- Customer ratings collected via the WhatsApp bot
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly subscription status per business
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  amount NUMERIC(10, 2) DEFAULT 0,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  admin_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paid top-3 ranking placements (admin-approved, per category + city)
CREATE TABLE IF NOT EXISTS rank_spots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  city TEXT NOT NULL,
  position INT NOT NULL CHECK (position IN (1, 2, 3)),
  monthly_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired')),
  payment_confirmed_at TIMESTAMPTZ,
  renewal_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (category, city, position, period_start)
);

-- Bidding ledger (businesses bid for next month's spots)
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  city TEXT NOT NULL,
  position INT NOT NULL CHECK (position IN (1, 2, 3)),
  amount NUMERIC(10, 2) NOT NULL,
  period DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'outbid', 'expired')),
  admin_feedback TEXT DEFAULT '',
  fallback_position INT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stats_events_biz_time ON stats_events (business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stats_events_type_time ON stats_events (type, created_at);
CREATE INDEX IF NOT EXISTS idx_rank_spots_cat_city ON rank_spots (category, city, status);
CREATE INDEX IF NOT EXISTS idx_rank_spots_period ON rank_spots (period_end);
CREATE INDEX IF NOT EXISTS idx_bids_period_status ON bids (period, status);
CREATE INDEX IF NOT EXISTS idx_bids_business ON bids (business_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_ratings_business ON ratings (business_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_business ON chat_logs (business_id);

-- Nightly rollup: stats_events -> daily_stats, then prune old events
CREATE OR REPLACE FUNCTION rollup_stats() RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE processed INT;
BEGIN
  INSERT INTO daily_stats (business_id, date, type, count)
  SELECT business_id, created_at::date, type, count(*)
  FROM stats_events
  WHERE created_at::date <= CURRENT_DATE - 1
  GROUP BY business_id, created_at::date, type
  ON CONFLICT (business_id, date, type) DO UPDATE SET count = EXCLUDED.count;

  GET DIAGNOSTICS processed = ROW_COUNT;
  DELETE FROM stats_events WHERE created_at < CURRENT_DATE - 92;
  RETURN processed;
END $$;

-- Expire rank spots and subscriptions whose period has ended
CREATE OR REPLACE FUNCTION expire_ranks() RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE n INT;
BEGIN
  UPDATE rank_spots SET status = 'expired' WHERE status = 'active' AND period_end < CURRENT_DATE;
  GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE subscriptions SET status = 'expired' WHERE status = 'active' AND expires_at < NOW();
  RETURN n;
END $$;
