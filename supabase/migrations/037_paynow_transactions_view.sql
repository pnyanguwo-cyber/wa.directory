-- Migration 037: Paynow transactions view for financial reporting
-- This view aggregates payment data from all tables that use Paynow for confirmation.
-- It consolidates:
--   - listing_subscriptions (listing plan payments)
--   - bids (ranking bid payments)
--
-- The view is used by admin stats and prevents missing table errors.
-- Safe to re-run.

-- Create the paynow_transactions view
CREATE OR REPLACE VIEW paynow_transactions AS
-- Listing subscription payments
SELECT
  id,
  'listing_payment' as source,
  business_id,
  'confirmed' as status,
  amount,
  paynow_reference as reference,
  created_at
FROM listing_subscriptions
WHERE paynow_reference IS NOT NULL
  AND status = 'active'
  AND paynow_paid_at IS NOT NULL
  AND paynow_paid_at IS NOT NULL

UNION ALL

-- Bid payments (one-time ranking payments)
SELECT
  id,
  'bid_payment' as source,
  business_id,
  CASE
    WHEN status = 'approved' THEN 'confirmed'
    WHEN status = 'paid' THEN 'pending'
    ELSE 'failed'
  END as status,
  amount,
  paynow_reference as reference,
  created_at
FROM bids
WHERE paynow_reference IS NOT NULL

UNION ALL

-- Manual listing confirmations (no paynow_reference)
SELECT
  id,
  'listing_payment' as source,
  business_id,
  'confirmed' as status,
  amount,
  'MANUAL-' || id as reference,
  created_at
FROM listing_subscriptions
WHERE paynow_reference IS NULL
  AND status = 'active'
  AND started_at IS NOT NULL;

-- Create an index-like helper for faster filtering on the view
-- Note: Views cannot have indexes, but we can create a materialized view if needed
-- For now, create a helper function to ensure the view is well-formed

-- Add a comment to the view
COMMENT ON VIEW paynow_transactions IS
'Consolidated Paynow transactions from listing_subscriptions and bids tables.
Columns: id, source, business_id, status, amount, reference, created_at';

-- RLS: the view inherits RLS from underlying tables
-- Service role can read it via admin API