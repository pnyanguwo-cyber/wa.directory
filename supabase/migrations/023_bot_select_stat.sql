-- Migration 023: bot result-selection analytics
-- Adds 'bot_select' to stats_events.type — recorded when a WhatsApp user
-- picks a numbered search result ("reply 1") to view contact details.
-- The bot inserts this best-effort; until this migration is applied the
-- insert silently fails and selection tracking is just absent.

DO $$
DECLARE
  conname TEXT;
BEGIN
  FOR conname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype = 'c'
      AND t.relname = 'stats_events'
      AND n.nspname = 'public'
      AND pg_get_constraintdef(c.oid) ILIKE 'CHECK %type%'
  LOOP
    EXECUTE format('ALTER TABLE stats_events DROP CONSTRAINT %I', conname);
  END LOOP;
END $$;

ALTER TABLE stats_events ADD
  CHECK (type IN (
    'profile_view', 'click_whatsapp', 'click_call', 'click_website',
    'impression', 'qr_scan', 'bot_search', 'bot_chat_open',
    'share_bot', 'share_web', 'bot_select'
  ));
