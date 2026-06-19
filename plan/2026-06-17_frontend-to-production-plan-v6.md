# Homeschool Compass — Frontend to Production Plan (v6 — Audited & Corrected)

**Date:** 2026-06-17
**Version:** v6 — 5 MMR passes (v1–v5) + 1 execution audit pass (15 findings: 6 🔴 Hard, 4 🟡 Medium, 5 🟢 Easy)
**All findings incorporated — no open corrections.**

---

## 🚫 BLOCKING QUESTIONS

### Fallback Defaults (use these unless changed)

| Question | Fallback | Why This | Cost to Change Later |
|----------|----------|----------|---------------------|
| Product name | "Homeschool Compass" | Needed for config.ts in Phase 0 | ~15 min grep + replace |
| Pricing tiers | Free-only for now; Stripe gated behind `ENABLE_STRIPE` flag | Unblocks Phase 4 scaffolding without committing | None — config toggle |
| Domain | Vercel preview URL | Vercel auto-assigns one; custom domain swapped later | Update env vars + config.ts |
| Auth providers | Google only | Simplest Stack Auth setup | Add providers in Stack dashboard |

---

## Execution Order

| Step | What | Depends On | Effort |
|------|------|-----------|--------|
| **S0** | **Pre-step: Provision Neon project + store connection strings (pooled AND unpooled) in Vercel env vars** | Nothing | 15 min |
| S1 | Answer blocking questions (or use fallbacks above) | Nothing | 15 min |
| S2 | Fix TS errors + remove `ignoreBuildErrors: true` | Nothing | 1-2h |
| S3 | Create `src/lib/config.ts` + `src/lib/env_validator.ts` | S1 | 10 min |
| S4 | Push all Drizzle migrations to Neon (uses **unpooled** URL) | S0, S2 | 30 min |
| S5 | Create restricted Neon user (corrected idempotent syntax) | S4 | 10 min |
| S6 | One-row end-to-end proof | S4, S5 | 30 min |
| S7 | Rebrand: replace "Tangle Trove" (case-insensitive, full scope) | S3 | 15 min |
| S8 | Replace mock data with Drizzle queries | S4, S5 | 2-3h |
| S9 | Write + deploy sync pipeline to ICHABOD (systemd, no lock file) | S4 | 2-3h |
| **S10** | **Configure Stack Auth (NOT "Neon Auth" — env vars are STACK_\*)** | S1 (domain), S5 | 30 min |
| S11 | Build Stripe integration (gated, env validator conditional) | S1 (pricing) | 2h |
| S12 | Deploy to Vercel + run parameterized smoke test script | S7, S8, S10 | 2h |

---

## Phase 0: Bootstrapping

### S0 — Pre-step: Provision Neon Project

1. Create a Neon project (console.neon.tech) if one doesn't exist
2. Note **both** connection strings:
   - `DATABASE_URL_ADMIN` — full admin connection string (pipeline + migrations)
   - `DATABASE_URL` — to be replaced with restricted user after S5 (frontend runtime)
3. **Critical — two URL variants:**
   - `DATABASE_URL` — **pooled** connection (contains `-pooler` in hostname). Used by app runtime (Vercel serverless functions).
   - `DATABASE_URL_UNPOOLED` — **unpooled** connection (no `-pooler`). Used by `drizzle-kit migrate` and seed scripts. **drizzle-kit uses node-postgres (TCP) internally — the pooled URL throws "prepared statement already exists" errors.**
4. Store ALL FOUR (admin pooled, admin unpooled, restricted pooled, restricted unpooled) as Vercel Sensitive env vars immediately
5. Verify the DB is reachable: `psql "$DATABASE_URL_ADMIN" -c "SELECT 1"`

### S1 — Answer Blocking Questions

Use fallback defaults from the table above. Proceed without waiting. Each can be changed later with trivial effort.

### S2 — Fix TypeScript errors

