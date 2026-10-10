-- Migration 015: Organization defaults
-- Shared pre-fill values an HQ applies when creating branches:
--   * default_logo_url   — the org logo copied onto new branch listings
--   * default_categories — categories preselected for new branches
--   * bio_template       — description template; '{branch}' is replaced with
--                          the branch label (e.g. "Official ZRP {branch} desk.")
-- Editing defaults never changes existing branches — it only affects
-- branches created afterwards.
-- Safe to re-run (IF NOT EXISTS).

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_logo_url TEXT DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_categories TEXT[] DEFAULT '{}';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bio_template TEXT DEFAULT '';
