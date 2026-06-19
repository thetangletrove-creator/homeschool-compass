# Homeschool Compass — Phase 1: User Features Plan

**Date:** 2026-06-17
**Status:** ✅ COMPLETE — Executed 2026-06-17. All four workstreams delivered. See `5c9ee90`.
**Depends on:** Phase 0 complete (Neon provisioned, auth active, live data flowing)

---

## What's Already Done

| Capability | Status |
|-----------|--------|
| Sign-in/sign-up **pages** (`app/sign-in/page.tsx`, `app/sign-up/page.tsx`) | ✅ Built |
| Auth form component (`components/auth/auth-form.tsx`) — email, social, magic link | ✅ Built |
| Nav auth component (`components/site/nav-auth.tsx`) — wired to `useSession()` | ✅ Built |
| Neon Auth server lib (`lib/auth.ts`) — `getSession()`, `getUserId()`, `isAuthConfigured()` | ✅ Built |
| Auth client lib (`lib/auth-client.ts`) — `useSession`, `signIn`, `signUp`, `signOut` | ✅ Built |
| Catch-all auth API route (`app/api/auth/[...all]/route.ts`) — proxies to managed Neon Auth | ✅ Built |
| App table **schema** — `watchlist`, `alert_preferences`, `subscriptions` in `schema.ts` | ✅ Defined (Drizzle) |
| Pricing page (`app/pricing/page.tsx`) + `pricing-section.tsx` | ✅ UI built |
| Stripe keys in Doppler (`STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_BACKUP_CODE`) | ✅ Stored |
| Stripe integration reference doc (`reference/stripe-integration.md`) | ✅ Filed |
| `webhook_events` table in schema — idempotency for Stripe | ✅ Defined |
| Python sync pipeline (LegiScan → Neon, systemd timer) | ✅ Running |
| `last_synced_at` in pipeline_metadata | ✅ Populated |

## What's Missing (the gaps)

| Gap | What Jack asked |
|-----|----------------|
| **A1.** Nav doesn't reflect real session state (sign-in/sign-up links show when logged in? need to verify) | "wire nav to real session" |
| **A2.** Dashboard page is empty (placeholder) — no user-specific data | "wire nav to real session" |
| **B1.** No server actions for watchlist CRUD | "server actions for watchlists" |
| **B2.** No server actions for alert preferences | "server actions for alert preferences" |
| **B3.** Tables exist in schema but migrations may not be pushed | "Add app tables" |
| **C1.** No `/api/checkout` route — nothing creates a Stripe Checkout Session | "Stripe checkout" |
| **C2.** No Customer Portal link — no self-service for upgrades/cancels | "customer portal" |
| **C3.** No webhook handler — `customer.subscription.*` events not processed | "webhook" |
| **C4.** Pricing buttons don't call anything (dead clicks) | "two paid plans" |
| **D1.** No BFF API routes for the Python pipeline to call | "API client layer" |
| **D2.** No revalidation endpoint wired (pipeline currently has no POST target) | "BFF route handlers" |
| **D3.** No `/api/me` endpoint for session-scoped user data | implied by "real session" |

---

## Execution Order (dependency-respecting)

### Stream B: App Tables + Server Actions (FOUNDATION — blocks A2, C, D)

**Why first:** Watchlist and alert preferences are the data layer everything else reads. Without them, dashboard is empty, checkout has nothing to gate, and BFF routes have no user context.

#### B1 — Push watchlist + alert_preferences migrations to Neon
- **Files:** `lib/db/schema.ts` → `drizzle-kit generate` → `drizzle-kit migrate`
- **Depends on:** Nothing (schema already defined)
- **Verify:** `psql "$DATABASE_URL_ADMIN" -c "\dt watchlist"` returns the table
- **Effort:** 10 min

#### B2 — Create server actions for watchlist
- **Files to create:** `lib/actions/watchlist.ts`
  ```
  addToWatchlist(billId)  — insert row, scope to getUserId()
  removeFromWatchlist(billId) — delete row, scope to getUserId()
  getWatchlist() — SELECT bills.* JOIN watchlist WHERE userId
  isWatched(billId) — boolean check for UI toggles
  ```
- **Files to touch:** `components/site/bill-card.tsx` — add watch/unwatch button
- **Depends on:** B1
- **Effort:** 45 min

#### B3 — Create server actions for alert preferences
- **Files to create:** `lib/actions/alerts.ts`
  ```
  getAlertPreferences() — SELECT for current user, return defaults if none
  updateAlertPreferences({ states, impactTypes, channels, ... }) — UPSERT
  ```
