# Homeschool Compass — Master Checklist

> **Last updated:** 2026-06-19
> **Source of truth:** This file. I check items off live as we complete them.
> **State:** Branch `main` at `bdb4610` (clean worktree)

---

## 🟢 Phase A — Pipeline Recovery
*Gated: LegiScan quota locked until ~2026-07-17*

- [ ] **A1** — Resume pipeline timer (`systemctl start homeschool-compass-sync.timer`)
- [ ] **A2** — Wire incremental sync (`get_changed_bills()` — delta runs 5/6 days)
- [ ] **A3** — Fetch bill text for 1,215 ESA-related bills (1 req/sec, ~20 min)

---

## ✅ Phase B — Data Enrichment

- [x] **B1** — Populate `esa_programs` JSONB (20 states, 26 total programs)
- [x] **B2** — Populate `compliance_forms` JSONB (all 52 states)
- [ ] **B3** — Set `esa_urls_verified_at` + quarterly re-check cron
- [x] **B4** — Deepen compliance data for 31 non-ESA states (replace DOE placeholders with real state-level URLs — research pass complete, 52/52 states enriched)
- [x] **B5** — Populate `non_esa_programs` JSONB (31 programs across 24 states — EFTC, refundable tax credits, vouchers, scholarships, allotments)
- [ ] **B6** — Fill missing portal/application/form URLs from research (TX, UT, etc.)

---

## 🟡 Phase C — Production Launch

- [x] **C1** — Verify Provider Invoice Portal on Vercel (routes, PDF, ZK encryption)
- [ ] **C2** — Custom domain → `homeschool-compass.com` ($6.79 Namecheap)
- [ ] **C3** — Remove `USE_LIVE_DATA` flag, switch to seed-based mock data

---

## 🟡 Phase D — Web Packet Polish

- [x] **D1** — Compliance pack reads `esa_programs` JSONB (multi-program rendering)
- [ ] **D2** — Wire `compliance_forms` into compliance pack (notification/assessment deadlines)
- [ ] **D3** — Deadline calendar from `esa_programs[].deadlines[]`

---

## 🔲 Phase E — Apple App API Endpoints

- [x] **E1** — Build API routes (under `/api/app/`):
  - [x] `GET /api/app/states` — catalog with scores/levels
  - [x] `GET /api/app/states/[code]` — full profile + programs + compliance + top bills + non-ESA programs
  - [ ] `GET /api/app/esa-programs` — multi-program data
  - [ ] `GET /api/app/compliance` — notification/assessment URLs
  - [x] `GET /api/app/bills/[state]` — paginated bills by state
  - [ ] `GET /api/bills/[id]` — full analysis, delta, actions
  - [ ] `GET /api/compare?states=FL,TX,UT` — side-by-side
  - [ ] `GET /api/rankings` — top 10 ESA-friendly states
  - [ ] `GET /api/deadlines` — flat calendar feed
- [ ] **E2** — StoreKit IAP verification bridge (`POST /api/iap/verify-receipt`)
- [x] **E3** — Data bundles for offline mode: `public/data/states.json`, `bills.json`, `non-esa-programs.json`, `esa-programs.json`, `compliance-forms.json`, `v1.json`

---

## 🔲 Phase F — Frontend Data Wiring
*The biggest gap: DB has 3,845 bills, 20 multi-program states, 52 compliance profiles. Frontend still shows mock.*

- [ ] **F1** — Wire `esa_programs[]` into StateTabs ESA tab (multi-program, platform badges, per-program deadlines)
- [ ] **F2** — Wire `compliance_forms` into StateTabs Requirements tab (real notification URLs, assessment rules per state)
- [ ] **F3** — Wire `esa_programs[]` into `/esa` page (multiple programs per state card, different platforms)
- [ ] **F4** — Migrate scorecard to live DB (52 real scores/levels from Neon)
- [ ] **F5** — Migrate `/state/[code]` page to live DB (real bill list per state, not 12 mock bills)
- [ ] **F6** — Wire bill list into StateTabs (3,845 real bills with impact confidence bars)
- [ ] **F7** — Add `compliance_forms` to Compliance Kit landing page
- [ ] **F8** — Wire `esa_programs` + `compliance_forms` through `rowToState()` in `db.ts`
- [ ] **F9** — Add `esa_programs` and `compliance_forms` to `StateData` type in `types.ts`
- [ ] **F10** — Migrate all `@/lib/data` imports → `getDb()` async calls

