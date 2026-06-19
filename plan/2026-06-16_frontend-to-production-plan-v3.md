# Homeschool Compass — Frontend to Production Plan (v3)

**Date:** 2026-06-16
**Context:** v0-generated Next.js app needs rebranded, wired to real data, deployed on Vercel.
**MMR v1 → v2 improvements:** 10 findings incorporated — monitoring, validation, auth guardrails, Stripe specifics, pipeline revalidation.
**MMR v2 → v3 improvements:** Pipeline→cache loop, USE_LIVE_DATA hardening, test row signal, 1970 timestamp fix, idempotency, alert channel, CSP headers, preview banner.

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
│ ✗ No bill extraction │      │                  │   │ ✗ No Neon Auth env vars  │
└──────────────────────┘      └──────────────────┘   └──────────────────────────┘
```

---

## Phase 0: One-Row End-to-End Proof

**Do this first. Before any other work.**

1. Answer the product name question → create `src/lib/config.ts` with the real name (not a placeholder)
2. Run `npx tsc --noEmit` — fix all TypeScript errors **immediately**. Remove `ignoreBuildErrors: true` from `next.config.mjs`. This is step 0 of Phase 0, before any other work.
3. Create `states` + `bills` + `pipeline_metadata` tables in Neon via Drizzle migrations
4. Create a second restricted Neon user with SELECT-only on `states` and `bills` — frontend uses this; pipeline + migrations use the admin user (`DATABASE_URL_ADMIN`)
5. Insert ONE test state row manually with **obviously distinguishable data**
   - `code: 'DE'`, `name: 'PHASE0-TEST-DELAWARE'`, `score: 999`
   - Values are impossible in production → instantly verifiable as live Neon data vs mock fallback
6. Write Drizzle query in frontend, toggle `USE_LIVE_DATA=true`, verify `/state/de` renders "PHASE0-TEST-DELAWARE" with score 999
7. Commit the working chain

**Why:** Proves Neon → Drizzle → Server Component → UI works before building the sync pipeline. If this breaks, nothing else matters.

---

## Phase 1: Rebrand

Replace "Tangle Trove" with the real product name.

**Implementation:**
- `src/lib/config.ts` holds `PRODUCT_NAME`, `TAGLINE`, `DOMAIN`
- All 17 files import from config.ts instead of hardcoding
- All SEO metadata fields (`metadata.title`, `metadata.description`, `metadata.openGraph.*`) also sourced from config.ts
- `grep -r 'Tangle Trove' --include='*.tsx' --include='*.ts' --include='*.json' --include='*.md'` — verify zero hits
- Check `public/` for image alt text or filenames with old brand
- If `robots.txt`, `sitemap.xml`, `next.config.mjs` exist — check for branded content
- One commit: `chore: rebrand from Tangle Trove to [name]`

---

## Phase 2: Data Architecture

The core work. Frontend reads from `lib/data.ts` (mock). Needs to read from Neon via Drizzle.

### Approach: Neon sync tables

Python pipeline on ICHABOD syncs LegiScan → Neon PostgreSQL. Frontend reads Neon via Drizzle ORM. No rewrite of the 4700-line Python pipeline.

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
-- full_text: store < 1MB per bill. If larger, store 1000-char preview + URL to full text.
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
  action_required TEXT CHECK (action_required IS NULL OR action_required IN ('call','donate','email','share','none')),
  esa_related BOOLEAN DEFAULT FALSE,
  full_text TEXT,
  analysis JSONB,
  legiscan_bill_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_bills_state ON bills(state_code);
CREATE INDEX idx_bills_legiscan ON bills(legiscan_bill_id);

-- Pipeline metadata — tracks sync health
CREATE TABLE pipeline_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO pipeline_metadata (key, value) VALUES ('last_synced_at', '1970-01-01T00:00:00Z');

-- Idempotency log for sync pipeline
CREATE TABLE sync_log (
  id SERIAL PRIMARY KEY,
  fetch_key TEXT UNIQUE NOT NULL,  -- e.g. "legiscan_fetch_<timestamp>_<bill_id>"
  status TEXT NOT NULL,
  errors TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Drizzle migration strategy
- Use `drizzle-kit generate` to create migration files
- Apply via `drizzle-kit migrate` during CI/CD for Vercel deployments
- ICHABOD pipeline uses the admin connection (`DATABASE_URL_ADMIN`) for the `states`/`bills` tables
- Migrations are idempotent: `IF NOT EXISTS` on tables, `migrations` table tracks applied versions

### Sync pipeline (cron on ICHABOD)

1. `legiscan_client.py` fetches new/updated bills
2. **Idempotency:** Log each LegiScan fetch as `legiscan_fetch_<timestamp>_<bill_id>` in `sync_log` with UNIQUE constraint. Skip if already processed.
3. **Upsert-parent-first:** Ensure state row exists before inserting associated bills. Inside a transaction.
4. **Data validation layer:** Validate each row individually (score 0-100, non-null required fields). Collect errors per-row. Continue processing good rows. If >10% of records fail validation, halt sync and emit `[SYNC-ALERT]` to stdout + write to `pipeline_metadata.sync_errors`.
5. Python script upserts into Neon PostgreSQL via `psycopg2` — not SQLite
6. Run scorecard generation against Neon data
7. **Cache invalidation:** Final step — POST to `/api/revalidate?secret=<REVALIDATION_SECRET>` on Vercel. Closes the loop: sync finishes → cache invalidates → next visitor gets fresh data.
8. Update `pipeline_metadata.last_synced_at` on success

**Frequency:** Every 4 hours during session, daily otherwise.

### Frontend changes

- `lib/data.ts` → replaced with Drizzle queries in `lib/db.ts`
- **`USE_LIVE_DATA` flag implementation** (hardened from MMR):
  ```ts
  // lib/db.ts
  export function getDb() {
    const USE_LIVE_DATA = process.env.USE_LIVE_DATA === 'true'

    // Preview branches: auto-force mock unless explicitly opted in
    if (process.env.VERCEL_ENV === 'preview' && !USE_LIVE_DATA) {
      console.log('[DB] Preview environment — using mock data. Set USE_LIVE_DATA=true to override.')
      return getMockDb()
    }

    if (USE_LIVE_DATA) {
      if (!process.env.DATABASE_URL) {
        throw new Error('[DB] USE_LIVE_DATA=true but DATABASE_URL is missing. Check env vars.')
      }
      console.log('[DB] Data source: live — Neon')
      return getLiveDb()
    }

    console.log('[DB] Data source: mock')
    return getMockDb()
  }
  ```
- Server components call `getDb()` instead of importing mock directly
- `generateStaticParams()` always returns a base set (mock IDs + any from DB). Never returns empty array — prevents zero-page build.
- ISR with `revalidate = 14400` (4h, matching cron frequency). Pipeline's POST to `/api/revalidate` bypasses this after sync.
- **On-demand revalidation:** `app/api/revalidate/route.ts` — validates `REVALIDATION_SECRET` via constant-time comparison (`openssl rand -base64 32`, stored in Vercel env vars). Rate-limited to 10 req/min.
- **Data freshness UI:** Footer reads `pipeline_metadata.last_synced_at`. Shows:
  - `'1970-01-01T00:00:00Z'` → "Data sync pending — initial load has not completed"
  - `< 1 hour ago` → "Data updated: X minutes ago"
  - `> 1 hour ago` → "Data updated: X hours ago"
  - `> 24 hours` → amber banner: "Data may be stale — last sync was X days ago"
- Full-text search: `to_tsvector('english', full_text)` with GIN index for bill content search

### Pipeline health monitoring

- `pipeline_metadata.last_synced_at` updated on every successful sync
- Footer displays data freshness with color coding (green/amber/red)
- Sync errors written to `pipeline_metadata.sync_errors` as JSON blob
- Sync idempotency tracked in `sync_log` table
- CLI health check: `python3 check_sync_health.py` — reads `last_synced_at`, alerts if >24h stale

---

## Phase 3: Neon Auth

Auth is already wired in the frontend (`@neondatabase/auth`). The app renders fully without auth — just disables watchlist/save features gracefully.

### Neon dashboard config
- Enable Neon Auth on the project
- Set up social providers (Google recommended for MVP, Apple optional)
- Configure email/magic-link provider
- Set base URL to production domain

### Vercel env vars
- `NEON_AUTH_BASE_URL` — deployment URL
- `NEON_AUTH_COOKIE_SECRET` — from Neon dashboard (32+ chars)
- `DATABASE_URL` — restricted user connection string (SELECT-only on `states`, `bills`)

### Startup validation
- Middleware logs warning in dev/staging if auth env vars are missing
- If missing in production → fatal error on deploy
- The app still renders without auth — just disables watchlist/save buttons

### Authorization
- Free tier: state map + scorecard visible, no watchlist saving
- Paid tier: watchlists, bill alerts, ESA tracking, interstate reports
- Server components check `subscriptions.status = 'active'` with `expires_at > NOW()`
- Unauthenticated users see watchlist buttons labeled "Save (requires login)" → redirect to sign-in
- Client-side auth data flows through `/api/me` endpoint (HttpOnly cookie auth), not raw session tokens

---

## Phase 4: Stripe Payments

Schema already has `subscriptions` table. Frontend has pricing section.

### Implementation

1. Create Stripe product + prices in Stripe dashboard (once tiers are decided)
2. Webhook endpoint: `app/api/webhooks/stripe/route.ts`
   - **Disable Next.js body parsing:** `export const config = { api: { bodyParser: false } }`
   - **Signature verification:** `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`
   - **IP validation:** Check against Stripe's published webhook IP ranges before processing
   - **Max request body:** 1MB limit
   - **Handle events:** `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - **Idempotency:** Store each `event.id` in `webhook_events` table with UNIQUE constraint. Skip if already processed. Wrap subscription updates in a transaction.
   - **Error handling:** Log failures, alert on webhook processing errors
   - **Retry:** Use Stripe's built-in webhook retry mechanism (automatic)
