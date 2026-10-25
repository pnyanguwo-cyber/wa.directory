-- 026_s16_matchmaking.sql
-- Matchmaking engine: buyer needs, supplier quotes, demand radar searches,
-- bot conversation transcripts, and a small KV store for admin toggles
-- (the dormant priority-supplier switch) and the admin digest cursor.
-- Safe to re-run. Follows the 005 lockdown convention: RLS on + no policies
-- (service role keeps full access server-side).

-- ── work_needs ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_needs (
  id BIGSERIAL PRIMARY KEY,
  rq_id TEXT UNIQUE NOT NULL,               -- 'RQ-7181' shown everywhere
  buyer_phone TEXT NOT NULL,                -- 263… digits
  item TEXT NOT NULL,                       -- what they need
  qty TEXT DEFAULT '',                      -- quantity, free text
  budget TEXT DEFAULT '',                   -- "USD 40-60", "50c each", free text
  city TEXT DEFAULT '',                     -- uppercase town
  category TEXT DEFAULT '',                 -- matched category label (best guess)
  status TEXT NOT NULL DEFAULT 'open',      -- open | closed | expired
  closed_by TEXT DEFAULT '',                -- 'buyer' | 'admin' | 'auto' | ''
  quotes_forwarded INT NOT NULL DEFAULT 0,
  winner_quote_id BIGINT,
  trace JSONB NOT NULL DEFAULT '[]',        -- buyer follow-up messages/events
  ceremony_sent_at TIMESTAMPTZ,             -- closing ceremony marker (222h rule)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE work_needs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON work_needs FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_work_needs_created ON work_needs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_needs_status ON work_needs (status);

-- ── need_quotes ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS need_quotes (
  id BIGSERIAL PRIMARY KEY,
  need_id BIGINT NOT NULL REFERENCES work_needs(id) ON DELETE CASCADE,
  supplier_phone TEXT NOT NULL,
  supplier_name TEXT DEFAULT '',
  price TEXT DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'sent',      -- sent | picked
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE need_quotes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON need_quotes FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_need_quotes_need ON need_quotes (need_id, created_at);
CREATE INDEX IF NOT EXISTS idx_need_quotes_supplier ON need_quotes (supplier_phone);

-- ── bot_searches (demand radar) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bot_searches (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT NOT NULL DEFAULT '',
  term TEXT NOT NULL DEFAULT '',
  city TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE bot_searches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON bot_searches FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_bot_searches_created ON bot_searches (created_at DESC);

-- ── bot_messages (word-for-word bot transcripts) ────────────────────────
CREATE TABLE IF NOT EXISTS bot_messages (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT NOT NULL DEFAULT '',
  dir TEXT NOT NULL DEFAULT 'in',           -- in | out
  kind TEXT NOT NULL DEFAULT 'text',        -- text | image | voice | location | list | buttons | cta
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE bot_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON bot_messages FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_bot_messages_phone ON bot_messages (phone, created_at);
CREATE INDEX IF NOT EXISTS idx_bot_messages_created ON bot_messages (created_at DESC);

-- Prune helper keeps transcripts lean (60 days).
CREATE OR REPLACE FUNCTION prune_bot_messages()
RETURNS VOID LANGUAGE sql AS $$
  DELETE FROM bot_messages WHERE created_at < NOW() - INTERVAL '60 days';
$$;

-- ── bot_settings (KV: admin digest cursor, dormant switch, …) ──────────
CREATE TABLE IF NOT EXISTS bot_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE bot_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON bot_settings FROM anon, authenticated;

-- Atomic upsert helper.
CREATE OR REPLACE FUNCTION upsert_bot_setting(p_key TEXT, p_value TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO bot_settings (key, value, updated_at)
  VALUES (p_key, p_value, NOW())
  ON CONFLICT (key) DO UPDATE
    SET value = excluded.value, updated_at = NOW();
$$;
