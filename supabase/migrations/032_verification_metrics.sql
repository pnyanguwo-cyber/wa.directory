-- Migration 032: Add trust and verification metrics to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS response_time_minutes INT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS orders_fulfilled INT DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS escrow_eligible BOOLEAN DEFAULT FALSE;
