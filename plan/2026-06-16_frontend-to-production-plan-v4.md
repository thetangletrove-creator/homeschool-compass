# Homeschool Compass — Frontend to Production Plan (v4)

**Date:** 2026-06-16
**Improvement MMR findings incorporated:** bill_full_text table, revalidation hardening, startup env validator, DLQ, timingSafeEqual, README runbook, revalidation-after-commit, header auth.

---

## 🚫 BLOCKING QUESTIONS

## Execution Order

| Step | What | Fallback Default | Depends On | Effort |
|------|------|-----------------|-----------|--------|
| **S1** | **Answer blocking questions** | Name: "Homeschool Compass", Pricing: Free-only for now, Domain: Vercel preview URL, Auth: Google only | ⏳ Jack's decision | 15 min |
| S2 | Fix TS errors + remove `ignoreBuildErrors` | — | Nothing | 1-2h |
| S3 | Create `src/lib/config.ts` with real brand name | — | S1 | 10 min |
| S4 | Drizzle migrations: create all Neon tables | — | S2, Neon DB | 30 min |
| S5 | Create restricted Neon user (SELECT-only) | — | S4 | 10 min |
| S6 | Insert test row + verify UI renders live data | — | S4, S5 | 30 min |
| S7 | Rebrand: replace all "Tangle Trove" | — | S3 | 15 min |
| S8 | Replace mock with Drizzle queries | — | S4, S5 | 2-3h |
| S9 | Sync pipeline to Neon | — | S4 | 2-3h |
| S10 | Neon Auth | — | S1 (domain), S5 | 30 min |
| S11 | Stripe | — | S1 (pricing) | 2h |
| S12 | Vercel deploy + smoke test | — | S7, S8, S10 | 2h |

## Phase 0: Bootstrapping

### S1 — Answer blocking questions
**Fallback defaults** (choose now or proceed with these):
- **Product name:** "Homeschool Compass" (rename later is trivial with config.ts)
- **Pricing tiers:** Free-only for Phase 0-3. Stripe built but gated by feature flag until pricing decided.
- **Domain:** Vercel preview URL (`homeschool-compass.vercel.app`) for development. Custom domain configurable later.
- **Neon Auth providers:** Google only for MVP. Email/magic-link and Apple added later.

### S2 — Fix TypeScript errors
1. Run `npx tsc --noEmit` — fix ALL errors
2. Remove `ignoreBuildErrors: true` from `next.config.mjs`
3. Run `npx eslint --fix` and `npx prettier --write` before final `npx tsc --noEmit`
4. Commit: `chore: fix TypeScript errors, remove ignoreBuildErrors flag`

### S3 — Centralized brand config
Create `src/lib/config.ts`:
```ts
export const CONFIG = {
  PRODUCT_NAME: 'Homeschool Compass',
  TAGLINE: 'Regulation Tracker',
  DOMAIN: process.env.NEXT_PUBLIC_DOMAIN || 'homeschool-compass.vercel.app',
  STRIPE_SUCCESS_URL: '/account?checkout=success',
  STRIPE_CANCEL_URL: '/pricing?checkout=cancelled',
}
```

All 17 frontend files import from here instead of hardcoding strings.

### S4 — Drizzle migrations → Neon tables

**Tables:**

```sql
-- Public read-only data (frontend uses restricted user)
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

-- Bills metadata (lean — frequently queried without full text)
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
  analysis JSONB,
  legiscan_bill_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_bills_state ON bills(state_code);
CREATE INDEX idx_bills_legiscan ON bills(legiscan_bill_id);

-- Full bill text (separate to keep bills table lean)
CREATE TABLE bill_full_text (
  bill_id TEXT PRIMARY KEY REFERENCES bills(id),
  full_text TEXT NOT NULL,
  text_url TEXT,  -- URL to official source if full text >1MB
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pipeline metadata
CREATE TABLE pipeline_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO pipeline_metadata (key, value) VALUES ('last_synced_at', '1970-01-01T00:00:00Z');

-- Dead letter queue for skipped pipeline rows
CREATE TABLE dlq (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL,          -- 'state' | 'bill'
  raw_payload JSONB NOT NULL,
  error_message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sync idempotency log
CREATE TABLE sync_log (
  id SERIAL PRIMARY KEY,
  fetch_key VARCHAR(255) UNIQUE NOT NULL,
  status TEXT NOT NULL,
  errors TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_sync_log_fetch_key ON sync_log(fetch_key);
```

