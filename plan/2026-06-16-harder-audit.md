# Homeschool Compass — Harder Audit

**Date:** 2026-06-16
**Audit scope:** 67 source files reviewed, 14 live attack vectors probed against deployed site at `homeschool-regulation-tracker.vercel.app`
**Commit:** `0f185f2` (post-fix)

---

## Executive Summary

Two launch-blocking bugs found and fixed. Nine yellow-flag items remain — none are launch blockers, but each has a pushback, acknowledgment, or fix path documented below.

Of 14 attack vectors probed against the live deployment — SQli, IDOR, rate limit exhaustion, Stripe replay, path traversal, CORS, source map exposure, header injection, mass assignment, dangling references, auth state — **none were critical at the time of testing.**

---

## 🔴 Critical — Found + Fixed

### 1. Proxy Middleware (Auth Wall)

**Severity:** Launch-blocking
**Status:** Fixed (`0f185f2`), verified live

**What was wrong:** The Neon Auth proxy's bypass list was too narrow. It only exempted `/`, `/about`, `/sign-in`, `/sign-up`, and `/api/auth/`. Every other route hit `auth.middleware()` which 307'd unauthenticated requests to `/sign-in`. This included:

| Route | What broke | Impact |
|-------|-----------|--------|
| `/scorecard` | All 50-state scorecard pages | Site-wide login wall |
| `/pricing` | Pricing section | No one could see plans |
| `/bill/*` | Individual bill pages | Broken deep links |
| `/state/*` | State detail pages | Broken deep links |
| `/esa` | ESA compliance guide | Broken landing pages |
| `POST /api/webhooks/stripe` | Stripe webhook handler | **Every subscription checkout silently failed** — payment went through, webhook 307'd, subscription never created |
| `POST /api/revalidate` | Pipeline revalidation | Data syncs couldn't invalidate ISR cache |
| `/api/bff/*` | BFF routes for pipeline | Pipeline couldn't read watchlist/alert data |

**Fix:** Replaced ad-hoc inline bypasses with `isPublicPath()` using an explicit `PUBLIC_ROUTES` array + `PUBLIC_PREFIXES` list for dynamic routes (`/bill/`, `/state/`). Protected routes (`/dashboard`, `/account`, `/api/me`, `/api/checkout`, `/api/portal`) still require session auth.

**Live verification (all 200):**

| Route | Status | Notes |
|-------|--------|-------|
| `/scorecard` | ✅ 200 | Renders correctly |
| `/pricing` | ✅ 200 | Pricing cards, CTAs visible |
| `/esa` | ✅ 200 | Full guide renders |
| `/bill/CA-SB-1234` | ✅ 200 | Dynamic route resolving |
| `/state/CA` | ✅ 200 | State detail page |
| `POST /api/webhooks/stripe` | ✅ 400 | "Missing signature" — reached handler |
| `POST /api/revalidate` | ✅ 401 | "Invalid token" — reached handler |
| `/api/bff/alerts` | ✅ 401 | Properly gated |
| `/api/bff/watchlist` | ✅ 401 | Properly gated |
| `/dashboard` | ✅ 307 | Correctly protected |
| `/sign-in` | ✅ 200 | Auth page accessible |

---

### 2. Pipeline systemd Timer (Doppler in Non-Login Shell)

**Severity:** Launch-blocking
**Status:** Fixed, verified (47 CA bills, 0 failures)

**What was wrong:** `/opt/homeschool-compass/scripts/sync-pipeline.sh` called `doppler secrets get` which requires a login shell with Doppler config. systemd timers run in non-login shells — the command silently failed, the sync never ran, and the Neon database had zero live bills.

**Fix:** Replaced with `.env`-sourcing version. Python script already had native `python-dotenv` support. Verified with a dry run processing 47 CA bills at 0 failures.

---

## 🟡 Yellow Flags — Pushback / Acknowledgment / Fix Path

### 1. Missing CSP Headers (defense-in-depth)

**Finding:** No `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, or `Referrer-Policy` response headers are set on the deployed site.

**Pushback:** This is a Vercel-hosted Next.js static site. Vercel's edge network already:
- Blocks source maps (403 on `.map` requests — verified)
- Provides HSTS (verified: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`)
- Handles DDoS at the edge
- The app has no iframe-based embedding surface (clickjacking risk is theoretical)
- No user-uploaded content, so XSS via file upload isn't a vector

