# Homeschool Compass — Frontend to Production Plan (v5 — Final)

**Date:** 2026-06-16
**MMR passes:** 5 (1 standard + 2 standard + 1 standard + 1 improvement + 1 improvement)
**All findings incorporated from all 5 passes.**

---

## 🚫 BLOCKING QUESTIONS

### Fallback Defaults (use these unless changed)

| Question | Fallback | Why This | Cost to Change Later |
|----------|----------|----------|---------------------|
| Product name | "Homeschool Compass" | Needed for config.ts in Phase 0 | ~15 min grep + replace |
| Pricing tiers | Free-only for now; Stripe gated behind `ENABLE_STRIPE` flag | Unblocks Phase 4 scaffolding without committing | None — config toggle |
| Domain | Vercel preview URL | Vercel auto-assigns one; custom domain swapped later | Update env vars + config.ts |
| Auth providers | Google only | Simplest Neon Auth setup | Add providers in Neon dashboard |

---

## Execution Order

| Step | What | Depends On | Effort |
|------|------|-----------|--------|
| **S0** | **Pre-step: Provision Neon project + store connection strings in Vercel env vars** | Nothing | 15 min |
| S1 | Answer blocking questions (or use fallbacks above) | Nothing | 15 min |
| S2 | Fix TS errors + remove `ignoreBuildErrors: true` | Nothing | 1-2h |
| S3 | Create `src/lib/config.ts` + `src/lib/env_validator.ts` | S1 | 10 min |
| S4 | Push all Drizzle migrations to Neon | S0, S2 | 30 min |
| S5 | Create restricted Neon user | S4 | 10 min |
| S6 | One-row end-to-end proof | S4, S5 | 30 min |
| S7 | Rebrand: replace "Tangle Trove" | S3 | 15 min |
| S8 | Replace mock data with Drizzle queries | S4, S5 | 2-3h |
| S9 | Write + deploy sync pipeline to ICHABOD | S4 | 2-3h |
| S10 | Configure Neon Auth | S1 (domain), S5 | 30 min |
| S11 | Build Stripe integration (gated) | S1 (pricing) | 2h |
| S12 | Deploy to Vercel + run smoke test script | S7, S8, S10 | 2h |

---

## Phase 0: Bootstrapping

### S0 — Pre-step: Provision Neon Project

1. Create a Neon project (console.neon.tech) if one doesn't exist
2. Note the connection strings:
   - `DATABASE_URL_ADMIN` — full admin connection string (pipeline + migrations)
   - `DATABASE_URL` — to be replaced with restricted user after S5
3. Store both as Vercel Sensitive env vars immediately
4. Verify the DB is reachable: `psql "$DATABASE_URL_ADMIN" -c "SELECT 1"`

### S1 — Answer Blocking Questions

Use fallback defaults from the table above. Proceed without waiting. Each can be changed later with trivial effort.

### S2 — Fix TypeScript errors

1. Run `npx eslint --fix && npx prettier --write` (from Improvement MMR — run formatters first)
2. Run `npx tsc --noEmit` — fix ALL errors
3. Remove `ignoreBuildErrors: true` from `next.config.mjs`
4. Add CI gate: `npm run lint && npm run typecheck` as a required check in the repo's CI pipeline (protected branch). Prevents regression. (Improvement MMR)
5. Scope `tsc --noEmit` to production source paths only (`app/`, `components/`, `lib/`) — not test files that may have unrelated issues. (Product MMR)
6. Commit: `chore: fix TypeScript errors, remove ignoreBuildErrors, add CI gate`

### S3 — Centralized Config + Env Validator

**`src/lib/config.ts`** — single source of truth for all brand strings and domain-dependent values:
```ts
export const CONFIG = {
  PRODUCT_NAME: 'Homeschool Compass',
  TAGLINE: 'Regulation Tracker',
  DOMAIN: process.env.NEXT_PUBLIC_DOMAIN || 'homeschool-compass.vercel.app',
  STRIPE_SUCCESS_URL: '/account?checkout=success',
  STRIPE_CANCEL_URL: '/pricing?checkout=cancelled',
  REVALIDATE_RPM: parseInt(process.env.REVALIDATE_RATE_LIMIT || '5', 10),
}
```

All 17 frontend files import from here. Also move domain-dependent values (CSP connect-src URLs, API base URLs) into config.ts. (Improvement MMR)

