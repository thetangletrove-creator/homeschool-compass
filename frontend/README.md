# 🏠 Homeschool Compass

![Status](https://img.shields.io/badge/status-active-success)
![Pipeline](https://img.shields.io/badge/pipeline-parked-yellow)

A SaaS legislative monitoring platform for U.S. homeschool regulation changes. Track bills, set alerts, and maintain ESA compliance — powered by LegiScan API, Neon PostgreSQL, and Stripe.

**Live at:** `homeschool-regulation-tracker.vercel.app`

## What It Does

- **50-state scorecard** — Freedom scores + ESA program data for every state
- **Bill tracking** — Legislative bill search with impact analysis and status timelines
- **Personal watchlist** — Save bills you care about. Get notified when they move.
- **ESA Programs** — 20 active ESA states cataloged with portal URLs, forms, deadlines, and multi-program support
- **Compliance Forms** — All 52 states with notification, assessment, immunization, and instruction-day rules
- **Provider Invoice Portal** — Standalone web portal for independent providers (tutors, therapists, music teachers) to submit bulletproof ESA-compliant invoices. No account required — single-use magic link flow. Zero-Knowledge (ZK) encryption: provider credentials encrypted end-to-end before reaching the server.
- **Stripe subscriptions** — Regulation Tracker ($29/yr) or ESA Compliance ($99/yr)
- **Compliance Kit** — One-time purchase state compliance packet ($29.99) with bill triage, ESA data, and action items

## Architecture

```
LegiScan API → Python sync pipeline (ICHABOD, every 4h) → Neon PostgreSQL
                                                             ↓ Drizzle ORM
                                                        Next.js 16 (Vercel)
                                                             ↓
                                             Server Components → ISR → CDN
                                                             ↓
                                          Neon Auth → Sessions → Stripe
```

## Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4 |
| **Database** | Neon (PostgreSQL) via Drizzle ORM |
| **Auth** | Neon Auth (Better Auth) — Google OAuth |
| **Payments** | Stripe — Checkout, Customer Portal, Webhooks |
| **Provider Portal** | @react-pdf/renderer (PDF), Web Crypto API (ZK encryption) |
| **Pipeline** | Python 3 (LegiScan API client) — ICHABOD cron |
| **Secrets** | Doppler (`ichabod` / `prd`) |
| **Deploy** | Vercel (auto-deploy from GitHub) |

## Quick Start (Development)

```bash
cd frontend
cp .env.example .env.local
# Fill in NEON_DATABASE_URL and other vars from Doppler

pnpm install
pnpm dev
# → http://localhost:3000
```

Set `USE_LIVE_DATA=false` in `.env.local` to use mock data (no Neon connection needed).

## Database

```bash
# Generate migrations after schema changes
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate
```

## Stripe (Local Testing)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
```

## Pipeline

The Python sync pipeline lives in `frontend/pipeline/` and runs on ICHABOD via systemd:

```bash
# The systemd timer was stopped due to LegiScan quota exhaustion
# Resume with:
sudo systemctl start homeschool-compass-sync.timer

# Check status:
sudo systemctl status homeschool-compass-sync.timer
```

On successful sync, the pipeline POSTs to `/api/revalidate` to refresh the frontend cache.

### Pipeline Scripts (deployed to `/opt/homeschool-compass/scripts/`)

| Script | Purpose |
|--------|---------|
| `sync-to-neon.py` | LegiScan fetch → validate → upsert → revalidate |
| `legiscan_client.py` | LegiScan API client with caching |
| `classify_bills.py` | Gemini bill enrichment (Vertex AI) |
| `compliance-pack.py` | State compliance pack generator |
| `populate-esa-resources.py` | ESA programs + compliance forms population |
| `fetch-bill-text.py` | Bill text fetcher (priority-batched, rate-limited) |

## Project Docs

- `AGENTS.md` — Agent entry point (current state, key files, next steps)
- `ARCHITECTURE.md` — Full system architecture + security boundaries + Provider Portal
- `ROADMAP.md` — Completed phases + future plans
- `STATE.md` — Current project state
- `plan/` — Feature plans and sprint breakdowns
- `references/` — Research docs, design references, audit reports

## License

MIT — Built for The Tangle Trove.
