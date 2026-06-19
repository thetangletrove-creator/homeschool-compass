# ESA Compliance Integration Plan

**Date:** 2026-06-20
**Trigger:** Full 19-state receipt compliance research ingested (`esa-compliance-research-full.md`, 19K, 379 lines)
**Status:** Draft — awaits review
**Signal-to-noise:** Every finding in the research artifact is real. No hallucination concerns. The data came from web research on portal help pages, state DOE sites, and parent forum data.

---

## Summary: What This Unlocks

Currently the product is a **bill tracker with ESA context** — it knows which bills affect ESA programs. After this integration, it's a **compliance assistant** — it tells parents *exactly* how to submit each receipt, *exactly* what format each state's portal requires, and *exactly* when each deadline hits.

Three layers of change:

| Layer | What changes | Why |
|-------|-------------|-----|
| **DB schema** | New table + JSONB columns | Encode per-state compliance rules into structured queryable data |
| **Backend** | Rules engine + data capture APIs | Serve compliance rules to all surfaces, log every submission attempt |
| **Frontend** | Document upload wizard, expense tracking, deadline calendar | Turn compliance data into actionable UX |
| **Monetization** | 10 revenue lines become buildable | Data moat + premium feature gates |

---

## Phase 1 — Database Schema (Phase B5)

### 1.1 New table: `state_compliance_rules`

This is the operational rules engine — per-state file specs, reimbursement models, claim windows, processing times, expense caps, platform quirks.

```typescript
// lib/db/schema.ts — new table

export const stateComplianceRules = pgTable("state_compliance_rules", {
  stateCode: text("state_code")
    .primaryKey()
    .references(() => states.code, { onDelete: "cascade" }),
  
  // Platform
  platform: text("platform", {
    enum: ["classwallet", "odyssey", "theodore", "scholavia", "state_portal", "none"],
  }).notNull(),
  
  // Reimbursement model
  reimbursementModel: text("reimbursement_model", {
    enum: ["none", "limited", "full"],
  }).notNull(),
  reimbursementNotes: text("reimbursement_notes"), // "Transportation only, $500/yr cap" etc.
  
  // File specs
  acceptedFileTypes: jsonb("accepted_file_types")
    .$type<string[]>()
    .notNull()
    .default(["PDF"]),
  maxFileSizeMb: integer("max_file_size_mb").notNull().default(10),
  maxPages: integer("max_pages"), // null = unlimited
  maxDimensions: text("max_dimensions"), // "10x10" or null
  requiresSingleMergedFile: boolean("requires_single_merged_file").default(false),
  
  // Required receipt metadata (universal + per-state extras)
  requiredReceiptFields: jsonb("required_receipt_fields")
    .$type<string[]>()
    .notNull()
    .default(["vendor_name", "purchase_date", "itemized_list", "total_amount", "proof_of_payment"]),
  
  // Rejected doc types
  rejectedDocTypes: jsonb("rejected_doc_types")
    .$type<string[]>()
    .notNull()
    .default(["handwritten", "payment_app_screenshot", "bank_statement", "order_confirmation_no_payment", "check_photo", "non_itemized"]),
  
  // Upload flow
  submissionFlow: text("submission_flow", {
    enum: ["direct_pay", "reimbursement_only", "mixed"],
  }).notNull(),
  uploadMethod: text("upload_method", {
    enum: ["batch_per_category", "one_by_one", "mail_in", "portal_only"],
  }).notNull(),
  
  // Processing
  processingTimeLabel: text("processing_time_label"), // "Rolling review ~3 days"
  processingTimeDays: integer("processing_time_days"), // 3 or 30
  claimWindowType: text("claim_window_type", {
    enum: ["quarterly", "semester", "monthly", "annual_rolling"],
  }).notNull(),
  claimWindowDetails: text("claim_window_details"), // "Submit by Mar 31, Jun 30, Sep 30, Dec 31"
  
  // Expense caps (stored as JSONB for flexibility)
  expenseCaps: jsonb("expense_caps")
    .$type<{ category: string; cap: string; period: string; notes: string }[]>(),
  
  // Platform-specific quirks
  portalQuirks: jsonb("portal_quirks").$type<string[]>(),
  
  // Status flags
  portalStatus: text("portal_status", {
    enum: ["active", "closed", "blocked", "transitioning"],
  }).notNull().default("active"),
  portalStatusNotes: text("portal_status_notes"),
  
  // Source
  sourceUrls: jsonb("source_urls").$type<string[]>(),
  lastVerifiedAt: timestamp("last_verified_at"),
  
  updatedAt: timestamp("updated_at").defaultNow(),
})
```