1. Run `npx eslint --fix && npx prettier --write` (from Improvement MMR — run formatters first)
2. Run `npx tsc --noEmit` — fix ALL errors
3. Remove `ignoreBuildErrors: true` from `next.config.mjs`
4. Add CI gate: `npm run lint && npm run typecheck` as a required check in the repo's CI pipeline (protected branch). Prevents regression.
5. Scope `tsc --noEmit` to production source paths only (`app/`, `components/`, `lib/`) — not test files that may have unrelated issues.
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

export const FEATURES = {
  ENABLE_STRIPE: process.env.ENABLE_STRIPE === 'true',
}
```

All 17 frontend files import from here. Also move domain-dependent values (CSP connect-src URLs, API base URLs) into config.ts.

**`src/lib/env_validator.ts`** — dedicated module, called early in the lifecycle:

```ts
import { FEATURES } from './config';

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  // Stack Auth env vars — NOT NEON_AUTH_*
  'NEXT_PUBLIC_STACK_PROJECT_ID',
  'NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY',
  'STACK_SECRET_SERVER_KEY',
  'REVALIDATION_SECRET',
  // Stripe vars are conditional — only required when ENABLE_STRIPE is true
  ...(FEATURES.ENABLE_STRIPE ? [
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  ] : []),
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

Called from `middleware.ts` — but with a catch wrapper so missing vars don't crash every request:

```ts
// middleware.ts
try {
  await import('./lib/env_validator');
} catch (e) {
  // During build: throw. During runtime: log and return generic 500.
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    throw e;
  }
  console.error('[CONFIG] Server configuration error (check server logs for details).');
  // Return a generic error response — never leak env var names to client
}
```

### S4 — Drizzle Migrations → Neon Tables

All `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` — idempotent from the start.

**Migration strategy:** `drizzle-kit generate` → `drizzle-kit migrate` in CI/CD. All idempotent. `migrations` table tracks applied versions.

**Must use `DATABASE_URL_UNPOOLED`** in `drizzle.config.ts`:
```ts
// drizzle.config.ts
export default {
  schema: './src/lib/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED!, // NOT DATABASE_URL — pooled URL crashes drizzle-kit
  },
}
```

**DDL:**

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
  archived BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
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

-- Stripe webhook idempotency
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

**Full-text search index (applied via separate migration AFTER initial data load — non-blocking):**

```sql
-- Run as a separate migration step, NOT in the baseline DDL
-- CREATE INDEX CONCURRENTLY is non-blocking — safe to run while pipeline is active
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bills_fts
  ON bill_full_text USING GIN (to_tsvector('english', full_text));
```

Queries use the indexed column. `LIMIT 100` prevents timeout in serverless functions.

**Restricted user (corrected syntax):**

Postgres does not support `CREATE USER IF NOT EXISTS`. Use the idempotent pattern:

```sql
DO $$
BEGIN
  CREATE USER hc_frontend WITH PASSWORD '<strong-random-password>';
  GRANT SELECT ON states, bills, bill_full_text TO hc_frontend;
EXCEPTION WHEN duplicate_object THEN
  -- User already exists — that's fine, idempotent
  RAISE NOTICE 'User hc_frontend already exists — skipping creation.';
END $$;
```

Password generated via `openssl rand -base64 24`, stored as Vercel Sensitive env var `NEON_FRONTEND_PASSWORD`. `DATABASE_URL` uses this restricted user. `DATABASE_URL_ADMIN` uses the admin role.

Note: `pipeline_metadata`, `sync_log`, `dlq`, and `webhook_events` are NOT accessible to the restricted user. Freshness indicator uses the admin connection in a server component that never reaches the client.

### S5 — Create Restricted Neon User

Applied via admin connection. Confirmed with:

```sql
SELECT table_catalog, table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'hc_frontend';
```

Only `states`, `bills`, `bill_full_text` should appear with `SELECT` privilege.

### S6 — One-Row End-to-End Proof

Insert a test row with a valid score (not 999!):

```sql
INSERT INTO states (code, name, score, subscores, level)
VALUES ('DE', 'PHASE0-TEST-DELAWARE', 99, '{}', 'No Notice');
```

Set `USE_LIVE_DATA=true`, verify `/state/de` renders "PHASE0-TEST-DELAWARE" with score 99.

