# Homeschool Compass — Phase 1: Sprint + PR Plan

**Date:** 2026-06-17
**Status:** ✅ EXECUTED — 2026-06-17. All 4 sprints, 11 PRs delivered. Commit: `5c9ee90` (15 files, 1542 insertions).
**Plan file:** `plan/2026-06-17_phase1-user-features-plan.md`
**Depends on:** Phase 0 complete (Neon provisioned, auth active, live data flowing)

---

## Model Tier Key

| Tier | Models | Use for |
|------|--------|---------|
| 🧠 **Frontier** | deepseek-v4-pro, claude-sonnet-4 | Security-critical, API integrations, architecture decisions, complex TypeScript |
| 💸 **Cheap** | deepseek-v4-flash, gemini-2.5-flash-lite | CRUD patterns, UI following existing conventions, boilerplate endpoints, tests |
| ⚙️ **Mechanical** | No model needed (scripts/CLI/manual) | drizzle-kit commands, Stripe Dashboard setup, env vars, verification |

---

## Sprint 1: Foundation *(~1.5h, unblocks everything)*

**Goal:** Tables exist. Pipeline can POST revalidation. Nav session verified.

### PR 1.1 — Push App Table Migrations
**Model tier:** 💸 Cheap
**Why:** `drizzle-kit generate` + `drizzle-kit migrate` is mechanical. Schema already defined in code — just needs the CLI run.

| File | Change |
|------|--------|
| `lib/db/schema.ts` | (read-only — already defined) |
| `drizzle/` (generated) | `drizzle-kit generate` output |
| `drizzle/meta/` | Generated migration SQL |

**Commands:**
```bash
cd frontend
npx drizzle-kit generate
npx drizzle-kit migrate
```

**Verify:** `psql "$DATABASE_URL_ADMIN" -c "\dt watchlist"` returns the table.

---

### PR 1.2 — Revalidation Endpoint + Pipeline Health
**Model tier:** 🧠 Frontier
**Why:** Timing-safe secret comparison. Rate limiting. Admin DB connection. These are security-sensitive — cheap models will miss edge cases.

| File | Change |
|------|--------|
| `app/api/revalidate/route.ts` | **CREATE** — POST handler with `timingSafeEqual`, rate limit 5/hr |
| `app/api/pipeline/health/route.ts` | **CREATE** — GET handler, admin connection, returns `last_synced_at` + DLQ count |

**PR 1.2 is self-contained:** Both routes are independent API endpoints. Nothing imports them. Deploy-safe even if rest of app is unchanged.

**Frontier-required details:**
- Revalidation uses `crypto.timingSafeEqual` (not `===`) for secret comparison
- Rate limiting stored in `pipeline_metadata` key `revalidation_rate` to survive cold starts
- Health endpoint uses admin DB connection (not the restricted `hc_frontend` user)
- Both return 401 on bad auth, never leak which part of the secret was wrong

---

### PR 1.3 — Nav Session Verification
**Model tier:** 💸 Cheap
**Why:** Components already built — just need to verify `useSession()` resolves correctly. If fix needed, it's a config tweak to `createAuthClient()`.

| File | Change |
|------|--------|
| `lib/auth-client.ts` | Possibly add `baseUrl` to `createAuthClient()` |
| `components/site/nav-auth.tsx` | Verify — likely no change needed |

**What to check:**
1. Sign in with Google → does `useSession()` return `{ user }`?
2. Sign out → does `useSession()` return `null`?
3. Does the cookie survive page refresh?

**If broken:** Add `createAuthClient({ baseURL: process.env.NEXT_PUBLIC_AUTH_URL })` — single-line fix.

---

## Sprint 2: Data Layer *(~2h, depends on Sprint 1)*

**Goal:** Server actions exist. Stripe products created. Alert preferences form live.

### PR 2.1 — Watchlist Server Actions
**Model tier:** 🧠 Frontier
**Why:** SQL injection surface. User scoping (`getUserId()`). JOIN logic between user-owned watchlist and public bills table. Error handling for duplicate inserts.

