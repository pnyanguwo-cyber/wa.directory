-- Migration 038: Conversation state table for WhatsApp onboarding/payment flow
-- Tracks the state of each WhatsApp conversation to prevent payment responses
-- being interpreted as searches/bids

CREATE TABLE IF NOT EXISTS conversation_state (
  phone TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK (state IN (
    'LISTING_SUBMITTED',
    'AWAITING_ADMIN_REVIEW',
    'APPROVED_AWAITING_PACKAGE',
    'AWAITING_ECOCASH_NUMBER',
    'PAYMENT_PENDING',
    'ACTIVE',
    'REJECTED',
    'CANCELLED',
    'PAYMENT_FAILED',
    'EXPIRED',
    -- Registration flow states
    'REGISTRATION_STARTED',
    'REGISTRATION_AWAITING_IMAGE',
    'REGISTRATION_PROCESSING_IMAGE',
    'REGISTRATION_REVIEW_EXTRACTED',
    'REGISTRATION_COLLECTING_FIELDS',
    'REGISTRATION_FINAL_REVIEW',
    'REGISTRATION_FLOW_ACTIVE'
  )),
  context_json JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient cleanup of expired states
CREATE INDEX IF NOT EXISTS idx_conversation_state_expires ON conversation_state(expires_at);

-- RLS: Service role only (server-side state management)
ALTER TABLE conversation_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON conversation_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- No policies for authenticated/anon - this is purely server-managed

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_conversation_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_state_updated_at ON conversation_state;
CREATE TRIGGER trigger_update_conversation_state_updated_at
  BEFORE UPDATE ON conversation_state
  FOR EACH ROW EXECUTE FUNCTION update_conversation_state_updated_at();

-- Comment
COMMENT ON TABLE conversation_state IS
'Persists WhatsApp conversation state for onboarding/payment flow.
States: LISTING_SUBMITTED -> AWAITING_ADMIN_REVIEW -> APPROVED_AWAITING_PACKAGE -> AWAITING_ECOCASH_NUMBER -> PAYMENT_PENDING -> ACTIVE
Terminal states: REJECTED, CANCELLED, PAYMENT_FAILED, EXPIRED';