3. Checkout session creation — server action that creates Stripe Checkout Session
   - `success_url: STRIPE_SUCCESS_URL` from config.ts (default `/account?checkout=success`)
   - `cancel_url: STRIPE_CANCEL_URL` from config.ts (default `/pricing?checkout=cancelled`)
4. Customer portal link — for managing existing subscriptions
5. Sync status to `subscriptions` table on every relevant Stripe event

### Testing
- Use Stripe test mode for development
- Stripe CLI for local webhook forwarding: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Test checkout → success → cancel → re-subscribe flows end-to-end before going live

---

## Phase 5: Vercel Deployment

1. **`ignoreBuildErrors: true` removed in Phase 0** — this is already done before deploy
2. Push repo to GitHub (already cloned, remote set)
3. Connect GitHub repo to Vercel
4. Set environment variables in Vercel dashboard
5. Configure custom domain (once decided) — update `NEON_AUTH_BASE_URL` to match

### Deploy config
```bash
# Vercel env vars
DATABASE_URL=postgresql://restricted_user:***@neon/neondb  # SELECT-only user
DATABASE_URL_ADMIN=postgresql://neondb_owner:***@neon/neondb  # admin user
NEON_AUTH_BASE_URL=https://homeschoolcompass.com
NEON_AUTH_COOKIE_SECRET=***     # from Neon dashboard
STRIPE_SECRET_KEY=***           # from Stripe
STRIPE_WEBHOOK_SECRET=***       # from Stripe dashboard
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
USE_LIVE_DATA=true
REVALIDATION_SECRET=***         # openssl rand -base64 32
```

