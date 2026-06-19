# ESA Compliance Tracker — Integration Plan v2

**Date:** 2026-06-20
**Constraint:** Zero-knowledge architecture — all PII encrypted client-side via RSA-OAEP+AES-256-GCM (`lib/crypto.ts`). Server never sees plaintext names, emails, addresses, student IDs, or vendor names from user data.

---

## Architecture

### ZK Pattern (extends existing `lib/crypto.ts`)

| Data | Where encrypted | Server sees | Client stores key |
|------|----------------|-------------|-------------------|
| Family profile (parent name, email, address) | Browser, on form submit | `encrypted_profile text` bundle | localStorage |
| Student name, legal name | Browser, on form submit | `encrypted_text text` per-student | localStorage |
| Receipt images | Browser, before upload | AES-GCM encrypted blob in S3 | localStorage |
| Submission logs (vendorName, denialReason) | Never stored — stripped before write | `state_code`, `platform`, `rejection_category`, `session_id` only | N/A |
| Expense records (amount, category, date) | Browser, on form submit | `encrypted_data text` bundle | localStorage |

**Key management:** RSA keypair generated on dashboard mount via `loadOrCreateKeypair()`. Public key embedded in URL fragment for shared links. Private key never leaves localStorage.

**Data moat:** Submission logs contain zero PII — just event metadata + session-level aggregation. The analytics layer uses SHA-256 hashed `state_code+platform` vectors, not raw text.

### Schema Strategy

**No new top-level table.** 19-state compliance rules live as an enhanced `compliance_rules` JSONB column on the existing `states` table (schema-on-read). Only materialize into a dedicated `state_compliance_rules` table after 5-state usage validates the data model.

Existing `esaPrograms` JSONB on `states` already carries per-program deadlines, platforms, and max awards. Extend with a `reimbursementRules` object per program (file formats, merge rules, cap types, pre-approval flags).

---

## Sprints

### Sprint 1: ZK Compliance Schema + Rules Seed

**Deliverable:** Server stores encrypted compliance data. 19-state rules queryable.

| Task | Files changed | Acceptance |
|------|--------------|------------|
| 1.1 Extend `states` table: `compliance_rules jsonb` column | `schema.ts`, migration `0004_compliance_rules.sql` | Migration runs, column exists, nullable |
| 1.2 Seed script: research artifact → `compliance_rules` JSONB for 19 states | `scripts/seed-compliance-rules.py` | `SELECT code, compliance_rules FROM states WHERE esa_active = true` returns 19 rows |
| 1.3 `/api/compliance/rules` — public read, cached 24h, 10 req/min per IP | route handler + drizzle query | `GET /api/compliance/rules?state=FL` returns file specs, deadlines, caps |
| 1.4 ZK encrypt for family profiles: extend `lib/crypto.ts` with `encryptFamilyProfile()` | `lib/crypto.ts` | Browser encrypts `{ parentEmail, address }`, server stores `encrypted_profile` |

### Sprint 2: Pre-Validation Upload Wizard (The Aha Moment)

**Deliverable:** Free user uploads a receipt, gets real actionable errors before the state portal rejects them.

| Task | Files changed | Acceptance |
|------|--------------|------------|
| 2.1 3-step upload wizard (Upload → Scan → Results) | `app/compliance/validate/` page + components | User uploads receipt PDF → sees file size/format pass/fail |
| 2.2 Vertex AI OCR behind `NEXT_PUBLIC_OCR_ENABLED` flag, fallback to heuristic | `lib/receipt-ocr.ts` | Flag ON → Google Vision fields; flag OFF → regex fallback |
| 2.3 Pre-validation: name match, file size, format, merge check, handwritten receipt detection | server action + rules lookup | Receipt with handwritten text → warning; receipt >5MB for FL → block |
| 2.4 Submission attempt logging (anonymous — session ID only, no PII) | `POST /api/compliance/submission/log` | Row: `{ session_id, state_code, platform, outcome, rejection_category }` |
| 2.5 Free tier: 1 full pre-validation per month (cookie-tracked) | middleware + rate limiter | Second attempt → upgrade prompt |

### Sprint 3: ZK Family Profiles + Expense Tracker

**Deliverable:** Auth-gated dashboard. Family sets up profile, adds expenses, sees cap warnings. Data encrypted before hitting server.

| Task | Files changed | Acceptance |
|------|--------------|------------|
| 3.1 Family profile setup UI (state, program, students, award amount) | `app/dashboard/compliance/profile/` | Saves encrypted profile to DB |
| 3.2 Expense CRUD + ZK encryption on amount, category, date | `app/dashboard/compliance/expenses/` + API routes | Expense encrypted → decrypted on dashboard load |
| 3.3 Cap warning engine: compare running total vs `compliance_rules.expenseCaps` | `lib/cap-engine.ts` + server action | TX tech cap exceeded → `{ type: 'over_cap', category: 'technology', amount_over: 50 }` |
| 3.4 Expense tracker dashboard with per-category progress bars | `app/dashboard/compliance/` dashboard | State caps shown, remaining budget per category, gap warnings with action links |
| 3.5 Auth gate: expense tracker = $49/yr (authenticated only) | Stripe product + middleware | Unauthed → redirect to pricing |

### Sprint 4: Deadline Engine + Calendar

**Deliverable:** Structured deadline calculations from `esaPrograms.deadlines`. Color-coded calendar. Email reminders.

