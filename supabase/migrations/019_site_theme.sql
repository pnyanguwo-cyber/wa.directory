-- 019: Business website theme colours (per-section + accent)

-- Optional per-section colours for the auto-generated website.
-- Shape: {"header":"#RRGGBB","hero":"#RRGGBB","shop":"#RRGGBB","contact":"#RRGGBB","accent":"#RRGGBB"}
-- NULL or empty-string keys fall back to the built-in defaults.
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS site_theme JSONB NULL;