### Security headers (next.config.mjs)
```js
headers: async () => [
  {
    source: '/(.*)',
    headers: [
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; frame-src https://js.stripe.com;" },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
    ],
  },
],
```

### Smoke test checklist (with assertions — not vibes)
- [ ] Homepage loads — state count badge shows a number (not 0, not undefined)
- [ ] State page `/state/tx` renders — page contains the word "Texas"
- [ ] Scorecard page renders — 34+ state cards visible (not empty grid)
- [ ] Bill page `/bill/tx-hb-2674` renders — bill title visible, not 404
- [ ] Sign-in button exists and links to Neon Auth
- [ ] Pricing page loads — plan cards visible
- [ ] Mobile viewport looks reasonable
- [ ] Lighthouse score > 80
- [ ] Footer shows "Data updated: X" — not "Data sync pending" (initial sync has run)
- [ ] `USE_LIVE_DATA=false` falls back to mock data — footer text changes to mock indicator
- [ ] Security headers present — curl -I returns CSP, HSTS, nosniff

### Edge cases handled
- **Build-time DB empty**: `generateStaticParams()` returns a base set of mock IDs + any DB results — never an empty array. Zero-page build cannot happen.
- **Stale data**: Footer shows `last_synced_at` with color coding. Amber banner at >24h.
- **Preview branches**: `getDb()` auto-detects `VERCEL_ENV='preview'` and forces mock data unless `USE_LIVE_DATA` is explicitly `'true'`. Preview banner shows "Data is mock — not production-accurate."
- **Revalidation secret**: Generated via `openssl rand -base64 32`, stored in Vercel env vars, validated with constant-time comparison, rate-limited to 10 req/min.
- **Preview branch data freshness indicator**: If mock data is active, footer shows "Using demo data — sign up for live updates" instead of a sync timestamp.

