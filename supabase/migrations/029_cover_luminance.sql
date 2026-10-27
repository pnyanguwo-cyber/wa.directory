-- 029: Cover luminance for the auto-site hero scrim.
-- image_luminance mirrors the average perceived luminance of
-- business_items.image_url; site_cover_luminance mirrors
-- businesses.site_content.gallery[0]. Computed server-side at save-time
-- (lib/image-luminance.ts with sharp) and backfilled once by
-- scripts/backfill-luminance.mjs. NULL = unknown → default scrim tiers.

ALTER TABLE business_items ADD COLUMN IF NOT EXISTS image_luminance NUMERIC NULL;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS site_cover_luminance NUMERIC NULL;
