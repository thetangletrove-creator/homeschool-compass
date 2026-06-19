# Required Environment Variables

Set these in the Vercel dashboard (Settings → Environment Variables) for both Production and Preview deployments.

## Required (app will crash without these)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | **Pooled** Neon connection string for the `hc_frontend` user | `postgresql://hc_frontend:****@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require` |
| `DATABASE_URL_UNPOOLED` | **Unpooled** Neon connection string for the `hc_frontend` user | `postgresql://hc_frontend:****@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require` |
| `REVALIDATION_SECRET` | Random secret for ISR revalidation. Generate with: `openssl rand -base64 32` | |

## Auth (optional — app works without, shows logged-out state)

| Variable | Description | How to Get |
|----------|-------------|------------|
| `NEON_AUTH_BASE_URL` | Neon Auth endpoint URL | From Neon Console → Auth → Settings → Auth endpoint URL |
| `NEON_AUTH_COOKIE_SECRET` | Secret for signing auth cookies (min **32 characters**, use **fixed-length**) | `openssl rand -base64 32` |

## Stripe (optional — gated behind `ENABLE_STRIPE` flag)

| Variable | Description | How to Get |
|----------|-------------|------------|
| `STRIPE_SECRET_KEY` | Stripe secret key (starts with `sk_live_` or `sk_test_`) | Stripe Dashboard → Developers → API Keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Stripe Dashboard → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Stripe Dashboard → Developers → Webhooks → Endpoint |

## Frontend Config (optional — has sensible defaults)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_DOMAIN` | Custom domain | `homeschool-compass.vercel.app` |
| `ENABLE_STRIPE` | Set to `'true'` to enable Stripe features | (not set = disabled) |
| `USE_LIVE_DATA` | Set to `'true'` to use live Neon data instead of mock | (not set = mock in preview) |
| `REVALIDATE_RATE_LIMIT` | ISR revalidation rate limit (requests per minute) | `5` |

## How to Set

1. Go to [Vercel Dashboard](https://vercel.com/wowthisiseasytoremember-stack/homeschool-regulation-tracker/settings/environment-variables)
2. Add each variable as **Sensitive** (values are encrypted)
3. Apply to: Production, Preview, Development
4. Redeploy: Vercel will automatically trigger a new deployment

## Verification

After setting env vars and deploying:

```bash
# Check deployment is healthy
curl -s -o /dev/null -w "%{http_code}" https://homeschool-compass.vercel.app

# Environment validator runs at build time — check build logs
# for "[CONFIG]" messages in Vercel deployment logs
```
