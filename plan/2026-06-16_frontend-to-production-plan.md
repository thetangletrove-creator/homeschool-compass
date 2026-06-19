# Homeschool Compass — Frontend to Production Plan

**Date:** 2026-06-16
**Context:** v0-generated Next.js app needs rebranded, wired to real data, deployed on Vercel.

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

**Known gaps:**
- No data pipeline feeding the DB the frontend reads from
- Frontend has 519 lines of hardcoded mock data
- 17 files reference the wrong product name
- Auth requires Neon dashboard config (social providers, cookie secret)
- Stripe webhook endpoint not built

---

## Phase 1: Rebrand

Replace "Tangle Trove" across all 17 frontend files.

**Files affected:**
- `app/layout.tsx` — metadata title + description
- `app/about/page.tsx`, `app/dashboard/page.tsx`, `app/esa/page.tsx`, `app/scorecard/page.tsx`, `app/pricing/page.tsx`, `app/sign-in/page.tsx`, `app/sign-up/page.tsx`, `app/state/[code]/page.tsx` — metadata titles
- `components/site/logo.tsx` — "Tangle Trove" text + subtitle "Regulation Tracker"
- `components/site/site-footer.tsx` — 2 references + copyright year
- `components/site/site-nav.tsx` — aria-label
- `components/site/pricing-section.tsx` — disclaimer text
- `lib/data.ts` — mock data comment header

**Effort:** Trivial — batch find-and-replace, 1 commit.

**Needs Jack:** What's the actual product name? "Homeschool Compass"? Something else?

---

## Phase 2: Data Architecture

The core work. The frontend reads from `lib/data.ts` (mock). It needs to read from Neon via Drizzle.

### Option A: Neon sync tables (recommended)

Python pipeline on ICHABOD syncs LegiScan → Neon PostgreSQL tables. Frontend reads Neon via Drizzle ORM.

**New Neon tables needed:**

```sql
-- States data (replaces mock `states` array in lib/data.ts)
CREATE TABLE states (
  code TEXT PRIMARY KEY,              -- "CA", "TX"
  name TEXT NOT NULL,                 -- "California"
  score INTEGER NOT NULL,             -- 0-100 freedom score
  subscores JSONB,                    -- {reporting: 80, testing: 90, curriculum: 85, teacher: 75}
  level TEXT NOT NULL,                -- "No Notice" | "Low Regulation" | "Moderate" | "High"
  esa_active BOOLEAN DEFAULT FALSE,
  esa_name TEXT,                      -- "Empowerment Scholarship Account"
  esa_max_award TEXT,                 -- "$7,500"
  esa_eligibility TEXT,
  esa_documentation JSONB,
  esa_deadline TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bills data (replaces mock `bills` array in lib/data.ts)
CREATE TABLE bills (
  id TEXT PRIMARY KEY,                -- "tx-hb-2674"
  state_code TEXT NOT NULL REFERENCES states(code),
  number TEXT NOT NULL,               -- "HB 2674"
  title TEXT NOT NULL,
  date DATE NOT NULL,
  status_step INTEGER NOT NULL,       -- 0-5 index into BILL_STEPS
  impact TEXT NOT NULL,               -- "increase" | "decrease" | "neutral"
  impact_summary TEXT,
  delta TEXT,
  action_required TEXT,
  esa_related BOOLEAN DEFAULT FALSE,
  full_text TEXT,
  analysis JSONB,                     -- string[]
  legiscan_bill_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Sync pipeline (cron on ICHABOD):**
1. `legiscan_client.py` fetches new/updated bills
2. Python script upserts into Neon PostgreSQL (not SQLite)
3. Run scorecard generation against Neon data
4. Frequency: every 4 hours during session, daily otherwise

**Frontend changes:**
- `lib/data.ts` → replaced with Drizzle queries
- Server components call `db.select().from(states)` etc.
- `generateStaticParams()` reads from DB at build time
- `revalidate` ISR for bill updates (every 4h matches cron)

**State sync details:**
- 34 states seeded in the pipeline's SQLite — needs expanding to all 50
- The pipeline has scorecard generation that produces the freedom score + subscores
- ESA data already exists for ~20 states in the pipeline seed

### Option B: Vercel Cron + API routes

Skip the ICHABOD cron entirely. Add Next.js API routes that proxy to LegiScan directly, plus Vercel Cron Jobs to sync.

**Pros:** Everything in one place (Vercel), no ICHABOD dependency.
**Cons:** 30K LegiScan API calls/month means careful quota management. Python pipeline (4700 lines) would need porting to TypeScript or running as serverless function. Gemini processing requires Vertex AI credentials.

**My recommendation:** Option A (Neon sync) — the Python pipeline already exists, Gemini+LegiScan logic is built, no rewrite needed.

---

## Phase 3: Neon Auth

Auth is already wired in the frontend code (Neon Auth via `@neondatabase/auth`). What needs to happen:

1. **Neon dashboard config:**
   - Enable Neon Auth on the project
   - Set up social providers (Google recommended for MVP, Apple optional)
   - Configure email/magic-link provider
   - Set the base URL to `https://homeschool-compass.vercel.app` (or whatever the domain ends up being)