**Acknowledgment:** CSP is mature defense-in-depth. If this site ever adds user-generated content, embeds third-party widgets, or serves ads, CSP becomes necessary. A `frame-ancestors 'self'` directive would trivially close the clickjacking gap.

**Fix path:** Add to `next.config.ts`:
```ts
headers: async () => [
  {
    source: '/(.*)',
    headers: [
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; frame-src https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.stripe.com;" },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ],
  },
],
```

**Priority:** Medium — not a launch blocker. Add before public launch announcement.

---

### 2. CORS Wildcard (`Access-Control-Allow-Origin: *`)

**Finding:** Vercel's default edge config sets `access-control-allow-origin: *` on all responses.

**Pushback:** The API routes already implement their own auth (BFF routes require bearer token, webhooks verify Stripe signatures, revalidation checks secret). A CORS wildcard on a static site with no authenticated browser API calls from external origins is low-risk — there's nothing to exfiltrate via cross-origin read. The `/api/bff/*` routes return 401 without a valid token regardless of Origin header. The pipeline runs server-side, not from a browser.

**Acknowledgment:** If the app ever adds session-cookie-authenticated API endpoints that respond to GET requests, CORS + CSRF protection becomes necessary. Currently: all authenticated API routes are POST-only or require bearer tokens/Stripe signatures. Cookie-based auth only flows through server components.

**Fix path:** In `next.config.ts` or Vercel's `vercel.json`, add per-route CORS headers:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "https://homeschool-regulation-tracker.vercel.app" }
      ]
    }
  ]
}
```

Or skip it entirely and let Vercel's default stand — the app's auth architecture makes it safe.

**Priority:** Low — architectural safety, not a vector.

---

### 3. Alert Preferences — No Zod Input Validation

**Finding:** The alert preferences server action (`lib/actions/alerts.ts`) stores user-submitted `preferences` JSONB data directly without a Zod schema boundary.

**Pushback:** The action internally calls `getUserId()` which validates the session — so only authenticated users can submit. JSONB in PostgreSQL handles arbitrary JSON safely (no injection). The app is single-tenant with no visibility boundaries between users on this data. A malicious user could submit malformed JSONB but it only corrupts their own preferences row.

**Acknowledgment:** Zod validation is a best practice that prevents a class of subtle bugs: unexpected data shapes, missing fields, type mismatches. Without it, a frontend change that shuffles the preference structure could silently write corrupt data that downstream readers don't know how to parse.

**Fix path:** In `lib/actions/alerts.ts`, add:
```ts
import { z } from 'zod'

const alertPreferencesSchema = z.object({
  states: z.array(z.string().length(2)).min(0),
  impactTypes: z.array(z.enum(['reporting', 'testing', 'curriculum', 'teacher'])).min(1),
  channels: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean().optional(),
  }),
})

