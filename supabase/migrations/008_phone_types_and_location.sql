-- Migration 008: phone types (landlines & hotlines) + verified address coordinates.
-- 1. phone_type: 'whatsapp' (default, current behaviour) or 'voice' — a landline
--    or hotline stored in national format (024…, 999) that renders a Call
--    button instead of a WhatsApp chat.
-- 2. lat/lng + address_verified: Google-geocoded coordinates saved at listing
--    time so the profile's Directions button opens turn-by-turn navigation in
--    one tap instead of a fuzzy text search.
-- Safe to re-run (IF NOT EXISTS).

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone_type TEXT NOT NULL DEFAULT 'whatsapp';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address_verified BOOLEAN DEFAULT FALSE;
