-- 027_supply_orders.sql
-- Typed customer orders (S18.2): the buyer types "2 bread 1 cake", the bot
-- matches it against catalogues and fans the confirmed order out per supplier.
-- One row per supplier slice; a mixed order shares one group_id. Rows double
-- as sale tracking: open (created) -> sent (wa.me short link opened) ->
-- claimed (supplier contacts the buyer) -> closed (TTL sweep or manual).
-- Safe to re-run. Follows the 005 lockdown convention: RLS on + no policies
-- (service role keeps full access server-side).

CREATE TABLE IF NOT EXISTS supply_orders (
  id BIGSERIAL PRIMARY KEY,
  group_id TEXT NOT NULL DEFAULT '',          -- shared id when one order spans suppliers
  token TEXT UNIQUE NOT NULL,                  -- short checkout link code (/go/o/<token>)
  biz_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  biz_name TEXT NOT NULL DEFAULT '',
  buyer_phone TEXT NOT NULL,                   -- 263… digits (the customer's bot number)
  lines JSONB NOT NULL DEFAULT '[]',           -- [{ name, qty, price }]
  note TEXT DEFAULT '',
  city TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',         -- open | sent | claimed | closed
  clicks INT NOT NULL DEFAULT 0,
  pushed_via TEXT DEFAULT '',                  -- 'dm' | 'template' | 'skipped-inactive' | ''
  trace JSONB NOT NULL DEFAULT '[]',           -- events: sent / claimed / delivered
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);
ALTER TABLE supply_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON supply_orders FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_supply_orders_token ON supply_orders (token);
CREATE INDEX IF NOT EXISTS idx_supply_orders_biz ON supply_orders (biz_id, created_at DESC);CREATE INDEX IF NOT EXISTS idx_supply_orders_status ON supply_orders (status, created_at DESC);
