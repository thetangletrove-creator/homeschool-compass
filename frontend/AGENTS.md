# Pinned Status Block

> **📋 Homeschool Compass** — operational clearinghouse for the funded homeschool
> **Living checklist:** `MASTER.md` — I check items off live as we complete them. AGENTS.md shows summary status; MASTER.md tracks every task.
> **Stack:** Next.js 16 / React 19 / Tailwind 4 / Drizzle ORM / Neon PostgreSQL / Neon Auth / Stripe
> **Deploy:** `https://homeschool-regulation-tracker.vercel.app/`
> **GitHub:** `thetangletrove-creator/homeschool-compass`
> **Pipeline:** Parked (LegiScan quota exhausted, timer stopped)
> **Last commit:** `29b6589` — `Logo: replace shield+compass hybrid with pure compass mark` (2026-06-19)
> **File index:** `ARCHITECTURE.md#key-implementation-files` — full table mapping every file to its role

## ✅ Done

- **Phase 0-7:** All bootstrapping, data, auth, payments, deploy, user features ✅
- **Phase 8:** Web packet + compliance pack redesign + MMR schema ✅
- **Phase 9:** Product pivot direction set ✅
- **Phase 10: Provider Invoice Portal — LIVE (2026-06-19)** ✅
  - Neon tables: `providers`, `provider_invoices`, `invoice_line_items`, `invoice_magic_links`
  - Magic link generation + validation + invoice submission API
  - 4-step tutor web form (Identity → Sessions → Payment → Review)
  - PDF generation via @react-pdf/renderer (ClassWallet/Odyssey-compliant template)
  - Parent dashboard: `/dashboard/provider` — create links, view invoices, download PDFs
  - Guardrails: requires credentials, blocks generic descriptions, enforces subject dropdown
  - **ZK Encryption (Phase 10b):** RSA-OAEP+AES-256-GCM hybrid encryption for provider profile
    - `lib/crypto.ts` — keygen, encryptPayload, decryptPayload, localStorage persistence
    - Magic link URL fragment `#pubkey=hex` — server never sees the public key
    - Provider consent checkbox 🔏 — encrypts credentials, phone, email before submit
    - Parent dashboard auto-decrypts via stored private key (lock/unlock icons)
    - Migration `0003_zk_encryption.sql` — `encrypted_profile text` column on `provider_invoices`

- **Phase 2 enrichment:** All 3,845 bills enriched with impact, ESA, analysis (avg confidence 0.831)
- **Phase 7 hardening:** CSP fix, dead code removal, ESLint 0 warnings, bill text infrastructure
- **Phase B1 — ESA programs populated:** 20 ESA states populated via `populate-esa-resources.py` (AZ:1, FL:3, OH:2, rest:1). Platforms: Odyssey (6), ClassWallet (10), custom (4). Commit `5a927f0`.
- **Phase B3 — Compliance forms enriched:** All 51 states + DC populated with real notification URLs, assessment rules, instruction days, recordkeeping requirements, and form links from research directory (`data/reference/compliance-forms-directory.json`). 51/51 have notification form URLs. Rollback saved at `drizzle/rollback-b3-compliance.sql`.
- **Phase B4 — ESA portal directory enrichment:** All 19 active ESA states enriched with real portal URLs, application URLs, platform assignments, deadlines, and funding amounts from research directory (`data/reference/esa-portal-directory.json`). Removed OH/OK (false-positive vouchers/tax-credits), added MS/MT (missing ESA states). 0 null portals/app URLs remaining. Rollback saved at `drizzle/rollback-b4-enrichment.sql`.
- **Phase D1 — Compliance pack multi-program:** Reads esa_programs JSONB instead of flat columns. Renders all programs per state with platform badge, deadline card, application link. Commit `1baf721`.
- **Rollback saved:** `drizzle/rollback-esa-population.sql` — `psql "$URL" -f` reverts all 3 columns to NULL.
- **Pipeline fixes:** psycopg2 autocommit + closed guard ✅, cache TTL 60m→1440m (24h) ✅
- **Product pivot:** Apple-native (SwiftUI/StoreKit IAP) flagship + website as funnel. Legacy pricing: Free / $29.99 Packet / $99.99 Binder Plus
- **Web packet ($29 one-time):** Stripe product + checkout + `/download/[state]` post-purchase page live on Vercel
- **Compliance pack redesign:** 2-column layout, bill triage queue, live confidence bars, legal disclaimer
- **Design Phase — Impeccable critique + 7 improvements deployed (2026-06-19):** PRODUCT.md (brand positioning), hero reframe (fear-driven), pricing value reframe, "Why We Built This" layout diversity, breadcrumbs, ESA filter/sort, state picker, dark mode (system), tooltips, copy refinement, app preview, footer hardening, DESIGN.md (token extraction). `generator: 'v0.app'` removed. ✅
- **Logo redesign + dark mode toggle (2026-06-19):** Replaced shield+compass hybrid with pure compass mark (thin ring, 4 points, open center, adaptive dark/light). Enhanced dark mode from system-preference only to user toggle (localStorage persistence + Moon/Sun icons in SiteNav). Brand-informed dark palette — deep navy-based (oklch 0.125 0.025 262) instead of generic gray. Smooth CSS transition on toggle. Logo direction: compass is the concept, not literal execution — shield removed. ✅

