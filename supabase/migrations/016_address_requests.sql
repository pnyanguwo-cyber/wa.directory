-- Migration 016: address verification requests.
-- Users can request admin verification when their street address fails
-- geocoding. Admin reviews and either approves (geocodes + marks verified)
-- or rejects the request.

CREATE TABLE IF NOT EXISTS address_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  business_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- RLS: only service role touches this table (admin API routes).
ALTER TABLE address_requests ENABLE ROW LEVEL SECURITY;
