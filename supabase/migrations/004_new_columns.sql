-- Migration 004: Add address, show_location, featured_eligible, fallback_position
-- Safe to re-run (IF NOT EXISTS)

-- Business fields
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS show_location BOOLEAN DEFAULT true;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS featured_eligible BOOLEAN DEFAULT true;

-- Bidding fallback
ALTER TABLE bids ADD COLUMN IF NOT EXISTS fallback_position INT DEFAULT NULL;
