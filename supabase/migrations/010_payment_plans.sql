-- Migration 010: Payment plans (1m/6m/12m), pro assistance add-on, stacking support.
-- Adds plan selection and professional assistance add-on to listing subscriptions.
-- Safe to re-run (IF NOT EXISTS).

-- ============================================================
-- 1. Add plan and pro_assistance columns to listing_subscriptions
-- ============================================================
ALTER TABLE listing_subscriptions ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT '1m';
ALTER TABLE listing_subscriptions ADD COLUMN IF NOT EXISTS pro_assistance BOOLEAN DEFAULT FALSE;

-- ============================================================
-- 2. Backfill existing active rows with '1m' plan
-- ============================================================
UPDATE listing_subscriptions SET plan = '1m' WHERE plan IS NULL;
