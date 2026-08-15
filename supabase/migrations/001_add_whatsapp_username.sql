-- Run in the Supabase SQL editor on your live project.
-- The whatsapp_username feature is code-complete but this column is
-- missing on the connected database (schema drift).
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS whatsapp_username TEXT DEFAULT '';
