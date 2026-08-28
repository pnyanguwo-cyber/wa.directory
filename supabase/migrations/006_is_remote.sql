-- Migration 006: Add is_remote flag for businesses that serve the whole country
-- Safe to re-run (IF NOT EXISTS)

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_remote BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_businesses_is_remote ON businesses (is_remote);