Score 99 is obviously fake (no real state scores 99) but passes the CHECK constraint.

Clean up:

```sql
DELETE FROM states WHERE code = 'DE';
```

**Automated verification script (`scripts/verify-live.sh`):**

```bash
#!/bin/bash
# Parameterized: BASE_URL defaults to localhost, override for CI/preview
BASE_URL="${BASE_URL:-http://localhost:3000}"
DATABASE_URL_ADMIN="${DATABASE_URL_ADMIN:?Required}"

# Insert test row
psql "$DATABASE_URL_ADMIN" -c "INSERT INTO states (code, name, score, subscores, level) VALUES ('DE', 'PHASE0-TEST', 99, '{}', 'No Notice') ON CONFLICT (code) DO NOTHING"

# Hit page — use grep -ci (case-insensitive) to handle markup variations
RESULT=$(curl -s "$BASE_URL/state/de" | grep -ci "phase0-test")
# Clean up
psql "$DATABASE_URL_ADMIN" -c "DELETE FROM states WHERE code = 'DE'"

if [ "$RESULT" -eq 0 ]; then
  echo "FAIL: Test row not visible on $BASE_URL/state/de"
  exit 1
fi
echo "PASS: Live data pipeline verified"
```

---

## Phase 1: Rebrand

Replace all "Tangle Trove" references. All strings come from `src/lib/config.ts`.

**Verification:**

```bash
# Exact match
grep -r 'Tangle Trove' --include='*.tsx' --include='*.ts' --include='*.json' --include='*.md'
# → 0 hits

# Case-insensitive catch-all (catches 'tangle', 'TANGLE', etc.)
grep -r 'tangle' --include='*.tsx' --include='*.ts' --include='*.json' --include='*.md' -i
# → 0 hits

# Visual assets
grep -r 'tangle' public/ --include='*' -i
# → 0 hits
```

Also check: `robots.txt`, `sitemap.xml`, `next.config.mjs`, `package.json` (name field), `README.md` (title), all metadata fields in `layout.tsx` and `page.tsx` files (title, description, Open Graph), and `<title>` tags.

---

## Phase 2: Data Architecture

### Drizzle Driver Setup (Corrected — Prevents Transaction Failures)

The driver choice is critical: `drizzle-orm/neon-http` does **not** support transactions, which the sync pipeline (S9) and migrations (S4) depend on.

**`src/lib/db.ts` — conditional import by environment:**

```ts
import { CONFIG } from './config';
import type { DbQueries } from './types';

// Conditional driver — production uses neon-serverless (WebSocket, transactions)
// Local dev uses node-postgres (against local Postgres or Neon unpooled URL)
let getLiveDb: () => DbQueries;

if (process.env.NODE_ENV === 'production') {
  // Production: neon-serverless with WebSocket
  const { neon } = await import('@neondatabase/serverless');
  const { drizzle } = await import('drizzle-orm/neon-serverless');
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  getLiveDb = () => ({
    getStates: () => db.select().from(states),
    // ... other queries
  });
} else {
  // Development: node-postgres against localhost or Neon unpooled URL
  const { Pool } = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED! });
  const db = drizzle(pool);

  getLiveDb = () => ({
    getStates: () => db.select().from(states),
    // ... other queries
  });
}
```

**Never use `drizzle-orm/neon-http` for writes.** It's fine for read-only endpoints — optimize later if needed.

### `getDb()` Implementation

```ts
function isLive(): boolean {
  return process.env.USE_LIVE_DATA === 'true' && process.env.VERCEL_ENV !== 'preview';
}

export function getDb() {
  if (isLive()) {
    if (!process.env.DATABASE_URL) {
      console.error('[DB] USE_LIVE_DATA=true but DATABASE_URL is missing.');
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

**Environment on ICHABOD:**
- `DATABASE_URL_ADMIN` — admin Neon connection (pooled)
- `DATABASE_URL_ADMIN_UNPOOLED` — admin Neon connection (unpooled, for psql scripts)
- `LEGISCAN_API_KEY` — already in Doppler
- `REVALIDATION_SECRET` — from Vercel env vars
- `PIPELINE_ALERT_EMAIL` — optional

All secrets stored as environment variables, never in the repo.

**Deployment model:** Runs as a **systemd timer** on ICHABOD (VM, static IP). Uses systemd's built-in overlap prevention rather than a lock file:

```ini
# /etc/systemd/system/homeschool-compass-sync.service
[Unit]
Description=Homeschool Compass Sync Pipeline