**`src/lib/env_validator.ts`** — dedicated module, called early in the lifecycle:
```ts
import { CONFIG } from './config';

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'NEON_AUTH_BASE_URL',
  'NEON_AUTH_COOKIE_SECRET',
  'STRIPE_WEBHOOK_SECRET',
  'REVALIDATION_SECRET',
  'STRIPE_SECRET_KEY',
] as const;

const MISSING: string[] = [];
for (const name of REQUIRED_ENV_VARS) {
  if (!process.env[name]) MISSING.push(name);
}

if (MISSING.length > 0) {
  const msg = `[FATAL] Missing required env vars: ${MISSING.join(', ')}. Set them in Vercel dashboard and redeploy.`;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(msg);
  } else {
    console.warn(msg);
  }
}
```

Called from `middleware.ts` (server-side entry point), not from `lib/db.ts`. (Architecture-improvement MMR)

### S4 — Drizzle Migrations → Neon Tables

All `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` — idempotent from the start. (Product MMR)

```sql
-- Public read-only data
CREATE TABLE IF NOT EXISTS states (
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

-- Bills metadata (lean — full text is separate)
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  state_code TEXT NOT NULL REFERENCES states(code) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_bills_state ON bills(state_code);
CREATE INDEX IF NOT EXISTS idx_bills_legiscan ON bills(legiscan_bill_id);

-- Full bill text (separate table — keeps bills queries lean)
CREATE TABLE IF NOT EXISTS bill_full_text (
  bill_id TEXT PRIMARY KEY REFERENCES bills(id) ON DELETE CASCADE,
  full_text TEXT NOT NULL,
  text_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pipeline metadata
CREATE TABLE IF NOT EXISTS pipeline_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO pipeline_metadata (key, value) VALUES ('last_synced_at', '1970-01-01T00:00:00Z')
  ON CONFLICT (key) DO NOTHING;

-- Dead letter queue (failed pipeline rows)
CREATE TABLE IF NOT EXISTS dlq (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  error_message TEXT NOT NULL,
  first_seen_at TIMESTAMP DEFAULT NOW(),
  last_attempted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sync idempotency log
CREATE TABLE IF NOT EXISTS sync_log (
  id SERIAL PRIMARY KEY,
  fetch_key VARCHAR(255) UNIQUE NOT NULL,
  status TEXT NOT NULL,
  errors TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_log_fetch_key ON sync_log(fetch_key);

-- Stripe webhook idempotency (Product MMR — was missing)
CREATE TABLE IF NOT EXISTS webhook_events (
  id SERIAL PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  received_at TIMESTAMP DEFAULT NOW()
);

-- Migrations tracking
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
);
```

**Migration strategy:** `drizzle-kit generate` → `drizzle-kit migrate` in CI/CD. All idempotent. `migrations` table tracks applied versions. (Architecture MMR)

**Restricted user:**
```sql
CREATE USER IF NOT EXISTS hc_frontend WITH PASSWORD '<strong-random-password>';
GRANT SELECT ON states, bills, bill_full_text TO hc_frontend;
```
Password generated via `openssl rand -base64 24`, stored as Vercel Sensitive env var `NEON_FRONTEND_PASSWORD`. `DATABASE_URL` uses this restricted user. `DATABASE_URL_ADMIN` uses the admin role. (Security MMR — separate credentials)
Note: `pipeline_metadata`, `sync_log`, `dlq`, and `webhook_events` are NOT accessible to the restricted user. Freshness indicator uses the admin connection in a server component that never reaches the client. (Security MMR v3)

### S5 — Create Restricted Neon User

Applied via admin connection. Confirmed with:
```sql
SELECT table_catalog, table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'hc_frontend';
```
Only `states`, `bills`, `bill_full_text` should appear with `SELECT` privilege.

### S6 — One-Row End-to-End Proof

Insert a test row with a **valid score** (not 999! — see Product MMR / Edge Cases MMR):
```sql
INSERT INTO states (code, name, score, subscores, level)
VALUES ('DE', 'PHASE0-TEST-DELAWARE', 99, '{}', 'No Notice');
```

Set `USE_LIVE_DATA=true`, verify `/state/de` renders "PHASE0-TEST-DELAWARE" with score 99.

