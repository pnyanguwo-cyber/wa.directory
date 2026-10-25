-- Idempotency for Meta webhook retries: every inbound message id is recorded
-- once; redeliveries (after timeouts or 5xx) are skipped by the bot so a
-- customer never receives duplicate replies.
CREATE TABLE IF NOT EXISTS webhook_receipts (
  message_id text PRIMARY KEY,
  seen_at timestamptz NOT NULL DEFAULT NOW()
);
