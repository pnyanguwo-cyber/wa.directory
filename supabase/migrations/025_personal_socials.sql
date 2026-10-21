-- Personal contacts carry up to 3 social links (Instagram/TikTok/Facebook/
-- LinkedIn/X), stored on same row as the listing. Read-only elsewhere.
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS socials TEXT[] DEFAULT '{}';
