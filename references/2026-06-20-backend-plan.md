# Homeschool Compass — Backend Implementation Plan

**Date:** 2026-06-20
**State:** 3 commits pushed (`3c7553a`), pipeline parked, quota exhausted, Phase 10 schema live on Neon

## Quick Status

| Area | Status |
|------|--------|
| Pipeline | 🟡 Parked (quota exhausted ~Jun 14, reset mid-Jun) |
| Cache TTL | ✅ 24h applied to `/opt/` + git |
| psycopg2 fix | ✅ autocommit + closed guard sync'd to `/opt/` |
| Neon data | ✅ 3,845 bills, 51 states, 20 ESA, 1,223 tagged |
| Provider Portal | ✅ Committed + pushed (3 commits) |
| esa_programs | ✅ 20 states populated (AZ:1, FL:3, OH:2, rest:1) — **DONE** |
| compliance_forms | ✅ 52 states populated (basic rules, pending deeper DOE research) — **DONE** |
| esa_urls_verified_at | ✅ Timestamp set at population time — **DONE** |
| Compliance pack multi-program | ✅ Reads esa_programs JSONB — **DONE** |
| Bill text | 🟡 8/3,845 fetched (1,215 ESA priority remaining) |
| Site health | ✅ 4/4 routes 200 |

---

## Phase A — Pipeline Recovery (⏳ Quota-Gated)

*Wait for LegiScan quota reset (~mid-Jun). Do in order.*

### A1: Resume pipeline timer
```bash
sudo systemctl start homeschool-compass-sync.timer
```
- Fix applied: 24h cache TTL means next run stays under 3,500 calls/mo
- Verify with `sudo journalctl -u homeschool-compass-sync --since "5 min ago"`

### A2: Wire incremental sync (`get_changed_bills()`)
- **File:** `frontend/pipeline/sync-to-neon.py` → `run_pipeline()`
- **Current:** Always calls `sync_bills_from_legiscan()` (full discovery) on every cron tick
- **Change:** On 5/6 daily runs, call `get_changed_bills(since_days=1)` instead — only fetches bills modified in the last 24h
- **Full discovery:** Keep 1 run/week (Sundays) to catch new search-term matches
- **Projection:** 5 delta runs × ~100 changed bills = ~500 calls + 1 full run × ~2,500 = ~3,000 calls/month
- **Rollback:** `git revert <commit>`

### A3: Fetch ESA bill text (priority queue)
```bash
cd /opt/homeschool-compass && python3 scripts/fetch-bill-text.py --batch-size 50
```
- **Scope:** 1,215 ESA-related bills still missing full text
- **Rate limit:** 1 req/sec → ~20 min total
- **Tracking columns:** `fetch_status`, `fetch_attempts`, `last_fetch_at`, `error_message` on `bill_full_text`
- **Expected:** ~300MB of raw bill text into Neon
- **Parallelize:** Can run alongside pipeline (different endpoint: `getBill` vs `getBillText`)

---

## Phase B — Data Enrichment ✅ COMPLETE

### B1: Populate `esa_programs` JSONB — 20 ESA states ✅
- **Commit:** `5a927f0`
- **Script:** `scripts/populate-esa-resources.py` (also synced to `/opt/homeschool-compass/scripts/`)
- **20 states populated:** AZ(1), AR(1), FL[3], GA(1), IA(1), IN(1), KS(1), LA(1+waitlist), MO(1), NC(1), NH(1), OH[2], OK(1), SC(1), TN(1), TX(1), UT(1), WV(1), WY(1)
- **Platform distribution:** Odyssey (6: GA, IA, LA, WY, TX, UT), ClassWallet (10: AL, AR, AZ, FL, IN, MO, NC, NH, SC, WV), custom (4: AK defunct, OK tax credit, TN pilot, ND)
- **Special cases:** AK(defunct), IN/SC(capped), TN(pilot), NC(disability-only), OK(tax credit)
- **Rollback:** `psql "$URL" -f drizzle/rollback-esa-population.sql`

### B2: Populate `compliance_forms` JSONB — all 52 states ✅
- **Commit:** `5a927f0` (same commit as B1)
- **All 52 states populated** with basic compliance rules:
  - Notification requirements (url or "see state DOE")
  - Assessment rules
  - Immunization requirements
  - Instruction days
  - Recordkeeping requirements
- **31 non-ESA states:** Get baseline "see state DOE" placeholders pending deeper research
- **Rollback:** `psql "$URL" -f drizzle/rollback-esa-population.sql`

### B3: Set `esa_urls_verified_at` + quarterly re-check cron ✅
- **Timestamps set** for all 20 ESA states at population time
- **Quarterly cron:** Pending creation — use Hermes cron for 90-day re-check
- **Script idea:** fetch ESA portal URLs from each state DOE, compare to stored data, report changes

---

## Phase C — Production Launch

### C1: Verify Provider Invoice Portal on Vercel
- **Check:** All API routes deployed from `main` branch
  - `GET /api/provider/magic-link` (create)
  - `GET /api/provider/[token]` (resolve)
  - `GET /api/provider/invoices` (list)
  - `GET /api/provider/invoice/[id]/pdf` (download PDF)
- **Check:** `/dashboard/provider` renders
- **Check:** `/provider/[token]` renders the 4-step form
- **Check:** ZK encryption works end-to-end (crypto.ts uses SubtleCrypto — verify browser support)
- **Fix if broken:** CSP nonce may need `unsafe-eval` for SubtleCrypto or worker isolation

