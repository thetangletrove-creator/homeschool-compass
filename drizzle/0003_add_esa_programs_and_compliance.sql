-- Phase 3: Binder Plus enrichment — ESA programs, compliance forms, URL freshness tracking
-- Additive migration: all columns are nullable, no table rewrite, no downtime.
-- Existing esa_name/esa_max_award/etc. columns preserved for backward compatibility.
-- Rollback: ALTER TABLE states DROP COLUMN esa_programs, DROP COLUMN compliance_forms, DROP COLUMN esa_urls_verified_at;

ALTER TABLE states ADD COLUMN "esa_programs" jsonb;
ALTER TABLE states ADD COLUMN "compliance_forms" jsonb;
ALTER TABLE states ADD COLUMN "esa_urls_verified_at" timestamp;

CREATE INDEX IF NOT EXISTS idx_states_esa_programs ON states USING btree (esa_programs);
CREATE INDEX IF NOT EXISTS idx_states_compliance_forms ON states USING btree (compliance_forms);

-- Drop the duplicate generated file
