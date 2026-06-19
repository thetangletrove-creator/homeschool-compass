# Homeschool Compass — Frontend to Production Plan (v2)

**Date:** 2026-06-16
**Context:** v0-generated Next.js app needs rebranded, wired to real data, deployed on Vercel.
**MMR v1 findings incorporated:** Monitoring, validation, auth guardrails, Stripe specifics, restructured execution.

---

## 🚫 BLOCKING QUESTIONS (must answer before execution)

| Question | Impact if Unanswered |
|----------|---------------------|
| **Product name?** ("Homeschool Compass" or other) | Phase 1 (rebrand) blocked. Can't ship with "Tangle Trove" |
| **Pricing tiers?** Free tier scope? Paid price? One-time option? | Phase 4 (Stripe) blocked — can't build checkout or webhooks without tiers |
| **Domain?** (homeschoolcompass.com or similar) | Vercel deploy partially blocked — env vars, Neon Auth base URL, SEO tags all depend on this |
| **Neon Auth providers?** Email + magic link? Google? Apple? | Phase 3 partially blocked — can configure in dashboard but need to know which providers to enable |

---

## Current State

```
Pipeline (ICHABOD, Python)    Neon DB (PostgreSQL)    Frontend (Vercel, Next.js)
┌──────────────────────┐      ┌──────────────────┐   ┌──────────────────────────┐
│ ✓ LegiScan API live  │ ──✗──│ ✓ Empty, ready   │   │ ✓ All UI pages built     │
│ ✓ 34-state seed data │      │ ✓ Pooled conn OK │   │ ✓ Routing, components OK │
│ ✓ Scorecard gen OK   │      │ ✗ No tables      │   │ ✗ ALL mock data          │
│ ✗ No Neon sync cron  │      │ ✗ No data        │   │ ✗ Branded "Tangle Trove" │
│ ✗ No bill extraction │      │                  │   │ ✗ No Neon Auth config    │
└──────────────────────┘      └──────────────────┘   └──────────────────────────┘
```

---

## Phase 0: One-Row End-to-End Proof (NEW)

**Do this first. Before any other work.**

1. Create a `src/config.ts` with centralized brand config (product name, tagline, domain)
2. Create `states` + `bills` tables in Neon via Drizzle migrations
3. Insert ONE test state row manually (e.g. `DE` — no LegiScan dependency)
4. Write Drizzle query in frontend, verify `/state/de` renders live data
5. Commit the working chain

**Why:** Proves Neon → Drizzle → Server Component → UI works before building the sync pipeline. If this breaks, nothing else matters.

---

## Phase 1: Rebrand

Replace "Tangle Trove" with the actual product name.

**Implementation:**
- Create `src/lib/config.ts` with `PRODUCT_NAME`, `TAGLINE`, `DOMAIN` constants
- All 17 files import from config.ts instead of hardcoding
- `grep -r 'Tangle Trove' --include='*.tsx' --include='*.ts' --include='*.json' --include='*.md'` for anything missed
- Check `public/` for image alt text or filenames with old brand
- Check `robots.txt`, `sitemap.xml` if they exist
- One commit: `chore: rebrand from Tangle Trove to [name]`

**Verification:** `grep -ri 'tangle' frontend/ --include='*.tsx' --include='*.ts'` returns 0 hits.

---

## Phase 2: Data Architecture

The core work. Frontend reads from `lib/data.ts` (mock). Needs to read from Neon via Drizzle.

### Approach: Neon sync tables (recommended)

Python pipeline on ICHABOD syncs LegiScan → Neon PostgreSQL. Frontend reads Neon via Drizzle ORM. No rewrite of the 4700-line Python pipeline needed.

### Neon tables

```sql
-- States data (replaces mock `states` array)
CREATE TABLE states (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  subscores JSONB,
  level TEXT NOT NULL CHECK (level IN ('No Notice','Low Regulation','Moderate','High')),
  esa_active BOOLEAN DEFAULT FALSE,
  esa_name TEXT,
  esa_max_award TEXT,
  esa_eligibility TEXT,
  esa_documentation JSONB,
  esa_deadline TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bills data (replaces mock `bills` array)
CREATE TABLE bills (
  id TEXT PRIMARY KEY,
  state_code TEXT NOT NULL REFERENCES states(code),
  number TEXT NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  status_step INTEGER NOT NULL CHECK (status_step >= 0 AND status_step <= 5),
  impact TEXT NOT NULL CHECK (impact IN ('increase','decrease','neutral')),
  impact_summary TEXT,
  delta TEXT,
  action_required TEXT,
  esa_related BOOLEAN DEFAULT FALSE,
  full_text TEXT,
  analysis JSONB,
  legiscan_bill_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pipeline metadata (NEW — MMR finding)
CREATE TABLE pipeline_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
-- Track last_synced_at, data_quality_score, etc.
INSERT INTO pipeline_metadata (key, value) VALUES ('last_synced_at', '1970-01-01T00:00:00Z');
```

