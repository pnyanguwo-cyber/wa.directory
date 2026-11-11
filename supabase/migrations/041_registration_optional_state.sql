-- Migration 041: Allow REGISTRATION_COLLECTING_OPTIONAL in conversation_state
-- 039's check constraint predates the optional-fields step added to the bot
-- registration flow (shared 9251a34). Without this, upserts with that state
-- fail with 23514 and the bot loses the user's place in the flow.

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
    'REGISTRATION_COLLECTING_OPTIONAL',
    'REGISTRATION_FINAL_REVIEW',
    'REGISTRATION_FLOW_ACTIVE'
  ));
