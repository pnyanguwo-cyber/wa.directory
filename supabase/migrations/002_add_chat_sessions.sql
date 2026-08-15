-- WhatsApp chatbot conversation state
-- Run in the Supabase SQL editor on your live project.
CREATE TABLE IF NOT EXISTS chat_sessions (
  phone TEXT PRIMARY KEY,
  step TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);