| Task | Files changed | Acceptance |
|------|--------------|------------|
| 4.1 Structured claim windows migration: parse freeform→structured JSON | migration + seed update | `deadlines.windows[{ opens, closes, label }]` per program |
| 4.2 `/api/compliance/deadlines` — per-state + per-program deadline calc | route handler + `lib/deadline-engine.ts` | TX: `{ next: '2026-07-01', label: 'Q3 Tranche', urgency: 'green' }` |
| 4.3 Deadline calendar dashboard component | `app/dashboard/compliance/calendar/` | Green (≥14d), yellow (3-14d), red (<3d), black (missed) |
| 4.4 Email reminder cron (3 days before hard deadline) | `scripts/deadline-reminder.py` + cron | User with TX deadline Jul 1 gets email Jun 28 |

### Sprint 5: Data Moat + Aggregation

**Deliverable:** Anonymized submission attempt data becomes queryable. First building block for UX Friction Index.

| Task | Files changed | Acceptance |
|------|--------------|------------|
| 5.1 `submission_attempts` aggregation endpoint | `GET /api/compliance/analytics/denials` | `{ state_code, platform, rejection_category, count, trend }` |
| 5.2 Rejection reason → category pipeline (regex → Vertex AI classify) | `lib/rejection-classifier.ts` | "File exceeds 5 MB limit" → `rejection_category: "file_size"` |
| 5.3 Vendor name normalization (fuzzy dedup for submission logs) | post-processing step | "Walmart", "walmart", "Wal-Mart" → canonical "Walmart" |
| 5.4 k-anonymity gate: suppress buckets <5 unique users | query middleware | Aggregation for state with 3 users → empty response |
| 5.5 PII scrubber on denial reason free-text before write | server action middleware | "Contact Jon at 555-1234" → "Contact [REDACTED]" |

### Sprint 6: Monetization Gates

**Deliverable:** Feature gating middleware. Stripe billing integration for $49/$79 tiers.

| Task | Files changed | Acceptance |
|------|--------------|------------|
| 6.1 Stripe product setup: $49/yr "Compliance Tracker" / $79/yr "Binder Plus" | Stripe dashboard + webhook handler | Products created, prices live |
| 6.2 Feature gate middleware: `checkFeatureAccess(userId, feature)` | `lib/feature-gates.ts` | Free: 1 scan/mo + rules ref + deadline view. $49: expenses + unlimited scan. $79: name matching + dynamic warnings + priority |
| 6.3 Upgrade/downgrade lifecycle: Stripe portal link, grace period | `app/dashboard/billing/` | User cancels → retains access until period end |
| 6.4 Free tier "aha moment" — 1 free pre-validation scan (cookie-tracked) | middleware + rate limit | First scan full-featured; second → upgrade modal |

### Sprint 7: Admin Tools

**Deliverable:** Non-engineer can update compliance rules without a deploy.

| Task | Files changed | Acceptance |
|------|--------------|------------|
| 7.1 CSV/JSON upload for `compliance_rules` updates | `app/admin/compliance/upload` | Upload CSV → overwrites per-state rules, audit logged |
| 7.2 Google Sheet sync MVP (read-only one-way) | `scripts/sync-compliance-sheet.py` | Sheet updated → `sync-compliance-sheet.py` → DB updated |
| 7.3 Audit log for rule changes | `compliance_rule_changes` table | Every rule update logged with timestamp, source, diff |
| 7.4 Legal disclaimer management: banner on compliance advice pages | shared component | "For guidance only. Verify with your state ESA portal." |

### Sprint 8: Viral Loop + GTM

**Deliverable:** Shareable assets that drive organic acquisition from parent communities.

| Task | Files changed | Acceptance |
|------|--------------|------------|
| 8.1 State denial guide page: `/compliance/[state]/denial-guide` public, shareable | route + dynamic page | SEO-friendly, embeddable, "email this guide" button |
| 8.2 Pre-validation widget: embeddable iframe for partner blogs | `components/embed/pre-validate-widget.tsx` | Partner drops `<iframe src=...>` → widget runs standalone |
| 8.3 PDF export of compliance summary (caps, deadlines, rules) | `lib/export-pdf.ts` | One-click download, print-friendly |
| 8.4 "Receipt Rejection Report" viral asset: top 10 denial reasons per state | `/api/compliance/analytics/top-denials?state=FL` | Returns ranked list, renders as infographic |

---

## Pricing (simplified)

| Tier | Price | What you get |
|------|-------|-------------|
| Free | $0 | Rules reference + 1 free pre-validation scan/mo + deadline calendar view |
| Tracker | $49/yr | Unlimited scans + expense tracker + cap warnings + deadline reminders |
| Binder Plus | $79/yr | All of Tracker + name matching + dynamic community warnings + priority support |

**One-time:** $29 Compliance Kit (static PDF guide per state, separate product — no feature overlap with web app).

---

## Dependency Map

```
Sprint 1 (Rules + ZK)
   ├─ Sprint 2 (Upload Wizard) — needs compliance_rules populated
   ├─ Sprint 3 (Family Profiles) — needs ZK encrypt pattern from 1.4
   └─ Sprint 7 (Admin Tools) — needs compliance_rules schema stable
Sprint 2
   └─ Sprint 5 (Data Moat) — needs submission_attempts logging from 2.4
Sprint 3
   ├─ Sprint 4 (Deadline Engine) — needs expenses + programs seeded
   └─ Sprint 6 (Monetization) — needs expense tracker from 3.4
Sprint 5
   └─ Sprint 8 (Viral Loop) — needs analytics data from 5.1
```

Parallelizable: Sprints 4 + 7 can run alongside 5. Sprint 8 independent once 5 ships.

---

## What's NOT Built (Yet)

- Vendor onboarding SaaS (needs vendor directory — Phase 6+)
- TheoPay concierge (WV-specific, needs revenue validation first)
- Financial products (bridge loans, device leasing — needs 1K+ users)
- White-label compliance API (needs stable rules engine + demand signal)
- Apple-native frontend (SwiftUI app exists as separate track — this plan is web-only)
