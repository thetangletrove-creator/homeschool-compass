-- Rollback B3 compliance forms enrichment: restore pre-enrichment default values
-- This reverts the real compliance data from compliance-forms-directory.json
-- back to generic "See state requirements" placeholders.
--
-- Run: psql "$DATABASE_URL_UNPOOLED" -f drizzle/rollback-b3-compliance.sql

-- Restore all 52 states' compliance_forms to original empty/placeholder format
UPDATE states
SET compliance_forms = jsonb_build_object(
  'notification_url', null,
  'notification_form_url', null,
  'assessment_rules', 'See state department of education website',
  'assessment_form_url', null,
  'instruction_days', 'See state requirements',
  'immunization_rules', 'See state requirements',
  'recordkeeping', 'See state requirements',
  'other_forms', '[]'::jsonb
)
WHERE code IN ('AK','AL','AR','AZ','CA','CO','CT','DC','DE','FL','GA','HI','IA','ID','IL','IN','KS','KY','LA','MA','MD','ME','MI','MN','MO','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VA','VT','WA','WI','WV','WY');