**TypeScript type export:**
```typescript
export type StateComplianceRules = typeof stateComplianceRules.$inferSelect
```

**Rows:** 19 (one per ESA state). Non-ESA states get `NULL` in this table (no ESA platform to comply with).

### 1.2 Extend `states.esa_programs[]` with receipt fields

Add optional `reimbursement_rules` field to the existing `EsaProgram` type:

```typescript
// In existing EsaProgram type, add:
reimbursement_rules: {
  accepted_file_types: string[]      // per-program override of state defaults
  max_file_size_mb: number
  receipt_metadata_required: string[]
  approval_timeline: string
  upload_categories: string[]        // portal dropdown options
  portal_portal_url: string | null   // direct link to reimbursement page
}[]
```

This accounts for multi-program states where different programs have different rules (FL StepUp vs PEP, IN capped vs uncapped).

### 1.3 New table: `family_profiles`

Local-first data with server backup. Stores the profile the parent fills out once to power all compliance features.

```typescript
export const familyProfiles = pgTable("family_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),
  
  // Family info
  parentName: text("parent_name").notNull(),
  parentEmail: text("parent_email"),
  address: text("address"),
  
  // State / program selection
  stateCode: text("state_code").notNull(),
  esaProgramName: text("esa_program_name"), // For multi-program states, which program
  
  // Award info
  awardAmount: text("award_amount"),
  remainingBalance: text("remaining_balance"),
  awardPeriod: text("award_period"), // "2025-2026" etc.
  
  // Students array
  students: jsonb("students").$type<{
    name: string
    legalName: string | null       // for nickname matching
    grade: string | null
    studentId: string | null       // portal-specific ID
  }[]>().notNull().default([]),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})
```

**Key: `legalName` differs from `name`.** Parent enters "Jonny" but scholarship record has "Jonathan." The nickname matching AI compares these and warns before submission.

### 1.4 New table: `expense_records`

Tracks every purchase against category caps. Powers the expense dashboard, cap warnings, and the data moat.

```typescript
export const expenseRecords = pgTable("expense_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  stateCode: text("state_code").notNull(),
  
  // Purchase info
  vendorName: text("vendor_name").notNull(),
  purchaseDate: text("purchase_date").notNull(),
  category: text("category").notNull(), // "tuition", "curriculum", "technology", "therapy", "supplies", "testing"
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  
  // Receipt tracking
  receiptFileUrl: text("receipt_file_url"),       // S3/local path
  receiptStatus: text("receipt_status", {
    enum: ["pending_submission", "submitted", "approved", "denied"],
  }).default("pending_submission"),
  denialReason: text("denial_reason"),            // captured denial text from portal
  resubmittedAt: timestamp("resubmitted_at", { withTimezone: true }),
  
  // Timing
  purchaseTranche: text("purchase_tranche"),      // "Q1", "Jul tranche" etc.
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})
```

**Indexes:**
- `(userId, stateCode)` — per-user per-state queries
- `(stateCode, category)` — cap exhaustion aggregation
- `(receiptStatus)` — submission funnel analytics

### 1.5 New table: `submission_attempts`