Score 99 is obviously fake (no real state scores 99) but passes the CHECK constraint. This was a real blocker: earlier versions of the plan used `score 999` which would have crashed on INSERT.

Clean up:
```sql
DELETE FROM states WHERE code = 'DE';
```

**Automated verification script** (`scripts/verify-live.sh`):
```bash
#!/bin/bash
# Insert test row, hit page, assert output, clean up
psql "$DATABASE_URL_ADMIN" -c "INSERT INTO states ... VALUES ('DE', 'PHASE0-TEST', 99, '{}', 'No Notice') ON CONFLICT DO NOTHING"
RESULT=$(curl -s http://localhost:3000/state/de | grep -c "PHASE0-TEST")
psql "$DATABASE_URL_ADMIN" -c "DELETE FROM states WHERE code = 'DE'"
if [ "$RESULT" -eq 0 ]; then echo "FAIL: Test row not visible"; exit 1; fi
echo "PASS: Live data pipeline verified"
```
(Improvement MMR — `npm run verify-live`)

---

## Phase 1: Rebrand

Replace all "Tangle Trove" references. All strings come from `src/lib/config.ts`.

**Verification:**
```bash
grep -r 'Tangle Trove' --include='*.tsx' --include='*.ts' --include='*.json' --include='*.md'
# → 0 hits

grep -r 'tangle' public/ --include='*' -i
# → 0 hits
```

**Scope:** 17 files across `app/`, `components/`, `lib/`, plus visual review of `public/` assets.

Also check: `robots.txt`, `sitemap.xml`, `next.config.mjs`, all metadata fields in layout.tsx and page.tsx files (title, description, Open Graph). (Architecture MMR — SEO metadata)

---

## Phase 2: Data Architecture

### `getDb()` Implementation

```ts
// src/lib/db.ts
function isLive(): boolean {
  // Consolidated logic: live only if explicitly opted in AND not a preview branch
  return process.env.USE_LIVE_DATA === 'true' && process.env.VERCEL_ENV !== 'preview';
}

export function getDb() {
  if (isLive()) {
    if (!process.env.DATABASE_URL) {
      // Server-side log: detailed error with env var names
      console.error('[DB] USE_LIVE_DATA=true but DATABASE_URL is missing.');
      // Client-facing: generic error caught by Next.js error boundary
      throw new Error('Unable to connect to data service. Please try again later.');
    }
    console.log('[DB] Data source: live — Neon');
    return getLiveDb();
  }

  if (process.env.VERCEL_ENV === 'preview') {
    console.log('[DB] Preview environment — using mock data. Set USE_LIVE_DATA=true to override.');
  } else {
    console.log('[DB] Data source: mock');
  }
  return getMockDb();
}
```

Key design decisions:
- **Error messages tell the operator what's wrong (server-side log) but show generic text to the client.** No env var names leaked in production responses. (Security MMR v3)
- **Preview branches auto-force mock** unless `USE_LIVE_DATA` is explicitly `'true'`. Preview banner shows "Data is mock — not production accurate." (Product MMR)
- **`isLive()` is a single consolidated function** — not mixed logic. (Product MMR v4)

### `getMockDb()` — Extract Existing Mock Data

Before creating `lib/db.ts`, extract the existing mock data from `lib/data.ts` into a standalone function:

```ts
// lib/mock-data.ts
export function getMockDb(): DbQueries {
  return {
    getStates: () => Promise.resolve(states),
    getState: (code: string) => Promise.resolve(states.find(s => s.code === code)),
    getBills: () => Promise.resolve(bills),
    getBill: (id: string) => Promise.resolve(bills.find(b => b.id === id)),
    getBillsForState: (code: string) => Promise.resolve(bills.filter(b => b.stateCode === code)),
  };
}
```

`lib/data.ts` re-exports from `lib/db.ts` so no existing imports break.

### Sync Pipeline (ICHABOD Cron)

**Pre-requisite:** Create a `.env` file on ICHABOD with:
- `DATABASE_URL_ADMIN` — admin Neon connection
- `LEGISCAN_API_KEY` — already in Doppler
- `REVALIDATION_SECRET` — from Vercel env vars
- `PIPELINE_ALERT_EMAIL` — for `[SYNC-ALERT]` notifications (optional, stdout is default)

All secrets stored as environment variables, never in the repo. (Security MMR)

