-- Migration 039: 90-day free trial for business listings
-- Adds trial tracking columns to listing_subscriptions and conversation_state

-- Add trial columns to listing_subscriptions
ALTER TABLE listing_subscriptions ADD COLUMN IF NOT EXISTS
  trial_eligible BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE listing_subscriptions ADD COLUMN IF NOT EXISTS
  trial_requested_at TIMESTAMPTZ;

ALTER TABLE listing_subscriptions ADD COLUMN IF NOT EXISTS
  trial_activated_at TIMESTAMPTZ;

ALTER TABLE listing_subscriptions ADD COLUMN IF NOT EXISTS
  trial_expires_at TIMESTAMPTZ;

ALTER TABLE listing_subscriptions ADD COLUMN IF NOT EXISTS
  trial_reminder_sent_7d BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE listing_subscriptions ADD COLUMN IF NOT EXISTS
  trial_reminder_sent_3d BOOLEAN DEFAULT false NOT NULL;

-- Add trial states to conversation_state
ALTER TABLE conversation_state DROP CONSTRAINT IF EXISTS conversation_state_state_check;

ALTER TABLE conversation_state ADD CONSTRAINT conversation_state_state_check
  CHECK (state IN (
    'LISTING_SUBMITTED',
    'AWAITING_ADMIN_REVIEW',
    'APPROVED_AWAITING_PACKAGE',
    'APPROVED_TRIAL_SELECTION',
    'AWAITING_ECOCASH_NUMBER',
    'PAYMENT_PENDING',
    'ACTIVE',
    'TRIAL_ACTIVE',
    'TRIAL_EXPIRING',
    'TRIAL_EXPIRED',
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
  ));

-- Index for trial expiring queries
CREATE INDEX IF NOT EXISTS idx_listing_subscriptions_trial_expires
  ON listing_subscriptions(trial_expires_at)
  WHERE trial_eligible = true AND trial_expires_at IS NOT NULL;

-- Index for trial reminders
CREATE INDEX IF NOT EXISTS idx_listing_subscriptions_trial_reminders
  ON listing_subscriptions(trial_reminder_sent_7d, trial_reminder_sent_3d)
  WHERE trial_eligible = true;

-- Function to check if business is eligible for trial
-- Returns true if business has no active subscription and is not a special category
CREATE OR REPLACE FUNCTION check_trial_eligibility(business_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_active BOOLEAN;
  is_special BOOLEAN;
BEGIN
  -- Check for existing active subscription
  SELECT EXISTS (
    SELECT 1 FROM listing_subscriptions
    WHERE business_id = check_trial_eligibility.business_id
    AND status = 'active'
  ) INTO has_active;

  -- Check if business is in a special category (Yellow Pages etc.)
  SELECT EXISTS (
    SELECT 1 FROM businesses b
    JOIN categories c ON b.category = c.name
    WHERE b.id = check_trial_eligibility.business_id
    AND c.special = true
  ) INTO is_special;

  -- Eligible if no active subscription and not special category
  RETURN NOT has_active AND NOT is_special;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE listing_subscriptions IS
'Persists WhatsApp conversation state for onboarding/payment flow.
States: LISTING_SUBMITTED -> AWAITING_ADMIN_REVIEW -> APPROVED_AWAITING_PACKAGE -> AWAITING_ECOCASH_NUMBER -> PAYMENT_PENDING -> ACTIVE
Terminal states: REJECTED, CANCELLED, PAYMENT_FAILED, EXPIRED
NEW Trial states: APPROVED_TRIAL_SELECTION -> TRIAL_ACTIVE -> TRIAL_EXPIRING/EXPIRED';

COMMENT ON COLUMN listing_subscriptions.trial_eligible IS 'Whether this business is eligible for a 90-day free trial';
COMMENT ON COLUMN listing_subscriptions.trial_requested_at IS 'When the business requested a trial';
COMMENT ON COLUMN listing_subscriptions.trial_activated_at IS 'When the trial was activated (admin approved)';
COMMENT ON COLUMN listing_subscriptions.trial_expires_at IS 'When the trial expires (90 days from activation)';
COMMENT ON COLUMN listing_subscriptions.trial_reminder_sent_7d IS 'Whether 7-day trial expiry reminder was sent';
COMMENT ON COLUMN listing_subscriptions.trial_reminder_sent_3d IS 'Whether 3-day trial expiry reminder was sent';