| File | Change |
|------|--------|
| `lib/actions/watchlist.ts` | **CREATE** — `addToWatchlist`, `removeFromWatchlist`, `getWatchlist`, `isWatched` |
| `components/site/bill-card.tsx` | Add watch/unwatch toggle button (calls server actions) |

**Frontier-required details:**
- Every action calls `getUserId()` first — no action works without auth
- `addToWatchlist` uses `ON CONFLICT DO NOTHING` for idempotency
- `getWatchlist` JOINs `watchlist` → `bills` → `states` for full bill display
- `isWatched` returns boolean for UI toggles — separate query, not loading full watchlist
- All actions are `"use server"` with proper error boundaries

---

### PR 2.2 — Alert Preferences + Settings Page
**Model tier:** 🧠 Frontier
**Why:** UPSERT logic. JSONB array handling. Form validation. Default values when no preferences exist.

| File | Change |
|------|--------|
| `lib/actions/alerts.ts` | **CREATE** — `getAlertPreferences`, `updateAlertPreferences` |
| `app/settings/page.tsx` | **CREATE** — settings form with state picker, impact type checkboxes, channel toggles |
| `components/site/site-nav.tsx` | Add Settings link for authenticated users |

**Frontier-required details:**
- `getAlertPreferences` returns sensible defaults when no row exists (not null)
- `updateAlertPreferences` uses `INSERT ... ON CONFLICT (userId) DO UPDATE`
- JSONB arrays use Drizzle's `.$type<string[]>()` — not raw casting
- Settings page is a Server Component that hydrates form from server action
- Form handles the case where user has never set preferences

---

### ⚙️ Manual — Create Stripe Products & Prices
**Model tier:** ⚙️ Mechanical
**Why:** Stripe Dashboard manual setup. No code. Just clicking.

**In dashboard.stripe.com:**
1. Create Product "Regulation Tracker" → Recurring price $29.00/year
2. Create Product "ESA Compliance" → Recurring price $99.00/year
3. Note both price IDs (e.g. `price_xxxxx`, `price_yyyyy`)
4. Enable Customer Portal in Settings → Customer Portal
5. Store price IDs as Vercel env vars: `STRIPE_PRICE_TRACKER`, `STRIPE_PRICE_ESA`

**No PR — manual operation. 10 minutes.**

---

## Sprint 3: User Surface *(~2.5h, depends on Sprint 2)*

**Goal:** Dashboard shows real data. Pricing buttons work. `/api/me` returns session.

### PR 3.1 — Dashboard + /api/me
**Model tier:** 💸 Cheap
**Why:** Dashboard is presentational — reads from server actions built in Sprint 2. `/api/me` is a simple aggregation endpoint. No new security surface.

| File | Change |
|------|--------|
| `app/dashboard/page.tsx` | Replace placeholder with real data: watchlist + alert prefs |
| `app/api/me/route.ts` | **CREATE** — GET returns `{ user, subscription, watchlistCount }` |

**Dashboard layout:**
```
┌─────────────────────────────────────────┐
│  Dashboard                 ⚙️ Settings  │
│                                         │
│  Your Watchlist (3 bills)               │
│  ┌─────────────────────────────────────┐│
│  │ TX HB 123 — Charter school caps    ││
│  │ Status: In committee  ●  High imp.  ││
│  │ [Remove]                            ││
│  ├─────────────────────────────────────┤│
│  │ CA AB 456 — ESA funding bill       ││
│  │ Status: Passed house  ●  Increase   ││
│  │ [Remove]                            ││
│  └─────────────────────────────────────┘│
│                                         │
│  Alert Preferences                      │
│  Monitoring: CA, TX, FL                 │
│  Alert on: increases, decreases         │
│  [Edit in Settings]                     │
└─────────────────────────────────────────┘
```

---

### PR 3.2 — Stripe Checkout Route
**Model tier:** 🧠 Frontier
**Why:** Stripe API integration. Error handling for missing products. `client_reference_id` for user mapping. Success/cancel URL construction from config.