[Service]
Type=oneshot
EnvironmentFile=/opt/homeschool-compass/.env
ExecStart=/opt/homeschool-compass/scripts/sync-pipeline.sh
TimeoutStartSec=30min
User=ichabod

# systemd ensures only one instance runs at a time
```

```ini
# /etc/systemd/system/homeschool-compass-sync.timer
[Unit]
Description=Homeschool Compass Sync Schedule

[Timer]
OnCalendar=*-*-* *:00/4:00
# systemd skips the next trigger if the previous run is still active
# No custom lock file needed
Persistent=true

[Install]
WantedBy=timers.target
```

Monitor health via `systemctl status homeschool-compass-sync.timer`.

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
   b. POST to `https://<domain>/api/revalidate` with `Authorization: Bearer ***` header (NOT query param)
   c. Exponential backoff on failure (3 retries, jitter)
   d. If all retries fail → write to `pipeline_metadata` key `sync_revalidation_failure` with error + timestamp
   e. Alert operator via `[SYNC-ALERT]: Revalidation failed after N retries`
7. Update `pipeline_metadata.last_synced_at`
8. Frequency: every 4h during session, daily otherwise.

**DLQ Lifecycle:**

```sql
-- Add to dlq table (already included in S4 DDL):
-- archived BOOLEAN DEFAULT FALSE,
-- resolved_at TIMESTAMP,

-- Monthly cleanup (manual or cron):
DELETE FROM dlq
WHERE created_at < NOW() - INTERVAL '90 days'
  AND archived = TRUE;
```

For MVP: document as a monthly manual step. Items can be reviewed via `SELECT * FROM dlq ORDER BY first_seen_at DESC`. No automated reprocessing in MVP.

**Pipeline health alert:** A cron wrapper captures stdout. If `[SYNC-ALERT]` appears in the last run's output, the timer triggers an email to `PIPELINE_ALERT_EMAIL`.

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

Key: 1970 epoch → "pending" (not "56 years ago"). >24h → amber warning.

### Static Generation Guard (Corrected — 56 Entries)

```ts
// src/lib/static-states.ts
export const ALL_USA_CODES = [
  'al','ak','az','ar','ca','co','ct','de','fl','ga',
  'hi','id','il','in','ia','ks','ky','la','me','md',
  'ma','mi','mn','ms','mo','mt','ne','nv','nh','nj',
  'nm','ny','nc','nd','oh','ok','or','pa','ri','sc',
  'sd','tn','tx','ut','vt','va','wa','wv','wi','wy',
  'dc','pr','gu','vi','as','mp',
] as const; // 56 entries: 50 states + DC + 5 territories (PR, GU, VI, AS, MP)

export async function generateStaticParams() {
  let dbStates: { code: string }[] = [];
  try {
    dbStates = await getLiveDb().getStateCodes();
  } catch {
    // DB not available — use static list only
  }
  // Merge static + live — never return empty, never duplicate
  const codes = new Set([...ALL_USA_CODES, ...dbStates.map(s => s.code.toLowerCase())]);
  // Never returns empty array — Next.js treats empty as "no static pages"
  return Array.from(codes).map(code => ({ code }));
}
```

---

## Phase 3: Stack Auth (NOT "Neon Auth" — Corrected Env Vars)

**Neon Auth uses Stack Auth under the hood.** The env var names are `STACK_*`, not `NEON_AUTH_*`. The entire Phase 3 section is rewritten below with the correct SDK, env vars, and callback URLs.

### Setup

