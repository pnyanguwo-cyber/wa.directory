-- 022: Structured site content blocks for auto-generated websites.
-- Optional per-business JSONB: FAQ entries, opening hours, gallery image URLs.
-- Empty/NULL site_content = all derived blocks hidden; every field has a
-- server-side fallback so the flagship template never renders empty sections.

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS site_content JSONB NULL;