**Deployment model:** Runs as a systemd timer on ICHABOD (VM, static IP). Monitor health via `systemctl status homeschool-compass-sync.timer`. (Architecture-improvement MMR — was missing deployment context)

**Flow:**

1. `legiscan_client.py` fetches new/updated bills with exponential backoff + jitter (3-5 attempts)
2. **Idempotency:** Log each fetch as `legiscan_fetch_<bill_id>_<unix_ts>` in `sync_log`. `ON CONFLICT (fetch_key) DO NOTHING` — skip duplicates without error.
3. **Upsert-parent-first:** Ensure state row exists before bill inserts. Single transaction per state.
4. **Data validation per-row:**
   - Score 0-100, non-null required fields
   - Valid rows → upsert
   - Invalid rows → write to `dlq` (raw_payload, error_message, `first_seen_at`)
   - If >10% of rows in a batch fail → halt sync, emit `[SYNC-ALERT]: X% validation failure for batch <id>`
   - Good rows continue processing (DLQ does not block)
5. Upsert to Neon via `psycopg2`, not SQLite
6. **Revalidation (hardened):**
   a. Wait for DB transaction to commit
   b. POST to `https://<domain>/api/revalidate` with `Authorization: Bearer <secret>` header (NOT query param)
   c. Exponential backoff on failure (3 retries, jitter)
   d. If all retries fail → write to `pipeline_metadata` key `sync_revalidation_failure` with error + timestamp
   e. Alert operator via `[SYNC-ALERT]: Revalidation failed after N retries` (Architecture-improvement MMR)
7. Update `pipeline_metadata.last_synced_at`
8. Frequency: every 4h during session, daily otherwise. Prevents overlapping runs via lock file.

**DLQ lifecycle:** Items can be reviewed via a simple SQL query (`SELECT * FROM dlq ORDER BY first_seen_at DESC`). No automated reprocessing in MVP. `last_attempted_at` used if manual reprocess is attempted. (Architecture-improvement MMR — lifecycle tracking)

**Pipeline health alert:** A cron wrapper captures stdout. If `[SYNC-ALERT]` appears in the last run's output, the timer triggers an email to `PIPELINE_ALERT_EMAIL`. (Product MMR — alert channel defined)

### Data Freshness UI

Footer reads `last_synced_at` via a server component using the **admin connection** (restricted user cannot access `pipeline_metadata`).

```ts
// app/components/data-freshness.tsx — server component
async function getFreshness(): Promise<string> {
  const result = await poolAdmin.query("SELECT value FROM pipeline_metadata WHERE key = 'last_synced_at'");
  const lastSynced = result.rows[0]?.value;
  if (!lastSynced || lastSynced === '1970-01-01T00:00:00Z') {
    return 'Data sync pending — initial load has not completed';
  }
  const hoursAgo = (Date.now() - new Date(lastSynced).getTime()) / 3600000;
  if (hoursAgo < 1) return `Data updated: ${Math.round(hoursAgo * 60)} minutes ago`;
  if (hoursAgo < 24) return `Data updated: ${Math.round(hoursAgo)} hours ago`;
  return `<span class="text-amber-600">Data may be stale — last sync was ${Math.round(hoursAgo / 24)} days ago</span>`;
}
```

Key: 1970 epoch → "pending" (not "56 years ago"). >24h → amber warning. (Product MMR — pending message)

### Static Generation Guard

```ts
export async function generateStaticParams() {
  let dbStates: { code: string }[] = [];
  try {
    dbStates = await getLiveDb().getStateCodes();
  } catch {
    // DB not available — fall back to mock
  }
  const baseSet = [{ code: 'al' }, { code: 'ak' }, { code: 'az' }, /* ... all 50 states */];
  // Merge — never return empty, never duplicate
  const codes = new Set([...baseSet.map(s => s.code), ...dbStates.map(s => s.code.toLowerCase())]);
  return Array.from(codes).map(code => ({ code }));
}
```

Never returns empty array. Zero-page build cannot happen. (Edge Cases MMR)

### Full-Text Search

Create GIN index for bill content search:
```sql
-- Applied after initial migration, not blocking
CREATE INDEX IF NOT EXISTS idx_bills_fts ON bill_full_text USING GIN (to_tsvector('english', full_text));
```

Queries use the indexed column. `LIMIT 100` prevents timeout in serverless functions.

---

