# Homeschool Compass — Roadmap

**Last updated:** 2026-06-20

## Phase 0: Bootstrapping ✅ COMPLETE

- [x] **S0:** Provision Neon project, store connection strings
- [x] **S1:** Confirm product name / pricing / domain / auth fallbacks
- [x] **S2:** Fix TypeScript errors, remove `ignoreBuildErrors`
- [x] **S3:** Create config.ts + env_validator.ts
- [x] **S4:** Push Drizzle migrations to Neon (10 tables)
- [x] **S5:** Create restricted Neon user
- [x] **S6:** One-row end-to-end proof (score 99, verify /state/de renders)

## Phase 1: Rebrand ✅ COMPLETE

- [x] Replace all "Tangle Trove" → "Homeschool Compass"
- [x] Centralize all brand strings in config.ts
- [x] Verify grep returns 0 hits

## Phase 2: Live Data ✅ COMPLETE

- [x] Replace mock data with Drizzle queries in `getDb()` / `getMockDb()`
- [x] Write sync pipeline: LegiScan → Neon via psycopg2
- [x] Data validation layer + DLQ
- [x] Revalidation POST with retry + alert
- [x] Data freshness UI in footer

## Phase 3: Auth ✅ COMPLETE

- [x] Configure Neon Auth (Google provider)
- [x] Set Vercel env vars
- [x] Wire up requireSubscription() utility

## Phase 4: Payments ✅ COMPLETE

- [x] Stripe webhook endpoint with full hardening
- [x] Checkout session creation
- [x] Portal link
- [x] Feature-gated behind ENABLE_STRIPE

## Phase 5: Deploy ✅ COMPLETE

- [x] Push repo, connect to Vercel
- [x] Set env vars (Sensitive)
- [x] Run smoke-test.sh
- [ ] Custom domain config — requires purchase (`homeschool-compass.com`)

## Phase 6: User Features ✅ COMPLETE

Built in 4 sprints, 11 PRs. Includes watchlist, alert preferences, dashboard, Stripe checkout, webhook handler, BFF routes, Customer Portal.

## Phase 2 (Round 2): Gemini Enrichment ✅ COMPLETE

All 3,845 bills enriched with impact/ESA/analysis via Vertex AI. Cost: ~$0.60 backfill, ~$0.002/day ongoing.

## Phase 7: Production Hardening ✅ COMPLETE

- [x] CSP fix — Stripe.js loads (was failing silently)
- [x] Dead code removed — ~800 LOC removed across paywall cluster, unused UI, shadcn components
- [x] ESLint — 24 warnings → 0 across 9 files
- [x] Unused npm packages removed (4 packages)
- [x] Bill text fetch infrastructure — 4 tracking columns + migration + fetch script
- [x] ESA Compliance dashboard page at `/dashboard/esa-compliance`
- [x] LegiScan quota crisis: tracker → cache TTL 1440m, timer stopped, audit saved

## Phase 8: Product Builds (2026-06-18/19)

### A. Web Packet ($29 one-time) ✅ LIVE

- [x] Stripe product `prod_UizlLjAcMh84ye` + price `price_1TjXmLRPStOUYCsDp6BWuM7A`
- [x] `/compliance-kit` landing page with state picker + hero
- [x] `/api/checkout/kit` — one-time checkout endpoint (no auth required)
- [x] `/download/[state]` — post-purchase pack page, verifies Stripe session, renders live Neon data
- [x] Deployed to Vercel, live at `https://homeschool-regulation-tracker.vercel.app/compliance-kit`

### B. Compliance Pack Generator Redesign ✅

- [x] Complete `compliance-pack.py` rewrite: 2-column hero + left rail + triage queue + confidence bars
- [x] Live aggregate queries: `AVG(impact_confidence)`, `AVG(esa_related_confidence)` per state
- [x] Verified working for IA, TX, FL (30K-31K each)
- [x] Data status template principle established: show every section, null-state for empty data

### C. MMR Schema Enrichment ✅

- [x] Phase 3 schema: `esa_programs jsonb`, `compliance_forms jsonb`, `esa_urls_verified_at` with GIN indexes
- [x] TypeScript type safety: `$type<EsaProgram[]>()`, `$type<ComplianceForms>()`
- [x] Migration `0003` applied to Neon

### B1. ESA Programs Populated ✅ (`5a927f0`)

- [x] 20 ESA states populated with esa_programs array via `scripts/populate-esa-resources.py`
- [x] Platform distribution: Odyssey (6 states), ClassWallet (10 states), custom (4 states)
- [x] Multi-program states: AZ(1), FL(3), OH(2), all others(1 each)
- [x] Special cases handled: AK(defunct), IN/SC(capped), TN(pilot), NC(disability-only), OK(tax credit)
- [x] Compliance forms populated for ALL 52 states (basic rules)