## ▶️ You (Jack)

- [ ] Purchase custom domain: `homeschool-compass.com` ($6.79/yr via Namecheap)
- [ ] Point domain to Vercel project
- [ ] Decide when to resume pipeline (LegiScan quota reset ~mid-Jun)

## ▶️ Me (No Trouble At All)

- [x] ~~Fix `psycopg2.InterfaceError` in `sync-to-neon.py:142`~~ ✅
- [x] ~~Populate Phase B1 data: `esa_programs` + `compliance_forms`~~ ✅
- [x] ~~Wire D1 compliance pack to read esa_programs JSONB~~ ✅
- [ ] Wire incremental sync (`get_changed_bills()`) into pipeline — project ~3,500 calls/month
- [ ] Fetch bill text for 1,215 ESA-related bills still missing (~20 min at 1 req/sec)
- [ ] Remove `USE_LIVE_DATA` flag, switch to seed-based mock data

## Pipeline Status

| Metric | Value |
|--------|-------|
| Bills tracked | 3,845 |
| States | 51 + DC |
| ESA states | **19** (all enriched with portal URLs) |
| ESA-related bills | 1,223 |
| Bill text fetched | 8 / 3,845 |
| ESA bills w/o text | 1,215 |
| esa_programs data | **19/19** ✅ *(21 programs, FL=3, rest=1)* |
| esa_programs portal URLs | **19/19** ✅ *(0 null)* |
| esa_programs app URLs | **19/19** ✅ *(0 null)* |
| esa_programs platforms | **19/19** ✅ *(all populated)* |
| compliance_forms data | **52/52** ✅ *(all enriched with real notification/assessment URLs)* |
| compliance_forms notification URLs | **52/52** ✅ *(0 null)* |
| compliance_forms DOE pages | **52/52** ✅ *(all state DOE homeschool pages)* |
| Calendar | — |
| Last pipeline run | 2026-06-18 06:28 UTC (FAILED: connection closed — **FIXED**) |
| ZK encryption | ✅ Active (RSA-OAEP+AES-256-GCM) |
| Timer status | Inactive (stopped 2026-06-18) |
| Git HEAD | `1baf721` — clean worktree, 2 B1/D1 commits pushed |

## Strategic Position

**North Star:** Operational clearinghouse for the funded homeschool.

We don't compete on day-to-day academic planning minutiae. The moat is where scholastic proof meets financial compliance — receipt-to-portfolio export that eliminates double data entry for ESA families.

**Concrete differentiator:** Zero-Knowledge (ZK) provider invoice portal — credentials, phone, and email are RSA-OAEP+AES-GCM encrypted before reaching the server. No other homeschool tool offers end-to-end encryption for provider data. This is the first piece of the bridge layer.

**Pricing insight (from positioning review):** $50-70/yr feels expensive for a homeschool planner, but trivially cheap for insurance protecting $6,000-$10,000 in annual state ESA funding. Frame as audit/portfolio security, not calendar management.

**GTM (near-term):** Target regional Facebook groups, local enrichment co-ops, and ESA parent forums in high-allocation states (AZ, FL, UT). Position as the administrative assistant that keeps you state-compliant. Gate portfolio exporter for quarterly submission season.
