-- 025_bot_contacts.sql
-- Customer-directory table for the WhatsApp bot: one row per phone number,
-- stores the profile name and activity of everyone who talks to the bot.
-- Status and pricing of the business listing it interacted with (if any).
-- Safe to re-run. Follows the 005 lockdown convention: RLS on + no policies
-- (service role keeps full access server-side).
CREATE TABLE IF NOT EXISTS bot_contacts (
  phone TEXT PRIMARY KEY,
  name TEXT DEFAULT '',
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message_count BIGINT NOT NULL DEFAULT 0,
  last_step TEXT DEFAULT '',
  opted_out BOOLEAN NOT NULL DEFAULT FALSE,
  nudge_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bot_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON bot_contacts FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_bot_contacts_last_seen ON bot_contacts (last_seen);
CREATE INDEX IF NOT EXISTS idx_bot_contacts_business ON bot_contacts (business_id);

-- Atomic upsert: one row per phone, message_count increments, a fresh
-- message re-arms the idle nudge (nudge_sent_at = NULL). opted_out survives.
CREATE OR REPLACE FUNCTION upsert_bot_contact(p_phone TEXT, p_name TEXT, p_last_step TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO bot_contacts (phone, name, last_seen, last_step, message_count, nudge_sent_at)
  VALUES (p_phone, p_name, NOW(), p_last_step, 1, NULL)
  ON CONFLICT (phone) DO UPDATE
    SET name = excluded.name,
        last_seen = excluded.last_seen,
        last_step = excluded.last_step,
        message_count = bot_contacts.message_count + 1,
        nudge_sent_at = NULL;
$$;
