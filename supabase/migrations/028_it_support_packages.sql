-- 028_it_support_packages.sql
-- Tiered IT Concierge add-on: Bronze $10/mo, Silver $25/mo, Gold $50/mo
-- One active subscription per business at a time; auto-renews with listing payment.
-- Safe to re-run. Follows the 005 lockdown convention: RLS on + no policies
-- (service role keeps full access server-side).

CREATE TYPE support_tier AS ENUM ('bronze', 'silver', 'gold');

CREATE TABLE IF NOT EXISTS support_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  biz_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  tier support_tier NOT NULL,
  price_usd NUMERIC(10,2) NOT NULL,         -- 10.00, 25.00, 50.00
  status TEXT NOT NULL DEFAULT 'active',     -- active | cancelled | past_due
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  -- Stripe/Paynow subscription id if we ever move to a gateway; for now we track via EcoCash manual.
  external_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE support_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON support_subscriptions FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_support_subs_biz ON support_subscriptions (biz_id, status);
CREATE INDEX IF NOT EXISTS idx_support_subs_period ON support_subscriptions (current_period_end);

-- One active support subscription per business
CREATE UNIQUE INDEX IF NOT EXISTS uq_support_subs_one_active
  ON support_subscriptions (biz_id)
  WHERE status = 'active';

-- Helpful view for portal UI
CREATE OR REPLACE VIEW v_business_support AS
SELECT
  b.id AS biz_id,
  b.name AS biz_name,
  b.payment_status,
  s.tier,
  s.price_usd,
  s.status AS support_status,
  s.current_period_end,
  CASE WHEN s.status = 'active' AND s.current_period_end > NOW() THEN true ELSE false END AS support_active
FROM businesses b
LEFT JOIN support_subscriptions s
  ON s.biz_id = b.id AND s.status = 'active'
WHERE b.payment_status = 'active';