### Sync pipeline (cron on ICHABOD)

1. `legiscan_client.py` fetches new/updated bills
2. **Data validation layer** (NEW): Before upserting to Neon, verify:
   - `score` between 0-100
   - Mandatory fields non-null (code, name, title, etc.)
   - If >10% records fail validation, halt sync + alert (don't push garbage)
3. **Upsert-parent-first** (NEW): Ensure state row exists before inserting associated bills
4. Python script upserts into Neon PostgreSQL (not SQLite)
5. Run scorecard generation against Neon data
6. Update `pipeline_metadata.last_synced_at` on success
7. Frequency: every 4 hours during session, daily otherwise

### Frontend changes

- `lib/data.ts` → replaced with Drizzle queries in `lib/db.ts`
- **`USE_LIVE_DATA` flag** (NEW — concrete implementation):
  - `lib/db.ts` exports `getDb()` → reads `process.env.USE_LIVE_DATA`
  - Defaults to `'false'` (mock data)
  - If `'true'` but `DATABASE_URL` is missing → throw loudly with clear error
  - Logs on startup: `console.log('[DB] Data source: mock')` or `console.log('[DB] Data source: live — Neon')`
  - Server components call `getDb()` instead of importing mock directly
- `generateStaticParams()` reads from DB at build time, falls back to mock if DB empty
- ISR with `revalidate = 14400` (4h, matching cron frequency)
- **On-demand revalidation** (NEW): `app/api/revalidate/route.ts` with secret token for manual cache bust
- **Data freshness UI** (NEW): Display "Data updated: X hours ago" in footer, read from `pipeline_metadata.last_synced_at`
- `full_text` search uses PostgreSQL `tsvector` + GIN index for bill content search

### Data sync details

- 34 states seeded in pipeline SQLite — expands to 50 as pipeline runs
- Scorecard generation produces freedom scores + subscores
- ESA data already exists for ~20 states in seed data
- 34 states is MVP-ready — 50-state expansion is post-launch

### Pipeline health monitoring (NEW)

- `pipeline_metadata.last_synced_at` updated on every successful sync
- Frontend footer shows "Data last updated: X hours/days ago"
- If `last_synced_at` > 24h → show amber banner warning
- CLI health check: `python3 check_sync_health.py` — alerts if stale
- Future: UptimeRobot / BetterStack monitor for `last_synced_at` freshness

---

## Phase 3: Neon Auth

Auth is already wired in the frontend (`@neondatabase/auth`). What needs to happen:

### Neon dashboard config
- Enable Neon Auth on the project
- Set up social providers (Google recommended for MVP, Apple optional)
- Configure email/magic-link provider
- Set base URL to production domain (or `homeschool-compass.vercel.app` until custom domain is configured)

### Vercel env vars
- `NEON_AUTH_BASE_URL` — deployment URL
- `NEON_AUTH_COOKIE_SECRET` — from Neon dashboard (32+ chars)
- `DATABASE_URL` — Neon pooled connection string

### Startup validation (NEW)
- Add a check in `layout.tsx` or middleware that logs a warning in dev/staging if required auth env vars are missing
- Prevents mystery auth failures on preview branches
- The app still renders fully without auth — just disables watchlist/save features gracefully

### Authorization strategy (NEW)
- Free tier: state map + scorecard visible, no watchlist saving
- Paid tier: watchlists, bill alerts, ESA tracking, interstate reports
- Check subscription status from `subscriptions` table in server components
- UI: Unauthenticated users see "Save (requires login)" on watchlist buttons → redirect to sign-in
- Server components use `getSession()` from Neon Auth, not client-only checks

---

## Phase 4: Stripe Payments

Schema already has `subscriptions` table. Frontend has pricing section.

### Implementation checklist (NEW — MMR findings)

1. Create Stripe product + prices in Stripe dashboard (once tiers are decided)
2. Webhook endpoint: `app/api/webhooks/stripe/route.ts`
   - **Disable Next.js body parsing:** `export const config = { api: { bodyParser: false } }`
   - **Signature verification:** `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`
   - **Handle events:** `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - **Idempotency:** Track `event.id` in a `webhook_events` log table to prevent duplicate processing
   - **Error handling:** Log failures, alert on webhook processing errors
3. Checkout session creation — server action that creates Stripe Checkout Session, redirects
4. Customer portal link — for managing existing subscriptions
5. Sync status to `subscriptions` table on every relevant Stripe event

### Testing (NEW)
- Use Stripe test mode for development
- Stripe CLI for local webhook forwarding: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Test checkout flows end-to-end before going live

---

## Phase 5: Vercel Deployment

1. **Remove `ignoreBuildErrors: true`** from `next.config.mjs` (NEW — do this before final deploy)
2. Fix any TypeScript errors that were hidden by the flag
3. Push repo to GitHub (already cloned, remote set)
4. Connect GitHub repo to Vercel
5. Set environment variables in Vercel dashboard
6. Configure custom domain (once decided) — update `NEON_AUTH_BASE_URL` to match

### Deploy config
```bash
# Vercel env vars
DATABASE_URL=postgresql://...  # from Doppler
NEON_AUTH_BASE_URL=https://homeschoolcompass.com  # or vercel.app domain
NEON_AUTH_COOKIE_SECRET=...     # from Neon dashboard
STRIPE_SECRET_KEY=sk_test_...   # from Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
USE_LIVE_DATA=true
```

### Smoke test checklist (NEW)
- [ ] Homepage loads, no 500 errors
- [ ] State page `/state/tx` renders scorecard data (or graceful fallback)
- [ ] Scorecard page shows all states
- [ ] Bill page `/bill/tx-hb-2674` renders
- [ ] Sign-in button exists and links to Neon Auth
- [ ] Pricing page loads
- [ ] Mobile viewport looks reasonable
- [ ] Lighthouse score > 80
- [ ] Footer shows data freshness timestamp
- [ ] `USE_LIVE_DATA=false` falls back to mock data correctly

### Edge cases (NEW — from MMR)
- **Build-time DB empty**: If Neon DB is empty during first Vercel build, `generateStaticParams` falls back to mock data. Site deploys with mock data, switches to live on first successful sync.
- **Stale data**: Footer always shows `last_synced_at`. If sync hasn't run, show "Initial data load pending" — not a broken timestamp.
- **Preview branches**: `USE_LIVE_DATA` defaults to `false` on preview — previews use mock data to avoid polluting production DB.

---

## Execution Order (Revised — MMR v1 feedback incorporated)

| Order | Step | What | Depends On | Effort |
|-------|------|------|-----------|--------|
| 0 | **Answer blocking questions** | Name, pricing, domain, auth providers | Nothing | ⏳ Jack's decision |
| P0 | **Phase 0: One-row test** | Create Drizzle schema → push to Neon → insert test row → verify UI renders | Neon DB ready | 1h |
| 1 | **Phase 1: Rebrand** | Create `config.ts`, batch-replace 17 files, verify with grep | Phase 0 | 15 min |
| 2a | **Phase 2: Drizzle schema + DDL** | `states`, `bills`, `pipeline_metadata` tables via Drizzle migration + SQL | Phase 0 | 1h |
| 2b | **Phase 2: Replace mock with Drizzle** | `lib/db.ts`, `getDb()`, `USE_LIVE_DATA` flag, server component queries | Phase 2a | 2-3h |
| 2c | **Phase 2: Sync pipeline to Neon** | Python sync script, data validation, upsert-parent-first, `last_synced_at` | Phase 2a | 2-3h |
| 3 | **Phase 3: Neon Auth** | Dashboard config, env vars, startup validation | Phase 1 (needs domain) | 30 min |
| 4 | **Phase 4: Stripe** | Webhook, checkout, portal, testing | Blocking questions (pricing tiers) | 2h |
| 5 | **Phase 5: Vercel deploy** | Remove `ignoreBuildErrors`, fix TS errors, set env vars, verify | Phases 1-2b | 2h |
| — | **Post-launch** | Expand to 50 states, full-text search tuning, multi-provider auth | Phase 5 | Roadmap |

---

## Guardrails & Rollback

- **Mock data stays in the repo.** `lib/data.ts` is not deleted until Phase 2b is verified with live data. Zero downtime.
- **`USE_LIVE_DATA` env var** controls the switch. Default `false`. Toggle per-environment.
- **Neon Auth is graceful by design.** Returns null when unconfigured. App works fully without auth.
- **Pipeline runs separately from frontend.** ICHABOD cron failure → stale data, not a broken site.
- **Data validation in pipeline.** If >10% records fail quality checks, sync halts and alerts — production DB is never corrupted.
- **Stripe webhook is the source of truth** for subscription status. Frontend redirect is best-effort only.
- **Preview branches default to mock data.** No risk of test data polluting the production DB.
- **`last_synced_at` health check.** Footer displays data freshness. Stale data is visible, not hidden.

---

## Open Questions

| Question | Blocking | Answer |
|----------|----------|--------|
| Product name? | Phase 1 | ⏳ |
| Pricing tiers? | Phase 4 | ⏳ |
| Domain? | Phases 3, 5 | ⏳ |
| Auth providers? | Phase 3 | ⏳ |