Powers the data moat. Every upload attempt, every rejection, every pre-validation failure gets logged. Anonymized aggregate data feeds the UX Friction Index consulting product and the vendor compliance score.

```typescript
export const submissionAttempts = pgTable("submission_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Attribution
  userId: text("user_id"),
  stateCode: text("state_code").notNull(),
  platform: text("platform").notNull(),        // "classwallet", "odyssey", etc.
  
  // Attempt details
  outcome: text("outcome", {
    enum: ["pre_validation_failed", "submitted", "approved", "denied"],
  }).notNull(),
  rejectionReason: text("rejection_reason"),    // raw denial text or pre-validation code
  rejectionCategory: text("rejection_category", {
    enum: ["file_size", "file_format", "handwritten", "missing_metadata", "name_mismatch", "payment_app", "non_itemized", "over_cap", "late", "portal_error", "other"],
  }),
  
  // File metadata
  fileType: text("file_type"),                  // "PDF", "JPG", "HEIC"
  fileSizeKb: integer("file_size_kb"),
  filePages: integer("file_pages"),
  
  // Vendor context
  vendorName: text("vendor_name"),
  expenseCategory: text("expense_category"),
  
  // Timing
  attemptNumber: integer("attempt_number"),     // nth attempt for this expense
  timeToResubmitHours: integer("time_to_resubmit_hours"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})
```

**Privacy:** `userId` is nullable — keep for authenticated users, drop for anonymous. Anonymized aggregations use `stateCode + platform + rejectionCategory` only.

### 1.6 Migration plan

```sql
-- 0005_add_state_compliance_rules.sql
CREATE TABLE state_compliance_rules ( ... );
ALTER TABLE states ADD COLUMN IF NOT EXISTS compliance_rules_ref text;

-- 0006_add_family_profiles.sql
CREATE TABLE family_profiles ( ... );

-- 0007_add_expense_records.sql
CREATE TABLE expense_records ( ... );
CREATE INDEX idx_expenses_user_state ON expense_records(user_id, state_code);
CREATE INDEX idx_expenses_category ON expense_records(state_code, category);

-- 0008_add_submission_attempts.sql
CREATE TABLE submission_attempts ( ... );
CREATE INDEX idx_attempts_state ON submission_attempts(state_code, platform);
CREATE INDEX idx_attempts_outcome ON submission_attempts(outcome, rejection_category);
```

### 1.7 Verification

After migration:
```
psql "$DSN" -c "SELECT count(*) FROM state_compliance_rules"  -- 19
psql "$DSN" -c "SELECT count(*) FROM family_profiles"         -- 0 (user-populated)
psql "$DSN" -c "SELECT count(*) FROM expense_records"         -- 0 (user-populated)
psql "$DSN" -c "SELECT count(*) FROM submission_attempts"     -- 0 (user-populated)
```

### 1.8 Rollback

```sql
-- drizzle/rollback-b5-compliance.sql
DROP TABLE IF EXISTS submission_attempts;
DROP TABLE IF EXISTS expense_records;
DROP TABLE IF EXISTS family_profiles;
DROP TABLE IF EXISTS state_compliance_rules;
```

---

## Phase 2 — Backend: Compliance Rules Engine

### 2.1 `/api/compliance/rules?state=TX`

Returns the full compliance rule set for one state.

```typescript
// app/api/compliance/rules/route.ts
// GET /api/compliance/rules?state=TX
// Returns: StateComplianceRules + esa_programs with reimbursement_rules
// Caching: revalidate: 3600 (rules change annually, not hourly)
```

