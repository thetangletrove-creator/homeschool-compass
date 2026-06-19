# From Here to 100% — Implementation Plan

**Date:** 2026-06-17
**Status:** Draft (awaiting feedback)
**Current state:** Pipeline complete (3,845 bills enriched, 51/51 states with ESA data), features wired, Stripe integrated

---

## Phase A — Production Readiness (Launch Blockers)

These must be resolved before launch. Each one blocks something critical.

### A1 — Verify Stripe End-to-End Flow

**Goal:** Prove the revenue engine works from signup → subscribe → webhook → dashboard unlock → cancel.

**Blocked by:** Needs Jack to run this smoke test in prod. I can't click Subscribe buttons.

**Checklist:**
- [ ] Create a test account on the live site
- [ ] Subscribe to the $29/yr Tracker plan
- [ ] Verify `/dashboard` shows subscription status correctly
- [ ] Navigate to Stripe Customer Portal — verify manage/cancel flow
- [ ] Cancel subscription — verify downgrade is reflected
- [ ] Check `subscriptions` table in Neon — verify status transitions
- [ ] Check Stripe Dashboard — verify webhook delivery status for all events (checkout.session.completed, customer.subscription.updated, invoice.paid, invoice.payment_failed)
- [ ] Repeat for $99/yr ESA Compliance plan

**Research needed:**
- Open Stripe Dashboard → Webhooks. Is the endpoint `https://<domain>/api/webhooks/stripe` registered? What's the last delivery status?

---

### A2 — Custom Domain

**Goal:** Replace Vercel subdomain with a proper domain.

**Blocked by:** Jack needs to tell me what domain.

**Checklist:**
- [ ] Pick a domain
- [ ] Point DNS to Vercel nameservers (or CNAME to `cname.vercel-dns.com`)
- [ ] Configure domain in Vercel Dashboard → Project → Settings → Domains
- [ ] Verify SSL provisioning
- [ ] Update Stripe webhook endpoint URL to new domain
- [ ] Test full auth flow on new domain (Neon Auth has domain allowlist)

**Research needed:**
- What domain do you own? Where's the DNS hosted?

---

### A3 — ESLint Config (Flat Config)

**Goal:** ESLint 10 requires `eslint.config.js` (flat config). Currently missing, so `eslint` or lint-on-build would fail.

**Why it blocks:** Build will ignore lint errors but `next lint` won't work, and CI lint checks would need this.

**Strategy:**
- Create `eslint.config.js` with `@eslint/js` recommended base + project-specific rules
- Include TypeScript ESLint plugin for proper TS linting
- Run `next lint` to verify zero config-time errors
- Keep rules lenient (warn not error) — we want lint to guide, not gate

**Decision-free:** I can write this now based on Next.js 16 + TypeScript conventions.

---

### A4 — Content Security Policy (CSP)

**Goal:** Remove `'unsafe-inline'` from script-src by adding nonce-based CSP.

**Why it blocks:** Security best practice. Without nonces, the site is vulnerable to XSS injection.

**Strategy:**
- Use Next.js built-in `middleware.ts` to generate and attach a nonce per-request
- Wire nonce into `next/script` component
- Add nonce to inline `<style>` tags
- Test that the site renders without `unsafe-inline` — check browser console for CSP violations

**Decision-free:** Standard Next.js pattern. I can implement this.

---

## Phase B — Data Completeness

Product value depends on data quality and depth. These fill the remaining gaps.

### B1 — Fetch Bill Full Text

**Goal:** Populate the `bill_full_text` table with actual bill text from LegiScan.

**Current state:** 0 rows. Schema exists (`bill_id`, `full_text`, `text_url`).

**Strategy:**
- LegiScan API has `getBillText` endpoint — returns text URL per bill
- Add a Phase 4 to the pipeline: after enrichment, fetch full text for each bill
- Store text in `bill_full_text` table
- Handle rate limits (LegiScan caps requests)
- Batch: prioritize bills with `impact != "neutral"` or `esa_related = TRUE` for text fetch

**Research needed:**
- Check LegiScan API docs — find `getBillText` — what parameters does it need? Rate limit per second? Text format returned?

---

### B2 — DC Subscores

**Goal:** Fill the one state gap in scoring.

**Current state:** 51/51 states have ESA data populated. DC has subscores available but may have gaps.

**Strategy:**
- Check what subscore fields exist for DC
- Research DC's homeschool regulations / ESA landscape
- Fill with accurate data

---

### B3 — Quality Audit

**Goal:** Verify Gemini enrichment accuracy before trusting production data.

**Strategy:**
- Random sample of 20 bills across categories (increase, decrease, neutral, ESA-related)
- For each, manually read the bill title + summary → compare to Gemini's classification
- Record: confidence score, whether classification was correct, any patterns in errors
- Calculate accuracy rate
- If below 85%, tune the prompt or add post-processing

---

## Phase C — Revenue Features

These are the features that justify the subscription tiers. Without them, users pay for empty promises.

### C1 — Email Alert Delivery

