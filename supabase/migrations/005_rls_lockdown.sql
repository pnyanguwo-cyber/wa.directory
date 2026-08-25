-- 005_rls_lockdown.sql
-- C3 + H1 security lockdown (IMPROVEMENTS.md §1/§2).
-- Safe to re-run. Run in Supabase SQL Editor.
--
-- What this does:
--   1. Removes the public INSERT policy on `businesses` (listings are now
--      created server-side via POST /api/businesses/create, service role).
--   2. Hides the secret `edit_token` column from anon/authenticated via
--      column-level GRANTs (public pages keep reading every other column).
--   3. Enables RLS with no policies (default-deny) + revokes table grants on
--      all portal/PII tables. The service role bypasses RLS, so all
--      server-side reads/writes continue to work unchanged.

-- ============================================================
-- 1+2. businesses: kill public INSERT, hide edit_token
-- ============================================================

DROP POLICY IF EXISTS "Public insert access" ON businesses;

REVOKE ALL ON public.businesses FROM anon, authenticated;
GRANT SELECT (
  id, name, bio, category, location, country_code, city, area,
  slug, phone, whatsapp_link, whatsapp_username, verified, rating,
  review_count, catalog_link, logo_url, price_range, website,
  address, show_location, featured_eligible, areas, created_at
) ON public.businesses TO anon, authenticated;

-- ============================================================
-- 3. Portal / PII / internal tables: default-deny
--    (RLS on + zero policies => anon/authenticated see nothing;
--     service role bypasses RLS as before)
-- ============================================================

ALTER TABLE business_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rank_spots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids               ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cache           ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions      ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON business_accounts FROM anon, authenticated;
REVOKE ALL ON stats_events       FROM anon, authenticated;
REVOKE ALL ON daily_stats        FROM anon, authenticated;
REVOKE ALL ON chat_logs          FROM anon, authenticated;
REVOKE ALL ON ratings            FROM anon, authenticated;
REVOKE ALL ON subscriptions      FROM anon, authenticated;
REVOKE ALL ON rank_spots         FROM anon, authenticated;
REVOKE ALL ON bids               FROM anon, authenticated;
REVOKE ALL ON ai_cache           FROM anon, authenticated;
REVOKE ALL ON chat_sessions      FROM anon, authenticated;