---

## 🟢 Phase G — Testing & Quality

- [x] **G1** — API contract tests (30 tests — catalog, detail, bills, ESA programs, data quality)
- [x] **G2** — ESA integration tests (18 tests — multi-program counts, platform distro, compliance completeness, TX family scenario)
- [ ] **G3** — Build route handlers to match contract tests (makes tests pass against real `GET /api/states`)
- [ ] **G4** — E2E invoice generator test (fire real magic link, submit, verify encrypted profile lands in Neon)

---

## 🔲 Phase H — Polish & Fixes

- [ ] **H1** — Fix null portal/application URLs in ESA data (research pass for actual Odyssey/ClassWallet URLs)
- [ ] **H2** — Fix empty state row in DB (row with null code/name, score=50 that corrupts lookups)
- [ ] **H3** — Wire `text-to-speech` column to Compliance Kit summary (where it was meant to render)

---

## Key Decisions Made

| Decision | When | Detail |
|----------|------|--------|
| Pipeline first pass | Jun 16 | 3,845 bills ingested before quota exhaustion |
| Product pivot → Apple flagship | Jun 18 | SwiftUI + StoreKit IAP, website becomes funnel |
| Provider portal + ZK encryption | Jun 17-19 | Encrypted invoices are the differentiator |
| ESA data via research agent | Jun 18 | 20 states from research, 31 non-ESA get placeholder compliance |
| Test before routes | Jun 20 | 48 contract/integration tests define API shapes before handlers exist |
| MASTER.md as single checklist | Jun 20 | This file — checked off live, no more scattered tracking |

---

## File Index

| File | Role |
|------|------|
| `MASTER.md` | **This file** — everything, checked off live |
| `AGENTS.md` | Operational status: done items, pinned state, pipeline status |
| `ARCHITECTURE.md` | System structure: every file's role, data flow, schema |
| `ROADMAP.md` | High-level phases, decisions, strategic position |
| `STATE.md` | Per-project frontmatter for automated scanning |
| `README.md` | Public-facing project summary |
| `frontend/pipeline/sync-to-neon.py` | Pipeline runner |
| `scripts/populate-esa-resources.py` | B1 population script |
| `frontend/scripts/populate-non-esa-programs.py` | B5 population script |
| `frontend/scripts/export-app-data.py` | C1/E3 static data export |
| `drizzle/rollback-b5-non-esa.sql` | B5 rollback (non_esa_programs) |
| `drizzle/rollback-esa-population.sql` | B1 rollback (esa_programs) |
| `scripts/rollback-c1-app-backend.sh` | C1 rollback (API routes + data bundles) |
| `tests/api-contract.test.ts` | 30 data contract tests |
| `tests/api-esa-programs.test.ts` | 18 DB integration tests |

## Pipeline Stats

| Metric | Current |
|--------|---------|
| Bills tracked | **3,845** |
| ESA-related bills | **1,223** |
| Bill text fetched | 8 / 3,845 |
| States with ESA data | **19 / 52** |
| States with compliance forms | **52 / 52** (all enriched with real notification/assessment URLs) |
| ESA programs active | **21** (FL=3, rest=1) |
| Non-ESA programs | **31 programs in 24 states** (19 homeschool-eligible) |
| Platforms: Odyssey / ClassWallet / custom | 7 / 8 / 4 |
| ESA portal URLs verified | **19/19** (0 null portals, 0 null app URLs) |
| Avg bill impact confidence | **0.831** |