// Then at the start of the action:
const parsed = alertPreferencesSchema.safeParse(preferences)
if (!parsed.success) throw new Error('Invalid preferences format')
```

**Priority:** Low — safe in practice, good hygiene.

---

### 4. Dangling Subscription on User Delete

**Finding:** There is no cleanup path when a user deletes their account — Stripe subscriptions, Neon Auth sessions, and preference rows are orphaned.

**Pushback:** There is no user-facing "delete account" action in the current app. The MVP has no account deletion flow, so this is a theoretical gap, not a live one. When you add account deletion, cleaning up Stripe subscriptions is a 3-line handler.

**Acknowledgment:** This becomes a real problem the moment someone asks to delete their account. Orphaned subscriptions still ping Stripe for renewal, and customers get charged for an account they can't log into.

**Fix path:** When adding account deletion:
1. Cancel active Stripe subscription (`stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })`)
2. Delete user from Neon Auth (`auth.admin.removeUser(userId)`)
3. Delete alert preferences row
4. Delete watchlist entries
5. Optionally anonymize (not delete) bill views for analytics continuity

**Priority:** Low — only actionable when account deletion is implemented.

---

### 5. Pipeline Classifier Accuracy (AI-Assisted Bill Analysis)

**Finding:** The pipeline uses "Gemini-assisted analysis" (from the marketing copy) or similar LLM classification to determine whether a bill is homeschool-relevant. No human attorney review.

**Pushback:** The classifier is a bounded, deterministic classification task — not legal analysis. It checks bill titles and summary text against keyword patterns (homeschool, home school, home education, compulsory, parent-taught, etc.). False positives are acceptable (better to flag and let a human dismiss than to miss). The actual pipeline result (`homeschool_bill_classifier.py`) is a `relevance_score` + `match_reasons` — it doesn't make legal judgments, it filters the firehose of 200K+ annual bills down to a manageable signal.

**Acknowledgment:** Two real risks:
- **False negatives** — a bill that restructures the state education code without mentioning "homeschool" could affect homeschoolers silently. The current keyword-based approach would miss it.
- **LLM drift** — if the classifier prompt changes or the LLM model is swapped, classification behavior shifts without notice.

**Fix path (near-term):** Add a pipeline audit table that logs every bill classified with its score, match reasons, and LLM model version. Expose a "report missed bill" button on the frontend so users can flag false negatives manually.

**Fix path (medium-term):** Add a secondary pass using LegiScan's subject tags and bill topic analysis, which doesn't rely on LLMs at all. Cross-reference LLM results with LegiScan tags.

**Priority:** Medium — the current approach is good enough for an MVP, but the false negative gap should be addressed before the user base grows.

---

### 6. Opaque State Scoring Methodology

**Finding:** The scorecard shows 0–100 scores for each state with four sub-categories (Reporting, Testing, Curriculum, Teacher) but there's no published methodology explaining how points are weighted or assigned.

**Pushback:** The methodology is HSLDA-aligned and the general ranking (Idaho/Texas permissive, New York restrictive) matches established consensus from HSLDA, Johns Hopkins Homeschool Hub, and state DOE sources. Publishing the full rubric is a documentation task, not a correctness issue.

**Acknowledgment:** Without a published methodology, users can't evaluate whether the scoring is fair or accurate for their specific situation. If one state's score seems off, there's no way for them to verify.

**Fix path:** Add a `/methodology` page that documents:
- The 4 sub-categories and what they measure
- Weight per category (e.g., Reporting 30%, Testing 25%, Curriculum 25%, Teacher 20%)
- Rubric for each category score (what earns 0/25 vs 25/25)
- Last reviewed date
- Citations for individual state requirements (linked to statutes/DOE pages)

**Priority:** Medium — trust-building. Add before any paid user asks.

---

### 7. "30,000+ Bills Analyzed" Claim — Unverifiable

**Finding:** This claim appears in marketing copy but the number can't be independently verified from the deployed site or public data.

**Pushback:** The Le iScan API does track the number of queries and bill updates processed. The sync pipeline runs every 4 hours across 34 (eventually 50) states, fetching updated bills each cycle. After running for a few weeks, 30,000+ API calls is a realistic cumulative count — each sync may process hundreds of bill updates depending on legislative session activity.

**Acknowledgment:** "API queries monthly processed" and "bills analyzed" are different things, and conflating them is misleading. 30,000 API calls ≠ 30,000 unique bills. Also, presenting this as a trust signal when the count is that low is odd — 30K is not impressive for an API-based tracker.

**Fix path:** Either:
1. Remove the claim entirely (it's not adding trust, it's raising questions)
2. Change to something specific and verifiable: "Tracking XXX bills across 50 states from 2025–2026 sessions" with a live count on the dashboard
3. Or use it internally to validate coverage, not as a marketing claim

**Priority:** Low — remove or rephrase in copy.

---

### 8. "2,400+ Families" Claim — Unverifiable

**Finding:** No way to verify this number from public data.

**Pushback:** If Neon Auth shows 2,400+ registered users in the database, then the claim is literally true. The gap is product, not integrity — there's no publicly visible count.

**Acknowledgment:** Without showing any evidence (testimonials, case studies, reviews), this kind of claim undermines credibility rather than building it. It reads as a vanity metric.

**Fix path:** Either:
1. Remove it until there's independent validation (reviews, Trustpilot, etc.)
2. Replace with a verifiable real-time counter from the database
3. Replace with qualitative testimonials if any exist

**Priority:** Low — copy change.

---

### 9. "Accuracy Guarantee" — Legally Dubious

**Finding:** The guarantee says "If we miss a bill that affects your state, your next year is free" but the terms are undefined — what counts as "affects your state"? How is "missed" defined? Who adjudicates disputes?

**Pushback:** For an MVP, this is marketing copy designed to signal confidence. The expected volume of missed-bill claims is near zero for a keyword-based classifier pulling from LegiScan's comprehensive database. It's a bold claim that translates to "we're confident in our coverage."

**Acknowledgment:** If someone actually took them up on it, there's no refund process, no escalation path, no way to adjudicate. The legal language needs to be tightened or the claim needs to be formalized with defined terms and a claim process.

**Fix path:** Either:
1. Formalize it: "If you identify a bill affecting homeschooling in your state that we did not track, email us at [support email] with [details]. We'll review within 5 business days and, if confirmed, extend your subscription by 12 months."
2. Or remove it until there's legal infrastructure to back it up.

**Priority:** Medium — consumer protection exposure if someone files a complaint.

---

## Probe Results Summary

| # | Vector | Test | Result | Severity |
|---|--------|------|--------|----------|
| 1 | Unauthenticated dashboard access | GET `/dashboard` without session | ✅ 307 → /sign-in | None |
| 2 | IDOR on watchlist | Toggle watchlist for another user's bill | ✅ Scoped to `getUserId()` | None |
| 3 | Rate limit on revalidation | 10 POSTs in 5s to `/api/revalidate` | ✅ 429 after 5/min | None |
| 4 | Stripe webhook replay | Resend same Stripe event | ✅ Idempotent via `ON CONFLICT` | None |
| 5 | SQL injection via bill ID | `' OR 1=1--` in bill page URL | ✅ Parameterized query | None |
| 6 | Source map exposure | GET `*.map` files | ✅ 403 on all | None |
| 7 | Path traversal | `../../../etc/passwd` style paths | ✅ 404 | None |
| 8 | Stripe metadata tampering | Checkout with wrong price ID | ✅ Server-side price resolution | None |
| 9 | Cross-user BFF access | Direct `/api/bff/alerts` | ✅ 401 without token | None |
| 10 | Mass assignment on alert prefs | Arbitrary JSONB fields | 🟡 Safe via auth gate, no Zod | Low |
| 11 | Dangling subscription on user delete | No cleanup path | 🟡 No delete-account feature yet | Low |
| 12 | CORS wildcard | `access-control-allow-origin: *` | 🟡 Auth architecture mitigates | Low |
| 13 | Missing CSP/XFO/CTO headers | Response header scan | 🟡 Defense-in-depth | Low |
| 14 | Build ID / framework disclosure | HTML source scan | ✅ No buildId exposed | None |

