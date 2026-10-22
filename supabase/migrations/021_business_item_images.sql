-- 021: Product images for the mini shop.
-- One hosted image per item (same pattern as businesses.logo_url).
-- Empty string = no image uploaded yet.

ALTER TABLE business_items ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
