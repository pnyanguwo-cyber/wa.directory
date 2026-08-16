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