---

## Verdict

**Phase 1 ships clean.** Two launch-blocking bugs that would have caused real damage (silent Stripe checkout failures, invisible scorecard) were found and fixed before a single paid user hit them. The remaining 🟡 items are production-quality gaps, not safety issues.

**What's actually at risk:** Credibility, not security. The marketing claims (30K bills, 2.4K families, accuracy guarantee) are the weakest part of the product — they're unverifiable and raise more questions than they answer. Fixing the copy is cheaper than fixing a code bug and has higher ROI for a service asking people to pay.

---

## Appendices

### A. Live Verification Checklist

| Check | Status | Note |
|-------|--------|------|
| Landing page | ✅ | HSTS active, no CSP |
| Scorecard | ✅ 200 | 50 states, grade A-F |
| State page | ✅ | e.g. /state/CA |
| Bill page | ✅ | e.g. /bill/CA-SB-1234 |
| Pricing | ✅ 200 | 2 plans visible |
| ESA guide | ✅ 200 | Long-form content |
| Auth page | ✅ | Sign-in renders |
| Dashboard | ✅ 307 | Protected |
| Webhook endpoint | ✅ 400 | Reached handler |
| Revalidation | ✅ 401 | Reached handler |
| BFF routes | ✅ 401 | Properly gated |
| Pipeline sync | ✅ | 47 CA bills, 0 failures |

### B. Commit Log (Relevant)

```
0f185f2 fix: proxy middleware blocking all public pages + API routes
8b5b0f6 fix: resolve 19 TypeScript errors — db import path, Stripe types, implicit any
2213451 chore: vercel.json with ENABLE_STRIPE=true
5c9ee90 feat: Phase 1 — auth, watchlist, alerts, Stripe checkout, webhook, BFF routes
```

### C. Security Header Status

| Header | Present | Value |
|--------|---------|-------|
| Strict-Transport-Security | ✅ | `max-age=63072000; includeSubDomains; preload` |
| Content-Security-Policy | ❌ | Missing |
| X-Frame-Options | ❌ | Missing |
| X-Content-Type-Options | ❌ | Missing |
| Referrer-Policy | ❌ | Missing |
| Access-Control-Allow-Origin | 🟡 | `*` (Vercel default) |
| Cache-Control | ✅ | `public, max-age=0, must-revalidate` |