- **Files to create:** `app/settings/page.tsx` — alert preferences form
- **Files to touch:** `components/site/site-nav.tsx` — add Settings link for logged-in users
- **Depends on:** B1
- **Effort:** 1h

---

### Stream A: Nav + Session Wire (depends on B)

#### A1 — Verify and fix nav-auth session wiring
- **Current state:** `NavAuth` already uses `useSession()` from `auth-client.ts`. Shows avatar + Dashboard + Sign Out when logged in, Sign In + Start Tracking when not.
- **Verify:** Does `useSession()` correctly reflect the session cookie set by Neon Auth?
- **Potential gap:** The `useSession()` hook from `@neondatabase/auth/next` may need the `authClient` configured with the base URL. Check if `createAuthClient()` requires options.
- **Effort:** 15 min (verify) + 15 min (fix if needed)

#### A2 — Build the Dashboard page with watchlist data
- **Files to touch:** `app/dashboard/page.tsx` (currently a placeholder — needs real data)
- **What it shows:**
  - Server Component that calls `getWatchlist()` + `getAlertPreferences()`
  - Pending: list of watched bills with status indicators
  - Quick actions: add states to alert, view scorecard
- **Depends on:** B2, B3
- **Effort:** 1h

#### A3 — Add `/api/me` endpoint
- **Files to create:** `app/api/me/route.ts`
  ```
  GET → return { user, subscription, watchlistCount, alertPrefs }
  ```
  This is the BFF endpoint the dashboard and nav call. Returns session-scoped data in one request so the client doesn't waterfall.
- **Depends on:** B2, B3
- **Effort:** 20 min

---

### Stream C: Stripe Integration (depends on B — needs subscriptions table)

#### C1 — Create Stripe products and prices in Stripe Dashboard
- **Manually in dashboard.stripe.com:**
  - **Product 1:** "Regulation Tracker" — $29/year (price ID `price_xxxxx`)
  - **Product 2:** "ESA Compliance" — $99/year (price ID `price_yyyyy`)
- **Store price IDs** as env vars: `STRIPE_PRICE_TRACKER`, `STRIPE_PRICE_ESA`
- **Also enable Customer Portal** in Stripe Dashboard settings
- **Effort:** 10 min (manual Stripe dashboard)

#### C2 — Build Checkout Session API route
- **Files to create:** `app/api/checkout/route.ts`
  ```
  POST → create Stripe Checkout Session for requested plan
  - Reads plan from request body ("tracker" | "esa")
  - Maps to the correct price ID
  - Sets success_url to /dashboard?checkout=success
  - Sets cancel_url to /pricing?checkout=cancelled
  - Passes userId as client_reference_id
  - Returns { url } → client redirects
  ```
- **Files to touch:** `components/site/pricing-section.tsx` — wire button onClick to POST /api/checkout
- **Depends on:** C1, B1 (subscriptions table must exist)
- **Effort:** 1h

#### C3 — Build Stripe Webhook handler
- **Files to create:** `app/api/webhooks/stripe/route.ts`
  ```
  POST → verify signature, handle events:
  - checkout.session.completed → create subscription row, status=active
  - customer.subscription.updated → update status/plan/period
  - customer.subscription.deleted → status=canceled
  - invoice.paid → status=active (renewal)
  - invoice.payment_failed → status=past_due
  ```
  Idempotency via `webhook_events` table. Disable Next.js body parsing.
- **File to create:** `lib/stripe.ts` — Stripe SDK singleton
- **Depends on:** C1, B1
- **Effort:** 1.5h

#### C4 — Build Customer Portal route
- **Files to create:** `app/api/portal/route.ts`
  ```
  POST → create Stripe Billing Portal session for the customer
  - Look up stripeCustomerId from subscriptions table
  - Return { url } → client redirects
  ```
- **Files to touch:** `app/settings/page.tsx` — "Manage Subscription" button
- **Depends on:** C3 (need customer ID from webhook)
- **Effort:** 30 min

#### C5 — Add requireSubscription() utility
- **Files to create:** `lib/subscription.ts`
  ```
  requireSubscription() → getUserId() → check subscriptions table
  - Returns { plan, status } or throws 401
  - Gating: "tracker" plan gets basic features, "esa" gets everything
  ```
- **Files to touch:** Any server component that gates content by subscription
- **Depends on:** C3
- **Effort:** 20 min

---

### Stream D: BFF API Layer (depends on B — needs user context for auth)

