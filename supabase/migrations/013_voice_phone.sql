-- Migration 013: secondary voice number for both-types listings.
-- A business can be reachable on WhatsApp (phone, phone_type='whatsapp') AND
-- publish a landline/hotline alongside it (voice_phone, national format
-- e.g. 024 2123456 or 999). Voice-only listings keep phone_type='voice' with
-- the voice number in `phone` and voice_phone left empty.
-- Safe to re-run (IF NOT EXISTS).

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS voice_phone TEXT;
