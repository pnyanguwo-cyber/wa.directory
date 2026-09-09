-- Migration 011: Paynow payments on bids
-- The bidding flow is now #1-only: a business bids to outbid the current #1
-- holder, pays the bid amount via Paynow (EcoCash mobile push), and takes the
-- #1 spot instantly once the payment is confirmed.

ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS payer_phone TEXT,
  ADD COLUMN IF NOT EXISTS paynow_poll_url TEXT,
  ADD COLUMN IF NOT EXISTS paynow_reference TEXT,
  ADD COLUMN IF NOT EXISTS paynow_paid_at TIMESTAMPTZ;

-- 'paid' = EcoCash confirmed, not yet in the audit list as activated
-- 'approved' = activated (holder of the spot)
-- The original status CHECK was created inline, so Postgres auto-named it
-- "bids_status_check". Drop it by name, then sweep for any other status
-- check by definition (renamed variants), then re-add the wider status set.
ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_status_check;

DO $$
DECLARE
  conname TEXT;
BEGIN
  FOR conname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype = 'c'
      AND t.relname = 'bids'
      AND n.nspname = 'public'
      AND pg_get_constraintdef(c.oid) ILIKE 'CHECK %status%'
  LOOP
    EXECUTE format('ALTER TABLE bids DROP CONSTRAINT %I', conname);
  END LOOP;
END $$;

ALTER TABLE bids ADD CONSTRAINT bids_status_check
  CHECK (status IN ('pending', 'paid', 'approved', 'rejected', 'outbid', 'expired'));

CREATE INDEX IF NOT EXISTS idx_bids_paynow_ref ON bids (paynow_reference);
