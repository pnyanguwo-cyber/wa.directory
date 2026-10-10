-- Migration 014: Organizations & branches
-- An organization (e.g. "Zimbabwe Republic Police") owns multiple listings:
--   * one HQ listing (is_hq = true) — the org-level portal account
--   * N branch listings (e.g. "ZRP Chinhoyi"), each a full standalone public
--     listing with its own phone/WhatsApp number, city and portal account.
-- HQ can see org-wide stats and act for any branch (promote/bid/renew);
-- branches only ever see their own data.
-- Safe to re-run (IF NOT EXISTS / guarded updates).

-- ============================================================
-- 1. organizations table
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  bio TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-fill a slug for any org created without one (incl. re-runs).
UPDATE organizations
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

-- ============================================================
-- 2. Branch columns on businesses
-- ============================================================
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_hq BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS branch_label TEXT DEFAULT '';

-- Only one HQ per organization (partial unique index).
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_org_hq
  ON businesses (org_id) WHERE is_hq IS TRUE AND org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_org ON businesses (org_id);

-- ============================================================
-- 3. Lock down organizations (default-deny like other portal tables;
--    public pages read via the service role, which bypasses RLS)
-- ============================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON organizations FROM anon, authenticated;

-- org_id / is_hq / branch_label are NOT added to the anon column grant on
-- businesses (see 005), so anonymous clients can never see them. Server
-- components and API routes use the service role and are unaffected.