**Migration strategy:**
- `drizzle-kit generate` → `drizzle-kit migrate` in CI/CD
- All migrations idempotent (`IF NOT EXISTS`)
- `migrations` table tracks applied versions

**Restricted user setup:**
```sql
CREATE USER hc_frontend WITH PASSWORD '***';
GRANT SELECT ON states, bills, bill_full_text TO hc_frontend;
-- pipeline_metadata, sync_log, dlq are NOT accessible to frontend
```
`DATABASE_URL` = restricted user connection string
`DATABASE_URL_ADMIN` = admin connection string (pipeline + migrations only)

### S5 — Create restricted Neon user
As above. Separate `DATABASE_URL` (frontend) and `DATABASE_URL_ADMIN` (pipeline + migrations).

### S6 — One-row end-to-end proof
1. Insert test row manually using admin connection:
   ```sql
   INSERT INTO states (code, name, score, subscores, level)
   VALUES ('DE', 'PHASE0-TEST-DELAWARE', 999, '{}', 'No Notice');
   ```
2. Temporarily set `USE_LIVE_DATA=true`, `DATABASE_URL` to restricted connection
3. Verify `/state/de` renders "PHASE0-TEST-DELAWARE" with score 999
4. The obvious fake values (score 999, name all-caps) make it instantly verifiable that live Neon data is flowing, not mock fallback
5. Delete the test row: `DELETE FROM states WHERE code = 'DE';`
6. Commit the working chain

---

## Phase 1: Rebrand

Replace all "Tangle Trove" references with product name from `config.ts`.

**Verification:**
```bash
grep -r 'Tangle Trove' --include='*.tsx' --include='*.ts' --include='*.json' --include='*.md'
# → 0 hits

# Also check public/ assets, robots.txt, sitemap.xml
grep -r 'tangle' public/ --include='*' -i
# → 0 hits
```

**Scope:** 17 files across `app/`, `components/`, `lib/`, plus visual review of `public/` assets.

---

## Phase 2: Data Architecture

### Startup env var validator

`src/lib/db.ts` includes a startup check:
```ts
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'NEON_AUTH_BASE_URL', 'STRIPE_WEBHOOK_SECRET', 'REVALIDATION_SECRET'] as const;

export function validateEnv() {
  for (const name of REQUIRED_ENV_VARS) {
    if (!process.env[name]) {
      throw new Error(`[ENV] Missing required env var: ${name}. Set it in Vercel dashboard and redeploy.`);
    }
  }
}
```

This runs at module load. Every missing env var is named explicitly with remediation steps. No mystery "Service Unavailable" with no cause.

### `getDb()` implementation

```ts
// src/lib/db.ts
export function getDb() {
  const useLive = process.env.USE_LIVE_DATA === 'true';

  // Preview branches: auto-force mock unless explicitly opted in
  if (process.env.VERCEL_ENV === 'preview' && !useLive) {
    console.log('[DB] Preview environment — using mock data. Set USE_LIVE_DATA=true to override.');
    return getMockDb();
  }

  if (useLive) {
    if (!process.env.DATABASE_URL) {
      throw new Error('[DB] USE_LIVE_DATA=true but DATABASE_URL is missing. Check env vars.');
    }
    console.log('[DB] Data source: live — Neon');
    return getLiveDb();
  }

  console.log('[DB] Data source: mock');
  return getMockDb();
}
```

Error messages expose env var names in dev (safe — local machine). In production, Next.js Error boundary catches them and displays a generic page. Structured logger captures the real error server-side.

### `getMockDb()` — extract existing mock data

Before creating `lib/db.ts`, extract the existing mock data from `lib/data.ts` into a standalone function:

