-- Migration 043: seeded-data marking + category review
--
-- is_seed marks listings created by the demo/seed scripts so the admin panel
-- can filter them out and bulk-remove them without touching real businesses.
-- requested_category keeps the owner's own words when the AI/bot matched them
-- to an approved category, so an admin can confirm the match or create the
-- category instead of the match being silently final.

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_seed boolean NOT NULL DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS requested_category text;

CREATE INDEX IF NOT EXISTS businesses_is_seed_idx ON businesses (is_seed) WHERE is_seed;
