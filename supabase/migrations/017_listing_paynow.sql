-- Automatic EcoCash payments for listing subscriptions.
--
-- Previously the /pay flow only recorded a *manual* payment request: the payer
-- entered their EcoCash number and an admin had to eyeball the transaction.
-- Now /api/pay initiates a real Paynow EcoCash push (the payer gets a PIN
-- prompt on their phone). Paynow's server-to-server result webhook
-- (/api/paynow/result) auto-confirms LISTING-<subId> payments, so the listing
-- goes live the moment the PIN is entered — no admin step needed. Admin can
-- still confirm/reject manually in the Subscriptions tab.
--
-- Adds the Paynow bookkeeping columns the auto flow needs.

ALTER TABLE listing_subscriptions ADD COLUMN IF NOT EXISTS paynow_poll_url TEXT;
ALTER TABLE listing_subscriptions ADD COLUMN IF NOT EXISTS paynow_reference TEXT;
ALTER TABLE listing_subscriptions ADD COLUMN IF NOT EXISTS paynow_paid_at TIMESTAMPTZ;
ALTER TABLE listing_subscriptions ADD COLUMN IF NOT EXISTS auto_confirmed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_listing_subscriptions_paynow_ref
  ON listing_subscriptions(paynow_reference)
  WHERE paynow_reference IS NOT NULL;