| File | Change |
|------|--------|
| `lib/stripe.ts` | **CREATE** — Stripe SDK singleton (`new Stripe(secretKey)`) |
| `app/api/checkout/route.ts` | **CREATE** — POST: create Checkout Session, return `{ url }` |
| `components/site/pricing-section.tsx` | Wire button onClick → fetch POST /api/checkout → redirect |

**Frontier-required details:**
- `stripe.ts` lazily initializes the Stripe SDK (only when `STRIPE_SECRET_KEY` exists)
- Checkout route reads plan from body, validates it's "tracker" or "esa"
- `client_reference_id` = `userId` from `getUserId()` — webhook uses this to link customer
- `metadata.userId` = `userId` as backup (redundant safety)
- Success URL = `CONFIG.DOMAIN + '/dashboard?checkout=success'`
- Cancel URL = `CONFIG.DOMAIN + '/pricing?checkout=cancelled'`
- Pricing buttons use `"use client"` fetch → redirect pattern (not `<form action>`)

---

## Sprint 4: Payments + BFF *(~3h, depends on Sprint 3)*

**Goal:** Stripe webhooks process. Customer Portal works. BFF routes exist for Python pipeline.

### PR 4.1 — Stripe Webhook Handler
**Model tier:** 🧠 Frontier
**Why:** This is the most security-critical code in the app. Webhook signature verification. Raw body access (Next.js bodyParser disabled). Idempotency. Transactional event processing. Stripe retry semantics. Getting ANY of these wrong means lost payments or double-provisioning.

| File | Change |
|------|--------|
| `app/api/webhooks/stripe/route.ts` | **CREATE** — POST: verify sig, handle 6 event types |
| `lib/stripe.ts` | Already created in PR 3.2 |

**Frontier-required details:**
- `export const config = { api: { bodyParser: false } }` — MUST disable Next.js body parsing
- `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)` with 5-min timestamp tolerance
- Idempotency: `INSERT INTO webhook_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING`
- Transaction wrapping: check event_id + update subscription in a single DB transaction
- Handles 6 events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`
- Returns 200 quickly (Stripe retries on non-200)
- Does NOT validate IP — Stripe says signature verification is sufficient

---

### PR 4.2 — Customer Portal + Subscription Gate
**Model tier:** 💸 Cheap (PR content) + 🧠 Frontier (review)
**Why:** Portal route is a simple Stripe API call. Subscription gate is a utility function. But the gating logic affects what paid users can access — frontier review catches privilege-escalation bugs.

| File | Change |
|------|--------|
| `app/api/portal/route.ts` | **CREATE** — POST: create Billing Portal session, return `{ url }` |
| `lib/subscription.ts` | **CREATE** — `requireSubscription()`, `getSubscription()` |
| `app/settings/page.tsx` | Add "Manage Subscription" button (calls portal route) |

**Details:**
- Portal route looks up `stripeCustomerId` from `subscriptions` table via `getUserId()`
- `requireSubscription()` returns `{ plan, status }` or throws 401
- `getSubscription()` returns `null` for free users (no error)
- Gating: free users get scorecard, tracker users get alerts + watchlist, ESA users get everything
- Portal configured to show plan details, update payment method, cancel subscription

---

### PR 4.3 — BFF Routes for Python Pipeline
**Model tier:** 💸 Cheap
**Why:** Simple CRUD API layer. Follows Next.js route handler patterns. No new security surface — reuses existing auth + DB patterns.

| File | Change |
|------|--------|
| `app/api/bff/watchlist/route.ts` | **CREATE** — GET all watchlists (for alert delivery) |
| `app/api/bff/alerts/route.ts` | **CREATE** — GET users with alerts enabled, POST trigger delivery |
| `lib/bff-auth.ts` | **CREATE** — shared auth for BFF routes (shared secret, not session) |

**Details:**
- BFF routes authenticated via `Authorization: Bearer <BFF_SECRET>` (separate from revalidation secret)
- GET `/api/bff/alerts` → returns `[{ userId, email, states, impactTypes, channels }]` for pipeline to iterate
- POST `/api/bff/alerts` → pipeline confirms alert delivered for a user+bill pair
- GET `/api/bff/watchlist` → returns all watchlist entries (for pipeline to know which bills matter)
- Minimal — these are plumbing, not user-facing

---

## Complete PR Sequence

```
Sprint 1 (Foundation)
  PR 1.1 — 💸 Migrations
  PR 1.2 — 🧠 Revalidation + Health
  PR 1.3 — 💸 Nav Session