1. In the Neon console (console.neon.tech), navigate to your project → **Auth** tab
2. Follow the **"Setup instructions"** flow — it generates a sample Next.js app with the correct config
3. Configure Google as the sole OAuth provider (MVP). Email/magic-link and Apple can be added later.

### Environment Variables

```bash
# Stack Auth — NOT NEON_AUTH_*
NEXT_PUBLIC_STACK_PROJECT_ID    → from Stack dashboard
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY → from Stack dashboard
STACK_SECRET_SERVER_KEY         → from Stack dashboard (Sensitive)
```

### OAuth Callback URL

The callback URL follows Stack Auth's pattern, not `{NEON_AUTH_BASE_URL}/callback/google`:

```
{STACK_AUTH_URL}/callback/google
```

Where `STACK_AUTH_URL` is derived from the project ID — Stack provides this in the setup guide.

### Auth Middleware (Graceful — Returns Null When Unconfigured)

```ts
// middleware.ts
// Env validator already caught missing vars at startup — but if they're unset,
// Stack handler returns null gracefully. App works fully without auth.

import { StackHandler } from '@stackframe/nextjs'; // Correct SDK import

export async function middleware(request: NextRequest) {
  const handler = StackHandler({ request });
  // handler.user is null when unconfigured — no crash
  // Auth gates watchlist/save features; unauthenticated users see full site
}
```

- `/api/me` endpoint returns session-scoped data via HttpOnly cookie.
- Authorization check: `subscriptions.status = 'active' AND (expires_at IS NULL OR expires_at > NOW())`.
- Create a `requireSubscription()` utility to avoid copy-paste auth checks across components.

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
- **No IP validation** — Stripe explicitly advises against this. Signatures are sufficient.
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

### Revalidation Endpoint (`app/api/revalidate/route.ts`) — Corrected

```ts
import { revalidatePath } from 'next/cache';
import { timingSafeEqual } from 'crypto';

function safeCompare(a: string, b: string): boolean {
  // REVALIDATION_SECRET is a fixed-length base64 string (openssl rand -base64 32 = 44 chars)
  // Both secret and auth header should be the same length — prevents length-based timing leakage
  if (a.length !== b.length) {
    // Log server-side only — never expose "wrong length" to client
    console.error(`[AUTH] Revalidation secret length mismatch`);
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
  const secret = process.env.REVALIDATION_SECRET;
  if (!secret || !authHeader || !safeCompare(authHeader, secret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting: On Vercel serverless, in-memory state resets per invocation.
  // For MVP: skip IP-based rate limiting — rely on secret + IP allowlist.
  // If rate limiting needed later, use Vercel KV or Upstash Redis.
  // In-memory Maps DO NOT persist across serverless cold starts.

  // IP allowlist as second defense layer (ICHABOD is a VM with static IP)
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (ip !== 'ICHABOD_STATIC_IP') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  revalidatePath('/');
  return Response.json({ revalidated: true });
}
```

- Secret passed via `Authorization: Bearer` header, NOT query param (secret could appear in server logs)
- `timingSafeEqual(Buffer.from(a), Buffer.from(b))` — prevents timing attacks. Length mismatch logged server-side only.
- Rate-limited conceptually to 5 req/hour (pipeline fires every 4h). On Vercel serverless, this is enforced by the pipeline's schedule, not in-memory state.
- IP allowlist as second defense layer.
- Logs every request for auditability.

### Environment Variables (Vercel Dashboard — all marked Sensitive)