#### D1 — Create revalidation endpoint
- **Files to create:** `app/api/revalidate/route.ts`
  ```
  POST → verify Authorization: Bearer <REVALIDATION_SECRET>
  → revalidatePath('/'), revalidatePath('/state/[code]'), revalidatePath('/bill/[id]')
  → rate limit: 5 req/hour (tracked in memory or pipeline_metadata)
  ```
- **Depends on:** Nothing (pipeline already sends POST)
- **Effort:** 20 min

#### D2 — Create pipeline-health endpoint
- **Files to create:** `app/api/pipeline/health/route.ts`
  ```
  GET → return last_synced_at from pipeline_metadata (admin connection)
  → return sync_log recent entries, DLQ count
  Authorized: same REVALIDATION_SECRET
  ```
- **Depends on:** Nothing
- **Effort:** 15 min

#### D3 — Create user-data BFF endpoints (for future Python pipeline consumption)
- **Files to create:** `app/api/bff/watchlist/route.ts`, `app/api/bff/alerts/route.ts`
  ```
  GET /api/bff/alerts → list users with alert preferences
  POST /api/bff/alerts → trigger alert delivery for a batch
  ```
  These are for the Python pipeline to consume when it wants to send alerts.
- **Depends on:** B2, B3
- **Effort:** 45 min

---

## Dependency Graph

```
B1 (migrations) ──────────────────────────────────────────────────┐
  ├── B2 (watchlist actions) ──┬── A2 (dashboard) ──┐              │
  │                            │── A3 (/api/me)      │              │
  │                            │── D3 (bff routes)   │              │
  ├── B3 (alert actions) ──────┤                     │              │
  │                            └─────────────────────┘              │
  └── C1 (Stripe dashboard) ──┬── C2 (checkout) ──── C5 (subscription gate)
                              ├── C3 (webhook) ───── C4 (portal)
                              └── C3 → C4 (needs customerId from webhook)

A1 (nav verify) — independent, quick
D1 (revalidate) — independent, quick
D2 (pipeline health) — independent, quick
```

## Parallel Execution

| Phase | What | Can run together |
|-------|------|-----------------|
| 1 | B1 (migrations), A1 (nav verify), D1 (revalidate), D2 (health) | All 4 independent |
| 2 | B2 (watchlist actions), B3 (alert actions), C1 (Stripe dashboard) | 3 in parallel |
| 3 | A2 (dashboard), A3 (/api/me), C2 (checkout), C3 (webhook) | 4 in parallel |
| 4 | C4 (portal), C5 (subscription gate), D3 (bff routes) | 3 in parallel |

## Total Effort Estimate

| Stream | Items | Est. |
|--------|-------|------|
| B — App Tables + Server Actions | B1–B3 | 2h |
| A — Nav + Session Wire | A1–A3 | 1.5h |
| C — Stripe Integration | C1–C5 | 3.5h |
| D — BFF API Layer | D1–D3 | 1.5h |
| **Total** | | **~8.5h** |

## Blockers / Decisions Needed from Jack

Before executing:
- **Stripe price IDs** — I can create products in your Stripe dashboard, but need confirmation on: $29/yr tracker, $99/yr ESA? (These are the fallback defaults from the v5 plan.)
- **Watchlist UI design choice** — do you want a heart/star toggle on bill cards, or a separate "My Watchlist" page, or both?
- **Alert preferences form** — what scope? State-level picker + impact type checkboxes, or something simpler for MVP?
- **File this plan** — should this live as `plan/2026-06-17_phase1-user-features-plan.md`?

---

## Verification Checklist

After each stream, verify:

**Stream B:**
- [ ] `psql` confirms `watchlist`, `alert_preferences`, `subscriptions` tables exist
- [ ] `addToWatchlist('tx-hb-123')` inserts and returns row
- [ ] `getWatchlist()` returns the row scoped to user
- [ ] `updateAlertPreferences()` upserts correctly

**Stream A:**
- [ ] Sign in with Google → nav shows avatar + Dashboard
- [ ] Sign out → nav shows Sign In + Start Tracking
- [ ] `/dashboard` shows user's watchlist
- [ ] `/api/me` returns `{ user, subscription, watchlistCount }`

**Stream C:**
- [ ] Click "Start Tracking — $29/year" → redirects to Stripe Checkout
- [ ] Complete test payment (card 4242…) → webhook fires → subscription row created
- [ ] Customer Portal link works → shows current plan
- [ ] `requireSubscription()` gates a server component correctly

**Stream D:**
- [ ] Pipeline POSTs to `/api/revalidate` → returns 200
- [ ] No-secret POST → returns 401
- [ ] `/api/pipeline/health` returns last_synced_at
- [ ] BFF routes return data for authenticated requests