```ts
// lib/mock-data.ts (extracted from lib/data.ts — same data, same shape)
export function getMockDb(): DbQueries {
  return {
    getStates: () => Promise.resolve(states),
    getState: (code: string) => Promise.resolve(states.find(s => s.code === code)),
    getBills: () => Promise.resolve(bills),
    getBill: (id: string) => Promise.resolve(bills.find(b => b.id === id)),
    // ...etc
  };
}
```

`lib/data.ts` re-exports from `lib/db.ts` for import compatibility. No existing imports break.

### Sync pipeline (ICHABOD cron)

1. `legiscan_client.py` fetches new/updated bills with exponential backoff + retry (3-5 attempts)
2. Idempotency: log each fetch as `legiscan_fetch_<bill_id>_<timestamp>` in `sync_log`. Skip duplicates.
3. Upsert-parent-first: ensure state row exists before bill inserts. Single transaction per state.
4. Data validation per-row:
   - Score 0-100, non-null required fields
   - Rows that fail → write to `dlq` (raw_payload + error_message)
   - If >10% of rows fail → halt sync, emit `[SYNC-ALERT]` to stdout
   - Good rows continue processing (DLQ only, don't block)
5. Upsert to Neon via `psycopg2`, not SQLite
6. **Revalidation (hardened):**
   a. Wait for DB transaction to commit (confirm data is durable)
   b. POST to `https://<domain>/api/revalidate` with `Authorization: Bearer <REVALIDATION_SECRET>` header (NOT query param)
   c. Exponential backoff on failure (3 retries)
   d. If all retries fail → write to `pipeline_metadata.sync_revalidation_failure`
7. Update `pipeline_metadata.last_synced_at`
8. Frequency: every 4h during session, daily otherwise

### Data freshness UI

Footer reads `last_synced_at` via a server component that queries `pipeline_metadata` using the **admin connection** (not the restricted frontend user). Displays:

| `last_synced_at` value | Display |
|------------------------|---------|
| `'1970-01-01T00:00:00Z'` | "Data sync pending — initial load has not completed" |
| `< 1 hour ago` | "Data updated: X minutes ago" |
| `1-24 hours ago` | "Data updated: X hours ago" |
| `> 24 hours` | Amber banner: "Data may be stale — last sync was X days ago" |

### Static generation guard

`generateStaticParams()` always returns a base set of mock IDs + any from DB. Never returns empty array even if DB is empty — prevents zero-page build.

---

## Phase 3: Neon Auth

- Enable Neon Auth on Neon project dashboard
- Configure Google as the sole provider (for MVP)
- `NEON_AUTH_BASE_URL` → Vercel deployment URL
- `NEON_AUTH_COOKIE_SECRET` → from Neon dashboard (32+ chars, stored as Vercel Sensitive env var)
- Middleware checks for missing env vars at startup, logs warning in dev, fails in production
- Unauthenticated users see the full site — auth only gates watchlist/save features
- `/api/me` endpoint returns session-scoped data (tier, preferences) via HttpOnly cookie

---

## Phase 4: Stripe Payments

**Note:** Built but gated by feature flag until pricing tiers are decided.

Webhook endpoint (`app/api/webhooks/stripe/route.ts`):
- Disable Next.js body parsing: `export const config = { api: { bodyParser: false } }`
- Signature verification: `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`
- **Timestamp tolerance:** verify webhook timestamp is within 5 minutes (prevent replay)
- **Idempotency:** store `event.id` in `webhook_events` table with UNIQUE — skip duplicates
- **Transactional:** wrap event check + subscription update in a single DB transaction
- **No IP validation** — Stripe explicitly advises against this. Signature verification is sufficient.
- Handle: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.*`
- Retry via Stripe's built-in webhook retry mechanism

Stripe Checkout uses relative URLs from config.ts (`STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`) — prevents open redirects.

---

## Phase 5: Vercel Deployment

### Security headers (`next.config.mjs`)
```js
headers: async () => [
  {
    source: '/(.*)',
    headers: [
      {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; frame-src https://js.stripe.com; connect-src 'self' https://api.stripe.com; img-src 'self' data:;",
      },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
    ],
  },
],
```
`unsafe-inline` retained for Next.js hydration + Stripe.js. Tested with Report-Only mode first. CSP tightened further if Report-Only shows no violations.

### Revalidation endpoint (`app/api/revalidate/route.ts`)
- Validates `Authorization: Bearer <secret>` header using `crypto.timingSafeEqual()`
- Rate-limited to 5 req/hour (pipeline only fires every 4h)
- Only accepts requests from ICHABOD's IP (second layer of defense)
- Logs every request for auditability

### Env vars (Vercel dashboard, all marked Sensitive)
```
DATABASE_URL          → restricted user connection string
DATABASE_URL_ADMIN    → admin connection string
NEON_AUTH_BASE_URL    → deployment URL
NEON_AUTH_COOKIE_SECRET → from Neon dashboard
STRIPE_SECRET_KEY     → from Stripe
STRIPE_WEBHOOK_SECRET → from Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY → pk_...
USE_LIVE_DATA         → true (production) / false (preview, dev)
REVALIDATION_SECRET   → openssl rand -base64 32
```
`NEXT_PUBLIC_` prefix only on values that must be client-accessible (Stripe publishable key, domain). All others server-only. Pre-deployment CI scan catches mis-prefixed env vars.

### Onboarding runbook (`README.md` section)

```bash
# 1. Clone + install
git clone https://github.com/wowthisiseasytoremember-stack/homeschool-regulation-tracker.git
cd homeschool-regulation-tracker
pnpm install

# 2. Set up Neon DB
#    - Create a Neon project
#    - Run drizzle-kit migrate to push tables
#    - Create restricted user: GRANT SELECT ON states, bills, bill_full_text TO hc_frontend;

# 3. Create .env.local
cp .env.example .env.local  # fill in DATABASE_URL, NEON_AUTH_BASE_URL, etc.

# 4. Run locally
pnpm dev  # opens http://localhost:3000 — mock data by default
USE_LIVE_DATA=true pnpm dev  # connects to Neon — verify with test row

# 5. Run end-to-end verification
#    - Insert test state row with obvious fake values
#    - Confirm /state/de renders the test data
#    - Delete test row
```

### Smoke test checklist (with assertions)

- [ ] `npx tsc --noEmit` passes — zero errors
- [ ] Homepage loads — state count badge shows a number (not 0, not undefined)
- [ ] State page `/state/tx` renders — page contains "Texas"
- [ ] Scorecard page renders — 34+ state cards (not empty grid)
- [ ] Bill page renders — bill title visible, not 404
- [ ] Sign-in button exists and links to Neon Auth
- [ ] Pricing page loads — plan cards visible
- [ ] Mobile viewport looks reasonable
- [ ] Lighthouse score > 80
- [ ] Footer shows data freshness timestamp (not "Data sync pending" after first sync)
- [ ] Security headers present — `curl -I` returns CSP, HSTS, X-Frame-Options
- [ ] `USE_LIVE_DATA=false` falls back to mock correctly
- [ ] `/api/revalidate` returns 401 without valid token, 200 with valid token

---

## Guardrails & Rollback

- **Mock data stays in repo** until Phase 2 is verified with live data. Zero downtime.
- **`USE_LIVE_DATA` flag** controls the switch. Preview branches auto-force mock. Production fails loudly if `true` but `DATABASE_URL` missing.
- **Neon Auth is graceful.** Returns null when unconfigured. App works fully without auth.
- **Pipeline failure → stale data only**, not a broken site. Footer shows freshness status.
- **Data validation with DLQ** — bad rows are captured, not lost. Pipeline continues with good data.
- **Stripe webhook is source of truth** for subscriptions. Idempotent via `event.id`. Timestamp-validated against replay.
- **Restricted DB user for frontend.** No write access to any table. `pipeline_metadata` and `sync_log` are not accessible to the frontend connection.
- **Revalidation endpoint** has two layers of defense: `Authorization` header + IP allowlist + 5 req/hour rate limit.
- **Secrets** are Vercel Sensitive env vars only. `.env.example` has placeholders. CI scan prevents committing real secrets.

---

## README Runbook (at `~/Projects/homeschool-compass/frontend/README.md`)

Added as a new section — step-by-step for any agent or engineer to pick up and execute Phase 0 in under 30 minutes.
