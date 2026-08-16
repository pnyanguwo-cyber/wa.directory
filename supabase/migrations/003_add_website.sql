-- 003: Add optional website column to businesses
-- Run this in your Supabase SQL editor (new project: jqwniyfzgoxovjftgepl)

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '';