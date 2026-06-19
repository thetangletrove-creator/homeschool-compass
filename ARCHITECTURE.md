# Homeschool Compass — Architecture

**Last updated:** 2026-06-20
**Position:** Operational clearinghouse for the funded homeschool

## System Overview

```
                    ┌──────────────────────┐
                    │   LEGISCAN API          │
                    │   (external data source) │
                    └──────────┬───────────┘
                               │
    ┌──────────────────────────────────────────┐
    │   SYNC PIPELINE (ICHABOD cron)           │
    │   Python / legiscan_client.py             │
    │   Data validation → upsert to Neon        │
    │   Idempotent via sync_log table           │
    │   DLQ for failed rows                    │
    │   POSTs to /api/revalidate on success     │
    └─────────────┬────────────────────────────┘
                  │
    ┌─────────────▼────────────────────────────┐
    │   GEMINI ENRICHMENT (Phase 2)             │
    │   services/gemini_classifier.py           │
    │   pipeline/classify_bills.py              │
    │                                           │
    │   Tier 1: Impact direction + ESA detect   │
    │   Tier 2: Deep analysis (delta, bullets,  │
    │           actions, provisions)            │
    │   Tier 3: State enrichment (ESA data)     │
    │                                           │
    │   Vertex AI (gemini-2.5-flash)            │
    │   Runs after sync, incremental            │
    └─────────────┬────────────────────────────┘
                  │
    ┌─────────────▼────────────────────────────┐
    │   NEON (PostgreSQL)                       │
    │   ┌───────────┐  ┌─────────────┐          │
    │   │ states    │  │ bills       │          │
    │   │ (ESA data │  │ (enriched:  │          │
    │   │  + scores)│  │  impact,    │          │
    │   │           │  │  analysis,  │          │
    │   │ pipeline_ │  │  delta,     │          │
    │   │ metadata  │  │  actions)   │          │
    │   │ sync_log  │  │ dlq         │          │
    │   │ webhook_  │  │ watchlist   │          │
    │   │ events    │  │ alert_preferences      │
    │   │           │  │ subscriptions          │
    │   └───────────┘  └─────────────┘          │
    │   Restricted user: SELECT on states/bills │
    └─────────────┬────────────────────────────┘
                  │ Drizzle ORM
    ┌─────────────▼────────────────────────────┐
    │   FRONTEND (Vercel, Next.js 16)           │
    │   Server Components → Drizzle queries     │
    │   ISR (revalidate: 14400)                 │
    │   On-demand revalidate via pipeline POST  │
    │   Mock fallback when USE_LIVE_DATA=false  │
    │                                            │
    │   API ROUTES:                              │
    │   /api/revalidate      — pipeline trigger  │
    │   /api/me              — session data      │
    │   /api/checkout        — Stripe checkout   │
    │   /api/webhooks/stripe — Stripe events     │
    │   /api/portal          — customer portal   │
    │   /api/bff/watchlist   — pipeline access   │
    │   /api/bff/alerts      — pipeline access   │
    │   /api/auth/[...all]   — Neon Auth proxy   │
    │   /api/provider/magic-link — create link   │
    │   /api/provider/[token] — validate + submit │
    │   /api/provider/invoices — list invoices   │
    │   /api/provider/invoice/[id]/pdf — generate │
    └────────────────────────────────────────────┘
                               │
    ┌─────────────▼────────────────────────────┐
    │   STRIPE                                  │
    │   Checkout Sessions → Customer Portal     │
    │   Webhooks → subscription state mirror    │
    └──────────────────────────────────────────┘
```

## Key Implementation Files

Every file below is exercised in production on Vercel. Files marked `(pipeline)` run on ichabod cron.

### Core Infrastructure

| File | Role |
|------|------|
| `lib/db/schema.ts` | Drizzle schema — all tables (states, bills, users, subscriptions, providers, invoices, compliance_links, esa_programs) + TypeScript types |
| `lib/stripe.ts` | Lazy-init Stripe SDK singleton, product definitions, pricing lookups |
| `lib/crypto.ts` | RSA-OAEP + AES-256-GCM hybrid encryption (keygen, encryptPayload, decryptPayload, localStorage persistence) |
| `pipeline/sync-to-neon.py` | (pipeline) LegiScan fetch → validate → upsert → revalidate POST. Idempotent via sync_log |
| `pipeline/classify_bills.py` | (pipeline) Gemini enrichment — impact/ESA/analysis tiers |
| `scripts/populate-esa-resources.py` | ESA programs + compliance forms population for all 52 states — embedded 20-state research data |

### Provider Invoice Portal (Phase 10)

| File | Role |
|------|------|
| `lib/pdf/invoice-document.tsx` | @react-pdf/renderer template — ClassWallet/Odyssey-compliant invoice PDF |
| `app/api/provider/magic-link/route.ts` | POST — parent creates single-use magic link with `#pubkey=` fragment |
| `app/api/provider/[token]/route.ts` | GET (validate link) / POST (submit invoice with encrypted profile) |
| `app/api/provider/invoices/route.ts` | GET — list invoices + active links for authenticated parent |
| `app/api/provider/invoice/[id]/pdf/route.tsx` | GET — generate + return PDF document |
| `app/provider/[token]/page.tsx` | 4-step client form: Identity → Sessions → Payment → Review. Reads `#pubkey` from URL hash |
| `app/dashboard/provider/page.tsx` | Parent dashboard: generate links, view invoices, decrypt profiles, download PDFs |
| `drizzle/0002_flashy_spyke.sql` | Migration: providers, invoices, line_items, magic_links tables |
| `drizzle/0003_zk_encryption.sql` | Migration: encrypted_profile column on provider_invoices |

### Documentation References

| File | Role |
|------|------|
| `references/competitor-research-prompt.md` | Self-contained prompt for Perplexity/Claude — competitive landscape + gap analysis |
| `references/esa-portal-research-prompt.md` | Self-contained prompt — 20 ESA state portal URLs, forms, deadlines; 31 non-ESA compliance forms |
| `references/strategic-positioning.md` | North star, three moats, pricing ladder, GTM vectors (aspirational — flags what's not yet built) |

## Data Flow

1. **Sync pipeline** fetches from LegiScan API every 4h (session) / daily (interim)
2. Validates each row against schema constraints (score 0-100, non-null required fields)
3. Valid rows → upsert to Neon in parent-first transactions (state → bills)
4. Failed rows → `dlq` table (dead letter queue)
5. **Gemini enrichment** runs after sync — classifies new/unanalyzed bills
   - Tier 1: Impact direction (INCREASE/DECREASE/NEUTRAL) + ESA detection
   - Tier 2: Deep analysis (delta, analysis points, action_required, key provisions)
   - Tier 3: State enrichment (ESA data, subscore JSONB)
6. On sync success: POST to `/api/revalidate` via Authorization header + IP allowlist
7. Frontend server components read Neon via Drizzle ORM
8. `last_synced_at` in footer shows data freshness

### User Feature Flow

8. **Auth:** User signs in via Neon Auth (Google OAuth) → HttpOnly session cookie set
9. **Watchlist:** User toggles bills on/off → server actions write to `watchlist` table (scoped to `userId`)
10. **Alerts:** User configures states + impact types in Settings → UPSERT to `alert_preferences`
11. **Dashboard:** Server component reads watchlist + alert prefs for authenticated user
12. **Checkout:** Pricing button → POST `/api/checkout` → Stripe Checkout Session → redirect to payment
13. **Webhook:** Stripe posts event → `/api/webhooks/stripe` verifies signature → updates `subscriptions` + `webhook_events`
14. **Portal:** "Manage Subscription" → POST `/api/portal` → Stripe Customer Portal → self-service
15. **BFF:** Python pipeline GETs `/api/bff/alerts` + `/api/bff/watchlist` → uses data for alert delivery

### Provider Portal Data Flow

16. **Parent** generates RSA-2048 keypair on first dashboard visit (Web Crypto API, stored in localStorage)
17. **Parent** creates magic link via `/api/provider/magic-link` → public key appended as `#pubkey=hex` URL fragment
18. **Provider** opens URL → browser reads `#pubkey` client-side (server never receives it)
19. **Provider** completes 4-step form (Identity → Sessions → Payment → Review)
20. **Provider** optionally consents to ZK save → `encryptPayload()` encrypts `{credentials, phone, email}` under parent's public key
21. **Form** submits encrypted bundle + plaintext provider name/address/sessions → server stores only ciphertext
22. **Parent dashboard** fetches invoices → downloads `encryptedProfile` → `decryptPayload()` using stored private key → displays decrypted credentials
23. **PDF** generated on-demand via `/api/provider/invoice/[id]/pdf` using @react-pdf/renderer — matches ClassWallet/Odyssey institutional template

## Auth Architecture

- **Provider:** Neon Auth (Better Auth under the hood)
- **Session:** HttpOnly cookies, server-side validation via `lib/auth.ts`
  - `getSession()` — returns session or null
  - `getUserId()` — returns userId or throws 401
  - `isAuthConfigured()` — graceful when auth is not configured
- **Client:** `lib/auth-client.ts`
  - `useSession()` — React hook for client components
  - `signIn()`, `signUp()`, `signOut()` — auth actions
- **Proxy:** `app/api/auth/[...all]/route.ts` — forwards to managed Neon Auth
- **API endpoint:** `/api/me` (GET) — returns `{ user, subscription, watchlistCount, alertPrefs }` for client hydration
- **Gating:** `requireSubscription()` utility checks `subscriptions` table for active plan

## Table Design

- `states` — 50-state freedom scores, ESA data (public, read-only)
- `bills` — legislative bill metadata (lean, frequently queried)
- `bill_full_text` — separate table for large text content
- `pipeline_metadata` — sync health tracking (admin-only access)
- `sync_log` — idempotency tracking for pipeline
- `dlq` — dead letter queue for failed pipeline rows
- `webhook_events` — Stripe idempotency tracking (event_id → processed)
- `watchlist` — per-user bill tracking: `(userId, billId, createdAt)` 
- `alert_preferences` — per-user alert config: `(userId, states[], impactTypes[], channels[])` — JSONB arrays
- `subscriptions` — Stripe subscription mirror: `(userId, stripeCustomerId, plan, status, currentPeriodEnd)`

### Provider Portal Tables

- `providers` — non-transactional provider profile: `(uuid PK, legalName, businessName, address, email, phone, credentials)`. Created on first magic-link use — no signup required.
- `invoice_magic_links` — single-use, 7-day expiry tokens: `(uuid PK, token, parentId, studentName, stateCode, used, expiresAt)`. Rate-limited to 5 active per parent.
- `provider_invoices` — invoice record linking provider ↔ parent: `(uuid PK, invoiceNumber, magicLinkId FK, providerId FK, parentId, studentName, stateCode, totalDue, paymentMethod, isPaidInFull, encryptedProfile text)`. Provider info snapshotted for historical accuracy.
- `invoice_line_items` — itemized session rows: `(uuid PK, invoiceId FK cascade, serviceDate, startTime, endTime, subject, hourlyRate, amount)`.

### ZK Encryption Architecture

- `encrypted_profile` column on `provider_invoices` stores an RSA-OAEP+AES-256-GCM hybrid encrypted blob.
- **Data flow:** Parent generates RSA-2048 keypair in browser (Web Crypto API) → public key appended as `#pubkey=hex` URL fragment → provider form reads fragment client-side → encrypts `{credentials, phone, email}` → server stores only base64 ciphertext → parent dashboard downloads + decrypts using stored private key.
- **Server sees:** opaque ciphertext, no phone, email, or cert data in plaintext.
- **Web MVP:** keys stored in localStorage. Native app: iOS Keychain / Secure Enclave.`

## API Route Design

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/revalidate` | POST | Bearer token | Pipeline triggers ISR refresh |
| `/api/pipeline/health` | GET | Bearer token | Sync health + DLQ stats |
| `/api/me` | GET | Session | User + subscription + watchlist |
| `/api/checkout` | POST | Session | Create Stripe Checkout Session |
| `/api/webhooks/stripe` | POST | Stripe signature | Process subscription events |
| `/api/portal` | POST | Session | Create Customer Portal session |
| `/api/bff/watchlist` | GET | BFF secret | All watchlists for pipeline |
| `/api/bff/alerts` | GET/POST | BFF secret | Alert delivery pipeline |
| `/api/auth/[...all]` | ALL | Proxy | Neon Auth managed service |
| `/api/provider/magic-link` | POST | Session | Create single-use 7-day magic link for provider |
| `/api/provider/[token]` | GET/POST | Token | Validate link (GET) / submit invoice (POST) — no session needed |
| `/api/provider/invoices` | GET | Session | List invoices + active links for authenticated parent |
| `/api/provider/invoice/[id]/pdf` | GET | None | Download ClassWallet-compliant invoice PDF |

## Security Boundaries

- **Restricted DB user:** SELECT only on `states`, `bills`, `bill_full_text`
- **Admin DB user:** Pipeline + migrations only
- **Revalidation:** `crypto.timingSafeEqual` for secret comparison + IP allowlist + 5 req/hour rate limit
- **Stripe Webhook:** Signature verification via `stripe.webhooks.constructEvent()` — no IP validation (per Stripe docs). `bodyParser: false` for raw body access. Idempotency via `webhook_events` table with `ON CONFLICT DO NOTHING`.
- **BFF routes:** Shared secret (separate from revalidation secret) — designed for Python pipeline consumption
- **CSP:** `script-src 'self' 'unsafe-inline' https://js.stripe.com` (nonce migration planned)
- **Server actions:** Every action calls `getUserId()` first — no action works without authentication
- **Checkout:** `client_reference_id` + `metadata.userId` for user → customer mapping

## Stripe Integration

- **SDK:** `lib/stripe.ts` — lazy-initialized singleton (only when `STRIPE_SECRET_KEY` exists)
- **Plans:** Regulation Tracker ($29/yr), ESA Compliance ($99/yr)
- **Checkout:** Success → `/dashboard?checkout=success`, Cancel → `/pricing?checkout=cancelled`
- **Webhook events handled:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
- **Idempotency:** `webhook_events` table — `INSERT ON CONFLICT DO NOTHING` + DB transaction wrapping
