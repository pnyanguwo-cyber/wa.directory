-- 030_bot_casts.sql
-- Broadcast queue for the WhatsApp bot: segmented (all / owners / buyers,
-- optional city-or-category token), batched (100 recipients per chunk), and
-- optionally scheduled (hourly cron releases casts whose time has come).
-- Safe to re-run. Follows the 005 lockdown convention: RLS on + no policies
-- (service role keeps full access server-side).
CREATE TABLE IF NOT EXISTS bot_casts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  body TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT 'all',
  filter TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_for TIMESTAMPTZ,
  created_by TEXT NOT NULL DEFAULT '',
  cursor INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  audience JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bot_casts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON bot_casts FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_bot_casts_release ON bot_casts (status, scheduled_for);
