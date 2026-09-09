-- Migration 012: payment_events audit log
-- Append-only audit trail for the Paynow payment flow: bid initiation,
-- validation rejections, gateway failures, confirmations and #1 activations.
-- Abuse attempts (invalid hashes, replayed webhooks, bid spam) are recorded
-- with request metadata so they can be reviewed in the admin panel later.
--
-- No foreign keys: an audit log must survive even if the referenced bid or
-- business is later deleted, and spoofed IDs from forged requests must still
-- be insertable. Access is service-role only (RLS enabled, no policies) —
-- the same lockdown pattern as migrations 005/011.

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bid_id UUID DEFAULT NULL,
  business_id UUID DEFAULT NULL,
  event_type TEXT NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'ok',
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_bid ON payment_events (bid_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_events_type_time ON payment_events (event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_events_created ON payment_events (created_at);

-- Audit log is append-only via the service role and invisible to anon/authenticated.
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON payment_events FROM anon, authenticated;
