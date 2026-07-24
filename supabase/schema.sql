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
  phone TEXT DEFAULT '',
  whatsapp_link TEXT DEFAULT '',
  verified BOOLEAN DEFAULT FALSE,
  rating FLOAT DEFAULT 0,
  review_count INT DEFAULT 0,
  catalog_link TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns (safe to re-run)
DO $$ BEGIN
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS category TEXT[] DEFAULT '{}';
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS whatsapp_link TEXT DEFAULT '';
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS rating FLOAT DEFAULT 0;
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS catalog_link TEXT DEFAULT '';
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

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
