-- ============================================
-- ROLLBACK — Revert esa_programs, compliance_forms, esa_urls_verified_at
-- Generated: 2026-06-18
-- Phase: B1 — ESA Resources Population
-- ============================================

BEGIN;

-- Revert all three Phase 3 columns to NULL
UPDATE states
SET esa_programs = NULL,
    compliance_forms = NULL,
    esa_urls_verified_at = NULL
WHERE esa_programs IS NOT NULL
   OR compliance_forms IS NOT NULL
   OR esa_urls_verified_at IS NOT NULL;

-- Verify revert
SELECT 'ROLLBACK: ' || COUNT(*) || ' states reverted' AS result
FROM states
WHERE esa_programs IS NULL
  AND compliance_forms IS NULL;

COMMIT;

-- Verify state:
SELECT code, esa_programs IS NOT NULL AS has_programs,
       compliance_forms IS NOT NULL AS has_forms,
       esa_urls_verified_at IS NOT NULL AS verified
FROM states WHERE code IN ('AZ', 'FL', 'IA', 'OK')
ORDER BY code;