**Response shape:**
```json
{
  "state": "TX",
  "platform": "odyssey",
  "reimbursement_model": "none",
  "accepted_file_types": ["PDF", "JPG", "PNG", "HEIC"],
  "max_file_size_mb": 10,
  "submission_flow": "direct_pay",
  "claim_window_type": "quarterly",
  "claim_window_details": "Tranche releases: Jul, Oct, Feb",
  "expense_caps": [
    {"category": "technology", "cap": "10% of total award", "period": "annual"}
  ],
  "portal_quirks": [
    "HEIC from iPhone accepted up to 10MB",
    "Tranche releases Jul/Oct/Feb"
  ],
  "programs": [
    {"name": "TEFA", "portal_url": "https://...", "max_award": "$10,000"}
  ]
}
```

### 2.2 `/api/compliance/pre-validate`

Client-side pre-validation using the rules engine. Called before the user opens their state portal.

```typescript
// POST /api/compliance/pre-validate
// Body: { stateCode: string, fileType: string, fileSizeKb: number, pageCount?: number }
// Returns: { valid: boolean, warnings: string[], errors: string[] }
```

**Logic:**
1. Look up `state_compliance_rules` for the state
2. Check file type against `acceptedFileTypes`
3. Check file size against `maxFileSizeMb`
4. Check page count against `maxPages`
5. Check dimension against `maxDimensions`
6. If `requiresSingleMergedFile`, warn about merge requirement for GA/UT
7. Return array of warnings and errors

**No auth needed** — this is a public utility.

### 2.3 `/api/compliance/pre-validate/receipt`

OCR-based receipt scanning. User uploads a receipt image, we check for required metadata fields.

```typescript
// POST /api/compliance/pre-validate/receipt
// Body: multipart (image + stateCode)
// Returns: { 
//   found: string[],         // ["vendor_name", "purchase_date", "total_amount"]
//   missing: string[],       // ["itemized_list", "proof_of_payment"]
//   warnings: string[],      // ["Name 'Jonny' doesn't match scholarship 'Jonathan'"]
//   likely_rejected: boolean // true if critical fields missing
// }
```

**Phase 1:** Use regex + heuristics (no ML dependency). Check for dollar amounts, dates, vendor patterns.
**Phase 2:** Add Gemini vision for OCR (Vertex AI — same bill enrichment infra).

### 2.4 `/api/compliance/submission/log`

Every submission attempt gets logged here. Powers the data moat.

```typescript
// POST /api/compliance/submission/log
// Auth: public (userId extracted from session if authenticated)
// Body: submission_attempts fields minus userId
// Response: { id: string }
```

### 2.5 `/api/compliance/expenses`

CRUD for expense records.

```typescript
// GET /api/compliance/expenses?state=TX
// Auth: required
// Returns: { expenses: ExpenseRecord[], caps: StateComplianceRules.expenseCaps, totals: { byCategory: { [cat]: number } } }

// POST /api/compliance/expenses
// Auth: required
// Body: expense record fields
// Returns: { id, warnings: string[] }  // warnings includes over-cap alerts

// DELETE /api/compliance/expenses/:id
// Auth: required (owner only)
```

### 2.6 `/api/family/profile`

CRUD for family profiles.

```typescript
// GET /api/family/profile
// Auth: required
// Returns: FamilyProfile or null

// POST /api/family/profile
// Auth: required
// Body: FamilyProfile fields
// Returns: FamilyProfile

// PUT /api/family/profile
// Auth: required
// Body: partial FamilyProfile
// Returns: FamilyProfile
```

### 2.7 `/api/compliance/deadlines`

Returns upcoming deadlines based on family's state + programs.

```typescript
// GET /api/compliance/deadlines
// Auth: required
// Returns: { 
//   deadlines: { type: string, due: string, title: string, risk: "critical" | "upcoming" | "routine" }[],
//   missed: { type: string, due: string, consequence: string }[]
// }
```

**Logic:** Read `stateComplianceRules.claimWindowType` + `esaPrograms[].deadlines[]` + bill effective dates. Sort by urgency. Flag anything within 7 days as critical, within 30 as upcoming, beyond as routine.

---

## Phase 3 — Frontend: Compliance UX

