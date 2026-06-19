-- Phase B5: Non-ESA funding programs (tax credits, vouchers, scholarships, allotments, EFTC)
-- Additive migration: all columns are nullable, no table rewrite, no downtime.
-- Rollback: ALTER TABLE states DROP COLUMN non_esa_programs, DROP COLUMN non_esa_verified_at;

ALTER TABLE states ADD COLUMN "non_esa_programs" jsonb;
ALTER TABLE states ADD COLUMN "non_esa_verified_at" timestamp;

CREATE INDEX IF NOT EXISTS idx_states_non_esa_programs ON states USING btree (non_esa_programs);