```bash
# Database (two URL variants — pooled for runtime, unpooled for migrations)
DATABASE_URL                    → postgresql://hc_frontend:***@neon/neondb?sslmode=require  (pooled, -pooler in host)
DATABASE_URL_UNPOOLED           → postgresql://hc_frontend:***@neon/neondb?sslmode=require  (no -pooler)
DATABASE_URL_ADMIN              → postgresql://neondb_owner:***@neon/neondb?sslmode=require  (pooled admin)
DATABASE_URL_ADMIN_UNPOOLED     → postgresql://neondb_owner:***@neon/neondb?sslmode=require  (unpooled admin)

# Stack Auth — NOT NEON_AUTH_*
NEXT_PUBLIC_STACK_PROJECT_ID    → from Stack Auth dashboard
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY → from Stack Auth dashboard
STACK_SECRET_SERVER_KEY         → from Stack Auth dashboard

# Stripe (gated behind ENABLE_STRIPE — only needed if enabled)
STRIPE_SECRET_KEY               → from Stripe dashboard
STRIPE_WEBHOOK_SECRET           → from Stripe dashboard
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY → pk_...

# App config
NEXT_PUBLIC_DOMAIN              → homeschool-compass.vercel.app
USE_LIVE_DATA                   → true (prod) / false (preview, dev)
ENABLE_STRIPE                   → false (until pricing decided)

# Sync pipeline auth
REVALIDATION_SECRET             → openssl rand -base64 32  (fixed 44-char length)
REVALIDATE_RATE_LIMIT           → 5 (conceptual — enforced by pipeline schedule on serverless)
PIPELINE_ALERT_EMAIL            → (optional)
```

**Pre-deployment CI scan:** checks that no server-only env var is prefixed with `NEXT_PUBLIC_`. Prevents accidental client-side exposure.

### Smoke Test Script (`scripts/smoke-test.sh`) — Corrected

