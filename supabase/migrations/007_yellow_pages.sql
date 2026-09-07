-- Migration 007: Yellow Pages — special public-service categories
-- (police, fire brigade, government offices, etc.)
-- Adds the `special` flag to categories and seeds the two starter
-- Yellow Pages categories so admins can manage them from /admin.
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT).

ALTER TABLE categories ADD COLUMN IF NOT EXISTS special BOOLEAN DEFAULT FALSE;

-- Flag existing rows as Yellow Pages without clobbering admin-edited
-- keywords/icons: on conflict we only (re)assert the special flag.
INSERT INTO categories (name, icon, keywords, active, special) VALUES
  ('Emergency Services', '🚨',
   ARRAY['police','zrp','fire brigade','firefighter','fire fighter','ambulance','emergency','disaster','rescue','civil protection','emergency hotline','toll free','sos'],
   TRUE, TRUE),
  ('Government Services', '🏛️',
   ARRAY['government','council','municipality','registrar','passport office','zimra','public office','civic','registry','home affairs','public service','utility office'],
   TRUE, TRUE)
ON CONFLICT (name) DO UPDATE SET special = TRUE;