## Phase 3: Neon Auth

- Configure in Neon dashboard: Google as sole provider (MVP). Email/magic-link and Apple added later.
- `NEON_AUTH_BASE_URL` → Vercel deployment URL. `NEON_AUTH_COOKIE_SECRET` → from Neon dashboard.
- Middleware checks for missing env vars at startup (`env_validator.ts`).
- Unauthenticated users see the full site; auth gates watchlist/save features.
- `/api/me` endpoint returns session-scoped data via HttpOnly cookie.
- Authorization check: `subscriptions.status = 'active' AND (expires_at IS NULL OR expires_at > NOW())`.
- Create a `requireSubscription()` utility to avoid copy-paste auth checks across components. (Architecture MMR)

---

## Phase 4: Stripe Payments (Gated by `ENABLE_STRIPE`)

Built but not live until pricing tiers are decided. Gated by:
```ts
// config.ts
export const FEATURES = {
  ENABLE_STRIPE: process.env.ENABLE_STRIPE === 'true',
};
```

Webhook endpoint (`app/api/webhooks/stripe/route.ts`):
- Disable Next.js body parsing: `export const config = { api: { bodyParser: false } }`
- Signature verification: `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`
- **Timestamp tolerance:** verify webhook timestamp within 5 minutes (prevent replay)
- **Idempotency:** `INSERT INTO webhook_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING` — skip if already processed
- **Transactional:** wrap event check + subscription update in a single DB transaction
- **No IP validation** — Stripe explicitly advises against this. Signatures are sufficient. (Security MMR v3)
- Handle: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Retry via Stripe's built-in webhook retry mechanism

Stripe Checkout uses relative URLs from config.ts (`STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`) — prevents open redirects.

---

## Phase 5: Vercel Deployment

### Security Headers (`next.config.mjs`)

```js
headers: async () => [
  {
    source: '/(.*)',
    headers: [
      {
        key: 'Content-Security-Policy',
        // unsafe-inline retained for Next.js hydration + Stripe.js
        // Tested with Report-Only mode before enforcing
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; frame-src https://js.stripe.com; connect-src 'self' https://api.stripe.com; img-src 'self' data:;",
      },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
    ],
  },
],
```

CSP tested with `Content-Security-Policy-Report-Only` first. If no unexpected violations, switch to enforcement. Future improvement: replace `unsafe-inline` with nonce-based CSP when time permits (post-launch).

### Revalidation Endpoint (`app/api/revalidate/route.ts`)

```ts
import { revalidatePath } from 'next/cache';
import { timingSafeEqual } from 'crypto';

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false; // length mismatch = mismatch
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
  const secret = process.env.REVALIDATION_SECRET;
  if (!secret || !authHeader || !safeCompare(authHeader, secret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: track requests per IP in memory/cache
  // Allow only ICHABOD's static IP
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (ip !== 'ICHABOD_STATIC_IP') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  revalidatePath('/');
  return Response.json({ revalidated: true });
}
```

- Secret passed via `Authorization: Bearer` header, NOT query param (secret could appear in server logs) (Security MMR v3)
- `timingSafeEqual(Buffer.from(a), Buffer.from(b))` — prevents timing attacks. Length mismatch returns `false` without throwing. (Product MMR v4)
- Rate-limited to 5 req/hour (configurable via `REVALIDATE_RATE_LIMIT` env var). Pipeline fires every 4h. (Improvement MMR)
- IP allowlist as second defense layer (ICHABOD is a VM with static IP) (Architecture-improvement MMR)
- Logs every request for auditability.

### Environment Variables (Vercel Dashboard — all marked Sensitive)

```
DATABASE_URL              → postgresql://hc_frontend:***@neon/neondb  (restricted user)
DATABASE_URL_ADMIN        → postgresql://neondb_owner:***@neon/neondb (admin)
NEON_FRONTEND_PASSWORD    → openssl rand -base64 24
NEON_AUTH_BASE_URL        → https://homeschool-compass.vercel.app
NEON_AUTH_COOKIE_SECRET   → from Neon dashboard
STRIPE_SECRET_KEY         → from Stripe
STRIPE_WEBHOOK_SECRET     → from Stripe dashboard
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY → pk_...
NEXT_PUBLIC_DOMAIN        → homeschool-compass.vercel.app
USE_LIVE_DATA             → true (prod) / false (preview, dev)
ENABLE_STRIPE             → false (until pricing decided)
REVALIDATION_SECRET       → openssl rand -base64 32
REVALIDATE_RATE_LIMIT     → 5
PIPELINE_ALERT_EMAIL      → (optional)
```

