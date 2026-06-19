-- Rollback B4 enrichment: restore esa_programs to pre-enrichment state
-- This reverts the portal URL / application URL / platform enrichment from the
-- ESA Portal Directory (2026-06-19), restores OH and OK (voucher/tax-credit false positives),
-- and removes MS and MT (added during enrichment).
--
-- Run: psql "$DATABASE_URL_UNPOOLED" -f drizzle/rollback-b4-enrichment.sql

-- Clear enriched programs for all 19 ESA states
UPDATE states
SET esa_programs = NULL, esa_urls_verified_at = NULL
WHERE code IN ('AL','AR','AZ','FL','GA','IA','IN','LA','MO','MS','MT','NC','NH','SC','TN','TX','UT','WV','WY');

-- Restore OH (voucher) that was incorrectly removed
UPDATE states
SET esa_programs = '[{"name":"EdChoice Expansion Scholarship","status":"voucher","platform":"custom","portal_url":"https://education.ohio.gov/Topics/Other-Resources/Scholarships/EdChoice-Expansion","deadline":"Verify 2026-27 window","max_award":"$6,166 K-8; $8,408 9-12","eligibility":"K-12 private-school voucher"}]'::jsonb,
    esa_urls_verified_at = now()
WHERE code = 'OH';

-- Restore OK (tax credit) that was incorrectly removed
UPDATE states
SET esa_programs = '[{"name":"Parental Choice Tax Credit","status":"refundable_tax_credit","platform":"custom","portal_url":"https://oklahoma.gov/tax/individuals/parental-choice-tax-credit.html","deadline":"Tax return filing","max_award":"$1,000 homeschool; $5,000-$7,500 private","eligibility":"Oklahoma taxpayers"}]'::jsonb,
    esa_urls_verified_at = now()
WHERE code = 'OK';
