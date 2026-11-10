-- Migration 040: authoritative business pricing + real 90-day trial lifecycle
--
-- 1. listing_subscriptions.amount defaulted to 1.00 (the old business price).
--    Any insert that omitted amount silently became USD 1. Personal-contact
--    rows legitimately keep their $1/$5/$10 prices, so the backfill below
--    deliberately excludes the 'Personal Contact' category.
-- 2. Trial history used to be erased on activation (trial_eligible was set to
--    false), which made repeat trials possible. is_trial + trial_status keep a
--    durable, queryable trial lifecycle alongside paid records.

ALTER TABLE listing_subscriptions ALTER COLUMN amount SET DEFAULT 2.00;

ALTER TABLE listing_subscriptions ADD COLUMN IF NOT EXISTS
  is_trial BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE listing_subscriptions ADD COLUMN IF NOT EXISTS
  trial_status TEXT DEFAULT 'none';

-- The WhatsApp EcoCash path has always written payment_method, but no
-- migration ever created the column, so those inserts failed in production.
ALTER TABLE listing_subscriptions ADD COLUMN IF NOT EXISTS
  payment_method TEXT;

ALTER TABLE listing_subscriptions DROP CONSTRAINT IF EXISTS listing_subscriptions_trial_status_check;
ALTER TABLE listing_subscriptions ADD CONSTRAINT listing_subscriptions_trial_status_check
  CHECK (trial_status IN ('none', 'requested', 'active', 'expiring', 'expired', 'converted'));

-- Backfill durable trial history from the columns written by the old flow.
UPDATE listing_subscriptions
SET is_trial = true,
    trial_status = CASE
      WHEN trial_activated_at IS NULL AND trial_requested_at IS NOT NULL THEN 'requested'
      WHEN trial_activated_at IS NULL THEN 'none'
      WHEN trial_expires_at IS NULL THEN 'active'
      WHEN trial_expires_at <= NOW() THEN 'expired'
      WHEN trial_expires_at <= NOW() + INTERVAL '7 days' THEN 'expiring'
      ELSE 'active'
    END
WHERE trial_activated_at IS NOT NULL OR trial_requested_at IS NOT NULL;

-- Correct stale $1 pending business rows. Never touch personal contacts.
UPDATE listing_subscriptions ls
SET amount = 2.00
FROM businesses b
WHERE ls.business_id = b.id
  AND ls.status = 'pending'
  AND ls.amount = 1.00
  AND ls.trial_activated_at IS NULL
  AND COALESCE(ls.is_trial, false) = false
  AND NOT ('Personal Contact' = ANY(COALESCE(b.category, '{}'::text[])));

-- Trial queries now use is_trial instead of overloading trial_eligible.
DROP INDEX IF EXISTS idx_listing_subscriptions_trial_expires;
DROP INDEX IF EXISTS idx_listing_subscriptions_trial_reminders;

CREATE INDEX IF NOT EXISTS idx_listing_subscriptions_trial_expires
  ON listing_subscriptions(trial_expires_at)
  WHERE is_trial = true AND trial_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listing_subscriptions_trial_reminders
  ON listing_subscriptions(trial_reminder_sent_7d, trial_reminder_sent_3d)
  WHERE is_trial = true AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_listing_subscriptions_business_trial
  ON listing_subscriptions(business_id, is_trial, trial_status);

COMMENT ON COLUMN listing_subscriptions.amount IS
  'Amount actually charged. Business plans: 2.00 / 10.00 / 20.00. Personal contacts: 1.00 / 5.00 / 10.00. Trials: 0.00.';
COMMENT ON COLUMN listing_subscriptions.is_trial IS
  'True for trial subscription records (including expired/converted), so trial revenue is never counted as paid.';
COMMENT ON COLUMN listing_subscriptions.trial_status IS
  'requested (before admin approval) -> active -> expiring -> expired -> converted (paid).';