**Pre-deployment CI scan:** checks that no server-only env var is prefixed with `NEXT_PUBLIC_`. Prevents accidental client-side exposure. (Security MMR v3)

### Smoke Test Script (`scripts/smoke-test.sh`)

```bash
#!/bin/bash
set -e

echo "=== Smoke Test Suite ==="

echo "1. Homepage loads"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
test "$STATUS" = "200" || (echo "FAIL: Homepage returned $STATUS"; exit 1)

echo "2. State page renders known state"
STATE_TEXT=$(curl -s "$BASE_URL/state/tx" | grep -c "Texas")
test "$STATE_TEXT" -gt 0 || (echo "FAIL: State page missing expected content"; exit 1)

echo "3. Scorecard has content"
CARD_COUNT=$(curl -s "$BASE_URL/scorecard" | grep -c "state-card")
test "$CARD_COUNT" -gt 0 || (echo "FAIL: No state cards visible"; exit 1)

echo "4. Bill page renders"
BILL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/bill/tx-hb-2674")
test "$BILL_STATUS" = "200" || (echo "FAIL: Bill page returned $BILL_STATUS"; exit 1)

echo "5. Security headers present"
CSP=$(curl -sI "$BASE_URL/" | grep -i "content-security-policy" | wc -l)
test "$CSP" -gt 0 || (echo "FAIL: Missing CSP header"; exit 1)

echo "6. Revalidation endpoint rejects without token"
REVAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/revalidate")
test "$REVAL_STATUS" = "401" || (echo "FAIL: Revalidation expected 401, got $REVAL_STATUS"; exit 1)

echo "=== All smoke tests passed ==="
```

(Product MMR — actionable assertions, not vibes)

---

## MMR Finding Log (All 5 Passes)

### 🔴 Incorporated (critical)

| Finding | Source | Where in Plan |
|---------|--------|--------------|
| One-row end-to-end test first (before pipeline) | v1 Product | S6 |
| Remove `ignoreBuildErrors` | v1 Arch, Edge Cases, Product | S2 |
| Pipeline monitoring + stale data banner | v1 Arch, v1 Edge Cases | Data Freshness UI |
| `USE_LIVE_DATA` flag concrete impl | v1 Product, v1 Arch | `getDb()` section |
| Pipeline must call revalidate after sync | v2 Product | Sync Pipeline step 6 |
| Pipeline idempotency keys | v2 Security | `sync_log` table |
| Restricted DB user (SELECT-only) | v2 Security | S5 |
| Revalidation via header not query param | v3 Security | Revalidation Endpoint |
| Revalidation after commit, not before | v4 Edge Cases | Sync Pipeline step 6a |
| Score 999 violates CHECK constraint (use 99) | v4 Edge Cases + Product | S6 |
| `IF NOT EXISTS` on all CREATE statements | v4 Product | S4 DDL |
| `webhook_events` table missing from DDL | v4 Product | S4 |
| `timingSafeEqual` buffer normalization | v4 Product | Revalidation Endpoint |
| Alert channel for sync failures | v2 Product, v4 Arch | `[SYNC-ALERT]` + PIPELINE_ALERT_EMAIL |
| Error messages don't leak env var names | v3 Security | `getDb()` section |
| Webhook timestamp tolerance (5min) | v3 Security | Phase 4 |
| Start-up env var validator | v2 Product + v4 Arch | `src/lib/env_validator.ts` |

### 🟡 Incorporated (improvement)