Sprint 2 (Data Layer)
  PR 2.1 — 🧠 Watchlist Actions
  PR 2.2 — 🧠 Alert Preferences + Settings
  ⚙️ Manual — Stripe Products

Sprint 3 (User Surface)
  PR 3.1 — 💸 Dashboard + /api/me
  PR 3.2 — 🧠 Stripe Checkout

Sprint 4 (Payments + BFF)
  PR 4.1 — 🧠 Stripe Webhook
  PR 4.2 — 💸 Customer Portal + Gate
  PR 4.3 — 💸 BFF Routes
```

---

## Model Tier Summary

| PR | Tier | Why |
|----|------|-----|
| 1.1 | 💸 Cheap | `drizzle-kit` commands — mechanical CLI usage |
| 1.2 | 🧠 Frontier | `timingSafeEqual`, rate limiting, admin DB connection — security |
| 1.3 | 💸 Cheap | Verify existing code, potential 1-line config fix |
| 2.1 | 🧠 Frontier | JOINs, user scoping, SQL injection surface, idempotency |
| 2.2 | 🧠 Frontier | UPSERT logic, JSONB arrays, form validation with defaults |
| 3.1 | 💸 Cheap | Presentational — reads from existing server actions |
| 3.2 | 🧠 Frontier | Stripe API integration, error handling, config composition |
| 4.1 | 🧠 Frontier | Webhook signature verification, bodyParser disable, idempotency, transactions — getting any wrong breaks payments |
| 4.2 | 💸 Cheap | Simple API calls + utility function |
| 4.3 | 💸 Cheap | CRUD layer following established patterns |

**Split:** 6 frontier PRs (security + integrations), 6 cheap PRs (mechanical + UI), 1 manual task.

---

## What a Cheap Model PR Looks Like (example PR 3.1)

Given a prompt like:
> "Build the Dashboard page for Homeschool Compass. Read `app/dashboard/page.tsx` for the current placeholder. Use `getWatchlist()` from `lib/actions/watchlist.ts` and `getAlertPreferences()` from `lib/actions/alerts.ts`. Follow the existing bill-card pattern. Add quick action links to scorecard and settings. Wire the `/api/me` route as a simple GET that returns `{ user, subscription, watchlistCount }`."

A cheap model can execute this because:
- Server actions already exist and are tested
- UI patterns are established (bill-card, state-card, button variants)
- No security decisions needed — auth is handled by the server actions
- `/api/me` is a simple aggregation with no new surface

## What a Frontier PR Looks Like (example PR 4.1)

Given a prompt like:
> "Build the Stripe webhook handler. Study `reference/stripe-integration.md`. Create `app/api/webhooks/stripe/route.ts` with signature verification, idempotency via `webhook_events` table, transaction wrapping, and handling for 6 event types. Disable Next.js body parsing. Return 200 quickly."

A frontier model is required because:
- `bodyParser: false` + raw body access is a Next.js edge case
- Signature verification with `constructEvent` + timestamp tolerance
- Idempotency with `ON CONFLICT DO NOTHING` + transaction wrapping
- 6 different event types with different DB operations
- Stripe retry semantics (must return 200, not 500)
- Getting ANY detail wrong means lost payments, double-provisioning, or replay attacks

---

## Blockers (same as before)

- **Stripe price IDs** — confirm $29/yr tracker, $99/yr ESA?
- **Watchlist UI** — toggle on bill cards, dedicated page, or both?
- **Alert preferences scope** — state picker + impact types + channels, or simpler MVP?