### C2: Custom domain → `homeschool-compass.com`
- **Purchase:** Namecheap, coupon `NEWCOM679` → $6.79/yr
- **DNS:** Add CNAME record pointing to `cname.vercel-dns.com`
- **Vercel:** Add domain in project settings (`homeschool-regulation-tracker.vercel.app` → add `homeschool-compass.com`)
- **Migration:** Update all absolute URLs, Stripe redirect URLs, marketing content
- **Note:** Cloudflare API token has Zone:DNS:Edit only — must use Namecheap or Cloudflare Registrar UI for registration

### C3: Remove `USE_LIVE_DATA` flag
- **Search:** Find all references to `USE_LIVE_DATA` or mock/seed data switches
- **Replace:** Point mock paths to production data sources
- **Verify:** Compliance pack, scorecard, state pages all read from Neon without flag

---

## Phase D — Web Packet Polish ✅ (D1 COMPLETE)

### D1: Wire `esa_programs` into compliance pack ✅
- **Commit:** `1baf721`
- **File:** `/opt/homeschool-compass/scripts/compliance-pack.py`
- **Change:** Reads `states.esa_programs` JSONB instead of flat columns — renders multiple programs per state
- **Multi-program rendering:** AZ(1), FL(3), OH(2), rest(1 each)
- **New features:** Platform badge (Odyssey/ClassWallet), application link button, deadline card per program
- **Rollback:** `git revert 1baf721`

### D2: Wire `compliance_forms` into compliance pack
- **New section:** "Compliance Calendar" with notification/assessment/immunization deadlines
- **New section:** "Forms Quick-Reference" — links to each form with access indicator
- **Status:** 📝 Queued (data exists, template needs update)

### D3: Deadline calendar from structured data
- **Source:** `esa_programs[].deadlines[]` (application_window, report, renewal)
- **Renders:** Timeline sorted by urgency (Immediate / Review / Routine)
- **Null-state:** "Your state has no hard deadlines this period" for non-ESA states
- **Status:** 📝 Queued

---

## Phase E — Apple App Foundational Work (Backend Implications)

### E1: API endpoints for SwiftUI app
- `GET /api/bills` — filtered bill list (state, impact, ESA, limit, offset)
- `GET /api/bills/[id]` — single bill with full analysis JSONB
- `GET /api/states/[code]` — state profile with scores, ESA, compliance
- `GET /api/states/[code]/pack` — compliance pack data (JSON, not HTML)
- `POST /api/stripe/iap-verify` — Bridge StoreKit receipt verification → Stripe

### E2: StoreKit IAP verification bridge
- `POST /api/iap/verify-receipt` — Verify Apple App Store receipt, map to Stripe product
- `POST /api/iap/restore` — Restore purchases from Apple ID
- **Stripe products:** Already created (`prod_UizlLjAcMh84ye` for $29 kit), need IAP product IDs

### E3: Data sync for offline mode
- **State data bundles:** Pre-compute and cache state compliance packs as JSON blobs
- **Bundle endpoint:** `GET /api/bundles/[state].json` — full state snapshot for offline viewing
- **Incremental updates:** `GET /api/bundles/updates?since=<timestamp>` — delta sync
- **Expected size:** ~50-100KB per state (bills + ESA + compliance + scores)

---

## Priority & Dependencies

```
Now ──────────────────────────────────────────► mid-Jun ─────────────►
│                                                    │
│  ✅ B1: esa_programs (DONE)                        │  A1: Resume timer
│  ✅ B2: compliance_forms (DONE)                    │  A2: Incremental sync
│  ✅ B3: verify timestamp (DONE)                    │  A3: Fetch bill text
│  ✅ D1: compliance pack multi-program (DONE)       │
│  C1: Verify Provider Portal on Vercel              │
│  C3: Remove USE_LIVE_DATA                          │
│                                                     │
│  Late Jun ─────────────────────────────────────────►│
│  C2: Custom domain                                  │
│  D2-D3: Compliance calendar + forms                 │
│  E1-E3: Apple app API endpoints                     │
```

**Order within an active phase:** Left-to-right, top-to-bottom. No parallelization unless marked.

---

## Rollback Points

| Phase | Rollback |
|-------|----------|
| A1 | `sudo systemctl stop homeschool-compass-sync.timer` |
| A2 | `git revert` the incremental sync commit |
| A3 | `DELETE FROM bill_full_text WHERE fetch_status = 'fetched' AND fetch_attempts > 0` |
| B1-B3 | `psql "$URL" -f drizzle/rollback-esa-population.sql` → `UPDATE states SET esa_programs = '[]'::jsonb, compliance_forms = '{}'::jsonb, esa_urls_verified_at = NULL` |
| C1 | Revert the commit, or disable routes via middleware |
| C2 | Remove domain from Vercel, update DNS |
| D1 | `git revert 1baf721` |
| D2-D3 | Revert compliance-pack.py changes from git |
| E1-E3 | Keep endpoints behind feature flag — disable in env |

---

## What's NOT on this plan (explicitly excluded)

- **Document processing pipeline** — No PDF filler or automated form submission. The $99 Binder points parents to the right portal URL, it doesn't fill forms for them.
- **Multi-state watch** — Deferred to Binder Plus launch. Single-state works for MVP.
- **Social features / forums** — Not a community product. Compliance tool.
- **AI chat / chatbot** — No conversational interface for legislation. Structured data + search.
- **Real-time alerts (push notifications)** — Deferred to Apple app launch. Email alerts are sufficient for MVP.