| Finding | Source | Where in Plan |
|---------|--------|--------------|
| Centralized brand config (config.ts) | v1 Architecture | S3 |
| Centralized brand for SEO metadata too | v3 Architecture | Phase 1 + S3 |
| Restructured execution order | v1 Product | Execution Order table |
| Pipeline data validation (score 0-100, non-null) | v1 Arch + v4 Edge Cases | Sync Pipeline step 4 |
| DLQ for failed rows | v4 Arch | `dlq` table |
| `first_seen_at` + `last_attempted_at` on DLQ | v4 Arch | `dlq` table |
| Upsert-parent-first in transactions | v1 Edge Cases | Sync Pipeline step 3 |
| Separate `bill_full_text` table | v4 Arch | S4 |
| CI gate for lint + typecheck | v4 Improvement | S2 |
| Pre-step: verify Neon project exists | v4 Improvement | S0 |
| Move env validator to own module | v4 Arch | `src/lib/env_validator.ts` |
| `npm run verify-live` script | v4 Improvement | S6 |
| `scripts/smoke-test.sh` | v4 Product | Smoke test script |
| ICHABOD deployment model documented | v4 Arch | Sync Pipeline: systemd timer |
| Revalidation retry alert | v4 Arch | Sync Pipeline step 6d-6e |
| Revalidation rate limit configurable | v4 Improvement | `REVALIDATE_RATE_LIMIT` env var |
| Feature flag for Stripe | v4 Improvement | `ENABLE_STRIPE` flag |
| Auth middleware (requireSubscription) | v1 Arch, v3 Security | Phase 3 |
| Preview branch auto-force mock + banner | v1 Product, v3 Security | `getDb()` + Phase 5 |
| 1970 timestamp → "sync pending" message | v2 Product | Data Freshness UI |
| CSP `connect-src` for Stripe API | v3 Security | Security Headers |

### 🟢 Acknowledged (post-launch / low priority)

| Finding | Source | Rationale |
|---------|--------|-----------|
| Remove `USE_LIVE_DATA` flag after stable | v2 Security | Post-launch. Seed script replaces mock. |
| Nonce-based CSP instead of `unsafe-inline` | v4 Arch, Product | Significant effort. Post-launch. |
| RLS on states/bills tables | v3 Security | Government data is public. Not needed. |
| Prometheus/Grafana monitoring | v3 Arch | Overkill for MVP. `last_synced_at` is sufficient. |
| RBAC formalization | v4 Arch | `free`/`paid` is enough granularity. |
| Async Stripe webhook processing | v4 Arch | Overkill for transaction volume. |
| Sync checkpoint table + advisory locks | v3 Edge Cases | Single cron, no concurrent runs. |
| Automate DLQ review/reprocess UI | v4 Arch, Improvement | Manual SQL review is fine for MVP. |
| Pipeline circuit breaker | v4 Improvement | Single cron, not a microservice. |

---

## Guardrails & Rollback

- **Mock data stays in repo** until Phase 2 is verified with live data. Zero downtime.
- **`USE_LIVE_DATA` flag** controls the switch. Preview branches auto-force mock. Production fails loudly if `true` but `DATABASE_URL` missing.
- **Neon Auth is graceful.** Returns null when unconfigured. App works fully without auth.
- **Pipeline failure → stale data only**, not a broken site. Footer shows freshness status.
- **Data validation with DLQ** — bad rows are captured, not lost. Pipeline continues with good data.
- **Stripe webhook is source of truth** for subscriptions. Idempotent via `event_id`. Timestamp-validated against replay.
- **Restricted DB user for frontend.** No write access to any table. `pipeline_metadata`, `sync_log`, `dlq`, `webhook_events` are not accessible.
- **Revalidation endpoint** has three layers of defense: `Authorization` header with `timingSafeEqual`, IP allowlist, 5 req/hour rate limit.
- **Secrets** are Vercel Sensitive env vars only. `.env.example` has placeholders. CI scan prevents committing real secrets.
- **All DDL is idempotent** (`IF NOT EXISTS`) — re-running migrations is safe.

---

## Onboarding Runbook (`README.md`)

```bash
# 1. Clone + install
git clone https://github.com/wowthisiseasytoremember-stack/homeschool-regulation-tracker.git
cd homeschool-regulation-tracker
pnpm install

# 2. Set up Neon DB
#    - Create a Neon project
#    - Run: drizzle-kit migrate
#    - Create restricted user: see S5 in plan

# 3. Create .env.local
cp .env.example .env.local  # fill in DATABASE_URL, NEON_AUTH_BASE_URL, etc.

# 4. Run locally
pnpm dev  # http://localhost:3000 — mock data
USE_LIVE_DATA=true pnpm dev  # connects to Neon

# 5. Verify live data
npm run verify-live  # insert test row, assert output, clean up

# 6. Run smoke tests
BASE_URL=http://localhost:3000 bash scripts/smoke-test.sh
```
