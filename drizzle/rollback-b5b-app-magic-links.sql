-- Rollback Phase B5b — App Magic Links
-- Run: psql "$DATABASE_URL" -f drizzle/rollback-b5b-app-magic-links.sql

DROP TABLE IF EXISTS app_magic_links;