---

## Execution Order

| Order | Step | What | Depends On | Effort |
|-------|------|------|-----------|--------|
| **0** | **Answer blocking questions** | Name, pricing, domain, auth providers | Nothing | ⏳ Jack's decision |
| P0.1 | **Fix TS errors + remove ignoreBuildErrors** | `npx tsc --noEmit`, fix all errors | Nothing | 1-2h |
| P0.2 | **Drizzle schema → push to Neon** | Create tables via migration | P0.1, Neon DB | 30 min |
| P0.3 | **Create restricted Neon user** | SELECT-only for frontend | P0.2 | 10 min |
| P0.4 | **Insert test row + verify UI renders** | Score 999 → "PHASE0-TEST-DELAWARE" visible | P0.2 | 30 min |
| 1 | **Rebrand** | Create config.ts, batch-replace 17 files | Blocking questions answered | 15 min |
| 2a | **Replace mock with Drizzle queries** | lib/db.ts, getDb(), server component queries | P0.2 | 2-3h |
| 2b | **Sync pipeline to Neon** | Python script, validation, idempotency, revalidate POST | P0.2 | 2-3h |
| 3 | **Neon Auth** | Dashboard config, env vars, startup validation | Blocking questions + Phase 1 (domain) | 30 min |
| 4 | **Stripe** | Webhook, checkout, portal, testing | Blocking questions (pricing tiers) | 2h |
| 5 | **Vercel deploy** | Set env vars, configure domain, verify smoke tests | Phases 0-2a | 2h |
| — | **Post-launch** | Expand to 50 states, multi-provider auth, drop mock data | Phase 5 | Roadmap |

---

## Guardrails & Rollback

- **Mock data stays in the repo** until Phase 2a is verified with live data and `USE_LIVE_DATA=true` in production. Zero downtime.
- **`USE_LIVE_DATA` env var** controls the switch. Preview branches auto-force mock. Production fails loudly if `true` but `DATABASE_URL` missing.
- **Neon Auth is graceful.** Returns null when unconfigured. The app works fully without auth — just no watchlists.
- **Pipeline runs separately from frontend.** ICHABOD cron failure → stale data, not a broken site.
- **Data validation in pipeline.** >10% failure threshold halts sync and alerts. Individual bad rows are skipped, not failed.
- **Stripe webhook is source of truth** for subscription status. Idempotent via `event.id` table.
- **Restricted DB user for frontend.** `DATABASE_URL` (frontend) cannot write to `states`/`bills`. `DATABASE_URL_ADMIN` (pipeline + migrations) is the admin connection. Principle of least privilege.
- **Preview branch isolation.** Auto-detect `VERCEL_ENV=preview`, force mock data, show "data is mock" banner.

---

## Open Questions

| Question | Blocking | Answer |
|----------|----------|--------|
| Product name? | Phase 1 | ⏳ |
| Pricing tiers? | Phase 4 | ⏳ |
| Domain? | Phases 3, 5 | ⏳ |
| Auth providers? | Phase 3 | ⏳ |