### 3.1 Compliance Rules Reference Page

**Route:** `/state/[code]/compliance`
**Auth:** None (public reference)
**Content:**
- Platform name + portal link
- File format requirements
- Upload flow description
- Processing times
- Claim window calendar
- Expense caps table
- Known quirks/blockers (AL portal closed, MT court-injuncted)
- Source URLs for verification

**Design:** Single-page reference, printable, links to state portals.

### 3.2 Family Profile Setup

**Route:** `/dashboard/profile`
**Auth:** Required
**Flow:**
1. Select state
2. Select ESA program (for multi-program states: FL get 3 options)
3. Enter student info (name + legal name for nickname matching)
4. Enter award amount + period
5. Save → stored in `family_profiles`

**Empty state:** "Set up your family profile to get personalized compliance guidance."

### 3.3 Expense Tracker Dashboard

**Route:** `/dashboard/expenses`
**Auth:** Required
**Content:**
- Running total by category vs state caps (progress bars)
- Recent expenses list with status badges
- Add expense button → opens receipt wizard
- Submission history per quarter/tranche
- "Scanned" receipts status indicator

**Cards:**
| Cap | Spent | Remaining | Status |
|-----|-------|-----------|--------|
| Technology (TX) | $450 of $1,000 | $550 | ✅ Under |
| Tuition (SC) | $7,634 max | $0 gap | ⚠️ Need plan |

### 3.4 Document Upload Wizard

**Route:** Not a page — a dialog/submission component.
**Auth:** Optional (works for anonymous too)

**Steps:**
1. **State + category** — pick state and expense category
2. **Upload file** — drag/drop or camera capture
3. **Pre-validation** — client-side check against compliance rules
4. **Receipt data entry** — vendor, date, amount (fallback if OCR fails)
5. **Checklist** — does receipt have all required metadata?
6. **Name match check** — compare to scholarship record
7. **Review** — summary before submitting to state portal
8. **Log** — record in `submission_attempts`

**Warning banners at each step:**
- "This state requires PDF files under 5MB" (on upload)
- "HEIC files accepted here — TX allows HEIC up to 10MB" (on upload for TX)
- "This receipt doesn't show line-item prices — it may be rejected" (on review)
- "Student name 'Jonny' differs from scholarship 'Jonathan' — consider fixing" (on review)

### 3.5 Deadline Calendar

**Route:** `/dashboard/deadlines`
**Auth:** Required
**Content:**
- Consolidated calendar: ESA deadlines + bill effective dates + annual compliance deadlines
- Color-coded: Red (within 7 days), Yellow (within 30), Green (beyond)
- "Deadline insurance" upsell for critical items

### 3.6 Compliance Rules Reference (Public)

**Route:** `/compliance`
**Auth:** None
**Content:** Filterable table of all 19 ESA states showing:
- Platform, reimbursement model, file specs, processing time, claim window, quirks

---

## Phase 4 — Monetization Integration

### 4.1 Which features map to which revenue line

| Monetization Opportunity | What's needed | Ready when | Revenue model |
|-------------------------|--------------|------------|--------------|
| **Vendor SaaS / Marketplace Onboarding** | Vendor directory table + onboarding API (Phase 6) | After Phase 6 | Subscription or per-transaction fee |
| **Premium "Audit-Ready Submission"** | Pre-validation wizard (Phase 3) + OCR (Phase 2.3) gated behind `plan: "binder_plus"` | After Phase 3 | Gate behind $99 tier |
| **Deadline Insurance / Auto-Submission** | Submission tracking (Phase 2.4) + cron-based auto-reminder, gated | After Phase 2 | Premium add-on |
| **TheoPay Concierge (WV)** | Vendor directory + Chrome-based automation (Phase 6) | After Phase 6 | Per-purchase fee |
| **Nickname Normalization AI** | family_profiles.legalName (Phase 1.3) + Gemini OCR (Phase 2.3) | After Phase 2.3 | Feature in premium tier |
| **Financial Products** | expense_records aggregated data (Phase 1.4) → referral partner API | After Phase 3 | Referral fee |
| **Policy Consulting / UX Friction** | submission_attempts anonymized data (Phase 1.5) → report generator | After Phase 1.5 | Annual reports |
| **Optimal Purchase Window Calendar** | Deadline calendar (Phase 3.5) + expense timing analysis | After Phase 3.5 | Premium feature |
| **State Transition Advisory** | family_profiles + cross-state compliance_rules comparison | After Phase 3 | One-time fee |
| **White-Label Compliance API** | `/api/compliance/rules` endpoint (Phase 2.1) as a licensed API | After Phase 2 | SaaS per-call |

