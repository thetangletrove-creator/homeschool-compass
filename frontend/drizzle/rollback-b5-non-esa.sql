-- Phase B5 rollback: Remove non-ESA program columns
ALTER TABLE states DROP COLUMN IF EXISTS "non_esa_programs";
ALTER TABLE states DROP COLUMN IF EXISTS "non_esa_verified_at";
-- Index drops automatically with column drop in PostgreSQL
