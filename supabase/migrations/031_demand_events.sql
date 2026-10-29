-- 031_demand_events.sql
-- Supplier Demand Radar: every (non-sensitive) user search is stored once so
-- verified suppliers can claim the lead. Rows are anonymized up front — the
-- buyer's raw digits are recorded only because the claim flow needs to ask
-- that same buyer for consent before their number is ever shared. Safe to
-- re-run. Follows the 005 lockdown convention: RLS on + no policies (service
-- role keeps full access server-side).
CREATE TABLE IF NOT EXISTS demand_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  term TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  result_count INT NOT NULL DEFAULT 0,
  buyer TEXT NOT NULL DEFAULT '',
  claimed_by TEXT,
  claimed_at TIMESTAMPTZ,
  rq_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE demand_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON demand_events FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_demand_events_city ON demand_events (city, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demand_events_open ON demand_events (claimed_by)
  WHERE claimed_by IS NULL;