### D1. Compliance Pack Multi-Program Support ✅ (`1baf721`)

- [x] Updated `compliance-pack.py`: reads `esa_programs` JSONB instead of flat columns
- [x] Action tiles, deadline cards, and ESA program cards all render all programs per state
- [x] Rollback file committed: `drizzle/rollback-esa-population.sql`

## Phase 9: Product Pivot (Direction Set)

| Aspect | Decision |
|--------|----------|
| Flagship product | Apple-native (SwiftUI + StoreKit IAP) |
| Website role | Funnel + non-Apple fallback + SEO |
| Tiers | Free / State Packet $29.99 / Binder Plus $99.99 |
| Binder Plus delivers | Portal links, form downloads, pre-filled checklists, hearing calendar |
| SwiftUI shell | Vibe code prompt saved in `references/swiftui-app-shell-prompt.md` |
| Pricing framing | $50-70/yr is insurance protecting $6K-$10K in state ESA funding, not a planner expense |
| GTM vector | Local co-ops, Facebook groups, ESA forums in AZ/FL/UT — gate portfolio export for quarterly submit season |

## Current Pipeline Status

| Component | Status |
|-----------|--------|
| LegiScan sync | ⏸ Paused — quota exhausted ~Jun 14, timer stopped |
| Cache TTL | ✅ Fixed 60m → 1440m (24h) |
| Incremental sync | 📝 Plan exists, `get_changed_bills()` unplugged |
| Bill text fetch | ⏸ Blocked by LegiScan quota — 8/3,845 fetched |
| ESA programs data | ✅ 20/20 states populated |
| Compliance forms data | ✅ 52/52 states populated |
| Compliance packs | ✅ Working for all 50 states, multi-program rendering |
| Web packet checkout | ✅ Live on Vercel |
| Provider Invoice Portal | ✅ Phase 10 complete — Magic link + 4-step form + PDF + ZK encryption |
| Vercel builds | ✅ Passing (0 TS errors, 0 ESLint warnings) |
| Git HEAD | `1baf721` — 2 B1/D1 commits pushed, clean worktree |

## Remaining Pre-Launch Gaps

- [ ] Custom domain: `homeschool-compass.com` — purchase + point to Vercel
- [ ] Resume pipeline (after LegiScan quota reset ~mid-Jun)
- [x] ~~Fix `psycopg2.InterfaceError`~~ ✅
- [x] ~~Populate Phase B1 esa_programs + compliance_forms~~ ✅
- [x] ~~Wire compliance pack to read esa_programs JSONB~~ ✅
- [ ] Bill text fetch: 1,215 priority ESA bills (~20 min)
- [ ] Test full checkout flow e2e (sign up → subscribe → dashboard → cancel)
- [ ] Remove `USE_LIVE_DATA` flag, switch to seed-based mock data
- [ ] Multi-provider auth (Apple, email)

## Phase 10: Provider Invoice Portal ✅ COMPLETE (2026-06-19)

- [x] **Provider tables in Neon:** `providers`, `provider_invoices`, `invoice_line_items`, `invoice_magic_links`
- [x] **Magic link generation:** `POST /api/provider/magic-link` — single-use, 7-day expiry, rate-limited
- [x] **Magic link validation:** `GET /api/provider/[token]` — validates token, returns student/state metadata
- [x] **Invoice submission:** `POST /api/provider/[token]` — creates/upserts provider, generates invoice number
- [x] **PDF generation:** `GET /api/provider/invoice/[id]/pdf` — returns ClassWallet/Odyssey-compliant invoice PDF
- [x] **4-step web form:** `app/provider/[token]/page.tsx` — Identity → Sessions → Payment → Review & Submit
- [x] **Client billing info + itemized session rows** matching the institutional invoice template
- [x] **PAID IN FULL stamp** when parent already paid
- [x] **Guardrails:** blocks generic descriptions, requires credentials, enforces subject dropdown
- [x] **Parent dashboard:** `/dashboard/provider` — create magic links, view invoices, download PDFs
- [x] **Navigation link:** "Invoices" added to site nav
- [x] **ZK Encryption (Phase 10b):** RSA-OAEP+AES-256-GCM hybrid encryption for provider profile
  - [x] `lib/crypto.ts` — key generation, hybrid encrypt/decrypt, localStorage persistence
  - [x] `#pubkey=hex` URL fragment — public key never sent to server
  - [x] Provider consent checkbox: 🔏
  - [x] Parent dashboard: auto-decrypts on load, lock/unlock icons
  - [x] Migration `0003_zk_encryption.sql`
  - [x] Zero-TypeScript-error build pass (0 errors)