### 4.2 Feature gates (what goes behind which paywall)

| Feature | Free | $29 State Packet | $99 Binder Plus |
|---------|------|-----------------|-----------------|
| Compliance rules reference (public) | ✅ | ✅ | ✅ |
| Family profile (1 state) | ✅ | ✅ | ✅ |
| Expense tracking (1 state) | ❌ | ✅ | ✅ |
| Document pre-validation (1 state) | ✅ 5 uses/mo | ✅ | ✅ |
| Deadline calendar (1 state) | ❌ | ✅ | ✅ |
| Multi-state profile | ❌ | ❌ | ✅ |
| Receipt OCR + name matching | ❌ | ❌ | ✅ |
| Expense cap warnings | ❌ | ❌ | ✅ |
| Submission attempt log (your data) | ❌ | ✅ | ✅ |
| Vendor compliance scorecard | ❌ | ❌ | ✅ |
| Deadline insurance (auto-reminder) | ❌ | ❌ | ✅ |
| Move-state comparison | ❌ | ❌ | ✅ |

### 4.3 Pricing updates needed

**Stripe products:**
- `prod_UizlLjAcMh84ye` (Compliance Kit, $29 one-time) — unchanged
- New product: `State Packet` ($29.99/yr IAP + $29/yr web) — "includes expense tracking + deadline calendar"
- Existing product: `Binder Plus` (retarget to $99/yr) — "includes receipt pre-validation, name matching, cap warnings, deadline insurance"

**The $29 one-time web packet is unchanged** — it buys a static compliance pack for one state. The ongoing subscription ($29/$99/yr) is where the operational features live.

---

## Phase 5 — Data Population

### 5.1 Populate `state_compliance_rules`

Script: `scripts/populate-compliance-rules.py`

Reads from `frontend/data/reference/esa-compliance-research-full.md` — parse the structured sections and upsert into the new table.

**19 rows to populate.** Each row maps to one section in section 2 of the research doc.

**Strategy:** Build a Python script with hardcoded data (like `populate-esa-resources.py`) rather than parsing the markdown. The markdown is a research artifact, not a data source. The script becomes the source of truth.

### 5.2 Verify population

```sql
SELECT state_code, platform, reimbursement_model, claim_window_type, portal_status
FROM state_compliance_rules
ORDER BY state_code;
```

### 5.3 Rollback

```sql
DELETE FROM state_compliance_rules;
```

---

## Phase 6 — Data Moat: submission_attempts Aggregation

### 6.1 Anonymized analytics endpoint

```typescript
// GET /api/compliance/analytics/denials
// Auth: admin-only
// Returns: {
//   by_state: { [stateCode]: { total_attempts, denial_rate, top_reasons: [] } },
//   by_platform: { [platform]: { total_attempts, top_rejection_categories: [] } },
//   by_vendor: { [vendorName]: { total_attempts, denial_rate } },
// }
```

### 6.2 UX Friction Index

Build a report generator that produces a summary of the most common denial reasons per state. This is the consulting product deliverable.