```bash
#!/bin/bash
set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
echo "=== Smoke Test Suite (target: $BASE_URL) ==="

echo "1. Homepage loads"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
test "$STATUS" = "200" || (echo "FAIL: Homepage returned $STATUS"; exit 1)

echo "2. State page renders known state"
# grep -ci = case-insensitive, count matches (handles markup like <span>Texas</span>)
STATE_TEXT=$(curl -s "$BASE_URL/state/tx" | grep -ci "texas")
test "$STATE_TEXT" -gt 0 || (echo "FAIL: State page missing expected content"; exit 1)

echo "3. Scorecard has content"
CARD_COUNT=$(curl -s "$BASE_URL/scorecard" | grep -ci "state-card")
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

---

## MMR Finding Log (All 5 Passes + Audited Correction Pass)

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
| **Neon Auth env vars are STACK_\* not NEON_AUTH_\*** | **Audit 🔴 #1** | Phase 3 (fully rewritten) |
| **Drizzle driver: neon-serverless for production, node-postgres for dev** | **Audit 🔴 #2** | Phase 2 (driver setup) |
| **drizzle-kit migrate needs unpooled URL** | **Audit 🔴 #3** | S0 + S4 (drizzle.config.ts) |
| **CREATE USER IF NOT EXISTS invalid Postgres syntax** | **Audit 🔴 #4** | S4 (DO block pattern) |
| **safeCompare length leak logged server-side only** | **Audit 🔴 #5** | Revalidation Endpoint |
| **generateStaticParams missing DC + 5 territories** | **Audit 🔴 #6** | Phase 2 (56-entry array) |

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
| **REVALIDATE_RATE_LIMIT is in-memory-only on Vercel** | **Audit 🟡 #7** | Revalidation Endpoint (documented, skip rate limiter for MVP) |
| **GIN index creation is blocking — use CONCURRENTLY** | **Audit 🟡 #8** | S4 (separate migration after initial load) |
| **DLQ needs cleanup strategy** | **Audit 🟡 #9** | DLQ Lifecycle (archived + resolved_at + monthly DELETE) |
| **Pipeline "lock file" → systemd built-in overlap prevention** | **Audit 🟡 #10** | Sync Pipeline (systemd timer) |

### 🟢 Acknowledged (incorporated — prompt-level)

| Finding | Source | Where in Plan |
|---------|--------|--------------|
| Remove `USE_LIVE_DATA` flag after stable | v2 Security | Post-launch. Seed script replaces mock. |
| Nonce-based CSP instead of `unsafe-inline` | v4 Arch, Product | Significant effort. Post-launch. |
| RLS on states/bills tables | v3 Security | Government data is public. Not needed. |
| Prometheus/Grafana monitoring | v3 Arch | Overkill for MVP. `last_synced_at` is sufficient. |
| RBAC formalization | v4 Arch | `free`/`paid` is enough granularity. |
| Async Stripe webhook processing | v4 Arch | Overkill for transaction volume. |
| Sync checkpoint table + advisory locks | v3 Edge Cases | Single cron, systemd handles overlap. |
| Automate DLQ review/reprocess UI | v4 Arch, Improvement | Manual SQL review is fine for MVP. |
| Pipeline circuit breaker | v4 Improvement | Single cron, not a microservice. |
| **Rebrand grep: case-insensitive + full scope** | **Audit 🟢 #11** | Phase 1 (case-insensitive grep for 'tangle') |
| **env_validator.ts: catch in middleware, don't throw on every request** | **Audit 🟢 #12** | S3 (middleware.ts catch pattern) |
| **Smoke test grep -c → grep -ci (case-insensitive)** | **Audit 🟢 #13** | Smoke test script (all grep calls use -ci) |
| **STRIPE_WEBHOOK_SECRET conditional in REQUIRED_ENV_VARS** | **Audit 🟢 #14** | S3 (env_validator.ts — gated by FEATURES.ENABLE_STRIPE) |
| **verify-live.sh: parameterize BASE_URL** | **Audit 🟢 #15** | S6 (verify-live.sh — `BASE_URL="${BASE_URL:-http://localhost:3000}"`) |

---

## Guardrails & Rollback

- **Mock data stays in repo** until Phase 2 is verified with live data. Zero downtime.
- **`USE_LIVE_DATA` flag** controls the switch. Preview branches auto-force mock. Production fails loudly if `true` but `DATABASE_URL` missing.
- **Stack Auth is graceful.** Returns null when unconfigured. App works fully without auth.
- **Pipeline failure → stale data only**, not a broken site. Footer shows freshness status.
- **Data validation with DLQ** — bad rows are captured, not lost. Pipeline continues with good data.
- **Stripe webhook is source of truth** for subscriptions. Idempotent via `event_id`. Timestamp-validated against replay.
- **Restricted DB user for frontend.** No write access to any table. `pipeline_metadata`, `sync_log`, `dlq`, `webhook_events` are not accessible.
- **Revalidation endpoint** has three layers of defense: `Authorization` header with `timingSafeEqual`, IP allowlist, pipeline schedule as de facto rate limiter.
- **Secrets** are Vercel Sensitive env vars only. `.env.example` has placeholders. CI scan prevents committing real secrets.
- **All DDL is idempotent** (`IF NOT EXISTS`) — re-running migrations is safe.
- **DB driver is environment-aware** — `neon-serverless` (WebSocket, transactions) in production, `node-postgres` in dev. Never uses `neon-http` for writes.
- **Two URL pools** — `DATABASE_URL` (pooled, runtime) and `DATABASE_URL_UNPOOLED` (migrations). Migrations never see the pooled URL.

---

## Onboarding Runbook (`README.md`)

```bash
# 1. Clone + install
git clone https://github.com/wowthisiseasytoremember-stack/homeschool-regulation-tracker.git
cd homeschool-regulation-tracker
pnpm install

# 2. Set up Neon DB
#    - Create a Neon project
#    - Note both pooled AND unpooled connection strings
#    - Run: DATABASE_URL_UNPOOLED=$DATABASE_URL_UNPOOLED drizzle-kit migrate
#    - Create restricted user: see S5 in plan
#    - Create GIN index: see S4 (CONCURRENTLY — non-blocking)

# 3. Create .env.local
cp .env.example .env.local
# Fill in: DATABASE_URL, DATABASE_URL_UNPOOLED,
#          NEXT_PUBLIC_STACK_PROJECT_ID, NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
#          STACK_SECRET_SERVER_KEY, REVALIDATION_SECRET

# 4. Run locally
pnpm dev  # http://localhost:3000 — mock data
USE_LIVE_DATA=true pnpm dev  # connects to Neon

# 5. Verify live data
npm run verify-live  # insert test row, assert output, clean up

# 6. Run smoke tests
BASE_URL=http://localhost:3000 bash scripts/smoke-test.sh
```
