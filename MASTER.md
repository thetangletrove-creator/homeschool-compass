# Homeschool Compass — Master Checklist

> **Last updated:** 2026-06-19 (session: design + esa_programs recovery)
> **Source of truth:** This file. I check items off live as we complete them.
> **Stack:** Next.js 16 / React 19 / Tailwind 4 / Drizzle ORM / Neon / Stripe
> **Deploy:** `https://homeschool-regulation-tracker.vercel.app/`
> **GitHub:** `thetangletrove-creator/homeschool-compass` (main)
> **Pipeline:** Parked (LegiScan quota exhausted, timer stopped)
|> **Last commit:** `681b09f` — pricing page rewritten for product pivot

---

## 🟢 P0 — Data Recovery (now)
*All DB-level data gaps that block product value*

- [x] **P0.1** — Re-run B4 enrichment (esa_programs JSONB for 19 ESA states)
  - 19 states populated ✅, OH/OK cleared ✅, MS/MT added ✅
  - 0 null portal URLs, 0 null app URLs, 0 null platforms
  - ⚠️ Known: FL has 1 program (should be 3 — needs multi-program pass)
- [ ] **P0.2** — Build multi-program support for FL (3 programs), AZ (3), add TN/WV special variants
- [ ] **P0.3** — Verify compliance_forms data quality (52 states populated, fill DOE URL gaps)
- [x] **P0.4** — Update mock data (data.ts + mock-data.ts) with real esa_programs data ✅
- [x] **P0.5** — Write this MASTER.md 🎯

---

## 🟡 P1 — Impeccable Design Pass (this session)
*Every frontend surface gets designed. One at a time, committed per phase.*

### Setup
- [ ] Run `context.mjs` from project root (impeccable setup)
- [ ] Read PRODUCT.md + DESIGN.md (foundation docs exist from Jun 19 critique)
- [ ] Read register (product — this is app UI)

### Frontend Surfaces — Critique + Build
| # | Surface | Status | Impeccable Command |
|---|---------|--------|-------------------|
| 1 | `/` (Home) | ✅ existing | critique → craft |
| 2 | `/scorecard` | ✅ existing | critique → colorize |
| 3 | `/state/[code]` + StateTabs | ✅ existing | critique → layout |
| 4 | `/esa` (ESA Guide) | ✅ existing | critique → typeset |
| 5 | `/funding-directory` | ✅ existing (B6) | critique → polish |
| 6 | `/compliance-kit` | ✅ existing | critique → layout |
| 7 | `/download/[state]` | ✅ existing | critique → polish |
| 8 | `/dashboard` | ✅ existing | critique → layout |
| 9 | `/pricing` | ✅ **fixed this session** | rewrite: $29/$99 pivot |
| 10 | `/dashboard/esa-compliance` | ✅ existing | critique → on hold |
| 11 | `/about` | ✅ existing | critique → polish |
| 12 | `/methodology` | ✅ existing | critique → polish |

- [ ] Run design critique across all 12 surfaces
- [ ] Compile findings → priority-ordered fix list (P1/P2/P3)
- [ ] Execute top-priority fixes per phase commit
|- [x] Verify with `tsc --noEmit` (0 errors, 54 tests pass ✅)

---

## 🔲 P2 — Pipeline Recovery (~Jul 1+)
*Gated on LegiScan quota reset*

- [ ] **A1** — Resume timer: `sudo systemctl start homeschool-compass-sync.timer`
- [ ] **A2** — Wire incremental sync: `get_changed_bills()` in `run_pipeline()`
  - 5/6 daily runs = delta poll, 1 run/week = full discovery
  - Projected: ~3,500 calls/month (under 30k quota)
- [ ] **A3** — Fetch bill text for 1,215 ESA-related bills
  - `cd /opt/homeschool-compass && python3 scripts/fetch-bill-text.py --batch-size 50`
  - ~20 min at 1 req/sec

---

## 🔲 P3 — Compliance Pack Modernization
*Wire DB JSONB fields into the generator*

- [ ] **D1** — Wire `esa_programs` JSONB into compliance-pack.py
  - [ ] Multi-program rendering (FL=3, rest=1)
  - [ ] Platform badge (Odyssey/ClassWallet/custom)
  - [ ] Application link button per program
- [ ] **D2** — Wire `compliance_forms` JSONB into pack
  - [ ] "Compliance Calendar" with notification/assessment/immunization deadlines
  - [ ] "Forms Quick-Reference" with access indicators
- [ ] **D3** — Deadline calendar from `esa_programs[].deadlines[]`
  - [ ] Timeline sorted: Immediate / Review / Routine
  - [ ] Null-state for non-ESA states
