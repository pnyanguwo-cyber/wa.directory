-- 035_chat_management_harvest.sql
-- Portal chat management + reviewed bot-training harvest.
--
-- chat_flags stores per-conversation workflow state without touching the
-- original transcript tables (chat_logs / bot_messages stay append-only for
-- this feature). scope is 'admin' for the bot-wide inbox or 'biz:<uuid>' for
-- a business portal inbox, so the same phone can be archived independently
-- by an admin and by the business it chatted with.
--
-- training_examples stores redacted COPIES of selected exchanges. Original
-- conversations are never modified. RLS follows the 005 convention: enabled
-- with no policies, so only the service role (server) can read/write.

CREATE TABLE IF NOT EXISTS chat_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL,                       -- 'admin' | 'biz:<business uuid>'
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'archived')),
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  last_read_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  blocked_at TIMESTAMPTZ,
  note TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (scope, phone)
);

CREATE INDEX IF NOT EXISTS idx_chat_flags_scope_status ON chat_flags (scope, status);
CREATE INDEX IF NOT EXISTS idx_chat_flags_phone ON chat_flags (phone);

ALTER TABLE chat_flags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON chat_flags FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL DEFAULT '',
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'admin',      -- admin | business
  source_chat_log_id UUID REFERENCES chat_logs(id) ON DELETE SET NULL,
  user_message TEXT NOT NULL,
  assistant_message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] NOT NULL DEFAULT '{}',
  redacted BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT DEFAULT '',
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_examples_status ON training_examples (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_examples_category ON training_examples (category);
CREATE INDEX IF NOT EXISTS idx_training_examples_phone ON training_examples (phone);

ALTER TABLE training_examples ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON training_examples FROM anon, authenticated;