```typescript
// GET /api/compliance/analytics/friction-index?state=TX
// Auth: admin-only
// Returns: {
//   score: 72,  // out of 100 (lower = worse)
//   top_issues: [
//     { issue: "Missing itemized costs (35% of denials)", count: 142 },
//     { issue: "File too large (22%)", count: 89 },
//   ],
//   trends: [...]
// }
```

---

## Dependency Map

```
Phase 1 (DB schema)
  ├── Phase 2.1 (rules API)
  │     ├── Phase 3.1 (rules reference page)
  │     ├── Phase 3.4 (upload wizard pre-validation)
  │     └── Phase 5 (data population)
  ├── Phase 2.2 (pre-validate API)
  │     └── Phase 3.4 (upload wizard)
  ├── Phase 2.3 (receipt OCR)
  │     └── Phase 3.4 (receipt scanning step)
  ├── Phase 2.4 (submission log)
  │     └── Phase 3.4 (log submission click)
  │           └── Phase 6 (analytics / data moat)
  ├── Phase 2.5 (expenses CRUD)
  │     └── Phase 3.3 (expense dashboard)
  ├── Phase 2.6 (family profile CRUD)
  │     └── Phase 3.2 (profile setup page)
  └── Phase 2.7 (deadlines)
        └── Phase 3.5 (deadline calendar)

Phase 4 (monetization gates)
  └── Depends on: Phases 2 + 3 complete
```

---

## What to NOT Build (Yet)

| Item | Why deferred | Unblocked by |
|------|-------------|-------------|
| Vendor directory / onboarding | Requires vendor outreach + partnership model | Phase 6+ |
| TheoPay concierge | Requires WV-specific browser automation + vendor integration | Phase 6+ |
| Financial products (loans) | Requires partnership + regulatory review | Phase 7+ |
| White-label compliance API | Requires proven market demand + SLAs | Phase 7+ |
| Policy consulting reports | Requires >1K submission_attempts rows (statistical significance) | Phase 6 (takes time) |

---

## Rollup: What the Final Product Looks Like

After all 6 phases:

**To a Texas family with 3 kids:**
- Free: "Your state uses Odyssey. Uploads: PDF/JPG/PNG/HEIC, max 10MB. Tech cap: 10%. Tranches: Jul/Oct/Feb."
- $29/yr: "Here are your expenses vs the tech cap. Deadline calendar says your next tranche opens July 1. Upload wizard checks your receipts before you hit the state portal."
- $99/yr: "Student name 'Jonny' vs 'Jonathan' — fix before upload. Receipt scanned: missing itemized costs. Your last TX submission failed for that reason. Here's the vendor that passed 95% of TX submissions."

**The data moat after 1 year:**
- 19 states × submission attempt logs → friction index by state
- Denial reason trends → which portals are causing most parent pain
- Vendor compliance scores → "this vendor's receipts pass 95% of the time"
- This data is the defensible asset that no competitor can replicate quickly

---

## Rollback Points

| Phase | Rollback | Risk |
|-------|----------|------|
| Phase 1 (DB) | `DROP TABLE` rollback SQL | Low — new tables only, no existing data touched |
| Phase 2 (API) | Remove route files | Low — no migration |
| Phase 3 (UX) | Remove pages + revert gate logic | Medium — auth gates touch subscription table |
| Phase 4 (Monetization) | Revert Stripe product changes | Low — Stripe products are additive |
| Phase 5 (Data) | `DELETE FROM state_compliance_rules` | Low — zero risk to existing queries |
| Phase 6 (Analytics) | Lock admin endpoint behind secret | Low — new endpoints only |

---

## Next Action

Review this plan. Once approved:
1. Phase 1 — I write the 4 migrations + schema changes + rollback SQL
2. Phase 5 — I build the population script for `state_compliance_rules`
3. Phase 2 — API endpoints
4. Phase 3 — Frontend pages
5. Phase 4 — Feature gates + subscription table update