- [ ] **D4** — Wire `non_esa_programs` into compliance pack (violet-themed card)

---

## 🔲 P4 — iPad App Shell
*THE product per Apple-native pivot. No code exists yet.*

- [ ] Build SwiftUI app from existing vibe prompt (`references/swiftui-app-shell-prompt.md`)
  - [ ] 4-tab structure (Dashboard / Bills / ESA Programs / Settings)
  - [ ] Mock data → live data bridge
  - [ ] Wire to `/api/app/` routes
- [ ] Build additional API routes:
  - [ ] `GET /api/app/esa-programs`
  - [ ] `GET /api/app/compliance`
  - [ ] `GET /api/compare?states=FL,TX,UT`
  - [ ] `GET /api/rankings`
  - [ ] `GET /api/deadlines`
- [ ] StoreKit IAP verification bridge (`POST /api/iap/verify-receipt`)
- [ ] Offline data bundles (states.json, bills.json, programs)

---

## 🔲 P5 — Product Launch

- [ ] **C2** — Purchase `homeschool-compass.com` ($6.79 Namecheap)
- [ ] **C2b** — Point domain to Vercel + update redirect URLs
- [ ] **C3** — Remove `USE_LIVE_DATA` flag, seed-based mock
- [ ] Verify Provider Invoice Portal end-to-end on Vercel
- [ ] Invoice generator: fire real magic link → submit → verify encrypted profile lands in Neon

---

## 🔲 P6 — Data Quality

- [ ] **B3** — Set `esa_urls_verified_at` for all states + quarterly re-check cron
- [ ] **B6** — Multi-program enrichment pass (FL 3→1, AZ 3→1)
- [ ] Fix empty state row in DB (null code/name, score=50)
- [ ] Fix OH/OK `esa_active=true` but no programs (should be false)
- [ ] Wire `text-to-speech` column to Compliance Kit summary

---

## Pipeline Stats (Live — Verified 2026-06-19)

| Metric | Current | Status |
|--------|---------|--------|
| Bills tracked | **3,845** | ✅ |
| ESA-related bills | **1,223** | ✅ |
| Bill text fetched | 8 / 3,845 | ❌ 0 downloaded |
| States with ESA | **19** | ✅ |
| esa_programs populated | **19 states / 19 programs** | ✅ (after B4 re-run) |
| Multi-program states (FL=3, AZ=3) | **FL=1, AZ=1** | ⚠️ Needs multi-program pass |
| compliance_forms | **52/52** | ✅ (basic, needs deeper fill) |
| non_esa_programs | **24 states / 31 programs** | ✅ |
| esa_programs null portal URLs | **0** | ✅ |
| esa_programs null app URLs | **0** | ✅ |
| esa_programs null platforms | **0** | ✅ |
| Avg impact confidence | **0.831** | ✅ |
| Pipeline timer | **Inactive** | ⏸ Quota exhaustion |
| Git HEAD | **bdb4610** | Clean |

---

## Key Decisions

| Decision | When | Detail |
|----------|------|--------|
| Product pivot → Apple flagship | Jun 18 | SwiftUI + StoreKit IAP, website = funnel |
| Design critique + 7 improvements | Jun 19 | Impeccable init, hero reframe, breadcrumbs, etc. |
| Provider portal + ZK encryption | Jun 17-19 | Encrypted invoices as differentiator |
| esa_programs recovered via B4 re-run | Jun 19 | 19 states populated, OH/OK cleared, MS/MT added |
| Mock data updated with real esa_programs | Jun 19 | lib/data.ts + lib/mock-data.ts — real portal URLs from B4 enrichment |
| Pricing page rewritten for product pivot | Jun 19 | Free Scorecard / $29.99 Packet / $99.99 Binder Plus — no trial, no subscriptions |
| MASTER.md as single checklist | Jun 19 | This file — checked off live |

---

## File Index

| File | Role |
|------|------|
| `MASTER.md` | **This file** — everything, checked off live |
| `AGENTS.md` | Operational status: done items, pinned state |
| `ARCHITECTURE.md` | System structure: every file's role |
| `ROADMAP.md` | High-level phases, decisions, strategic position |
| `README.md` | Public-facing project summary |
| `scripts/enrich-esa-portal-urls.py` | B4 enrichment script (just re-run ✅) |
| `scripts/populate-esa-resources.py` | B1 population script (legacy) |
| `scripts/populate-non-esa-programs.py` | B5 population script |
| `scripts/export-app-data.py` | C1/E3 static data export |
| `data/reference/esa-portal-directory.json` | Source data for B4 enrichment |
| `drizzle/rollback-b4-enrichment.sql` | B4 rollback |
