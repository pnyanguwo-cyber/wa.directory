-- Personal contact paid listings (USD 0.20 each, per month): the category
-- row unlocks createListing approval (createListing checks the categories
-- table) without joining the static data/category hints used for parsing,
-- so searches like "contact" don't accidentally category-match these rows.
INSERT INTO categories (name, active, special)
VALUES ('Personal Contact', TRUE, FALSE)
ON CONFLICT (name) DO UPDATE SET active = TRUE, special = FALSE;
