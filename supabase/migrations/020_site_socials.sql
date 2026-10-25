-- 020: Business social profiles shown on their website + profile page.

-- Optional social links. Shape:
-- {"twitter":"https://x.com/...","instagram":"https://instagram.com/...","facebook":"https://facebook.com/...","linkedin":"https://linkedin.com/...","tiktok":"https://tiktok.com/...","youtube":"https://youtube.com/..."}
-- NULL or empty-string keys mean the platform is not linked.
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS site_socials JSONB NULL;