2. **Vercel env vars:**
   - `NEON_AUTH_BASE_URL` — the Vercel deployment URL
   - `NEON_AUTH_COOKIE_SECRET` — generated in Neon dashboard (must be 32+ chars)

3. **Push Drizzle schema** to Neon — creates `watchlist`, `alert_preferences`, `subscriptions` tables in the `public` schema. Neon Auth manages `neon_auth` schema separately.

4. **Frontend behavior:** Auth is already graceful — unauthenticated users see the full site, just can't save watchlists or premium features. Auth activates automatically when env vars are set.

---

## Phase 4: Stripe Payments

Schema already has `subscriptions` table. Frontend has pricing section. Needs:

1. **Stripe product + price creation** in Stripe dashboard
2. **Webhook endpoint** — `app/api/webhooks/stripe/route.ts` that:
   - Handles `checkout.session.completed` → creates subscription record
   - Handles `invoice.paid` / `invoice.payment_failed`
   - Handles `customer.subscription.updated` / `deleted`
   - Syncs to the `subscriptions` table
3. **Checkout session creation** — server action that creates a Stripe Checkout Session, redirects to Stripe
4. **Portal link** — for managing existing subscriptions

**Pricing needs Jack's decision:** What are the actual tiers? Free (state map only?) vs paid ($29/yr? $99 one-time?).

---

## Phase 5: Vercel Deployment

1. **Push repo** to the GitHub repo (already cloned, remote set)
2. **Connect GitHub repo** to Vercel
3. **Set environment variables** in Vercel dashboard:
   - `DATABASE_URL` → Neon pooled connection string
   - `NEON_AUTH_BASE_URL` → Vercel deployment URL
   - `NEON_AUTH_COOKIE_SECRET` → from Neon dashboard
   - `STRIPE_SECRET_KEY` → from Stripe dashboard
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → Stripe publishable key
4. **Build check:** `typescript: { ignoreBuildErrors: true }` is already set — build should pass
5. **Verify:** Static pages render (home, about, pricing, scorecard). State pages load data from Neon. Auth redirects to Neon's managed login.

---

## Execution Order

| Step | What | Depends On | Effort |
|------|------|-----------|--------|
| 1 | Jack confirms product name | Nothing | 1 decision |
| 2 | Rebrand (rename "Tangle Trove") | Step 1 | 15 min |
| 3 | Create Neon tables (states + bills) | Nothing | 30 min |
| 4 | Write Neon sync script for pipeline | Step 3 | 2-3h |
| 5 | Expand seed data to 50 states | Step 4 | 1-2h |
| 6 | Replace mock data with Drizzle queries | Step 3 | 2-3h |
| 7 | Configure Neon Auth in dashboard | Nothing (but needs Neon console) | 30 min |
| 8 | Set Vercel env vars | Steps 3, 7 | 15 min |
| 9 | Build Stripe webhook + checkout | Strip keys exist | 2h |
| 10 | Push repo, deploy to Vercel | Steps 2, 6, 8 | 30 min |
| 11 | Verify everything end-to-end | Step 10 | 1h |

---

## Guardrails & Rollback

- **Mock data is untouched during DB build.** `lib/data.ts` stays in the repo until Drizzle queries are verified — no downtime if the sync cron fails.
- **Switch via config flag:** `USE_LIVE_DATA` env var — when false, falls back to mock. Ship both, flip when verified.
- **Neon Auth is graceful by design.** Returns null when unconfigured. The app works fully without auth — just no watchlists.
- **Pipeline runs separately from frontend.** A sync failure on ICHABOD doesn't take down Vercel — it just means stale data until the next successful sync.
- **Pricing needs Jack's input before Stripe build.** Don't build Stripe until tiers are decided.

---

## Open Questions for Jack

1. **Product name?** "Homeschool Compass" or something else?
2. **Pricing tiers?** Free (state map only?), Paid ($29/yr?), One-time option?
3. **Domain?** homeschoolcompass.com? homeschoolregulationtracker.com?
4. **Neon Auth providers?** Email + magic link for MVP? Google login too?