**Goal:** Actually send the alert emails that users configure in their alert preferences.

**Current state:** Alerts table has user preferences (50+ states, channel/impact toggles). Zero emails ever sent.

**Strategy:**
- Choose an email provider (Resend? SendGrid? Brevo? AWS SES?)
- Set up sending domain (DMARC, SPF, DKIM)
- Create a cron job (or extend the pipeline) that:
  1. Detects new/updated bills matching user alert preferences
  2. Generates email digest per user
  3. Sends via chosen provider
- Build preference-respecting logic: only send for user's selected states, selected impact levels, selected channels

**Research needed:**
- What email provider do you want to use? Do you have one set up already (DMARC/SPF/DKIM)?
- How often should alerts send? (Realtime? Daily digest? Weekly?)

---

### C2 — ESA Compliance Dashboard

**Goal:** Build the paid-tier dashboard that shows ESA compliance for the user's home state.

**Current state:** States table has all ESA fields populated (name, max award, eligibility, documentation, deadline). No frontend route to display it.

**Strategy:**
- Create `/esa` route (protected by `requireSubscription('esa_compliance')`)
- Display:
  - ESA program name + active status
  - Maximum award amount
  - Eligibility requirements (checklist)
  - Required documentation (checklist)
  - Application deadline (countdown)
- Show bill actions in their state that could affect ESA availability (ESA-related bills)
- Toggle between states for multi-state families

---

## Phase D — Production Hardening

Infrastructure and code quality work. Not launch blockers individually, but important for reliability.

### D1 — Sentry Error Monitoring

**Goal:** Stop being blind to production errors.

**Strategy:**
- Create a Sentry project for Homeschool Compass
- Install `@sentry/nextjs`
- Configure DSN, performance tracing
- Verify error capture with a test throw
- Set up alerting (slack/email on new error groups)

---

### D2 — Load Testing

**Goal:** Know the performance ceiling before real users hit it.

**Strategy:**
- Write a simple k6 or artillery script
- Test: homepage load, bill search, watchlist operations
- Identify bottlenecks (DB queries? API routes? LegiScan?)
- Fix or document known limits

---

### D3 — Remove Dead Code

**Goal:** Delete the Phase 0 scaffolding that's now irrelevant.

**What to remove:**
- All `USE_LIVE_DATA` flag references (mock data switch was for Phase 0, no longer relevant)
- Old pipeline scripts: `~/Projects/homeschool-compass/frontend/archive/` (if exists) or any mock data files
- `lib/data.ts` mock data (currently unused or only used as reference)

---

### D4 — Apple OAuth Provider

**Goal:** Allow sign-in with Apple ID.

**Strategy:**
- Configure Apple OAuth provider in Neon Console
- Add "Sign in with Apple" button to login page
- Test end-to-end

---

## Implementation Order (Recommended)

| Step | Phase | What | Est. Time | Parallelizable |
|------|-------|------|-----------|----------------|
| 1 | A3 | ESLint flat config | 30min | ✅ Yes (me) |
| 2 | A4 | CSP nonces | 1hr | ✅ Yes (me) |
| 3 | D3 | Remove dead code | 20min | ✅ Yes (me) |
| 4 | D1 | Sentry setup | 45min | ✅ Yes (me) |
| 5 | A2 | Custom domain | 15min | 🔒 Needs Jack |
| 6 | B3 | Quality audit | 1hr | ✅ Yes (me) |
| 7 | A1 | Stripe e2e smoke test | 20min | 🔒 Needs Jack |
| 8 | B1 | Fetch bill full text | 2hr | ✅ Yes (me) |
| 9 | B2 | DC subscores | 15min | ✅ Yes (me) |
| 10 | D4 | Apple OAuth | 1hr | 🟡 Needs Neon Console access |
| 11 | D2 | Load testing | 1hr | ✅ Yes (me) |
| 12 | C1 | Email alert delivery | 4hr | 🔒 Needs provider decision |
| 13 | C2 | ESA Compliance dashboard | 3hr | ✅ Yes (me, can prototype with dummy data) |

**What I'm starting now (steps 1–4, 6, 8, 9, 11, 13):**
All work I can do without blocking on you. I'll send updates as each finishes.

**What I need from you:**
- **A2:** Your domain name
- **A1:** 20 minutes to run the Stripe smoke test on the live site
- **B1/B3 feedback:** After I run the quality audit, confirm you're happy with Gemini's accuracy before I scale bill text fetching
- **C1:** Email provider preference
- **D4:** Neon Console OAuth config access (or I can walk you through it)

---

## Research Prompts

Embedded research for each step:

- `/opt/homeschool-compass/scripts/sync-to-neon.py` — read lines 195–198 (impact classification), verify Phase 3 enrichment code is present
- `psql` - check count of `bill_full_text` rows, check DC subscores, sample 20 enriched bills
- LegiScan API docs for `getBillText` — curl the endpoint or check their documentation page
- Current `.env` — verify Stripe webhook secret and price IDs are set
- Vercel Dashboard — check domain settings, check latest deploy status
